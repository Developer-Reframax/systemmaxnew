BEGIN;

-- Seed alinhado aos slugs atualmente usados no menu e nas paginas com controle visual.
-- Itens sem moduleSlug/functionalitySlug no codigo atual (ex.: dashboard, modulos,
-- security-params e settings) foram omitidos intencionalmente desta migration.

WITH module_seed (slug, nome, descricao, tipo, ativo) AS (
  VALUES
    ('usuario', 'Usuarios', 'Controle de acesso visual do modulo de usuarios.', 'corporativo', true),
    ('contratos', 'Contratos', 'Controle de acesso visual do modulo de contratos.', 'corporativo', true),
    ('letras', 'Letras', 'Gestao de letras vinculadas aos contratos.', 'exclusivo', true),
    ('equipes', 'Equipes', 'Gestao de equipes e supervisores.', 'exclusivo', true),
    ('almoxarifado', 'Almoxarifado', 'Gestao de estoque, requisicoes, aprovacoes e entregas.', 'exclusivo', true),
    ('inspecoes_checks', 'Inspecoes e Checks', 'Gestao de formularios, execucoes e nao conformidades.', 'exclusivo', true),
    ('boas_praticas', 'Boas Praticas / Lab Ideias', 'Gestao de boas praticas, avaliacoes e votacoes.', 'exclusivo', true),
    ('apadrinhamento', 'Apadrinhamento', 'Gestao do processo de apadrinhamento.', 'exclusivo', true),
    ('3p', '3 Ps', 'Modulo de Pausar, Processar e Prosseguir.', 'exclusivo', true),
    ('relatos_desvios', 'Relatos / Desvios', 'Gestao de relatos, desvios e monitoramento.', 'exclusivo', true),
    ('emociograma', 'Emociograma', 'Registros emocionais, tratativas e relatorios.', 'exclusivo', true),
    ('oac', 'OAC', 'Observacoes comportamentais e seus relatorios.', 'exclusivo', true),
    ('agentes', 'Agentes de IA', 'Acesso aos agentes especialistas do sistema.', 'exclusivo', true),
    ('monitoramento_seguranca', 'Sessoes', 'Monitoramento de sessoes e acessos do sistema.', 'corporativo', true),
    ('documentacao', 'Documentacao', 'Documentacao interativa e base de conhecimento.', 'corporativo', true)
),
inserted_modules AS (
  INSERT INTO modulos (nome, descricao, slug, tipo, ativo)
  SELECT s.nome, s.descricao, s.slug, s.tipo, s.ativo
  FROM module_seed s
  WHERE NOT EXISTS (
    SELECT 1
    FROM modulos m
    WHERE m.slug = s.slug
  )
  RETURNING id, slug
)
UPDATE modulos m
SET
  nome = s.nome,
  descricao = s.descricao,
  tipo = s.tipo,
  ativo = s.ativo
FROM module_seed s
WHERE m.slug = s.slug;

WITH functionality_seed (module_slug, slug, nome, descricao, tipo, ativa) AS (
  VALUES
    ('usuario', 'criar_usuarios', 'Criar usuarios', 'Libera a criacao de novos usuarios.', 'exclusivo', true),
    ('usuario', 'exportar_excel_usuarios', 'Exportar usuarios', 'Libera a exportacao de usuarios para Excel.', 'exclusivo', true),
    ('usuario', 'editar_usuarios', 'Editar usuarios', 'Libera a edicao de usuarios.', 'exclusivo', true),
    ('usuario', 'editar_contratos_usuarios', 'Gerenciar contratos de usuarios', 'Libera o vinculo de contratos aos usuarios.', 'exclusivo', true),
    ('usuario', 'editar_funcionalidades_usuarios', 'Gerenciar funcionalidades de usuarios', 'Libera o vinculo de funcionalidades aos usuarios.', 'exclusivo', true),
    ('usuario', 'deletar_usuarios', 'Excluir usuarios', 'Libera a exclusao de usuarios.', 'exclusivo', true),

    ('letras', 'letras-gestao', 'Gerenciar letras', 'Libera criar, editar e excluir letras.', 'exclusivo', true),
    ('equipes', 'equipes-gestao', 'Gerenciar equipes', 'Libera criar, editar e excluir equipes.', 'exclusivo', true),

    ('almoxarifado', 'user-almoxarife', 'Perfil almoxarife', 'Libera entregas e operacoes do almoxarife.', 'exclusivo', true),
    ('almoxarifado', 'user-gestor-almoxarifado', 'Perfil gestor de almoxarifado', 'Libera gestao de itens e controle de estoque.', 'exclusivo', true),
    ('almoxarifado', 'user-aprovador-requisicao', 'Perfil aprovador de requisicao', 'Libera aprovacoes e rejeicoes de requisicoes.', 'exclusivo', true),

    ('inspecoes_checks', 'inspecao-sesmt', 'Perfil SESMT de inspecoes', 'Libera formularios e equipamentos no modulo de inspecoes.', 'exclusivo', true),
    ('inspecoes_checks', 'inspecao-gestao', 'Gestao de inspecoes', 'Libera a criacao e gestao avancada de formularios de inspecao.', 'exclusivo', true),

    ('boas_praticas', 'boaspraticas-cadastro', 'Cadastrar boas praticas', 'Libera o cadastro de novas boas praticas.', 'exclusivo', true),
    ('boas_praticas', 'boaspraticas-gestao-geral', 'Gestao geral de boas praticas', 'Libera catalogos e configuracoes gerais do modulo.', 'exclusivo', true),
    ('boas_praticas', 'boaspraticas-gestao-local', 'Visao local de boas praticas', 'Libera a visao geral local e listagens ampliadas.', 'exclusivo', true),

    ('apadrinhamento', 'apadrinhamento-acesso', 'Acesso ao modulo de apadrinhamento', 'Libera a entrada no modulo de apadrinhamento.', 'exclusivo', true),
    ('3p', '3p-acesso', 'Acesso ao modulo 3 Ps', 'Libera a entrada no modulo 3 Ps.', 'exclusivo', true),

    ('relatos_desvios', 'relatos-monitoramento', 'Central de monitoramento', 'Libera a central de monitoramento de relatos e desvios.', 'exclusivo', true),
    ('relatos_desvios', 'relatos-sesmt', 'Perfil SESMT de relatos', 'Libera visao SESMT, exportacao e listagens gerais.', 'exclusivo', true),
    ('relatos_desvios', 'relatos-supervisor', 'Perfil supervisor de relatos', 'Libera avaliacao, pendencias, kanban e visoes por colaborador.', 'exclusivo', true),

    ('emociograma', 'emociograma-lider', 'Perfil lider de emociograma', 'Libera DDS, tratativas, historico de tratativas e relatorios.', 'exclusivo', true),

    ('oac', 'oac-acesso', 'Acesso ao modulo OAC', 'Libera a entrada no modulo OAC.', 'exclusivo', true),
    ('agentes', 'ia-interagir-agent', 'Interagir com agente de IA', 'Libera o uso do agente de relatos/desvios.', 'exclusivo', true)
),
inserted_functionalities AS (
  INSERT INTO modulo_funcionalidades (modulo_id, nome, descricao, slug, tipo, ativa)
  SELECT
    m.id,
    s.nome,
    s.descricao,
    s.slug,
    s.tipo,
    s.ativa
  FROM functionality_seed s
  INNER JOIN modulos m
    ON m.slug = s.module_slug
  WHERE NOT EXISTS (
    SELECT 1
    FROM modulo_funcionalidades mf
    WHERE mf.modulo_id = m.id
      AND mf.slug = s.slug
  )
  RETURNING id, slug
)
UPDATE modulo_funcionalidades mf
SET
  nome = s.nome,
  descricao = s.descricao,
  tipo = s.tipo,
  ativa = s.ativa
FROM functionality_seed s
INNER JOIN modulos m
  ON m.slug = s.module_slug
WHERE mf.modulo_id = m.id
  AND mf.slug = s.slug;

COMMIT;
