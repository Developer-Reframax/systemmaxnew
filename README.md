# SystemMax New — Visão Técnica

Documentação concisa para desenvolvedores sobre arquitetura, stack, segurança e padrões do sistema.

## Stack e Fundamentos

- **Framework**: Next.js (App Router) + React 18 + TypeScript.
- **UI**: Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts).
- **Dados**: Supabase (PostgreSQL) com RLS e Policies específicas por contrato/equipe.
- **Storage**: Supabase Storage (buckets `avatars`, `desvios-images`, evidências de planos).
- **Auth**: JWT próprio (tokens guardados no client). Service Role Key usada somente em API Routes.
- **Realtime**: @supabase/realtime-js (ex.: `/api/desvios/realtime`, `/api/inspecoes/equipamentos/realtime`).
- **Excel/Export**: ExcelJS em client-side (ex.: página de usuários).

## Módulos Principais (Apps)

- `/users`: gestão de usuários, contratos, equipes e funcionalidades; exportação Excel; APIs `/api/users/*`.
- `/desvios`: relatos de desvios, avaliação, imagens, configs por contrato; APIs `/api/desvios/*`.
- `/inspecoes`: formulários/checklists, execuções, planos de ação, equipamentos, NC; APIs `/api/inspecoes/*`.
- `/emociograma`: bem-estar, registros diários, alertas/tratativas; APIs `/api/emociograma/*`.
- Outros: dashboards, documentos, segurança (reset-password, login, etc.) conforme pastas em `src/app`.

## Estrutura de Código

- `src/app/**`: páginas (App Router) e rotas de API (Next.js).
- `src/components/**`: componentes compartilhados (Layout, modais, tabelas, etc.).
- `src/lib/**`: integrações Supabase, auth/JWT, serviços (ex.: `services/alertas`), tipos.
- `documents/**`: documentação de arquitetura por módulo (users, desvios, inspecoes, emociograma, kanban).

## Autenticação e Segurança

- **JWT**: emitido no login; enviado em `Authorization: Bearer <token>` para APIs.
- **AutZ (roles)**: `Admin`, `Editor`, `Usuario`; algumas features também usam checagem de funcionalidades (UUIDs).
- **Supabase Service Role**: apenas em API Routes; nunca expor no client.
- **RLS/Filters**: queries filtram por `contrato_raiz` ou `matricula` do token quando aplicável.
- **Uploads**: validação de tipo/tamanho (5MB) e categoria; Storage write só via backend.
- **Restrições de uso**:
  - Emociograma: 1 registro a cada 8h (RPC) e 1/dia no UI.
  - Desvios/inspeções: apenas executor ou Admin/Editor pode editar/concluir; delete restrito.

## APIs (visão agregada)

- `GET|POST|PUT|DELETE /api/users*`: CRUD usuários, avatar, contratos, letras, equipes, termos, verificação, functionalities.
- `GET|POST|PUT|DELETE /api/desvios*`: listagem/CRUD, stats, avaliação, resolução, imagens (bucket `desvios-images`), configs, realtime.
- `GET|POST|PUT|DELETE /api/inspecoes*`: stats, formulários, categorias, execuções (respostas/participantes), planos-ação + evidências, NC, equipamentos (realtime), locais, usuários.
- `GET|POST /api/emociograma*`: listagem/criação, stats, alertas, tratativas.


## Scripts Úteis

- `npm run dev`: modo desenvolvimento.
- `npm run build && npm run start`: produção.
- `npm run lint`: lint do projeto.

## Convenções e Boas Práticas

- Evitar expor secrets no cliente; apenas `NEXT_PUBLIC_*` pode ir para o browser.
- Sempre validar JWT nas APIs antes de chamar Supabase com service key.
- Manter paginação em listagens (desvios, execuções, emociogramas, usuários).
- Uploads sempre via API Route; limpar storage se a persistência no banco falhar.
- Respeitar RLS/contrato/equipe nas queries e roles nas mutações.

## Referências Internas

- Documentos detalhados por módulo em `documents/`:  
  - `users-modulo-arquitetura.md`  
  - `desvios-modulo-arquitetura.md`  
  - `inspecoes-modulo-arquitetura.md`  
  - `emociograma-modulo-arquitetura.md`  
  - `kanban-reformulado-arquitetura.md`
  - `systemmax-arquitetura-completa.md`

## Fluxo de Autorização (Exemplos)

- **Users**: Admin/Editor podem listar/editar; delete lógico só Admin; role/status alteráveis apenas por Admin.
- **Desvios**: Avaliar/deletar só Admin/Editor; resolver apenas responsável; imagens por owner/Admin/Editor.
- **Inspeções**: Concluir/editar apenas executor ou Admin; checklists exigem `tag_equipamento` para concluir; participantes validados.
- **Emociograma**: escopos `meus` ou `equipe`; alertas/tratativas controlados por liderança/Admin.

## Observações de Deploy

- Produção: garantir variáveis Supabase e JWT configuradas; buckets existentes (`avatars`, `desvios-images`, evidências de planos se separado).
- Habilitar HTTPS e Secure Cookies se houver camada custom de auth.
- Monitorar limites de Storage e Realtime (conexões SSE).
