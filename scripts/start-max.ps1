$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
try {
    $electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
    if (!(Test-Path -LiteralPath $electron -PathType Leaf)) { throw 'Dependencias desktop ausentes. Execute a instalacao do projeto.' }
    $port = 4173
    $envFile = Join-Path $root '.env'
    if (Test-Path -LiteralPath $envFile) {
        $portLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*PORT\s*=\s*["'']?(\d+)' } | Select-Object -Last 1
        if ($portLine -match '^\s*PORT\s*=\s*["'']?(\d+)') { $port = [int]$Matches[1] }
    }
    function Test-Core {
        $client = [System.Net.Sockets.TcpClient]::new()
        try { $pending = $client.ConnectAsync('127.0.0.1', $port); return ($pending.Wait(500) -and $client.Connected) } catch { return $false } finally { $client.Dispose() }
    }
    if (!(Test-Core)) {
        $task = Get-ScheduledTask -TaskName 'MaxCore' -ErrorAction SilentlyContinue
        if ($task) { Start-ScheduledTask -TaskName 'MaxCore' }
        else {
            $node = (Get-Command node.exe -ErrorAction Stop).Source
            $runner = Join-Path $PSScriptRoot 'run-max-core.ps1'
            $arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $runner + '" -NodePath "' + $node + '"'
            Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden
        }
        for ($attempt = 0; $attempt -lt 30 -and !(Test-Core); $attempt++) { Start-Sleep -Milliseconds 500 }
        if (!(Test-Core)) { throw 'O servico local nao iniciou. Consulte os logs em .runtime\logs.' }
    }
    Start-Process -FilePath $electron -ArgumentList ('"' + $root + '" --companion') -WorkingDirectory $root -WindowStyle Normal
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(('Nao foi possivel abrir a Max. ' + $_.Exception.Message), 'Max') | Out-Null
    exit 1
}
