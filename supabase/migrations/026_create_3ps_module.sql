-- Criar módulo 3 P's (Pausar, Processar, Prosseguir)
-- Migration para tabelas de registros 3P's e participantes

-- Criar tabela principal de registros 3P's
CREATE TABLE registros_3ps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id INTEGER NOT NULL REFERENCES locais(id),
    matricula_criador INTEGER NOT NULL REFERENCES usuarios(matricula),
    atividade TEXT NOT NULL,
    paralisacao_realizada BOOLEAN NOT NULL,
    riscos_avaliados BOOLEAN NOT NULL,
    ambiente_avaliado BOOLEAN NOT NULL,
    passo_descrito BOOLEAN NOT NULL,
    hipoteses_levantadas BOOLEAN NOT NULL,
    atividade_segura BOOLEAN NOT NULL,
    oportunidades TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de participantes dos registros 3P's
CREATE TABLE participantes_3ps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_3p_id UUID NOT NULL REFERENCES registros_3ps(id) ON DELETE CASCADE,
    matricula_participante INTEGER NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(registro_3p_id, matricula_participante)
);

-- Criar índices para performance
CREATE INDEX idx_registros_3ps_area_id ON registros_3ps(area_id);
CREATE INDEX idx_registros_3ps_matricula_criador ON registros_3ps(matricula_criador);
CREATE INDEX idx_registros_3ps_created_at ON registros_3ps(created_at DESC);

CREATE INDEX idx_participantes_3ps_registro_id ON participantes_3ps(registro_3p_id);
CREATE INDEX idx_participantes_3ps_matricula ON participantes_3ps(matricula_participante);

-- Habilitar Row Level Security
ALTER TABLE registros_3ps ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_3ps ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para registros_3ps
CREATE POLICY "Usuários podem ver registros do seu contrato" ON registros_3ps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u1
            JOIN locais l ON registros_3ps.area_id = l.id
            JOIN usuarios u2 ON u2.matricula = registros_3ps.matricula_criador
            WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
            AND u1.contrato_raiz = u2.contrato_raiz
        )
        OR
        EXISTS (
            SELECT 1 FROM participantes_3ps p
            WHERE p.registro_3p_id = registros_3ps.id
            AND p.matricula_participante = (auth.jwt() ->> 'matricula')::integer
        )
    );

CREATE POLICY "Usuários podem criar registros" ON registros_3ps
    FOR INSERT WITH CHECK (
        matricula_criador = (auth.jwt() ->> 'matricula')::integer
        AND EXISTS (
            SELECT 1 FROM usuarios u
            JOIN locais l ON l.id = area_id
            WHERE u.matricula = matricula_criador
            AND u.contrato_raiz = l.contrato
        )
    );

CREATE POLICY "Usuários podem atualizar seus próprios registros" ON registros_3ps
    FOR UPDATE USING (
        matricula_criador = (auth.jwt() ->> 'matricula')::integer
    );

-- Políticas de segurança para participantes_3ps
CREATE POLICY "Usuários podem ver participações do seu contrato" ON participantes_3ps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u1
            JOIN registros_3ps r ON participantes_3ps.registro_3p_id = r.id
            JOIN usuarios u2 ON u2.matricula = r.matricula_criador
            WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
            AND u1.contrato_raiz = u2.contrato_raiz
        )
        OR
        matricula_participante = (auth.jwt() ->> 'matricula')::integer
    );

CREATE POLICY "Usuários podem adicionar participantes aos seus registros" ON participantes_3ps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM registros_3ps r
            WHERE r.id = registro_3p_id
            AND r.matricula_criador = (auth.jwt() ->> 'matricula')::integer
        )
    );

CREATE POLICY "Usuários podem remover participantes dos seus registros" ON participantes_3ps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM registros_3ps r
            WHERE r.id = registro_3p_id
            AND r.matricula_criador = (auth.jwt() ->> 'matricula')::integer
        )
    );

-- Conceder permissões básicas para roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON registros_3ps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON participantes_3ps TO authenticated;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela registros_3ps
CREATE TRIGGER update_registros_3ps_updated_at 
    BEFORE UPDATE ON registros_3ps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE registros_3ps IS 'Tabela para armazenar registros do módulo 3 P''s (Pausar, Processar, Prosseguir)';
COMMENT ON TABLE participantes_3ps IS 'Tabela para armazenar participantes dos registros 3 P''s';

COMMENT ON COLUMN registros_3ps.paralisacao_realizada IS 'Etapa 1: Paralisação foi realizada antes do início da atividade';
COMMENT ON COLUMN registros_3ps.riscos_avaliados IS 'Etapa 2: Os riscos foram avaliados';
COMMENT ON COLUMN registros_3ps.ambiente_avaliado IS 'Etapa 2: O ambiente ao redor foi avaliado';
COMMENT ON COLUMN registros_3ps.passo_descrito IS 'Etapa 2: O passo a passo foi descrito';
COMMENT ON COLUMN registros_3ps.hipoteses_levantadas IS 'Etapa 2: As hipóteses foram levantadas';
COMMENT ON COLUMN registros_3ps.atividade_segura IS 'Etapa 2: A atividade é considerada segura';
COMMENT ON COLUMN registros_3ps.oportunidades IS 'Etapa 3: Oportunidades de melhoria e aprendizado identificadas';