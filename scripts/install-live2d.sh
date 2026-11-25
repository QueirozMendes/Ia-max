#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$#" -ne 2 ]; then
  echo 'Uso: sh scripts/install-live2d.sh /caminho/Core/live2dcubismcore.min.js /caminho/modelo.model3.json' >&2
  exit 1
fi
node --input-type=module - "$1" "$2" <<'JS'
import { resolve, dirname, basename, join } from 'node:path';
import { mkdir, copyFile, cp, access } from 'node:fs/promises';
const core = resolve(process.argv[2]);
const model = resolve(process.argv[3]);
if (!model.endsWith('.model3.json')) throw new Error('Selecione o arquivo model3.json.');
await access(core);
await access(model);
const root = resolve('.runtime/live2d');
await mkdir(join(root, 'vendor'), { recursive: true });
await mkdir(join(root, 'model'), { recursive: true });
await copyFile(core, join(root, 'vendor/live2dcubismcore.min.js'));
await cp(dirname(model), join(root, 'model'), { recursive: true });
if (basename(model) !== 'max.model3.json') await copyFile(model, join(root, 'model/max.model3.json'));
JS
npm install --prefix .runtime/live2d/deps --no-audit --no-fund --save-exact pixi.js@6.5.10 pixi-live2d-display@0.4.0
cp .runtime/live2d/deps/node_modules/pixi.js/dist/browser/pixi.min.js .runtime/live2d/vendor/pixi.min.js
cp .runtime/live2d/deps/node_modules/pixi-live2d-display/dist/cubism4.min.js .runtime/live2d/vendor/cubism4.min.js
echo 'Arquivos instalados. Reinicie a Max e abra a página.'
