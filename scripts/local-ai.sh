#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
case "${1:-}" in
  ollama)
    mkdir -p .runtime/ollama-models
    export OLLAMA_MODELS="$PWD/.runtime/ollama-models"
    export OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1
    exec .runtime/ollama/Ollama.app/Contents/Resources/ollama serve
    ;;
  webui)
    mkdir -p .runtime/webui-data
    export UV_CACHE_DIR="$PWD/.runtime/uv-cache"
    export UV_PYTHON_INSTALL_DIR="$PWD/.runtime/python"
    export DATA_DIR="$PWD/.runtime/webui-data"
    export OLLAMA_BASE_URL=http://127.0.0.1:11434
    exec .runtime/uv/uv tool run --python 3.11 --from open-webui==0.7.2 --with sentencepiece==0.2.1 --with cryptography==48.0.1 --with argon2-cffi-bindings==25.1.0 --with opencv-python==4.11.0.86 open-webui serve --host 127.0.0.1 --port 3000
    ;;
  *)
    printf '%s\n' 'Uso: sh scripts/local-ai.sh ollama|webui' >&2
    exit 2
    ;;
esac
