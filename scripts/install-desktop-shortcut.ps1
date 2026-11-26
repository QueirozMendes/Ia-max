param([switch]$Autostart)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$launcher=Join-Path $PSScriptRoot 'start-max.ps1'
$electron=Join-Path $root 'node_modules\electron\dist\electron.exe'
if(!(Test-Path -LiteralPath $electron -PathType Leaf)){throw 'Instale as dependencias desktop primeiro.'}
$shell=New-Object -ComObject WScript.Shell
$destinations=@([Environment]::GetFolderPath('Desktop'))
if($Autostart){$destinations+=[Environment]::GetFolderPath('Startup')}
foreach($destination in $destinations){
    $shortcut=$shell.CreateShortcut((Join-Path $destination 'Max.lnk'))
    $shortcut.TargetPath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $shortcut.Arguments='-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$launcher+'"'
    $shortcut.WorkingDirectory=$root
    $shortcut.IconLocation=$electron+',0'
    $shortcut.Description='Abrir Max e sua personagem flutuante'
    $shortcut.WindowStyle=7
    $shortcut.Save()
    Write-Output ('Atalho criado: '+(Join-Path $destination 'Max.lnk'))
}
