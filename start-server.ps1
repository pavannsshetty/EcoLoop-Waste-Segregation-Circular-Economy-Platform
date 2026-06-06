$serverDir = Join-Path $PSScriptRoot "server"
Write-Host "Starting EcoLoop backend server on port 5003..." -ForegroundColor Green
Set-Location $serverDir
node server.js
