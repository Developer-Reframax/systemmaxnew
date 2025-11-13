-- Migração para criar o módulo de Interações
-- Data: 2025-01-05
-- Descrição: Criação de todas as tabelas necessárias para o módulo de interações

-- Tabela de tipos de interação
CREATE TABLE interacao_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tipo, contrato_id)
);

-- Tabela de unidades de interação
CREATE TABLE interacao_unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(unidade, contrato_id)
);

-- Tabela de áreas de interação
CREATE TABLE interacao_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(area, contrato_id)
);

-- Tabela de classificações
CREATE TABLE interacao_classificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classificacao VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(classificacao, contrato_id)
);

-- Tabela de violações
CREATE TABLE interacao_violacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violacao VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(violacao, contrato_id)
);

-- Tabela de grandes riscos
CREATE TABLE interacao_grandes_riscos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grandes_riscos VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grandes_riscos, contrato_id)
);

-- Tabela de locais de instalação
CREATE TABLE interacao_local_instalacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_instalacao VARCHAR(100) NOT NULL,
    contrato_id VARCHAR(20) NOT NULL REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(local_instalacao, contrato_id)
);

-- Tabela principal de interações
CREATE TABLE interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_id UUID NOT NULL REFERENCES interacao_tipos(id),
    metodo_coach VARCHAR(10) NOT NULL CHECK (metodo_coach IN ('Sim', 'Não')),
    data DATE NOT NULL,
    unidade_id UUID NOT NULL REFERENCES interacao_unidades(id),
    empresa VARCHAR(100) NOT NULL,
    area_id UUID NOT NULL REFERENCES interacao_areas(id),
    local_id INTEGER NOT NULL REFERENCES locais(id),
    houve_desvios VARCHAR(10) NOT NULL CHECK (houve_desvios IN ('Sim', 'Não')),
    descricao TEXT NOT NULL,
    acao TEXT,
    evento VARCHAR(20) NOT NULL CHECK (evento IN ('ROTINA', 'PARADA')),
    violacao_id UUID REFERENCES interacao_violacoes(id),
    instante VARCHAR(30) NOT NULL CHECK (instante IN ('N/A', 'HORA SEGURA', 'INSPEÇÃO DE SEGURANÇA')),
    grande_risco_id UUID REFERENCES interacao_grandes_riscos(id),
    matricula_colaborador INTEGER NOT NULL REFERENCES usuarios(matricula),
    matricula_coordenador INTEGER REFERENCES usuarios(matricula),
    classificacao_id UUID NOT NULL REFERENCES interacao_classificacoes(id),
    local_interacao_id UUID NOT NULL REFERENCES interacao_local_instalacao(id),
    matricula_supervisor INTEGER REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_interacoes_data ON interacoes(data DESC);
CREATE INDEX idx_interacoes_tipo_id ON interacoes(tipo_id);
CREATE INDEX idx_interacoes_matricula_colaborador ON interacoes(matricula_colaborador);
CREATE INDEX idx_interacoes_created_at ON interacoes(created_at DESC);

-- Índices para tabelas de configuração
CREATE INDEX idx_interacao_tipos_contrato ON interacao_tipos(contrato_id);
CREATE INDEX idx_interacao_unidades_contrato ON interacao_unidades(contrato_id);
CREATE INDEX idx_interacao_areas_contrato ON interacao_areas(contrato_id);
CREATE INDEX idx_interacao_classificacoes_contrato ON interacao_classificacoes(contrato_id);
CREATE INDEX idx_interacao_violacoes_contrato ON interacao_violacoes(contrato_id);
CREATE INDEX idx_interacao_grandes_riscos_contrato ON interacao_grandes_riscos(contrato_id);
CREATE INDEX idx_interacao_local_instalacao_contrato ON interacao_local_instalacao(contrato_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE interacao_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_classificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_violacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_grandes_riscos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacao_local_instalacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver tipos" ON interacao_tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver unidades" ON interacao_unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver áreas" ON interacao_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver classificações" ON interacao_classificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver violações" ON interacao_violacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver grandes riscos" ON interacao_grandes_riscos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver locais instalação" ON interacao_local_instalacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem ver interações" ON interacoes FOR SELECT TO authenticated USING (true);

-- Políticas para inserção/atualização (apenas usuários autenticados)
CREATE POLICY "Usuários autenticados podem inserir interações" ON interacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar interações" ON interacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar interações" ON interacoes FOR DELETE TO authenticated USING (true);

-- Políticas para configurações (CRUD completo para usuários autenticados)
CREATE POLICY "Usuários autenticados podem inserir tipos" ON interacao_tipos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar tipos" ON interacao_tipos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar tipos" ON interacao_tipos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir unidades" ON interacao_unidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar unidades" ON interacao_unidades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar unidades" ON interacao_unidades FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir áreas" ON interacao_areas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar áreas" ON interacao_areas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar áreas" ON interacao_areas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir classificações" ON interacao_classificacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar classificações" ON interacao_classificacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar classificações" ON interacao_classificacoes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir violações" ON interacao_violacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar violações" ON interacao_violacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar violações" ON interacao_violacoes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir grandes riscos" ON interacao_grandes_riscos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar grandes riscos" ON interacao_grandes_riscos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar grandes riscos" ON interacao_grandes_riscos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir locais instalação" ON interacao_local_instalacao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar locais instalação" ON interacao_local_instalacao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar locais instalação" ON interacao_local_instalacao FOR DELETE TO authenticated USING (true);

-- Permissões para role anon (leitura básica)
GRANT SELECT ON interacao_tipos TO anon;
GRANT SELECT ON interacao_unidades TO anon;
GRANT SELECT ON interacao_areas TO anon;
GRANT SELECT ON interacao_classificacoes TO anon;
GRANT SELECT ON interacao_violacoes TO anon;
GRANT SELECT ON interacao_grandes_riscos TO anon;
GRANT SELECT ON interacao_local_instalacao TO anon;

-- Permissões completas para role authenticated
GRANT ALL PRIVILEGES ON interacao_tipos TO authenticated;
GRANT ALL PRIVILEGES ON interacao_unidades TO authenticated;
GRANT ALL PRIVILEGES ON interacao_areas TO authenticated;
GRANT ALL PRIVILEGES ON interacao_classificacoes TO authenticated;
GRANT ALL PRIVILEGES ON interacao_violacoes TO authenticated;
GRANT SELECT ON interacao_grandes_riscos TO authenticated;
GRANT ALL PRIVILEGES ON interacao_local_instalacao TO authenticated;
GRANT ALL PRIVILEGES ON interacoes TO authenticated;

-- Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas as tabelas
CREATE TRIGGER update_interacao_tipos_updated_at BEFORE UPDATE ON interacao_tipos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_unidades_updated_at BEFORE UPDATE ON interacao_unidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_areas_updated_at BEFORE UPDATE ON interacao_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_classificacoes_updated_at BEFORE UPDATE ON interacao_classificacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_violacoes_updated_at BEFORE UPDATE ON interacao_violacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_grandes_riscos_updated_at BEFORE UPDATE ON interacao_grandes_riscos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacao_local_instalacao_updated_at BEFORE UPDATE ON interacao_local_instalacao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interacoes_updated_at BEFORE UPDATE ON interacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dados de teste serão inseridos via API após a criação das tabelas