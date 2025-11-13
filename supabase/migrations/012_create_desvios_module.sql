-- Migração 012: Criar módulo de Relatos/Desvios de Segurança
-- Criado em: 2024
-- Descrição: Tabelas para gestão de desvios de segurança com fluxo automatizado

-- Criar tabela desvios
CREATE TABLE desvios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_user VARCHAR(20) NOT NULL,
  descricao TEXT NOT NULL,
  natureza_id UUID NOT NULL,
  contrato VARCHAR(50) NOT NULL,
  local VARCHAR(255) NOT NULL,
  riscoassociado_id UUID NOT NULL,
  tipo_id UUID NOT NULL,
  responsavel VARCHAR(20),
  equipe_id UUID,
  potencial VARCHAR(50) NOT NULL CHECK (potencial IN ('Intolerável', 'Substancial', 'Moderado', 'Trivial')),
  acao TEXT,
  observacao TEXT,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  ver_agir BOOLEAN NOT NULL DEFAULT false,
  data_limite TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'Aguardando Avaliação' CHECK (status IN ('Aguardando Avaliação', 'Em Andamento', 'Concluído', 'Vencido')),
  potencial_local VARCHAR(255),
  acao_cliente BOOLEAN DEFAULT false,
  gerou_recusa BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para desvios
CREATE INDEX idx_desvios_matricula_user ON desvios(matricula_user);
CREATE INDEX idx_desvios_responsavel ON desvios(responsavel);
CREATE INDEX idx_desvios_status ON desvios(status);
CREATE INDEX idx_desvios_contrato ON desvios(contrato);
CREATE INDEX idx_desvios_data_limite ON desvios(data_limite);
CREATE INDEX idx_desvios_created_at ON desvios(created_at DESC);

-- Criar tabela imagens_desvios
CREATE TABLE imagens_desvios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desvio_id UUID NOT NULL REFERENCES desvios(id) ON DELETE CASCADE,
  categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('desvio', 'evidencia')),
  nome_arquivo VARCHAR(255) NOT NULL,
  url_storage TEXT NOT NULL,
  tamanho INTEGER,
  tipo_mime VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para imagens_desvios
CREATE INDEX idx_imagens_desvios_desvio_id ON imagens_desvios(desvio_id);
CREATE INDEX idx_imagens_desvios_categoria ON imagens_desvios(categoria);

-- Criar tabela configuracoes_desvios
CREATE TABLE configuracoes_desvios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato VARCHAR(50) NOT NULL UNIQUE,
  evidencias_obrigatorias BOOLEAN DEFAULT false,
  imagens_obrigatorias BOOLEAN DEFAULT false,
  imagens_obrigatorias_condicao VARCHAR(50) DEFAULT 'todos' CHECK (imagens_obrigatorias_condicao IN ('todos', 'intoleravel', 'recusa')),
  prazo_padrao_dias INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para todas as tabelas
ALTER TABLE desvios ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_desvios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_desvios ENABLE ROW LEVEL SECURITY;

-- Conceder permissões para roles
GRANT SELECT, INSERT, UPDATE, DELETE ON desvios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON imagens_desvios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON configuracoes_desvios TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON desvios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON imagens_desvios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON configuracoes_desvios TO anon;

-- Criar políticas RLS
CREATE POLICY "Usuários autenticados podem gerenciar desvios" ON desvios FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuários anônimos podem gerenciar desvios" ON desvios FOR ALL TO anon USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar imagens" ON imagens_desvios FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuários anônimos podem gerenciar imagens" ON imagens_desvios FOR ALL TO anon USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar configurações" ON configuracoes_desvios FOR ALL TO authenticated USING (true);
CREATE POLICY "Usuários anônimos podem gerenciar configurações" ON configuracoes_desvios FOR ALL TO anon USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_desvios_updated_at 
  BEFORE UPDATE ON desvios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at 
  BEFORE UPDATE ON configuracoes_desvios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar status vencidos automaticamente
CREATE OR REPLACE FUNCTION atualizar_status_vencidos()
RETURNS void AS $$
BEGIN
  UPDATE desvios 
  SET status = 'Vencido', updated_at = NOW()
  WHERE status IN ('Aguardando Avaliação', 'Em Andamento')
    AND data_limite < NOW()
    AND data_conclusao IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE desvios IS 'Tabela principal para registro de desvios de segurança';
COMMENT ON TABLE imagens_desvios IS 'Armazenamento de imagens relacionadas aos desvios';
COMMENT ON TABLE configuracoes_desvios IS 'Configurações específicas por contrato para o módulo de desvios';

-- Inserir configuração padrão para contratos existentes
INSERT INTO configuracoes_desvios (contrato, evidencias_obrigatorias, imagens_obrigatorias, prazo_padrao_dias)
SELECT DISTINCT codigo, false, false, 30
FROM contratos
WHERE codigo IS NOT NULL
ON CONFLICT (contrato) DO NOTHING;