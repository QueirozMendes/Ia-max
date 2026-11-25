# Max Local Brain
Perfil inicial para Windows, Xeon, 28 GB RAM, GPU NVIDIA com 8 GB VRAM e SSD de 1 TB. Os parâmetros são pontos de partida, não resultados de benchmark.

Instale Ollama pelo site oficial https://ollama.com/download/windows e mantenha o serviço em loopback (127.0.0.1:11434). Não exponha a porta na rede. Desabilite serviços cloud do Ollama nas configurações locais, se disponíveis na sua versão.

No PowerShell:
```powershell
ollama pull qwen3:8b
ollama pull qwen3:4b
ollama list
ollama ps
```

O download exige internet. O uso local dos pesos baixados não exige API paga. Confirme os termos de licença dos modelos. Configure o .env existente sem substituir chaves ou memórias:
```dotenv
MAX_PROVIDER=auto
MAX_ALLOW_CLOUD=false
OLLAMA_MODEL=qwen3:8b
OLLAMA_FALLBACK_MODEL=qwen3:4b
MAX_LOCAL_CONTEXT=4096
MAX_LOCAL_THREADS=8
MAX_LOCAL_KEEP_ALIVE=120
MAX_LOCAL_MAX_TOKENS=1024
```

Inicie o Core com npm start. A tela inicial e GET /api/local-brain mostram se o Ollama responde e se o modelo está instalado. O modelo de 4B é usado se o de 8B não estiver instalado; não há fallback pago. Para priorizar 4B enquanto joga, altere OLLAMA_MODEL e reinicie o Core. Uma conversa local de cada vez evita duplicar a carga. O contexto e a saída têm limites; conversas longas podem perder contexto. A permanência de 120 segundos permite descarregar o modelo depois de inatividade. Confirme com ollama ps e o Gerenciador de Tarefas. O próximo Resource Manager deverá automatizar o controle de carga; este módulo não detecta jogos ou temperatura.

Não há instalação automática de modelos, alteração de drivers ou garantia de execução integral na GPU. Teste em português, meça latência, VRAM, RAM e temperatura e reduza contexto ou use 4B se necessário. Voz e transcrição ainda possuem configurações independentes e podem consumir APIs externas.
