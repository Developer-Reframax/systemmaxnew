## Páginas Novas
- **Gestores – `/inspecoes/nao-conformidades`**
  - Lista todas as não conformidades (planos de ação) do contrato do usuário logado
  - Filtros: `status`, `prioridade`, `responsavel`, `vencidos`, `periodo`, `formulário`, `local`, busca por texto
  - Colunas: pergunta, desvio, o_que_fazer, responsável, prazo, status, prioridade, evidências, link para execução
  - Acesso: `Admin`, `Editor` e `Gestor`

- **Responsáveis – `/inspecoes/minhas-acoes`**
  - Lista planos de ação onde `responsavel_matricula = user.matricula`
  - Permite editar: `prazo`, `status`, `como_fazer` e fazer upload de evidências
  - Usa os endpoints já existentes por execução para atualização e evidências

## Reuso de Componentes
- **`src/components/inspecoes/PlanosAcaoList.tsx`** já lista e edita planos por execução (referência: c:\Users\garibaldi.neto\systemmaxnew\src\components\inspecoes\PlanosAcaoList.tsx:60)
  - Reaproveitar padrões de UI (badges, cards, filtros, modal)
- **`src/components/inspecoes/PlanoAcaoModal.tsx`** já cria/edita e faz upload de evidências (referência: c:\Users\garibaldi.neto\systemmaxnew\src\components\inspecoes\PlanoAcaoModal.tsx:201)
  - Usar o mesmo modal para edição em "Minhas Ações"

## APIs Necessárias
- **Listagem global por contrato** – `GET /api/inspecoes/nao-conformidades`
  - Retorna planos de ação com joins:
    - `planos_acao` ⇄ `execucoes_inspecao` (para status, datas)
    - `perguntas_formulario(pergunta)` (texto da pergunta)
    - `usuarios(responsavel)` e `usuarios(executor)` (para nome/email/contrato)
  - Filtro por `contrato_raiz` do usuário logado via JWT
  - Implementação com Service Role (como nas rotas de planos: c:\Users\garibaldi.neto\systemmaxnew\src\app\api\inspecoes\execucoes\[id]\planos-acao\route.ts:11), validando papéis

- **Minhas ações** – `GET /api/inspecoes/planos-acao/minhas`
  - Retorna `planos_acao` onde `responsavel_matricula = user.matricula`
  - Inclui `execucao_inspecao_id`, `status`, `prazo`, `pergunta.pergunta`, `evidencias`

- **Atualização e evidências**
  - Reusar rotas existentes:
    - Update: `PUT /api/inspecoes/execucoes/[id]/planos-acao/[planoId]` (define `data_conclusao` se `status=concluido`, referência: c:\Users\garibaldi.neto\systemmaxnew\src\app\api\inspecoes\execucoes\[id]\planos-acao\[planoId]\route.ts:178)
    - Upload: `POST /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias` (valida tipos/tamanho, referência: c:\Users\garibaldi.neto\systemmaxnew\src\app\api\inspecoes\execucoes\[id]\planos-acao\[planoId]\evidencias\route.ts:100)

## Modelos e Tipos
- Reusar `PlanoAcao`, `PlanoAcaoWithRelations`, `EvidenciaPlanoAcao` (referência: c:\Users\garibaldi.neto\systemmaxnew\src\types\plano-acao.ts:7)
- A listagem global adiciona campos agregados (executor, formulário, local); expandir o tipo de retorno no handler sem alterar o tipo base

## UI/UX Detalhes
- **Gestores**
  - Tabela com paginação, ordenação por `prazo` e `status`
  - Indicadores: vencido (vermelho), concluído (verde), em andamento (azul)
  - Botões: ver execução (`/inspecoes/execucoes/[id]`), abrir detalhes do plano (drawer/modal read-only)

- **Responsáveis**
  - Lista em cards com busca textual e filtros básicos (`status`, `vencidos`)
  - Botões: editar (abre `PlanoAcaoModal`), adicionar evidência (input de arquivo)

## Integração no Dashboard
- Adicionar dois cards de navegação em `/inspecoes`:
  - "Não Conformidades" → `/inspecoes/nao-conformidades` (somente `Admin`/`Editor`/`Gestor`)
  - "Minhas Ações" → `/inspecoes/minhas-acoes`
  - Base: padrão de cards já usado (referência: c:\Users\garibaldi.neto\systemmaxnew\src\app\inspecoes\page.tsx:218)

## Segurança e Acesso
- Validar JWT via `verifyJWTToken`
- Filtrar por `contrato_raiz` do usuário logado (consultando `usuarios`)
- Permissões:
  - Gestores: visualização global do contrato
  - Responsáveis: edição apenas dos planos onde são responsáveis
  - Admin continua com acesso completo

## Passos de Implementação
1. Criar `GET /api/inspecoes/nao-conformidades`
2. Criar `GET /api/inspecoes/planos-acao/minhas`
3. Criar página `/inspecoes/nao-conformidades` com tabela e filtros
4. Criar página `/inspecoes/minhas-acoes` reutilizando `PlanoAcaoModal`
5. Adicionar navegação no dashboard `/inspecoes`
6. Testes: validar filtros, atualização de status/prazo/como_fazer, upload/visualização de evidências

## Observações Técnicas
- RLS: usar Service Role para consultas agregadas; continuar validando papéis
- Performance: paginação e `head_limit` nas consultas
- Campos já suportados: `data_conclusao` auto-set ao concluir (referência: [planoId] PUT)

Confirma o plano para eu iniciar a implementação?