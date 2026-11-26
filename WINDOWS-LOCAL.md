# Windows e recursos locais

Com o projeto e as dependências já instalados, execute `scripts/install-desktop-shortcut.ps1` para criar **Max** na Área de Trabalho. Abra esse atalho com dois cliques. Ele aponta para `scripts/start-max.ps1`, inicia o Core local quando necessário e abre o Electron com `--companion`. Não é um executável portátil independente: mantenha a pasta do projeto e `node_modules` instalados.

Para instalar as dependências básicas em uma nova máquina Windows com Node 22+ e Python 3.13, use `scripts/setup-windows.ps1`. A opção `-Autostart` configura o Core e o atalho de inicialização; `-Launch` abre a Max. O instalador preserva um `.env` já existente. Ele instala a transcrição Whisper base; não instala automaticamente todos os modelos opcionais abaixo.

## Recursos incluídos no código

- Conversa com Ollama, Whisper local e resposta falada automática, sem preencher o rascunho.
- Voz Windows gratuita e suporte a Kokoro ONNX local, além dos provedores externos opcionais.
- Live2D Epsilon, sincronização labial, expressões por emojis e gestos compartilhados com a personagem flutuante. Emojis e rubricas de gestos são omitidos da voz.
- Captura do microfone, áudio do PC por loopback no Windows, câmera e observação de tela com controles visíveis por sessão.
- Visão local com `moondream:1.8b` no Ollama, executada na CPU para deixar a GPU disponível à conversa.
- Developer local e correção de execução do Codex CLI; ferramentas Replica opcionais em `.runtime/replica-tools`.
- Estudos de documentação pública durante ociosidade, com resumo local e notas separadas das memórias pessoais. Não é treinamento do modelo nem consciência.
- Acesso privado opcional por Tailscale Serve com autenticação, sem Funnel.

O avatar flutuante usa composição por software para contornar falhas gráficas observadas no Windows. Permanece sobre aplicativos sem tomar o foco. **Ctrl+Shift+A** restaura a personagem; **Ctrl+Shift+M** revoga sensores e controle da sessão. As áreas de trabalho virtuais do Windows e tela cheia exclusiva têm limitações; não há garantia de sobreposição nesses contextos.

## Configuração e arquivos que ficam na máquina

`.env`, `.runtime`, memórias, conversas, credenciais, modelos baixados, dependências e logs não são publicados no Git. Uma cópia nova do repositório não inclui esses arquivos. Preserve-os ao atualizar. Nunca substitua sua configuração local pela de outra máquina.

A voz Windows pode ser selecionada com `MAX_VOICE=windows`. O Kokoro usa `MAX_VOICE=kokoro` e depende do ambiente Python `.runtime/voice`, dos arquivos `kokoro-v1.0.onnx`, `voices-v1.0.bin` e `ready.json` em `.runtime/kokoro`; o worker está em `scripts/speak-kokoro.py`. Esses modelos opcionais não são provisionados pelo instalador básico.

Live2D depende do Core Cubism e dos arquivos do modelo obtidos de fontes oficiais, com os respectivos termos aceitos. `scripts/install-live2d.ps1 -Core <arquivo> -Model <modelo.model3.json>` instala os arquivos fornecidos e o renderizador local. Não sobrescreve uma instalação Live2D existente. Os arquivos de modelo e Core não são redistribuídos neste commit.

A análise de câmera, tela e áudio só recebe os dados efetivamente capturados pelos controles ativos. Uma prévia de câmera não significa análise contínua. O controle do Windows continua limitado às ações implementadas e às confirmações existentes; não há controle geral de qualquer aplicativo, conta ou operação. Não foram criadas as poses específicas de braços cruzados ou mão tocando o cabelo.

## Verificação

Use `npm test` e `npm run check`. Os testes cobrem roteamento local, permissões, estado, audição, proteção contra realimentação, expressões e recuperação da janela flutuante. O funcionamento dos modelos opcionais exige validação na máquina em que estiverem instalados.
