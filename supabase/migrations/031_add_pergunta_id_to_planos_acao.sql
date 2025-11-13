-- Migration: Adicionar pergunta_id na tabela planos_acao para vincular planos às perguntas específicas
-- Created at: $(date)

-- 1. Adicionar coluna pergunta_id na tabela planos_acao
ALTER TABLE planos_acao 
ADD COLUMN pergunta_id UUID REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE;

-- 2. Criar índice para performance em buscas por pergunta
CREATE INDEX idx_planos_acao_pergunta_id ON planos_acao(pergunta_id);

-- 3. Criar índice composto para buscar planos por execução + pergunta (otimização)
CREATE INDEX idx_planos_acao_execucao_pergunta ON planos_acao(execucao_inspecao_id, pergunta_id);

-- 4. Atualizar comentário da tabela
COMMENT ON COLUMN planos_acao.pergunta_id IS 'ID da pergunta de inspeção que gerou este plano de ação';

-- 5. Remover constraint único se existir (para permitir múltiplos planos por pergunta)
-- Nota: Se existir o constraint unique_plano_por_pergunta, removê-lo
ALTER TABLE planos_acao 
DROP CONSTRAINT IF EXISTS unique_plano_por_pergunta;

-- 6. Grant permissions para a nova coluna (manter consistência com permissões existentes)
GRANT SELECT (pergunta_id) ON planos_acao TO anon;
GRANT ALL (pergunta_id) ON planos_acao TO authenticated;
GRANT SELECT (pergunta_id) ON planos_acao TO service_role;

-- 7. Verificar estrutura final
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'planos_acao'
-- ORDER BY ordinal_position;