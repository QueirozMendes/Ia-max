# Max: presença e autonomia no desktop

Windows é o host principal. O Core permanece privado e o cliente desktop roda na sessão interativa do usuário, separado da tarefa de inicialização. A captura de tela e áudio e os controles de entrada devem ocorrer somente nessa sessão.

## Camadas
1. Cliente desktop: janela principal, avatar flutuante, bandeja, botão de pausa global e indicadores de microfone/tela.
2. Observação: captura explícita da tela/janela, amostragem adaptativa, pausa em bloqueio de sessão, seleção de monitor e exclusão de aplicativos sensíveis. Não persistir capturas por padrão. Envio a provedores remotos somente após consentimento específico.
3. Audição: microfone opt-in, detecção de voz, interrupção da fala, prevenção de eco da própria Max e descarte do áudio ambiente não utilizado.
4. Iniciativa: política lib/initiative.js, estado da interação, modelo decide se há algo útil ou divertido a dizer, resposta curta e voz ElevenLabs. Limites ajustáveis, silêncio imediato sob pedido e no máximo duas chamadas sem resposta.
5. Ações: ferramentas restritas à sessão local. Mover cursor de brincadeira somente quando o usuário habilitar e estiver ocioso; cancelar imediatamente com entrada física. Cliques, digitação, comandos e alterações em projetos exigem permissões específicas e confirmação. Nunca operar senhas, pagamentos ou excluir arquivos automaticamente.
6. Programação: diretórios autorizados, diff, branch isolada, testes e revisão antes de publicar. Conteúdo de tela e repositório é dado não confiável, não instrução de execução.
7. Mobile: conexão ao Core privado; não controla sensores do PC sem permissões locais. Limitações de execução em segundo plano de cada plataforma devem ser verificadas.

## Estado
Política inicial e testes unitários adicionados; ainda não conectados a sensores, executor, cliente desktop ou loop de conversa. Validar no Windows antes de habilitar qualquer ação. Não há percepção de tédio real: brincadeiras são uma característica simulada da personalidade.
