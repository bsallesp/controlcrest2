# Deploy Control Crest landing (Angular static site + Node Function for contact form email).
# Prerequisites: az login, Node.js, npm.
# ACS connection string is read at deploy time (not stored in the repo).
#
# Email stack (subscription 39b8497a-..., RG thelaserspace-prod):
#   - Email Communication Service: thelaser-email — Azure Managed Domain (Mail From domain).
#   - Azure Communication Services: thelaser-comm — connection string for @azure/communication-email SDK.

$ErrorActionPreference = 'Stop'

function Invoke-Az {
  param([Parameter(Mandatory)][string[]] $Args)
  & az @Args
  if ($LASTEXITCODE -ne 0) {
    throw "az failed (exit $LASTEXITCODE): az $($Args -join ' ')"
  }
}

$SubscriptionId = '39b8497a-8d94-42aa-b43a-ae9ac3ae9932'
$Location = 'eastus2'
$Rg = 'rg-control-crest-prod'
$AcsRg = 'thelaserspace-prod'
$AcsName = 'thelaser-comm'
$MailTo = 'bsallesp@gmail.com'
$MailFromDomain = '49056c6a-2022-4812-8cdd-a9617428d269.azurecomm.net'
$MailFrom = "DoNotReply@$MailFromDomain"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LandingDir = Join-Path $RepoRoot 'LandingPage'
$FuncDir = Join-Path $RepoRoot 'AzureFunctions\SubmitContact'
$TempDir = Join-Path $RepoRoot 'temp'
$EnvTs = Join-Path $LandingDir 'src\environments\environment.ts'
$EnvDevTs = Join-Path $LandingDir 'src\environments\environment.development.ts'
$DistBrowser = Join-Path $LandingDir 'dist\landing-page-ng\browser'

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host 'Setting subscription...'
Invoke-Az @('account', 'set', '--subscription', $SubscriptionId)

Write-Host "Ensuring resource group $Rg ($Location)..."
Invoke-Az @('group', 'create', '--name', $Rg, '--location', $Location)

$StorageName = 'stcc' + [guid]::NewGuid().ToString('N').Substring(0, 11)
Write-Host "Creating storage account $StorageName (with retries)..."
$created = $false
for ($i = 1; $i -le 5; $i++) {
  try {
    Invoke-Az @(
      'storage', 'account', 'create',
      '--name', $StorageName,
      '--resource-group', $Rg,
      '--location', $Location,
      '--sku', 'Standard_LRS',
      '--kind', 'StorageV2'
    )
    $created = $true
    break
  } catch {
    Write-Warning "Attempt $i failed: $_"
    if ($i -eq 5) { throw }
    Start-Sleep -Seconds (8 * $i)
  }
}
if (-not $created) { throw 'Storage account was not created.' }

Write-Host 'Enabling static website ($web)...'
Invoke-Az @(
  'storage', 'blob', 'service-properties', 'update',
  '--account-name', $StorageName,
  '--auth-mode', 'login',
  '--static-website',
  '--index-document', 'index.html',
  '--404-document', 'index.html'
)

$WebEndpoint = az storage account show --name $StorageName --resource-group $Rg --query 'primaryEndpoints.web' -o tsv
if (-not $WebEndpoint) { throw 'Could not read static website endpoint.' }
$WebOrigin = $WebEndpoint.TrimEnd('/')

$FunctionName = 'func-cc-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
Write-Host "Creating Function App $FunctionName..."
Invoke-Az @(
  'functionapp', 'create',
  '--name', $FunctionName,
  '--resource-group', $Rg,
  '--consumption-plan-location', $Location,
  '--runtime', 'node',
  '--runtime-version', '24',
  '--functions-version', '4',
  '--storage-account', $StorageName,
  '--os-type', 'Linux'
)

Write-Host 'Waiting for Function App to finish provisioning...'
Start-Sleep -Seconds 20

Write-Host 'Fetching ACS connection string...'
$AcsConn = az communication list-key --name $AcsName --resource-group $AcsRg --query 'primaryConnectionString' -o tsv
if (-not $AcsConn) { throw 'Could not read ACS connection string.' }

$AllowedOrigins = "$WebOrigin,http://localhost:4200,http://127.0.0.1:4200"
Write-Host 'Configuring Function app settings...'
# Values may contain ';' — pass each setting as its own argument
Invoke-Az @(
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

Write-Host 'Packaging and deploying Function (zip)...'
Push-Location $FuncDir
if (-not (Test-Path 'node_modules')) {
  npm ci --omit=dev
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed in AzureFunctions/SubmitContact' }
}
$ZipPath = Join-Path $TempDir 'deploy-func-cc.zip'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path 'host.json', 'package.json', 'package-lock.json', 'node_modules', 'SubmitContact' -DestinationPath $ZipPath -Force
Pop-Location

Invoke-Az @('functionapp', 'deployment', 'source', 'config-zip', '--resource-group', $Rg, '--name', $FunctionName, '--src', $ZipPath)

$ApiUrl = "https://$FunctionName.azurewebsites.net/api/submit-contact"
Write-Host "Updating environment.ts contactApiUrl -> $ApiUrl"
$envContent = Get-Content -LiteralPath $EnvTs -Raw
if ($envContent -match 'PLACEHOLDER') {
  $envContent = $envContent -replace 'https://PLACEHOLDER\.azurewebsites\.net/api/submit-contact', $ApiUrl
  [System.IO.File]::WriteAllText($EnvTs, $envContent, [System.Text.UTF8Encoding]::new($false))
} else {
  Write-Warning 'environment.ts has no PLACEHOLDER URL; set contactApiUrl manually to:'
  Write-Warning $ApiUrl
}

Write-Host "Updating environment.development.ts contactApiUrl -> $ApiUrl (same Function; local ng serve sends via thelaser-email)"
$devContent = Get-Content -LiteralPath $EnvDevTs -Raw
$devContent = $devContent -replace "contactApiUrl:\s*'[^']*'", "contactApiUrl: '$ApiUrl'"
[System.IO.File]::WriteAllText($EnvDevTs, $devContent, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Building Angular (production)...'
Push-Location $LandingDir
npx ng build --configuration=production
if ($LASTEXITCODE -ne 0) { throw 'ng build failed' }
Pop-Location

if (-not (Test-Path $DistBrowser)) {
  throw "Build output not found: $DistBrowser"
}

Write-Host 'Uploading static site to `$web`...'
$storageConn = az storage account show-connection-string --name $StorageName --resource-group $Rg --query connectionString -o tsv
if (-not $storageConn) {
  throw 'Could not read storage connection string for blob upload.'
}
Invoke-Az @(
  'storage', 'blob', 'upload-batch',
  '--connection-string', $storageConn,
  '--destination', '$web',
  '--source', $DistBrowser,
  '--overwrite'
)

Write-Host ''
Write-Host '=== Deploy finished ===' -ForegroundColor Green
Write-Host "Resource group:  $Rg"
Write-Host "Storage account: $StorageName"
Write-Host "Static site URL: $WebEndpoint"
Write-Host "Function app:    https://$FunctionName.azurewebsites.net"
Write-Host "Submit API:      $ApiUrl"
Write-Host "Email to:        $MailTo (from $MailFrom)"
Write-Host ''
Write-Host 'Email uses Email Service thelaser-email (managed domain) + ACS thelaser-comm. If send fails, verify Mail From in portal.'
Write-Host 'CORS allows static site + localhost:4200 for ng serve.'
