# Dev da Landing Page (Angular) - acessível na rede (ex.: celular via IPv4)
# Uso: .\run-LP-local.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$lpRoot = Join-Path $scriptDir "..\LandingPage"

if (-not (Test-Path $lpRoot)) {
    Write-Error "Pasta LandingPage nao encontrada: $lpRoot"
    exit 1
}

$packageJson = Join-Path $lpRoot "package.json"
if (-not (Test-Path $packageJson)) {
    Write-Error "package.json nao encontrado em LandingPage."
    exit 1
}

Push-Location $lpRoot
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "Instalando dependencias (npm install)..."
        npm install
    }
    $ipv4 = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -notmatch "^169\." } | Select-Object -First 1).IPAddress
    Write-Host "Iniciando dev server (host 0.0.0.0 para acesso pelo celular)..."
    Write-Host "Acesse no PC: http://localhost:4200"
    if ($ipv4) { Write-Host "No celular (mesma rede): http://${ipv4}:4200" }
    else { Write-Host "No celular: http://<SEU_IP>:4200 (mesma rede Wi-Fi)" }
    npx ng serve --host 0.0.0.0 --port 4200
} finally {
    Pop-Location
}
