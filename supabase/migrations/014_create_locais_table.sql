-- Migração para criar tabela de locais no módulo de Parametrização de Segurança
-- Data: 2024
-- Descrição: Criação da tabela locais para parametrização de locais por contrato

-- Tabela de Locais
CREATE TABLE locais (
    id SERIAL PRIMARY KEY,
    local VARCHAR(100) NOT NULL,
    contrato VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(local, contrato)
);

-- Criar índices para locais
CREATE INDEX idx_locais_contrato ON locais(contrato);
CREATE INDEX idx_locais_nome ON locais(local);

-- Habilitar RLS
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para locais
CREATE POLICY "Usuários autenticados podem ver locais" ON locais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir locais" ON locais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar locais" ON locais FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar locais" ON locais FOR DELETE TO authenticated USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_locais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_locais_updated_at_trigger
    BEFORE UPDATE ON locais
    FOR EACH ROW
    EXECUTE FUNCTION update_locais_updated_at();

-- Dados iniciais serão inseridos após verificar contratos existentes

-- Conceder permissões às roles anon e authenticated
GRANT SELECT ON locais TO anon;
GRANT ALL PRIVILEGES ON locais TO authenticated;

-- Comentário na tabela
COMMENT ON TABLE locais IS 'Tabela para parametrização de locais por contrato';