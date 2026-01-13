create or replace view public.vw_relatos_consulta as
select
  d.id,
  d.created_at,
  d.updated_at,
  d.matricula_user,
  u.nome as autor_nome,
  u.funcao as autor_funcao,
  u.email as autor_email,
  u.equipe_id as autor_equipe_id,
  d.contrato,
  d.local,
  d.equipe_id,
  e.equipe as equipe_nome,
  d.natureza_id,
  n.natureza as natureza_nome,
  d.riscoassociado_id,
  ra.risco_associado as risco_associado_nome,
  ra.categoria as risco_categoria,
  ra.descricao as risco_descricao,
  d.tipo_id,
  t.tipo as tipo_nome,
  d.descricao,
  d.potencial,
  d.potencial_local,
  d.status,
  d.ver_agir,
  d.responsavel,
  d.data_limite,
  d.data_conclusao,
  d.acao,
  d.observacao,
  d.acao_cliente,
  d.gerou_recusa
from public.desvios d
left join public.usuarios u on u.matricula = d.matricula_user
left join public.natureza n on n.id = d.natureza_id
left join public.riscos_associados ra on ra.id = d.riscoassociado_id
left join public.tipos t on t.id = d.tipo_id
left join public.equipes e on e.id = d.equipe_id;

