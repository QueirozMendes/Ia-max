# Max

Max é uma assistente pessoal em português brasileiro. Ela conversa, ajuda com programação e estudos, orienta sobre tarefas e pode consultar a web com fontes. O painel roda no navegador e o servidor escuta apenas no próprio computador.

## Windows: abrir com dois cliques

Consulte [Windows e recursos locais](WINDOWS-LOCAL.md). O instalador cria o atalho **Max** na Área de Trabalho. Ele inicia o Core quando necessário e abre o aplicativo com a personagem flutuante.

## Abrir no Mac

Com Node.js 22 ou mais recente, execute na pasta do projeto:

```sh
cp -n .env.example .env
node --env-file-if-exists=.env server.js
```

Abra [127.0.0.1:4173](http://127.0.0.1:4173). A lista de tarefas e a memória podem ser usadas desde já. Para habilitar a conversa e a busca, preencha `OPENAI_API_KEY` no arquivo local `.env` com uma [chave de API](https://platform.openai.com/api-keys) e reinicie o servidor. O uso da API pode gerar cobranças. O nome do criador pode ser alterado em `MAX_OWNER` e o modelo em `OPENAI_MODEL`.

## Usar

- Em **Conversa**, escreva ou use **Ditar** nos navegadores com reconhecimento de voz. **Ouvir** lê a resposta com as vozes instaladas no dispositivo.
- Marque **Web** para permitir que a Max pesquise e mostre as fontes.
- Use **Anexar texto** para compartilhar código, logs ou outros arquivos de texto UTF-8 na próxima mensagem. O limite é de 24.000 caracteres.
- Em **Memória**, salve ou edite o que a Max deve levar em conta nas próximas respostas. Esse recurso usa suas anotações como contexto.
- No chat, escreva **Lembre que** seguido do que você quer guardar. O comando salva a lembrança localmente e funciona sem chave de API.
- Em **Tarefas**, adicione, conclua ou remova itens.
- Use **Organizar meu dia** ou marque **Compartilhar tarefas pendentes** para enviar à API até 50 tarefas abertas na próxima mensagem. A caixa é desmarcada após uma resposta bem-sucedida.

## Dados e acesso

A conversa, a memória e as tarefas ficam no armazenamento do navegador neste computador. Ao enviar uma mensagem, o trecho recente da conversa, a memória e o texto anexado são enviados à API da OpenAI para gerar a resposta. Dependendo do navegador, o ditado também pode usar um serviço remoto de reconhecimento de voz.

O acesso ao painel depende do acesso à sua sessão no computador. Use seu próprio perfil de navegador. Esta versão tem acesso aos arquivos de texto que você escolhe anexar. Controle de outros dispositivos e acompanhamento em segundo plano ficam para integrações futuras.

## Biblioteca de IA

A aba **Biblioteca** reúne os repositórios e documentos indicados para o projeto. Abra o GitHub a partir de cada cartão ou clique em **Perguntar à Max** para anexar o resumo e o link à próxima pergunta. O catálogo inclui referências de estudos, modelos, automação, agentes e interfaces de voz e avatar.

## Conversar com um modelo local

Instale o [llama.cpp](https://github.com/ggml-org/llama.cpp) e obtenha um modelo de conversa no formato GGUF adequado ao seu computador. Inicie o servidor em um terminal:

```sh
llama-server --model /caminho/modelo.gguf --alias local --host 127.0.0.1 --port 8080
```

No arquivo `.env` da Max, configure `MAX_PROVIDER=llama.cpp`, `LLAMA_PORT=8080` e `LLAMA_MODEL=local`. Reinicie a Max. A geração do chat, o contexto da memória e os anexos de texto trafegam entre a Max e o servidor local nesse modo. Para usar a busca Web, selecione `MAX_PROVIDER=openai` e configure a chave. O mecanismo de ditado continua dependendo do navegador.

## Voz e câmera

Ative **Responder em voz alta** para ouvir a resposta pelo alto-falante. Nesse modo, o botão **Ditar** envia a fala reconhecida ao terminar. Permita o microfone quando o navegador solicitar.

Use **Ligar câmera** para abrir a prévia local. No modo OpenAI com chave configurada e um modelo que aceite imagens, **Compartilhar foto** anexa uma imagem da prévia à próxima pergunta. A imagem vai para a API quando a mensagem é enviada. A prévia permanece no dispositivo. A câmera funciona no endereço local ou em HTTPS, conforme permissões do navegador.

## Avatar da Max

O estúdio tem um avatar 2D que pisca, acompanha o ponteiro e reage ao microfone, à preparação da resposta e à reprodução de voz. A boca se move no início da fala e acompanha os eventos de voz que o navegador oferece. **Ouvir saudação** permite experimentar o avatar com a síntese de voz do navegador mesmo sem configurar um modelo.

Em **Corpo inteiro**, escolha o ângulo frontal, de três quartos, de perfil ou de costas. No modo **Automático**, a Max alterna as poses de repouso e volta a olhar para a frente quando escuta ou fala. **Rosto** amplia o enquadramento para destacar o olhar e a boca. As mudanças de ângulo usam poses ilustradas com transição.

**A Max escolhe** deixa a personagem decidir o enquadramento pela interação: corpo inteiro em repouso, gesto no início da fala e aproximação ao escutar, preparar ou continuar uma resposta. Escolha **Corpo inteiro** ou **Rosto** para fixar o enquadramento.

Com a chave OpenAI configurada, o modo OpenAI usa a voz sintética Coral com direção de dublagem em português brasileiro. O texto lido é enviado à API de voz. Sem chave, no modo llama.cpp ou com `MAX_VOICE=browser`, a Max usa as vozes disponíveis no dispositivo. Instalar uma voz brasileira aprimorada nos ajustes do sistema pode melhorar o resultado local.

Ative **Continuar ouvindo** antes de iniciar a conversa por voz para a Max reabrir o microfone ao terminar uma resposta falada. Use **Encerrar conversa por voz** para parar. O modo também para quando você sai da conversa, oculta a aba ou o reconhecimento falha.

## Ollama, Open WebUI e OpenRouter

- **Ollama** executa o modelo no próprio Mac. Com o serviço ativo em `127.0.0.1:11434`, baixe um modelo leve com `ollama pull qwen2.5:0.5b`. Defina `MAX_PROVIDER=ollama` e `OLLAMA_MODEL=qwen2.5:0.5b` no `.env` e reinicie o estúdio. Consulte os [requisitos de macOS](https://docs.ollama.com/macos).
- **Open WebUI** é um painel local separado. Com `uv` instalado, execute `DATA_DIR="$PWD/.runtime/webui-data" OLLAMA_BASE_URL=http://127.0.0.1:11434 uv tool run --python 3.11 --from open-webui open-webui serve --host 127.0.0.1 --port 3000`. Abra [Open WebUI](http://127.0.0.1:3000/) e crie seu usuário local no primeiro acesso. [Guia oficial](https://docs.openwebui.com/getting-started/quick-start/).
- **OpenRouter** funciona pela API. Defina `MAX_PROVIDER=openrouter`, `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` no `.env`. Use o identificador do modelo escolhido no [catálogo do OpenRouter](https://openrouter.ai/models). O contexto da conversa é enviado ao OpenRouter e pode gerar cobranças dependendo do modelo.

Os modos Ollama e OpenRouter usam a voz disponível no dispositivo. A pesquisa web integrada e as fotos da câmera ficam disponíveis no modo OpenAI.

Se as ferramentas já estiverem instaladas dentro de `.runtime`, você pode reiniciá-las em terminais separados com `sh scripts/local-ai.sh ollama` e `sh scripts/local-ai.sh webui`.

Para adicionar o OpenRouter também no Open WebUI, vá para **Admin Settings → Connections**, adicione uma conexão OpenAI compatível com o endereço `https://openrouter.ai/api/v1` e informe sua chave naquela interface. A conexão do Open WebUI é salva na configuração desse painel, enquanto a Max lê o próprio `.env`.

## Programação e Codex

Marque **Programação** para pedir explicações de código, correções ou sugestões de teste. Com `OPENAI_API_KEY` configurada, o controle vira **Codex · OpenAI** e usa o modelo `gpt-5.3-codex` pela API, inclusive quando a conversa normal usa Ollama. O modo Codex envia a pergunta atual, o arquivo que você anexou e a referência selecionada. Ele trabalha com esse conteúdo no painel e não executa comandos. Sem chave, **Programação** usa o modelo atual.
