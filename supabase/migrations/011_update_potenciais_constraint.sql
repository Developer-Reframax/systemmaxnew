-- Migração para atualizar constraint da tabela potenciais
-- Data: 2024
-- Descrição: Alterar valores válidos de potencial_sede para remover prefixo "Risco"

-- Remover a constraint existente
ALTER TABLE potenciais DROP CONSTRAINT IF EXISTS potenciais_potencial_sede_check;

-- Adicionar nova constraint com os valores corretos
ALTER TABLE potenciais ADD CONSTRAINT potenciais_potencial_sede_check 
    CHECK (potencial_sede IN ('Intolerável', 'Substancial', 'Moderado', 'Trivial'));

-- Comentário explicativo
COMMENT ON CONSTRAINT potenciais_potencial_sede_check ON potenciais IS 'Constraint para validar valores de potencial_sede: Intolerável, Substancial, Moderado, Trivial';