$ErrorActionPreference='Stop'
[Console]::InputEncoding = [Text.Encoding]::UTF8
$request=[Console]::In.ReadToEnd() | ConvertFrom-Json
if (!$request.text -or $request.text.Length -gt 2400) { throw 'Texto inválido' }
Add-Type -AssemblyName System.Speech
$voice=New-Object System.Speech.Synthesis.SpeechSynthesizer
$buffer=New-Object IO.MemoryStream
try {
  $available=$voice.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'pt-BR' }
  $selected=$available | Where-Object { $_.VoiceInfo.Gender -eq 'Female' } | Select-Object -First 1
  if (!$selected) { $selected=$available | Select-Object -First 1 }
  if (!$selected) { throw 'Instale uma voz pt-BR no Windows.' }
  $voice.SelectVoice($selected.VoiceInfo.Name)
  $voice.SetOutputToWaveStream($buffer)
  $voice.Speak([string]$request.text)
  $voice.SetOutputToNull()
  [Console]::Out.Write([Convert]::ToBase64String($buffer.ToArray()))
} finally { $voice.Dispose(); $buffer.Dispose() }
