# Run this if deploy-landing-azure.ps1 stopped mid-way (network/CLI errors).
# Fills: Function app settings (ACS email), zip-deploys SubmitContact, production build, uploads $web.
# Defaults match the first successful RG provisioning (edit if yours differ).

param(
  [string] $ResourceGroup = 'rg-control-crest-prod',
  [string] $StorageAccount = 'stcce78f20af4fb',
  [string] $FunctionApp = 'func-cc-5c7775b3cf',
  [string] $AcsResourceGroup = 'thelaserspace-prod',
  [string] $AcsName = 'thelaser-comm',
  [string] $MailTo = 'bsallesp@gmail.com',
  [string] $MailFrom = 'DoNotReply@49056c6a-2022-4812-8cdd-a9617428d269.azurecomm.net'
)

$ErrorActionPreference = 'Stop'

function Invoke-Az { param([string[]]$Args); & az @Args; if ($LASTEXITCODE -ne 0) { throw "az failed: az $($Args -join ' ')" } }

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LandingDir = Join-Path $RepoRoot 'LandingPage'
$FuncDir = Join-Path $RepoRoot 'AzureFunctions\SubmitContact'
$TempDir = Join-Path $RepoRoot 'temp'
$EnvTs = Join-Path $LandingDir 'src\environments\environment.ts'
$DistBrowser = Join-Path $LandingDir 'dist\landing-page-ng\browser'
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$WebOrigin = (az storage account show --name $StorageAccount --resource-group $ResourceGroup --query 'primaryEndpoints.web' -o tsv).TrimEnd('/')
Write-Host "Static origin (CORS): $WebOrigin"

$AcsConn = az communication list-key --name $AcsName --resource-group $AcsResourceGroup --query 'primaryConnectionString' -o tsv
if (-not $AcsConn) { throw 'Could not read ACS connection string.' }

Write-Host 'Applying Function app settings...'
Invoke-Az @(
  'functionapp', 'config', 'appsettings', 'set',
  '--name', $FunctionApp,
  '--resource-group', $ResourceGroup,
  '--settings',
  "ACS_CONNECTION_STRING=$AcsConn",
  "MAIL_FROM_ADDRESS=$MailFrom",
  "MAIL_TO_ADDRESS=$MailTo",
  "ALLOWED_ORIGIN=$WebOrigin",
  'FUNCTIONS_WORKER_RUNTIME=node'
)

Write-Host 'Packaging function...'
Push-Location $FuncDir
if (-not (Test-Path 'node_modules')) { npm ci --omit=dev }
$ZipPath = Join-Path $TempDir 'deploy-func-cc.zip'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path 'host.json', 'package.json', 'package-lock.json', 'node_modules', 'SubmitContact' -DestinationPath $ZipPath -Force
Pop-Location

Write-Host 'Zip deploy...'
Invoke-Az @('functionapp', 'deployment', 'source', 'config-zip', '--resource-group', $ResourceGroup, '--name', $FunctionApp, '--src', $ZipPath)

$ApiUrl = "https://$FunctionApp.azurewebsites.net/api/submit-contact"
Write-Host "Patching environment.ts -> $ApiUrl"
$envContent = Get-Content -LiteralPath $EnvTs -Raw
$envContent = $envContent -replace 'https://PLACEHOLDER\.azurewebsites\.net/api/submit-contact', $ApiUrl
[System.IO.File]::WriteAllText($EnvTs, $envContent, [System.Text.UTF8Encoding]::new($false))

Write-Host 'ng build production...'
Push-Location $LandingDir
npx ng build --configuration=production
Pop-Location

$storageConn = az storage account show-connection-string --name $StorageAccount --resource-group $ResourceGroup --query connectionString -o tsv
Invoke-Az @('storage', 'blob', 'upload-batch', '--connection-string', $storageConn, '--destination', '$web', '--source', $DistBrowser, '--overwrite')

Write-Host 'Done. Site:' (az storage account show -n $StorageAccount -g $ResourceGroup --query primaryEndpoints.web -o tsv)
Write-Host 'API:' $ApiUrl
