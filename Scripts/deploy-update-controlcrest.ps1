# Update existing deploy: Function submit-contact + static site to storage.
$ErrorActionPreference = 'Stop'

function Invoke-AzRetry {
  param([Parameter(Mandatory)][string[]] $Args, [int] $MaxAttempts = 8)
  $attempt = 0
  while ($attempt -lt $MaxAttempts) {
    $attempt++
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $null = & az @Args 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $oldEap
    if ($code -eq 0) { return }
    Write-Warning "az attempt $attempt exit $code -- sleep 6s"
    Start-Sleep -Seconds 6
  }
  throw "az failed after $MaxAttempts attempts: az $($Args -join ' ')"
}

$SubscriptionId = '39b8497a-8d94-42aa-b43a-ae9ac3ae9932'
$Rg = 'rg-control-crest-prod'
$StorageName = 'stcce78f20af4fb'
$FunctionName = 'func-cc-5c7775b3cf'
$AcsRg = 'thelaserspace-prod'
$AcsName = 'thelaser-comm'
$MailTo = 'bsallesp@gmail.com'
$MailFrom = 'DoNotReply@49056c6a-2022-4812-8cdd-a9617428d269.azurecomm.net'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LandingDir = Join-Path $RepoRoot 'LandingPage'
$FuncDir = Join-Path $RepoRoot 'AzureFunctions\SubmitContact'
$TempDir = Join-Path $RepoRoot 'temp'
$EnvTs = Join-Path $LandingDir 'src\environments\environment.ts'
$EnvDevTs = Join-Path $LandingDir 'src\environments\environment.development.ts'
$DistBrowser = Join-Path $LandingDir 'dist\landing-page-ng\browser'
$ApiUrl = "https://$FunctionName.azurewebsites.net/api/submit-contact"

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host 'Setting subscription...'
Invoke-AzRetry @('account', 'set', '--subscription', $SubscriptionId)

Write-Host 'Fetching ACS connection string (retries)...'
$AcsConn = $null
for ($i = 1; $i -le 12; $i++) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $AcsConn = & az communication list-key --name $AcsName --resource-group $AcsRg --query 'primaryConnectionString' -o tsv 2>$null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -eq 0 -and $AcsConn) { break }
  Write-Warning "list-key attempt $i failed, sleep 8s..."
  Start-Sleep -Seconds 8
}
if (-not $AcsConn) { throw 'Could not read ACS connection string after retries.' }

$WebEndpoint = $null
for ($i = 1; $i -le 8; $i++) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $WebEndpoint = & az storage account show --name $StorageName --resource-group $Rg --query 'primaryEndpoints.web' -o tsv 2>$null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -eq 0 -and $WebEndpoint) { break }
  Write-Warning "storage show attempt $i..."
  Start-Sleep -Seconds 5
}
if (-not $WebEndpoint) { throw 'Could not read storage web endpoint.' }
$WebOrigin = $WebEndpoint.TrimEnd('/')
$AllowedOrigins = "$WebOrigin,http://localhost:4200,http://127.0.0.1:4200"

Write-Host 'Configuring Function app settings...'
Invoke-AzRetry @(
  'functionapp', 'config', 'appsettings', 'set',
  '--name', $FunctionName,
  '--resource-group', $Rg,
  '--settings',
  "ACS_CONNECTION_STRING=$AcsConn",
  "MAIL_FROM_ADDRESS=$MailFrom",
  "MAIL_TO_ADDRESS=$MailTo",
  "ALLOWED_ORIGIN=$AllowedOrigins",
  'FUNCTIONS_WORKER_RUNTIME=node'
)

Write-Host 'npm ci and zip Function...'
Push-Location $FuncDir
if (-not (Test-Path 'node_modules')) {
  npm ci --omit=dev
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
}
$ZipPath = Join-Path $TempDir 'deploy-func-cc-update.zip'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path 'host.json', 'package.json', 'package-lock.json', 'node_modules', 'SubmitContact' -DestinationPath $ZipPath -Force
Pop-Location

Write-Host 'Zip deploy to Function App (1-2 min)...'
Invoke-AzRetry @('functionapp', 'deployment', 'source', 'config-zip', '--resource-group', $Rg, '--name', $FunctionName, '--src', $ZipPath)

Write-Host 'Updating environment.ts and environment.development.ts...'
$envContent = Get-Content -LiteralPath $EnvTs -Raw
$envContent = $envContent -replace "contactApiUrl:\s*'[^']*'", "contactApiUrl: '$ApiUrl'"
[System.IO.File]::WriteAllText($EnvTs, $envContent, [System.Text.UTF8Encoding]::new($false))
$devContent = Get-Content -LiteralPath $EnvDevTs -Raw
$devContent = $devContent -replace "contactApiUrl:\s*'[^']*'", "contactApiUrl: '$ApiUrl'"
[System.IO.File]::WriteAllText($EnvDevTs, $devContent, [System.Text.UTF8Encoding]::new($false))

Write-Host 'ng build production...'
Push-Location $LandingDir
npx ng build --configuration=production
if ($LASTEXITCODE -ne 0) { throw 'ng build failed' }
Pop-Location

if (-not (Test-Path $DistBrowser)) {
  throw "Build output not found: $DistBrowser"
}

Write-Host 'Uploading to storage static website...'
$storageConn = $null
for ($i = 1; $i -le 8; $i++) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $storageConn = & az storage account show-connection-string --name $StorageName --resource-group $Rg --query connectionString -o tsv 2>$null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -eq 0 -and $storageConn) { break }
  Start-Sleep -Seconds 5
}
if (-not $storageConn) { throw 'Could not read storage connection string.' }
Invoke-AzRetry @(
  'storage', 'blob', 'upload-batch',
  '--connection-string', $storageConn,
  '--destination', '$web',
  '--source', $DistBrowser,
  '--overwrite'
)

Write-Host ''
Write-Host '=== DEPLOY OK ===' -ForegroundColor Green
Write-Host "Static site: $WebEndpoint"
Write-Host "Submit API:  $ApiUrl"
Write-Host "Email to:    $MailTo"
