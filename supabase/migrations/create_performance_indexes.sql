-- Índices de performance para a página Desvios Gerais
-- Criação de índices otimizados para melhorar a performance das consultas
-- Baseado na estrutura real da tabela desvios

-- Índice composto para filtros mais comuns (contrato + status + data)
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_status_data 
ON desvios (contrato, status, created_at DESC);

-- Índice para filtro por contrato e potencial
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_potencial 
ON desvios (contrato, potencial);

-- Índice para filtro por contrato e responsável
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_responsavel 
ON desvios (contrato, responsavel);

-- Índice para filtro por contrato e natureza
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_natureza 
ON desvios (contrato, natureza_id);

-- Índice para filtro por contrato e tipo
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_tipo 
ON desvios (contrato, tipo_id);

-- Índice para busca textual (descrição)
CREATE INDEX IF NOT EXISTS idx_desvios_texto_busca 
ON desvios USING gin(to_tsvector('portuguese', descricao));

-- Índice para filtro por local
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_local 
ON desvios (contrato, local);

-- Índice para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_created_at 
ON desvios (contrato, created_at DESC);

-- Índice para estatísticas rápidas por status
CREATE INDEX IF NOT EXISTS idx_desvios_stats_status 
ON desvios (contrato, status) 
WHERE status IN ('Aguardando Avaliação', 'Em Andamento', 'Concluído', 'Vencido');

-- Índice para filtro por matricula do usuário
CREATE INDEX IF NOT EXISTS idx_desvios_contrato_matricula 
ON desvios (contrato, matricula_user);

-- Comentários explicativos
COMMENT ON INDEX idx_desvios_contrato_status_data IS 'Índice principal para filtros de contrato, status e ordenação por data';
COMMENT ON INDEX idx_desvios_contrato_potencial IS 'Índice para filtro por potencial dentro do contrato';
COMMENT ON INDEX idx_desvios_contrato_responsavel IS 'Índice para filtro por responsável dentro do contrato';
COMMENT ON INDEX idx_desvios_contrato_natureza IS 'Índice para filtro por natureza dentro do contrato';
COMMENT ON INDEX idx_desvios_contrato_tipo IS 'Índice para filtro por tipo dentro do contrato';
COMMENT ON INDEX idx_desvios_texto_busca IS 'Índice GIN para busca textual na descrição';
COMMENT ON INDEX idx_desvios_contrato_local IS 'Índice para filtro por local dentro do contrato';
COMMENT ON INDEX idx_desvios_contrato_created_at IS 'Índice para ordenação por data de criação';
COMMENT ON INDEX idx_desvios_stats_status IS 'Índice parcial para cálculo rápido de estatísticas por status';
COMMENT ON INDEX idx_desvios_contrato_matricula IS 'Índice para filtro por matrícula do usuário dentro do contrato';