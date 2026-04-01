# Chama setup-github-actions-azure.sh via Git Bash (OIDC Azure + gh secret set).
# Opcional: $env:REPO = 'owner/repo'
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bash = 'C:\Program Files\Git\bin\bash.exe'
if (-not (Test-Path $bash)) { throw 'Git Bash nao encontrado (instale Git for Windows).' }
$sh = Join-Path $RepoRoot 'Scripts\setup-github-actions-azure.sh'
if ($env:REPO) {
  & $bash -lc "cd `"$($RepoRoot -replace '\\','/')`" && chmod +x `"$($sh -replace '\\','/')`" && REPO=$env:REPO ./Scripts/setup-github-actions-azure.sh"
} else {
  & $bash -lc "cd `"$($RepoRoot -replace '\\','/')`" && chmod +x `"$($sh -replace '\\','/')`" && ./Scripts/setup-github-actions-azure.sh"
}
