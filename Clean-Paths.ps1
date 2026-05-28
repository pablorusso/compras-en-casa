<#
.SYNOPSIS
    Filtra un archivo de paths dejando solo los que existen en disco.

.DESCRIPTION
    Lee un archivo donde cada linea es una ruta. Verifica cuales existen
    (carpeta o archivo), descarta las que no, y reescribe el archivo solo
    con las rutas validas. Antes de sobreescribir genera un backup .bak.

.PARAMETER Path
    Ruta al archivo a procesar.

.EXAMPLE
    .\Clean-Paths.ps1 -Path D:\user_path.txt
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Path
)

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "No existe el archivo: $Path"
    exit 1
}

# Lee todas las lineas, ignorando vacias / solo espacios
$lines = Get-Content -LiteralPath $Path

$valid   = [System.Collections.Generic.List[string]]::new()
$invalid = [System.Collections.Generic.List[string]]::new()

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }

    if (Test-Path -LiteralPath $trimmed) {
        $valid.Add($trimmed)
    } else {
        $invalid.Add($trimmed)
    }
}

# Backup del original antes de tocar nada
$backup = "$Path.bak"
Copy-Item -LiteralPath $Path -Destination $backup -Force

# Reescribe el archivo solo con las rutas validas
Set-Content -LiteralPath $Path -Value $valid -Encoding UTF8

Write-Host ""
Write-Host "Validas:   $($valid.Count)"   -ForegroundColor Green
Write-Host "Invalidas: $($invalid.Count)" -ForegroundColor Yellow
if ($invalid.Count -gt 0) {
    Write-Host ""
    Write-Host "Rutas eliminadas:" -ForegroundColor Yellow
    $invalid | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}
Write-Host ""
Write-Host "Backup del original en: $backup" -ForegroundColor Cyan
