-- Migração para o Módulo de Apadrinhamento
-- Criação da tabela apadrinhamentos com triggers, funções e dados iniciais

-- Criar tabela apadrinhamentos
CREATE TABLE apadrinhamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_novato INTEGER NOT NULL,
    matricula_padrinho INTEGER NOT NULL,
    matricula_supervisor INTEGER NOT NULL,
    tipo_apadrinhamento VARCHAR(50) NOT NULL CHECK (
        tipo_apadrinhamento IN (
            'Técnico',
            'Comportamental', 
            'Integração'
        )
    ),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Ativo' CHECK (
        status IN ('Ativo', 'Concluído', 'Vencido')
    ),
    finalizado BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_apadrinhamentos_novato ON apadrinhamentos(matricula_novato);
CREATE INDEX idx_apadrinhamentos_padrinho ON apadrinhamentos(matricula_padrinho);
CREATE INDEX idx_apadrinhamentos_supervisor ON apadrinhamentos(matricula_supervisor);
CREATE INDEX idx_apadrinhamentos_status ON apadrinhamentos(status);
CREATE INDEX idx_apadrinhamentos_data_fim ON apadrinhamentos(data_fim);
CREATE INDEX idx_apadrinhamentos_tipo ON apadrinhamentos(tipo_apadrinhamento);

-- Trigger para calcular data_fim automaticamente
CREATE OR REPLACE FUNCTION calculate_data_fim()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_fim := NEW.data_inicio + INTERVAL '90 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_data_fim
    BEFORE INSERT OR UPDATE OF data_inicio ON apadrinhamentos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_data_fim();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_apadrinhamentos_updated_at
    BEFORE UPDATE ON apadrinhamentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function para atualizar status automaticamente
CREATE OR REPLACE FUNCTION update_apadrinhamento_status()
RETURNS void AS $$
BEGIN
    -- Atualizar status para Vencido quando passou da data_fim e não foi finalizado
    UPDATE apadrinhamentos 
    SET status = 'Vencido'
    WHERE data_fim < CURRENT_DATE 
    AND finalizado = FALSE 
    AND status != 'Vencido';
    
    -- Manter status Concluído para apadrinhamentos finalizados
    UPDATE apadrinhamentos 
    SET status = 'Concluído'
    WHERE finalizado = TRUE 
    AND status != 'Concluído';
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS (Row Level Security)
ALTER TABLE apadrinhamentos ENABLE ROW LEVEL SECURITY;

-- Política para service role (acesso total)
CREATE POLICY "Service role has full access" ON apadrinhamentos
    FOR ALL USING (auth.role() = 'service_role');

-- Política para usuários autenticados (acesso baseado em relacionamento)
CREATE POLICY "Users can view related apadrinhamentos" ON apadrinhamentos
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id::text FROM usuarios 
            WHERE matricula::text IN (
                matricula_novato::text, 
                matricula_padrinho::text, 
                matricula_supervisor::text
            )
        )
    );

-- Dados iniciais para teste
INSERT INTO apadrinhamentos (
    matricula_novato,
    matricula_padrinho, 
    matricula_supervisor,
    tipo_apadrinhamento,
    data_inicio,
    observacoes
) VALUES 
(
    12345,
    67890, 
    11111,
    'Técnico',
    CURRENT_DATE - INTERVAL '30 days',
    'Apadrinhamento em andamento - colaborador demonstrando bom progresso'
),
(
    23456,
    78901,
    11111, 
    'Comportamental',
    CURRENT_DATE - INTERVAL '60 days',
    'Treinamento específico para desenvolvimento comportamental'
),
(
    34567,
    89012,
    22222,
    'Integração',
    CURRENT_DATE - INTERVAL '95 days',
    'Apadrinhamento próximo ao vencimento - avaliar finalização'
);

-- Function para ser executada via cron (automação de status)
CREATE OR REPLACE FUNCTION cron_update_apadrinhamento_status()
RETURNS void AS $$
BEGIN
    PERFORM update_apadrinhamento_status();
    
    -- Log da execução (se tabela system_logs existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
        INSERT INTO system_logs (action, details, created_at)
        VALUES (
            'cron_apadrinhamento_status_update',
            'Status de apadrinhamentos atualizado automaticamente',
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para as roles anon e authenticated
GRANT SELECT ON apadrinhamentos TO anon;
GRANT ALL PRIVILEGES ON apadrinhamentos TO authenticated;