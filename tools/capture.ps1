# Capture the primary display at true pixel size.
#
# PowerShell is DPI-unaware by default: on a scaled display it reports a
# virtualised size and captures only the top-left crop, which makes centered
# content look off-center. Set DPI awareness before measuring.

param([Parameter(Mandatory = $true)][string]$Out)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Dpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Dpi]::SetProcessDPIAware() | Out-Null

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output ("captured {0}x{1} -> {2}" -f $bounds.Width, $bounds.Height, $Out)
