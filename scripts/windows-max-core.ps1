param(
    [ValidateSet('Install','Start','Stop','Status','Uninstall')]
    [string]$Action = 'Status',
    [switch]$AtBoot
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskName = 'MaxCore'
function Stop-MaxCore {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    # Match the absolute server path written by our own runner, never all Node processes.
    $serverPattern = [regex]::Escape((Join-Path $root 'server.js')) + '(?:"|\s|$)'
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match $serverPattern } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
}
if ($Action -eq 'Install') {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $version = & $node --version
    if ([int]($version.TrimStart('v').Split('.')[0]) -lt 22) { throw 'Instale Node.js 22 ou superior.' }
    if (-not (Test-Path (Join-Path $root '.env'))) { throw 'Configure primeiro o arquivo .env a partir de .env.example.' }
    $runtime = Join-Path $root '.runtime'
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    $runner = Join-Path $PSScriptRoot 'run-max-core.ps1'
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $runner + '" -NodePath "' + $node + '"'
    $taskAction = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument $arguments -WorkingDirectory $root
    $settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    if ($AtBoot) {
        $credential = Get-Credential -UserName $identity -Message 'Conta Windows para iniciar a Max antes do login. A senha e armazenada pelo Agendador de Tarefas, nao pelo projeto.'
        if (-not $credential -or $credential.UserName -ne $identity) { throw 'Use a conta Windows atual.' }
        $trigger = New-ScheduledTaskTrigger -AtStartup
        Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Settings $settings -User $identity -Password $credential.GetNetworkCredential().Password -RunLevel Limited -Force | Out-Null
    } else {
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
        $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
        Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    }
    Start-ScheduledTask -TaskName $taskName
    Write-Output 'Max Core registrado. Use -Action Status para conferir.'
} elseif ($Action -eq 'Start') {
    Start-ScheduledTask -TaskName $taskName
} elseif ($Action -eq 'Stop') {
    Stop-MaxCore
} elseif ($Action -eq 'Uninstall') {
    Stop-MaxCore
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output 'Inicializacao automatica removida. Dados e configuracoes preservados.'
} else {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) { Write-Output 'Max Core ainda nao registrado.'; return }
    $task | Select-Object TaskName, State
    Get-ScheduledTaskInfo -TaskName $taskName | Select-Object LastRunTime, LastTaskResult, NextRunTime
    Write-Output ('Logs: ' + (Join-Path $root '.runtime\logs'))
}
