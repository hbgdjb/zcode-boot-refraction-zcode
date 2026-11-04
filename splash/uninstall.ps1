# Remove the ZCode splash and restore the shortcut it replaced.

$ErrorActionPreference = "Stop"

$install = Join-Path $env:LOCALAPPDATA "ZCodeSplash"
$backup = Join-Path $install "backup"
$desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "ZCode.lnk"

if (Test-Path $backup) {
  $latest = Get-ChildItem $backup -Filter "ZCode.lnk.*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latest) {
    Copy-Item $latest.FullName $desktop -Force
    Write-Host "restored shortcut from $($latest.Name)"
  }
}

Get-Process ZCodeSplash -ErrorAction SilentlyContinue | Stop-Process -Force

if (Test-Path $install) {
  Remove-Item $install -Recurse -Force
  Write-Host "removed $install"
}
