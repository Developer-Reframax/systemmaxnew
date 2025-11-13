-- Migration: Corrigir relacionamentos das tabelas do módulo emociograma
-- Descrição: Adicionar chaves estrangeiras faltantes e campos necessários

-- 1. Adicionar chave estrangeira em alertas_emociograma.usuario_matricula -> usuarios(matricula)
ALTER TABLE alertas_emociograma 
ADD CONSTRAINT alertas_emociograma_usuario_matricula_fkey 
FOREIGN KEY (usuario_matricula) REFERENCES usuarios(matricula);

-- 2. Adicionar campo alerta_id em tratativas_emociograma para referenciar alertas
ALTER TABLE tratativas_emociograma 
ADD COLUMN alerta_id UUID REFERENCES alertas_emociograma(id);

-- 3. Adicionar campo status em alertas_emociograma para controle de estado
ALTER TABLE alertas_emociograma 
ADD COLUMN status VARCHAR(20) DEFAULT 'ativo' 
CHECK (status IN ('ativo', 'em_tratamento', 'resolvido'));

-- 4. Adicionar campos para tratativas mais detalhadas
ALTER TABLE tratativas_emociograma 
ADD COLUMN tipo_tratativa VARCHAR(50) DEFAULT 'conversa' 
CHECK (tipo_tratativa IN ('conversa', 'encaminhamento', 'acompanhamento', 'orientacao'));

ALTER TABLE tratativas_emociograma 
ADD COLUMN descricao TEXT;

ALTER TABLE tratativas_emociograma 
ADD COLUMN acao_tomada TEXT;

-- 5. Renomear campos para melhor consistência
ALTER TABLE tratativas_emociograma 
RENAME COLUMN queixa TO observacoes_iniciais;

ALTER TABLE tratativas_emociograma 
RENAME COLUMN tratativa_realizada TO descricao_tratativa;

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_usuario_matricula_fkey 
ON alertas_emociograma(usuario_matricula);

CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_status 
ON alertas_emociograma(status);

CREATE INDEX IF NOT EXISTS idx_tratativas_emociograma_alerta_id 
ON tratativas_emociograma(alerta_id);

CREATE INDEX IF NOT EXISTS idx_tratativas_emociograma_tipo 
ON tratativas_emociograma(tipo_tratativa);

-- 7. Atualizar políticas RLS para incluir novos relacionamentos
-- Política para alertas com join para usuários
DROP POLICY IF EXISTS "Usuários podem ver seus próprios alertas" ON alertas_emociograma;
CREATE POLICY "Usuários podem ver seus próprios alertas" ON alertas_emociograma
    FOR SELECT USING (
        usuario_matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
    );

-- Política para tratativas com join para alertas
DROP POLICY IF EXISTS "Usuários autenticados podem ver tratativas" ON tratativas_emociograma;
CREATE POLICY "Usuários autenticados podem ver tratativas" ON tratativas_emociograma
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND u.role IN ('Admin', 'Editor', 'Lider', 'Supervisor')
        )
        OR 
        EXISTS (
            SELECT 1 FROM alertas_emociograma a
            WHERE a.id = tratativas_emociograma.alerta_id
            AND a.usuario_matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
        )
    );

-- 8. Comentários para documentação
COMMENT ON COLUMN alertas_emociograma.status IS 'Status do alerta: ativo, em_tratamento, resolvido';
COMMENT ON COLUMN tratativas_emociograma.alerta_id IS 'Referência ao alerta que originou esta tratativa';
COMMENT ON COLUMN tratativas_emociograma.tipo_tratativa IS 'Tipo de tratativa realizada';
COMMENT ON COLUMN tratativas_emociograma.descricao IS 'Descrição detalhada da tratativa';
COMMENT ON COLUMN tratativas_emociograma.acao_tomada IS 'Ação específica tomada durante a tratativa';