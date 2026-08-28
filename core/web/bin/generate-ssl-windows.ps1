$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sslDir = Join-Path $scriptDir "..\bin\ssl"
$sslDir = (Resolve-Path $sslDir).Path

if (-not (Test-Path $sslDir)) {
  New-Item -Path $sslDir -ItemType Directory | Out-Null
}

& openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 `
  -keyout "$sslDir\localhost-windows.key" `
  -out "$sslDir\localhost-windows.crt" `
  -subj "/CN=tgmc-portfolio.dev" `
  -addext "subjectAltName=DNS:localhost,DNS:tgmc-portfolio.dev,DNS:www.tgmc-portfolio.dev,DNS:tgmc-portfolio.local,DNS:www.tgmc-portfolio.local,IP:127.0.0.1,IP:::1"

Copy-Item "$sslDir\localhost-windows.key" "$sslDir\localhost.key" -Force
Copy-Item "$sslDir\localhost-windows.crt" "$sslDir\localhost.crt" -Force

Write-Host "Generated:"
Write-Host "  $sslDir\localhost-windows.key"
Write-Host "  $sslDir\localhost-windows.crt"
Write-Host "  $sslDir\localhost.key"
Write-Host "  $sslDir\localhost.crt"
