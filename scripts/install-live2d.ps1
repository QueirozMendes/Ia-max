param([Parameter(Mandatory)][string]$Core, [Parameter(Mandatory)][string]$Model)
$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (!(Test-Path -LiteralPath $Core -PathType Leaf) -or !(Test-Path -LiteralPath $Model -PathType Leaf) -or !$Model.EndsWith('.model3.json')) { throw 'Informe Core e modelo model3.json existentes.' }
if (Test-Path .runtime/live2d) { throw 'Live2D já existe; preserve a pasta antes de substituir o modelo.' }
$json = Get-Content -LiteralPath $Model -Raw | ConvertFrom-Json
if (!$json.FileReferences.Moc -or !$json.FileReferences.Textures) { throw 'Modelo incompleto.' }
New-Item -ItemType Directory -Force .runtime/live2d/vendor,.runtime/live2d/model | Out-Null
Copy-Item -LiteralPath $Core .runtime/live2d/vendor/live2dcubismcore.min.js
Copy-Item -Path (Join-Path (Split-Path $Model) '*') -Destination .runtime/live2d/model -Recurse
Copy-Item -LiteralPath $Model .runtime/live2d/model/max.model3.json
npm.cmd install --prefix .runtime/live2d/deps --no-audit --no-fund --save-exact pixi.js@6.5.10 pixi-live2d-display@0.4.0 @pixi/unsafe-eval@6.5.10
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar renderizador.' }
Copy-Item .runtime/live2d/deps/node_modules/pixi.js/dist/browser/pixi.min.js .runtime/live2d/vendor/
Copy-Item .runtime/live2d/deps/node_modules/pixi-live2d-display/dist/cubism4.min.js .runtime/live2d/vendor/
Copy-Item .runtime/live2d/deps/node_modules/@pixi/unsafe-eval/dist/browser/unsafe-eval.min.js .runtime/live2d/vendor/
Write-Output 'Live2D instalado. Reinicie a Max e verifique o avatar.'
