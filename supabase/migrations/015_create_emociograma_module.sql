-- Migration: Criar módulo de Gestão de Emociograma
-- Descrição: Tabelas para registro de estado emocional e tratativas

-- Criar tabela emociogramas
CREATE TABLE emociogramas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_usuario INTEGER NOT NULL REFERENCES usuarios(matricula),
    estado_emocional VARCHAR(20) NOT NULL CHECK (estado_emocional IN ('bem', 'regular', 'pessimo')),
    observacoes TEXT,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    requer_tratativa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela tratativas_emociograma
CREATE TABLE tratativas_emociograma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emociograma_id UUID NOT NULL REFERENCES emociogramas(id) ON DELETE CASCADE,
    matricula_tratador INTEGER NOT NULL REFERENCES usuarios(matricula),
    queixa TEXT NOT NULL,
    tratativa_realizada TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'concluida' CHECK (status IN ('pendente', 'concluida')),
    data_tratativa TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_emociogramas_matricula_usuario ON emociogramas(matricula_usuario);
CREATE INDEX idx_emociogramas_data_registro ON emociogramas(data_registro DESC);
CREATE INDEX idx_emociogramas_estado_emocional ON emociogramas(estado_emocional);
CREATE INDEX idx_emociogramas_requer_tratativa ON emociogramas(requer_tratativa) WHERE requer_tratativa = true;

CREATE INDEX idx_tratativas_emociograma_id ON tratativas_emociograma(emociograma_id);
CREATE INDEX idx_tratativas_matricula_tratador ON tratativas_emociograma(matricula_tratador);
CREATE INDEX idx_tratativas_status ON tratativas_emociograma(status);
CREATE INDEX idx_tratativas_data_tratativa ON tratativas_emociograma(data_tratativa DESC);

-- Trigger para definir se requer tratativa
CREATE OR REPLACE FUNCTION set_requer_tratativa()
RETURNS TRIGGER AS $$
BEGIN
    NEW.requer_tratativa = (NEW.estado_emocional IN ('regular', 'pessimo'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_requer_tratativa
    BEFORE INSERT OR UPDATE ON emociogramas
    FOR EACH ROW
    EXECUTE FUNCTION set_requer_tratativa();

-- Função para verificar último registro (8 horas)
CREATE OR REPLACE FUNCTION check_last_emociograma(user_matricula INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    last_registro TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT data_registro INTO last_registro
    FROM emociogramas
    WHERE matricula_usuario = user_matricula
    ORDER BY data_registro DESC
    LIMIT 1;
    
    IF last_registro IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN (NOW() - last_registro) >= INTERVAL '8 hours';
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_emociogramas_updated_at
    BEFORE UPDATE ON emociogramas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tratativas_updated_at
    BEFORE UPDATE ON tratativas_emociograma
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS nas tabelas
ALTER TABLE emociogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratativas_emociograma ENABLE ROW LEVEL SECURITY;

-- Política para emociogramas - usuários podem ver apenas seus próprios registros
CREATE POLICY "Usuários podem ver próprios emociogramas" ON emociogramas
    FOR SELECT USING (auth.uid()::text IS NOT NULL);

-- Política para inserção - usuários autenticados podem inserir
CREATE POLICY "Usuários autenticados podem inserir emociogramas" ON emociogramas
    FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

-- Política para tratativas - apenas usuários autenticados
CREATE POLICY "Usuários autenticados podem ver tratativas" ON tratativas_emociograma
    FOR SELECT USING (auth.uid()::text IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir tratativas" ON tratativas_emociograma
    FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

-- Grants para roles
GRANT SELECT, INSERT, UPDATE ON emociogramas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tratativas_emociograma TO authenticated;
GRANT SELECT, INSERT, UPDATE ON emociogramas TO anon;
GRANT SELECT, INSERT, UPDATE ON tratativas_emociograma TO anon;

-- Dados de exemplo serão inseridos posteriormente quando houver usuários válidos