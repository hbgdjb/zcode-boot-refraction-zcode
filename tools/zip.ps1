param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Source)) { throw "missing source: $Source" }
if (Test-Path $Destination) { Remove-Item $Destination -Force }

Compress-Archive -Path $Source -DestinationPath $Destination -CompressionLevel Optimal
Write-Output ("zipped {0} -> {1}" -f $Source, $Destination)
