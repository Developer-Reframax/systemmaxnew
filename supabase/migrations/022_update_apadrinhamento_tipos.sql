-- Atualizar tipos de apadrinhamento para os valores corretos
-- Migração para alterar os tipos aceitos na tabela apadrinhamentos

-- Primeiro, remover a constraint existente
ALTER TABLE apadrinhamentos DROP CONSTRAINT IF EXISTS apadrinhamentos_tipo_apadrinhamento_check;

-- Adicionar nova constraint com os tipos corretos
ALTER TABLE apadrinhamentos 
ADD CONSTRAINT apadrinhamentos_tipo_apadrinhamento_check 
CHECK (tipo_apadrinhamento IN ('Novo colaborador', 'Novo operador de ponte', 'Novo operador de empilhadeira'));

-- Atualizar registros existentes se houver (mapear tipos antigos para novos)
UPDATE apadrinhamentos 
SET tipo_apadrinhamento = CASE 
    WHEN tipo_apadrinhamento = 'Técnico' THEN 'Novo colaborador'
    WHEN tipo_apadrinhamento = 'Comportamental' THEN 'Novo colaborador'
    WHEN tipo_apadrinhamento = 'Integração' THEN 'Novo colaborador'
    ELSE tipo_apadrinhamento
END
WHERE tipo_apadrinhamento IN ('Técnico', 'Comportamental', 'Integração');