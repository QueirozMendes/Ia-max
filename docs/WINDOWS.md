# Max Core no Windows

## Preparação
Instale Node.js 22 ou superior. Clone o projeto em uma pasta privada da sua conta Windows, configure .env a partir de .env.example e teste npm start antes de registrar a tarefa. Pare a execução manual antes de ativar a tarefa automática.

## Inicialização
Em PowerShell, na raiz do projeto:

    .\scripts\windows-max-core.ps1 -Action Install

Isso inicia a Max imediatamente e após o login da conta atual, sem privilégios elevados.

Para iniciar antes do login, execute:

    .\scripts\windows-max-core.ps1 -Action Install -AtBoot

O Agendador pode exigir privilégios administrativos para registrar a tarefa e a senha da conta Windows. Não use o PIN do Windows Hello como senha. O script não salva essa credencial no projeto. A execução do Core permanece com privilégios limitados. Se a política local bloquear scripts, revise e autorize somente os scripts confiáveis; não desative globalmente as proteções.

## Gerenciamento

    .\scripts\windows-max-core.ps1 -Action Status
    .\scripts\windows-max-core.ps1 -Action Start
    .\scripts\windows-max-core.ps1 -Action Stop
    .\scripts\windows-max-core.ps1 -Action Uninstall

Os logs ficam em .runtime/logs. A rotação ocorre na inicialização quando o arquivo anterior ultrapassa 5 MB. A tarefa tenta reiniciar até cinco vezes após falhas, com intervalo de um minuto. Desinstalar a tarefa não apaga dados.

## Acesso remoto
O Core permanece em loopback. Configure Tailscale Serve privado separadamente, nunca Funnel, e restrinja acesso aos seus dispositivos. O computador precisa estar ligado e conectado, sem suspensão. Se usar Ollama, configure também sua disponibilidade antes do login. A inicialização automática do Core não configura esses serviços nem instala o avatar ou as chaves de API.

## Validação no PC
Verifique o status da tarefa e a resposta de /api/status; se o modo remoto estiver habilitado, use as credenciais configuradas. Reinicie o PC e confira acesso antes/depois do login conforme o modo escolhido. Teste parada, reinício após falha e acesso remoto de um celular autorizado. Não registre o Core em uma pasta que outros usuários possam modificar.

