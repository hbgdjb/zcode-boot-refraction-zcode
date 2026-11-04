# Install the ZCode splash.
#
# Copies the host to %LOCALAPPDATA%\ZCodeSplash, then points the desktop
# shortcut at it after backing the original up. The Start Menu shortcut is
# left alone unless -StartMenu is passed.

param(
  [switch]$StartMenu,
  [string]$DesktopShortcut = ""
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
# Works both in the repo (payload in dist\) and in the packaged zip (payload
# sits beside this script).
$dist = if (Test-Path (Join-Path $here "ZCodeSplash.exe")) { $here } else { Join-Path $here "dist" }
$exe = Join-Path $dist "ZCodeSplash.exe"
if (-not (Test-Path $exe)) { throw "build first: powershell -File splash\build.ps1" }

$install = Join-Path $env:LOCALAPPDATA "ZCodeSplash"
$backup = Join-Path $install "backup"
if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Path $backup -Force | Out-Null }

# Copy the host beside its page; leave the WebView2 profile alone.
Get-ChildItem $dist -File | Where-Object {
  $_.Name -match '^(ZCodeSplash\.exe|splash\.html|Microsoft\.Web\.WebView2\..*\.dll|WebView2Loader\.dll)$'
} | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $install $_.Name) -Force
}

$app = Join-Path $env:USERPROFILE "ZCode\ZCode.exe"
$splash = Join-Path $install "ZCodeSplash.exe"

function Repoint([string]$path) {
  if (-not (Test-Path $path)) { return $false }
  $shell = New-Object -ComObject WScript.Shell
  $current = $shell.CreateShortcut($path)
  if ($current.TargetPath -eq $splash) { Write-Host "already points at the splash: $path"; return $true }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $path (Join-Path $backup ("ZCode.lnk." + $stamp)) -Force

  $link = $shell.CreateShortcut($path)
  $link.TargetPath = $splash
  $link.WorkingDirectory = $install
  $link.IconLocation = "$app,0"
  $link.Description = "ZCode"
  $link.Save()
  Write-Host "repointed $path (backup in $backup)"
  return $true
}

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not $DesktopShortcut) { $DesktopShortcut = Join-Path $desktop "ZCode.lnk" }

if (Repoint $DesktopShortcut) {
  Write-Host "desktop shortcut ready"
} else {
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut($DesktopShortcut)
  $link.TargetPath = $splash
  $link.WorkingDirectory = $install
  $link.IconLocation = "$app,0"
  $link.Description = "ZCode"
  $link.Save()
  Write-Host "created $DesktopShortcut"
}

if ($StartMenu) {
  $menu = Join-Path ([Environment]::GetFolderPath("Programs")) "ZCode.lnk"
  Repoint $menu | Out-Null
}

Write-Host ""
Write-Host "installed: $install"
Write-Host "launch through the ZCode shortcut to see the film."
