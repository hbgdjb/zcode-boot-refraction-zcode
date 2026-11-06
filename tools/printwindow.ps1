# Capture a window's pixels with PrintWindow(PW_RENDERFULLCONTENT).
# Used to test whether the app can be grabbed while the splash covers it.

param(
  [string]$Process = "ZCode",
  [Parameter(Mandatory = $true)][string]$Out
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out RECT value, int size);
}
"@

$proc = Get-Process -Name $Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw "no window for $Process" }

$hwnd = $proc.MainWindowHandle

# Prefer the DWM frame bounds (excludes the invisible resize border).
$rect = New-Object Win+RECT
$size = [System.Runtime.InteropServices.Marshal]::SizeOf($rect)
[void][Win]::DwmGetWindowAttribute($hwnd, 9, [ref]$rect, $size)
if ($rect.Right -le $rect.Left -or $rect.Bottom -le $rect.Top) {
  [void][Win]::GetWindowRect($hwnd, [ref]$rect)
}

$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [Win]::PrintWindow($hwnd, $hdc, 0x00000002)
$g.ReleaseHdc($hdc)
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ("printwindow={0} size={1}x{2} at {3},{4}" -f $ok, $w, $h, $rect.Left, $rect.Top)
