param([Parameter(Mandatory=$true)][string]$NodePath)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$logs = Join-Path $root '.runtime\logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
foreach ($name in @('max-core.out.log','max-core.err.log')) {
    $file = Join-Path $logs $name
    if ((Test-Path $file) -and (Get-Item $file).Length -gt 5MB) {
        Move-Item $file ($file + '.previous') -Force
    }
}
# Run synchronously so Task Scheduler can observe process exit and restart on failure.
$ErrorActionPreference = 'Continue'
& $NodePath '--env-file-if-exists=.env' 'server.js' 1>> (Join-Path $logs 'max-core.out.log') 2>> (Join-Path $logs 'max-core.err.log')
$code = $LASTEXITCODE
if ($code -eq 0) { exit 1 }
exit $code
