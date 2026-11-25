# Max — evolução técnica

## Princípios
- Preservar interface, avatar e suporte aos provedores existentes.
- Servidor restrito a loopback; não publicar diretamente na internet.
- Dados privados fora do Git; memória explícita, editável e apagável.
- Ferramentas locais com lista de permissões, confirmação humana e sem shell arbitrário.

## Sequência de implementação e critérios de aceite
1. Fundação: validação, tratamento de erros, testes de regressão.
2. Memória: armazenamento local persistente, busca relevante, exportação e exclusão; não salvar automaticamente informações sensíveis.
3. Avatar: estados de escuta, reflexão e fala; sincronização de áudio; preservar arte original e respeitar movimento reduzido.
4. Voz: interrupção, cancelamento de requisições, sessões contínuas; palavra de ativação opt-in com indicador do microfone.
5. Agentes: perfis de programação, design, pesquisa e produtividade; nenhuma execução implícita de ações.
6. Mac: ferramentas específicas, prévia e confirmação; permissões do macOS e registro local de ações.
7. Modelos locais: diagnóstico, escolha de modelo, streaming, limites de contexto; sem fallback remoto silencioso.

## Auditoria inicial
- Memória, tarefas e conversas hoje ficam no localStorage.
- Pesquisa web e visão dependem do provedor OpenAI; Codex é uma chamada de modelo, não um agente de edição de arquivos.
- O avatar usa canvas e sprites, não um modelo 3D.
- O modo contínuo atual alterna escuta e fala, não é full duplex.
- A configuração exige Node 22+ e o servidor escuta em 127.0.0.1.
- Testar microfone, câmera, voz e Ollama no Mac antes de integrar à main.
