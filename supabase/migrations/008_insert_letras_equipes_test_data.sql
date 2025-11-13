-- Inserir dados de teste para letras e equipes

-- Primeiro, inserir contratos de teste se não existirem
INSERT INTO contratos (codigo, nome, local, status) VALUES 
('CONT001', 'Contrato Teste 1', 'São Paulo - SP', 'ativo'),
('CONT002', 'Contrato Teste 2', 'Rio de Janeiro - RJ', 'ativo'),
('CONT003', 'Contrato Teste 3', 'Belo Horizonte - MG', 'ativo')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir letras de teste
INSERT INTO letras (letra, codigo_contrato, lider) VALUES 
('A', 'CONT001', 1),
('B', 'CONT001', 1),
('C', 'CONT001', 1),
('A', 'CONT002', 1),
('B', 'CONT002', 1),
('A', 'CONT003', 1),
('B', 'CONT003', 1),
('C', 'CONT003', 1),
('D', 'CONT003', 1);

-- Inserir equipes de teste
INSERT INTO equipes (equipe, codigo_contrato, supervisor) VALUES 
('Equipe Alpha', 'CONT001', 1),
('Equipe Beta', 'CONT001', 1),
('Equipe Gamma', 'CONT001', 1),
('Equipe Delta', 'CONT002', 1),
('Equipe Epsilon', 'CONT002', 1),
('Equipe Zeta', 'CONT003', 1),
('Equipe Eta', 'CONT003', 1),
('Equipe Theta', 'CONT003', 1);

-- Verificar dados inseridos
SELECT 'Contratos inseridos:' as info;
SELECT codigo, nome, local FROM contratos ORDER BY codigo;

SELECT 'Letras inseridas:' as info;
SELECT l.letra, l.codigo_contrato, u.nome as lider_nome 
FROM letras l 
JOIN usuarios u ON l.lider = u.matricula 
ORDER BY l.codigo_contrato, l.letra;

SELECT 'Equipes inseridas:' as info;
SELECT e.equipe, e.codigo_contrato, u.nome as supervisor_nome 
FROM equipes e 
JOIN usuarios u ON e.supervisor = u.matricula 
ORDER BY e.codigo_contrato, e.equipe;