# Compile the splash host.
#
# Needs the .NET Framework C# 5 compiler (present on every Windows 10/11 box)
# and the WebView2 managed assemblies. Any installed app that embeds WebView2
# ships them; pass -WebViewDir to point at another copy.

param(
  [string]$WebViewDir = "C:\Program Files (x86)\ASUS\ASUS Member Center",
  [string]$Csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $here "dist"

$core = Join-Path $WebViewDir "Microsoft.Web.WebView2.Core.dll"
$forms = Join-Path $WebViewDir "Microsoft.Web.WebView2.WinForms.dll"
$loader = Join-Path $WebViewDir "runtimes\win-x64\native\WebView2Loader.dll"
foreach ($f in @($Csc, $core, $forms, $loader)) {
  if (-not (Test-Path $f)) { throw "missing: $f" }
}

if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }

& $Csc /nologo /target:winexe /platform:x64 /optimize+ `
  "/out:$dist\ZCodeSplash.exe" `
  "/win32manifest:$here\app.manifest" `
  "/r:System.Windows.Forms.dll" `
  "/r:System.Drawing.dll" `
  "/r:$core" `
  "/r:$forms" `
  "$here\Program.cs"

if ($LASTEXITCODE -ne 0) { throw "csc failed ($LASTEXITCODE)" }

Copy-Item $core $dist -Force
Copy-Item $forms $dist -Force
Copy-Item $loader $dist -Force
Copy-Item (Join-Path $here "splash.html") $dist -Force

Write-Host "built $dist"
