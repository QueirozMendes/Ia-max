# Max Mobile (Android e iPhone)

A primeira versão é uma PWA privada. Não é um APK ou IPA e não exige publicação em loja. Os dados continuam no Max Core; não há cache de conversas ou respostas da API no service worker.

## Preparar o PC Windows
1. Instale Tailscale no PC e no celular, entre na mesma tailnet e restrinja a política de acesso aos seus próprios dispositivos.
2. Com o Core ainda em loopback, execute no PC: `tailscale serve --bg http://127.0.0.1:4173` (ajuste a porta se necessário).
3. Consulte `tailscale serve status` e copie a origem HTTPS .ts.net fornecida. Nunca use Funnel.
4. Defina no .env MAX_REMOTE_ORIGIN com essa origem sem barra final e MAX_REMOTE_PASSWORD com uma senha aleatória de pelo menos 24 caracteres. Reinicie o Core. Não envie a senha ao GitHub.
5. Confirme que todos os acessos exigem autenticação Basic (usuário max) e que o Core responde somente no loopback. Teste /api/status e uma mensagem POST pelo endereço remoto. Se a origem/Host for reescrita e houver erro 403, não desabilite a validação; investigue o proxy.
6. Mantenha o computador ligado, sem suspensão, com Tailscale e Max Core ativos.

## Android
Com Tailscale conectado, abra a origem privada no Chrome, autentique e use Instalar Max se disponível, ou a opção do navegador para adicionar à tela inicial.

## iPhone
Com Tailscale conectado, abra a origem privada no Safari, autentique, toque em Compartilhar > Adicionar à Tela de Início. Ative Abrir como App Web se disponível.

## Limitações
O navegador pode interromper áudio e microfone quando a tela bloqueia ou o app vai para segundo plano; a versão web pausa os sensores ao perder visibilidade. Não há notificações push ou execução offline. O sistema pode solicitar novo login ao abrir pelo ícone. O controle local do PC e o Developer permanecem exclusivos da sessão desktop. Não foram validados dispositivos reais ou a instalação do ícone.
Não há garantia de instalação automática em navegadores específicos; a opção manual depende do sistema.
