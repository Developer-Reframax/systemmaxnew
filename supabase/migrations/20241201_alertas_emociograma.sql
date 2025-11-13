-- Migration para sistema de alertas de emociograma
-- Criação das tabelas para alertas automáticos e notificações

-- Tabela para registrar alertas de estados emocionais irregulares
CREATE TABLE IF NOT EXISTS alertas_emociograma (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_matricula INTEGER NOT NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    equipe VARCHAR(100),
    letra VARCHAR(10),
    estado_emocional VARCHAR(20) NOT NULL CHECK (estado_emocional IN ('regular', 'pessimo')),
    observacoes TEXT,
    data_registro TIMESTAMP WITH TIME ZONE NOT NULL,
    lider_matricula INTEGER,
    supervisor_matricula INTEGER,
    notificado BOOLEAN DEFAULT FALSE,
    resolvido BOOLEAN DEFAULT FALSE,
    data_resolucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para registrar notificações enviadas
CREATE TABLE IF NOT EXISTS notificacoes_emociograma (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    destinatario_matricula INTEGER NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('lider', 'supervisor')),
    usuario_afetado VARCHAR(255) NOT NULL,
    estado_emocional VARCHAR(20) NOT NULL,
    data_registro TIMESTAMP WITH TIME ZONE NOT NULL,
    observacoes TEXT,
    lida BOOLEAN DEFAULT FALSE,
    data_leitura TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_usuario ON alertas_emociograma(usuario_matricula);
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_data ON alertas_emociograma(data_registro);
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_estado ON alertas_emociograma(estado_emocional);
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_resolvido ON alertas_emociograma(resolvido);
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_equipe ON alertas_emociograma(equipe);
CREATE INDEX IF NOT EXISTS idx_alertas_emociograma_letra ON alertas_emociograma(letra);

CREATE INDEX IF NOT EXISTS idx_notificacoes_emociograma_destinatario ON notificacoes_emociograma(destinatario_matricula);
CREATE INDEX IF NOT EXISTS idx_notificacoes_emociograma_lida ON notificacoes_emociograma(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_emociograma_data ON notificacoes_emociograma(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alertas_emociograma_updated_at 
    BEFORE UPDATE ON alertas_emociograma 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE alertas_emociograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_emociograma ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para alertas_emociograma
-- Usuários podem ver seus próprios alertas
CREATE POLICY "Usuários podem ver seus próprios alertas" ON alertas_emociograma
    FOR SELECT USING (
        usuario_matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
    );

-- Líderes e supervisores podem ver alertas de suas equipes/letras
CREATE POLICY "Líderes podem ver alertas de suas letras" ON alertas_emociograma
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            JOIN letras l ON u.letra_id = l.id
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND u.funcao ILIKE '%líder%'
            AND l.letra = alertas_emociograma.letra
        )
    );

CREATE POLICY "Supervisores podem ver alertas de suas equipes" ON alertas_emociograma
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            JOIN equipes e ON u.equipe_id = e.id
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND u.funcao ILIKE '%supervisor%'
            AND e.equipe = alertas_emociograma.equipe
        )
    );

-- Admin e Editor podem ver todos os alertas
CREATE POLICY "Admin e Editor podem ver todos os alertas" ON alertas_emociograma
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND u.role IN ('Admin', 'Editor')
        )
    );

-- Políticas para inserção de alertas (apenas sistema)
CREATE POLICY "Sistema pode inserir alertas" ON alertas_emociograma
    FOR INSERT WITH CHECK (true);

-- Políticas para atualização de alertas
CREATE POLICY "Líderes podem atualizar alertas de suas letras" ON alertas_emociograma
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            LEFT JOIN letras l ON u.letra_id = l.id
            LEFT JOIN equipes e ON u.equipe_id = e.id
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND (
                u.role IN ('Admin', 'Editor')
                OR (u.funcao ILIKE '%líder%' AND l.letra = alertas_emociograma.letra)
                OR (u.funcao ILIKE '%supervisor%' AND e.equipe = alertas_emociograma.equipe)
            )
        )
    );

-- Políticas de segurança para notificacoes_emociograma
-- Usuários podem ver suas próprias notificações
CREATE POLICY "Usuários podem ver suas notificações" ON notificacoes_emociograma
    FOR SELECT USING (
        destinatario_matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
    );

-- Admin e Editor podem ver todas as notificações
CREATE POLICY "Admin e Editor podem ver todas as notificações" ON notificacoes_emociograma
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios u 
            WHERE u.matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
            AND u.role IN ('Admin', 'Editor')
        )
    );

-- Políticas para inserção de notificações (apenas sistema)
CREATE POLICY "Sistema pode inserir notificações" ON notificacoes_emociograma
    FOR INSERT WITH CHECK (true);

-- Políticas para atualização de notificações (marcar como lida)
CREATE POLICY "Usuários podem atualizar suas notificações" ON notificacoes_emociograma
    FOR UPDATE USING (
        destinatario_matricula = CAST((current_setting('request.jwt.claims', true)::json->>'matricula') AS INTEGER)
    );

-- Conceder permissões básicas para as roles
GRANT SELECT, INSERT, UPDATE ON alertas_emociograma TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notificacoes_emociograma TO authenticated;

-- Conceder permissões para role anônima (apenas leitura limitada se necessário)
GRANT SELECT ON alertas_emociograma TO anon;
GRANT SELECT ON notificacoes_emociograma TO anon;

-- Comentários para documentação
COMMENT ON TABLE alertas_emociograma IS 'Registra alertas automáticos para estados emocionais irregulares (regular/péssimo)';
COMMENT ON TABLE notificacoes_emociograma IS 'Registra notificações enviadas para líderes e supervisores sobre alertas de emociograma';

COMMENT ON COLUMN alertas_emociograma.usuario_matricula IS 'Matrícula do usuário que registrou o estado emocional irregular';
COMMENT ON COLUMN alertas_emociograma.estado_emocional IS 'Estado emocional que gerou o alerta (regular ou péssimo)';
COMMENT ON COLUMN alertas_emociograma.lider_matricula IS 'Matrícula do líder responsável pela letra do usuário';
COMMENT ON COLUMN alertas_emociograma.supervisor_matricula IS 'Matrícula do supervisor responsável pela equipe do usuário';
COMMENT ON COLUMN alertas_emociograma.notificado IS 'Indica se as notificações foram enviadas';
COMMENT ON COLUMN alertas_emociograma.resolvido IS 'Indica se o alerta foi resolvido/tratado';

COMMENT ON COLUMN notificacoes_emociograma.tipo IS 'Tipo de destinatário da notificação (lider ou supervisor)';
COMMENT ON COLUMN notificacoes_emociograma.lida IS 'Indica se a notificação foi lida pelo destinatário';