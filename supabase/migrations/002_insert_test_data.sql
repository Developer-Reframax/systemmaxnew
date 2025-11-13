-- Inserir dados de teste para módulos e funcionalidades

-- Inserir módulos de teste
INSERT INTO modulos (id, nome, descricao, tipo, ativo) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Gestão de Usuários', 'Módulo para gerenciamento de usuários do sistema', 'exclusivo', true),
('550e8400-e29b-41d4-a716-446655440002', 'Relatórios Avançados', 'Módulo para geração de relatórios personalizados', 'exclusivo', true),
('550e8400-e29b-41d4-a716-446655440003', 'Dashboard Corporativo', 'Módulo de dashboard para visão geral', 'corporativo', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir funcionalidades de teste
INSERT INTO modulo_funcionalidades (id, modulo_id, nome, descricao, ativa) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Criar Usuário', 'Permite criar novos usuários no sistema', true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Editar Usuário', 'Permite editar dados de usuários existentes', true),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Excluir Usuário', 'Permite excluir usuários do sistema', true),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Gerar Relatório de Vendas', 'Permite gerar relatórios de vendas personalizados', true),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Exportar Dados', 'Permite exportar dados em diversos formatos', true),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'Visualizar Dashboard', 'Permite visualizar o dashboard corporativo', true)
ON CONFLICT (id) DO NOTHING;

-- Verificar dados inseridos
SELECT 'Módulos inseridos:' as info;
SELECT m.nome, m.tipo, m.ativo FROM modulos m ORDER BY m.nome;

SELECT 'Funcionalidades inseridas:' as info;
SELECT 
    mf.nome as funcionalidade,
    m.nome as modulo,
    m.tipo as tipo_modulo,
    mf.ativa
FROM modulo_funcionalidades mf
JOIN modulos m ON mf.modulo_id = m.id
ORDER BY m.nome, mf.nome;

SELECT 'Funcionalidades de módulos exclusivos:' as info;
SELECT 
    mf.nome as funcionalidade,
    m.nome as modulo
FROM modulo_funcionalidades mf
JOIN modulos m ON mf.modulo_id = m.id
WHERE m.tipo = 'exclusivo' AND mf.ativa = true
ORDER BY m.nome, mf.nome;