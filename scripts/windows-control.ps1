param(
  [Parameter(Mandatory=$true)][ValidateSet('open-app','cursor-nudge')][string]$Action,
  [ValidateSet('notepad','calculator','explorer')][string]$App
)
$ErrorActionPreference = 'Stop'
if ($Action -eq 'open-app') {
  $programs = @{notepad='notepad.exe';calculator='calc.exe';explorer='explorer.exe'}
  if (-not $programs.ContainsKey($App)) { throw 'Aplicativo nao autorizado' }
  Start-Process -FilePath (Join-Path $env:SystemRoot ('System32\' + $programs[$App]))
  Write-Output 'OK'
  exit
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MaxInput {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize,dwTime; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
  public static bool Nudge() {
    LASTINPUTINFO info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(info);
    if (!GetLastInputInfo(ref info) || unchecked((uint)Environment.TickCount-info.dwTime)<20000) return false;
    POINT p;
    if (!GetCursorPos(out p)) return false;
    return SetCursorPos(p.X+8,p.Y);
  }
}
'@
if ([MaxInput]::Nudge()) { Write-Output 'OK' } else { Write-Output 'SKIP' }
