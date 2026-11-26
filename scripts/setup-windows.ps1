param([switch]$Autostart, [switch]$Launch)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root
function Run([scriptblock]$Command) { & $Command; if ($LASTEXITCODE -ne 0) { throw 'Etapa de instalação falhou; confira a saída acima.' } }
if ([int]((& node --version).TrimStart('v').Split('.')[0]) -lt 22) { throw 'Node 22+ necessário.' }
if (!(Test-Path .env)) { Copy-Item .env.example .env }
Run { npm.cmd install --include=dev --no-audit --no-fund }
Run { node node_modules/electron/install.js }
$python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'
if (!(Test-Path $python)) { throw 'Python 3.13 não encontrado. Instale Python e execute novamente.' }
if (!(Test-Path .runtime/hearing/Scripts/python.exe)) { Run { & $python -m venv .runtime/hearing } }
$hearing = Join-Path $root '.runtime/hearing/Scripts/python.exe'
Run { & $hearing -m pip install 'faster-whisper==1.2.1' 'av==16.0.1' }
Run { & $hearing -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-base', local_dir='.runtime/whisper-base')" }
Run { npm.cmd test }
Run { npm.cmd run check }
if ($Autostart) {
  Run { & (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -NoProfile -File (Join-Path $PSScriptRoot 'windows-max-core.ps1') -Action Install }
  & (Join-Path $PSScriptRoot 'install-desktop-shortcut.ps1') -Autostart
} else {
  & (Join-Path $PSScriptRoot 'install-desktop-shortcut.ps1')
}
if ($Launch) { & (Join-Path $PSScriptRoot 'start-max.ps1') }
Write-Output 'Dependências e testes concluídos. Microfone, câmera e tela não foram ativados.'
