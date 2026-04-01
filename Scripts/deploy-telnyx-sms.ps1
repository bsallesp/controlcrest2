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

function Invoke-KuduZipDeploy {
  param(
    [Parameter(Mandatory)][string] $ResourceGroup,
    [Parameter(Mandatory)][string] $FunctionName,
    [Parameter(Mandatory)][string] $ZipPath
  )

  $creds = & az functionapp deployment list-publishing-credentials --name $FunctionName --resource-group $ResourceGroup -o json | ConvertFrom-Json
  if (-not $creds.publishingUserName -or -not $creds.publishingPassword) {
    throw 'Could not retrieve publishing credentials for Kudu deploy.'
  }

  $pair = '{0}:{1}' -f $creds.publishingUserName, $creds.publishingPassword
  $basicAuth = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))
  $headers = @{ Authorization = "Basic $basicAuth" }

  $response = Invoke-WebRequest 
    -Uri "https://$FunctionName.scm.azurewebsites.net/api/zipdeploy" 
    -Method Post 
    -Headers $headers 
    -InFile $ZipPath 
    -ContentType 'application/zip' 
    -MaximumRedirection 0

  if ($response.StatusCode -notin 200, 202) {
    throw "Kudu zipdeploy failed with status $($response.StatusCode)"
  }

  $statusUrl = $response.Headers.Location
  if (-not $statusUrl) {
    Start-Sleep -Seconds 10
    return
  }

  for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 5
    $status = Invoke-RestMethod -Uri $statusUrl -Headers $headers -Method Get
    if ($status.status -eq 4) { return }
    if ($status.status -eq 3) {
      throw "Kudu deployment failed: $($status.status_text)"
    }
  }

  throw 'Kudu deployment did not complete in time.'
}

$SubscriptionId = '39b8497a-8d94-42aa-b43a-ae9ac3ae9932'
$Rg = 'rg-comm-prod'
$Location = 'eastus'
$VaultName = 'kv-comm-t40hq9'
$SecretApiKey = 'telnyx-api-key'
$SecretFromNumber = 'telnyx-from-number'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$FuncDir = Join-Path $RepoRoot 'AzureFunctions\TelnyxSms'
$TempDir = Join-Path $RepoRoot 'temp'
$StageDir = Join-Path $TempDir 'telnyx-sms-package'

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host 'Setting subscription...'
Invoke-AzRetry @('account', 'set', '--subscription', $SubscriptionId)

$storageName = $null
$functionName = $null
$existingStorage = & az storage account list -g $Rg --query "[?starts_with(name, 'stcommsms')].name | [0]" -o tsv 2>$null
if ($LASTEXITCODE -eq 0 -and $existingStorage) {
  $storageName = $existingStorage.Trim()
}
$existingFunction = & az functionapp list -g $Rg --query "[?starts_with(name, 'func-comm-telnyx')].name | [0]" -o tsv 2>$null
if ($LASTEXITCODE -eq 0 -and $existingFunction) {
  $functionName = $existingFunction.Trim()
}

if (-not $storageName) {
  $storageName = ('stcommsms' + ((1..14 | ForEach-Object { Get-Random -Maximum 10 }) -join '')).ToLowerInvariant().Substring(0,22)
  Write-Host "Creating storage account $storageName..."
  Invoke-AzRetry @('storage', 'account', 'create', '--name', $storageName, '--resource-group', $Rg, '--location', $Location, '--sku', 'Standard_LRS', '--kind', 'StorageV2')
}

if (-not $functionName) {
  $functionName = 'func-comm-telnyx-' + (-join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ }))
  Write-Host "Creating Function App $functionName..."
  Invoke-AzRetry @(
    'functionapp', 'create',
    '--name', $functionName,
    '--resource-group', $Rg,
    '--storage-account', $storageName,
    '--consumption-plan-location', $Location,
    '--functions-version', '4',
    '--runtime', 'node',
    '--runtime-version', '20'
  )
}

$fromNumber = $null
$legacyEnv = 'C:\Users\bsall\OneDrive\Área de Trabalho\Projects\ControlCrest_OLD\.env'
if (Test-Path $legacyEnv) {
  $line = Get-Content $legacyEnv | Where-Object { $_ -match '^\s*Telnyx__FromNumber=(.+)$' } | Select-Object -First 1
  if ($line) {
    $fromNumber = ($line -replace '^\s*Telnyx__FromNumber=','').Trim()
  }
}
if (-not $fromNumber) { throw 'Telnyx__FromNumber not found in legacy .env' }

Write-Host 'Ensuring Key Vault secrets exist...'
Invoke-AzRetry @('keyvault', 'secret', 'set', '--vault-name', $VaultName, '--name', $SecretFromNumber, '--value', $fromNumber)

$apiKey = & az keyvault secret show --vault-name $VaultName --name $SecretApiKey --query value -o tsv
$fromNumber = & az keyvault secret show --vault-name $VaultName --name $SecretFromNumber --query value -o tsv
if (-not $apiKey -or -not $fromNumber) { throw 'Could not resolve Telnyx secrets from Key Vault.' }

Write-Host 'Enabling managed identity...'
$principalId = & az functionapp identity assign --name $functionName --resource-group $Rg --query principalId -o tsv
if (-not $principalId) { throw 'Could not enable managed identity on Function App.' }

Write-Host 'Granting Key Vault access to the Function App...'
Invoke-AzRetry @('keyvault', 'set-policy', '--name', $VaultName, '--object-id', $principalId, '--secret-permissions', 'get', 'list')

Write-Host 'Running tests...'
Push-Location $FuncDir
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }

$generatedConfigPath = Join-Path $StageDir 'SendSms\generated-config.json'
$generatedConfig = @{
  ALLOWED_ORIGIN = '*'
  TELNYX_API_KEY = $apiKey
  TELNYX_FROM_NUMBER = $fromNumber
} | ConvertTo-Json -Depth 5

$ZipPath = Join-Path $TempDir 'deploy-func-telnyx-sms.zip'
if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $StageDir 'SendSms') | Out-Null
Copy-Item -Path 'host.json', 'package.json' -Destination $StageDir
Copy-Item -Path 'SendSms\*' -Destination (Join-Path $StageDir 'SendSms') -Recurse -Force
[System.IO.File]::WriteAllText($generatedConfigPath, $generatedConfig, [System.Text.UTF8Encoding]::new($false))

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Push-Location $StageDir
Compress-Archive -Path 'host.json', 'package.json', 'SendSms' -DestinationPath $ZipPath -Force
Pop-Location

Write-Host 'Zip deploying Function App...'
$previousEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$null = & az functionapp deployment source config-zip --resource-group $Rg --name $functionName --src $ZipPath 2>&1
$zipExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousEap
if ($zipExitCode -ne 0) {
  Write-Warning 'Azure CLI config-zip failed; falling back to Kudu zipdeploy.'
  Invoke-KuduZipDeploy -ResourceGroup $Rg -FunctionName $functionName -ZipPath $ZipPath
}
Pop-Location

$apiUrl = "https://$functionName.azurewebsites.net/api/send-sms"
Write-Host ''
Write-Host '=== DEPLOY OK ===' -ForegroundColor Green
Write-Host "Function App: $functionName"
Write-Host "Storage:      $storageName"
Write-Host "Endpoint:     $apiUrl"