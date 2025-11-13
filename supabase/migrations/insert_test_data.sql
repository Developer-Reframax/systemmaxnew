-- Inserir dados de teste para módulos exclusivos e suas funcionalidades

-- Primeiro, vamos verificar se já existem módulos exclusivos
INSERT INTO modulos (nome, descricao, tipo, ativo) VALUES
('Relatórios Avançados', 'Módulo para geração de relatórios avançados', 'exclusivo', true),
('Auditoria', 'Módulo para auditoria do sistema', 'exclusivo', true),
('Analytics', 'Módulo para análise de dados', 'exclusivo', true)
ON CONFLICT DO NOTHING;

-- Inserir funcionalidades para os módulos exclusivos
-- Primeiro, obter os IDs dos módulos exclusivos
WITH modulos_exclusivos AS (
  SELECT id, nome FROM modulos WHERE tipo = 'exclusivo'
)
INSERT INTO modulo_funcionalidades (modulo_id, nome, descricao, ativa)
SELECT 
  m.id,
  f.nome,
  f.descricao,
  true
FROM modulos_exclusivos m
CROSS JOIN (
  VALUES 
    ('Gerar Relatório PDF', 'Funcionalidade para gerar relatórios em PDF'),
    ('Exportar Dados', 'Funcionalidade para exportar dados'),
    ('Visualizar Gráficos', 'Funcionalidade para visualizar gráficos'),
    ('Configurar Alertas', 'Funcionalidade para configurar alertas')
) AS f(nome, descricao)
WHERE m.nome IN ('Relatórios Avançados', 'Auditoria', 'Analytics')
ON CONFLICT DO NOTHING;

-- Verificar os dados inseridos
SELECT 
  m.nome as modulo_nome,
  m.tipo,
  mf.nome as funcionalidade_nome,
  mf.ativa
FROM modulos m
JOIN modulo_funcionalidades mf ON m.id = mf.modulo_id
WHERE m.tipo = 'exclusivo'
ORDER BY m.nome, mf.nome;