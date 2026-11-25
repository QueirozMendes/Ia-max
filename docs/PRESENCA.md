# Max: presença e autonomia no desktop

Windows é o host principal. O Core permanece privado e o cliente desktop roda na sessão interativa do usuário, separado da tarefa de inicialização. A captura de tela e áudio e os controles de entrada devem ocorrer somente nessa sessão.

## Camadas
1. Cliente desktop: janela principal, avatar flutuante, bandeja, botão de pausa global e indicadores de microfone/tela.
2. Observação: captura explícita da tela/janela, amostragem adaptativa, pausa em bloqueio de sessão, seleção de monitor e exclusão de aplicativos sensíveis. Não persistir capturas por padrão. Envio a provedores remotos somente após consentimento específico.
3. Audição: após a autorização inicial, o microfone permanece aberto durante a sessão desktop, inclusive quando a Max fala; sem palavra de ativação. A versão nativa deverá usar detecção de voz, cancelamento de eco e interrupção da fala. Priorizar transcrição local e descarte de áudio ambiente, sem gravação permanente; transmissão externa somente quando autorizada. Indicador de captura, botão de desligar e privacidade de outras pessoas presentes.
4. Iniciativa: política lib/initiative.js, estado da interação, modelo decide se há algo útil ou divertido a dizer, resposta curta e voz ElevenLabs. Limites ajustáveis, silêncio imediato sob pedido e no máximo duas chamadas sem resposta.
5. Ações: ferramentas restritas à sessão local. Mover cursor de brincadeira somente quando o usuário habilitar e estiver ocioso; cancelar imediatamente com entrada física. Cliques, digitação, comandos e alterações em projetos exigem permissões específicas e confirmação. Nunca operar senhas, pagamentos ou excluir arquivos automaticamente.
6. Programação: diretórios autorizados, diff, branch isolada, testes e revisão antes de publicar. Conteúdo de tela e repositório é dado não confiável, não instrução de execução.
7. Mobile: conexão ao Core privado; não controla sensores do PC sem permissões locais. Limitações de execução em segundo plano de cada plataforma devem ser verificadas.

## Estado
Política inicial e testes unitários adicionados. A prévia web usa reconhecimento contínuo após ativação explícita, reinicia quando o navegador encerra o reconhecimento e descarta resultados durante a reprodução da voz e processamento de respostas. Ela pode suspender a captura em segundo plano e depende do serviço de reconhecimento do navegador, que pode processar áudio externamente. Ainda não equivale à escuta nativa simultânea com cancelamento de eco. Validar no Windows antes de habilitar qualquer ação. Não há percepção de tédio real: brincadeiras são uma característica simulada da personalidade.

## Preferências escolhidas para a Max
- Iniciativa: 80/100; humor: 75/100 (alvos de personalidade, ainda não são controles de frequência conectados ao executor).
- Conversas espontâneas, observação da tela e brincadeiras com o cursor habilitadas como preferências desejadas, sujeitas às permissões efetivas e aos limites de segurança.
- Microfone contínuo sem palavra de ativação como comportamento padrão do desktop após consentimento inicial. Sem desligar ao final de cada conversa. O usuário mantém controle de pausa e privacidade.
- A política de iniciativa distingue microfone aberto de fala humana ativa.
