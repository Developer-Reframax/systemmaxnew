-- Migração para criar tabelas do módulo de Parametrização de Segurança
-- Data: 2024
-- Descrição: Criação das tabelas potenciais, natureza, tipos e riscos_associados

-- Tabela de Potenciais
CREATE TABLE potenciais (
    id SERIAL PRIMARY KEY,
    potencial_sede VARCHAR(50) NOT NULL CHECK (potencial_sede IN ('Risco Intolerável', 'Risco Substancial', 'Risco Moderado', 'Risco Trivial')),
    potencial_local VARCHAR(100) NOT NULL,
    contrato VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(potencial_sede, contrato)
);

-- Criar índices para potenciais
CREATE INDEX idx_potenciais_contrato ON potenciais(contrato);
CREATE INDEX idx_potenciais_sede ON potenciais(potencial_sede);

-- Políticas RLS para potenciais
ALTER TABLE potenciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem ver potenciais" ON potenciais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir potenciais" ON potenciais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar potenciais" ON potenciais FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar potenciais" ON potenciais FOR DELETE TO authenticated USING (true);

-- Tabela de Natureza
CREATE TABLE natureza (
    id SERIAL PRIMARY KEY,
    natureza VARCHAR(100) NOT NULL,
    contrato VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(natureza, contrato)
);

-- Criar índices para natureza
CREATE INDEX idx_natureza_contrato ON natureza(contrato);
CREATE INDEX idx_natureza_nome ON natureza(natureza);

-- Políticas RLS para natureza
ALTER TABLE natureza ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem ver natureza" ON natureza FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir natureza" ON natureza FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar natureza" ON natureza FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar natureza" ON natureza FOR DELETE TO authenticated USING (true);

-- Tabela de Tipos
CREATE TABLE tipos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    contrato VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tipo, contrato)
);

-- Criar índices para tipos
CREATE INDEX idx_tipos_contrato ON tipos(contrato);
CREATE INDEX idx_tipos_nome ON tipos(tipo);

-- Políticas RLS para tipos
ALTER TABLE tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem ver tipos" ON tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir tipos" ON tipos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar tipos" ON tipos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar tipos" ON tipos FOR DELETE TO authenticated USING (true);

-- Tabela de Riscos Associados
CREATE TABLE riscos_associados (
    id SERIAL PRIMARY KEY,
    risco_associado VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para riscos associados
CREATE INDEX idx_riscos_associados_categoria ON riscos_associados(categoria);
CREATE INDEX idx_riscos_associados_nome ON riscos_associados(risco_associado);

-- Políticas RLS para riscos associados
ALTER TABLE riscos_associados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem ver riscos associados" ON riscos_associados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir riscos associados" ON riscos_associados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar riscos associados" ON riscos_associados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar riscos associados" ON riscos_associados FOR DELETE TO authenticated USING (true);

-- Dados iniciais para riscos associados
INSERT INTO riscos_associados (risco_associado, descricao, categoria) VALUES
('Queda de altura', 'Risco de queda em trabalhos em altura', 'Físico'),
('Choque elétrico', 'Risco de choque em instalações elétricas', 'Elétrico'),
('Exposição a produtos químicos', 'Risco de exposição a substâncias químicas', 'Químico');

-- Conceder permissões às roles anon e authenticated
GRANT SELECT ON potenciais TO anon;
GRANT ALL PRIVILEGES ON potenciais TO authenticated;

GRANT SELECT ON natureza TO anon;
GRANT ALL PRIVILEGES ON natureza TO authenticated;

GRANT SELECT ON tipos TO anon;
GRANT ALL PRIVILEGES ON tipos TO authenticated;

GRANT SELECT ON riscos_associados TO anon;
GRANT ALL PRIVILEGES ON riscos_associados TO authenticated;

-- Comentários nas tabelas
COMMENT ON TABLE potenciais IS 'Tabela para parametrização de potenciais de risco por contrato';
COMMENT ON TABLE natureza IS 'Tabela para parametrização de naturezas por contrato';
COMMENT ON TABLE tipos IS 'Tabela para parametrização de tipos por contrato';
COMMENT ON TABLE riscos_associados IS 'Tabela para parametrização de riscos associados';