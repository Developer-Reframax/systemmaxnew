-- Migração 017: Criar módulo OAC (Observações Comportamentais)
-- Data: 2024-12-01
-- Descrição: Criação das tabelas para o módulo de Observações Comportamentais

-- Função para atualizar updated_at (caso não exista)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TABELA: categorias_oac
-- =====================================================
CREATE TABLE categorias_oac (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria VARCHAR(100) NOT NULL,
    topico_categoria TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para categorias_oac
CREATE INDEX idx_categorias_oac_categoria ON categorias_oac(categoria);

-- RLS para categorias_oac
ALTER TABLE categorias_oac ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar categorias" ON categorias_oac
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar categorias" ON categorias_oac
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_categorias_oac_updated_at
    BEFORE UPDATE ON categorias_oac
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA: subcategorias_oac
-- =====================================================
CREATE TABLE subcategorias_oac (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_pai UUID NOT NULL REFERENCES categorias_oac(id) ON DELETE CASCADE,
    subcategoria VARCHAR(150) NOT NULL,
    topico_subcategoria TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para subcategorias_oac
CREATE INDEX idx_subcategorias_oac_categoria_pai ON subcategorias_oac(categoria_pai);
CREATE INDEX idx_subcategorias_oac_subcategoria ON subcategorias_oac(subcategoria);

-- RLS para subcategorias_oac
ALTER TABLE subcategorias_oac ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar subcategorias" ON subcategorias_oac
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar subcategorias" ON subcategorias_oac
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_subcategorias_oac_updated_at
    BEFORE UPDATE ON subcategorias_oac
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA: oacs
-- =====================================================
CREATE TABLE oacs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe VARCHAR(100) NOT NULL,
    local VARCHAR(200) NOT NULL,
    datahora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    tempo_observacao INTEGER NOT NULL CHECK (tempo_observacao > 0),
    observador INTEGER NOT NULL REFERENCES usuarios(matricula),
    qtd_pessoas_local INTEGER NOT NULL CHECK (qtd_pessoas_local >= 0),
    qtd_pessoas_abordadas INTEGER NOT NULL CHECK (qtd_pessoas_abordadas >= 0),
    contrato VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para oacs
CREATE INDEX idx_oacs_datahora_inicio ON oacs(datahora_inicio DESC);
CREATE INDEX idx_oacs_observador ON oacs(observador);
CREATE INDEX idx_oacs_local ON oacs(local);
CREATE INDEX idx_oacs_equipe ON oacs(equipe);
CREATE INDEX idx_oacs_contrato ON oacs(contrato);

-- RLS para oacs
ALTER TABLE oacs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar OACs" ON oacs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem criar OACs" ON oacs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem atualizar OACs" ON oacs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_oacs_updated_at
    BEFORE UPDATE ON oacs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA: planos_acao_oac
-- =====================================================
CREATE TABLE planos_acao_oac (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oac_id UUID NOT NULL REFERENCES oacs(id) ON DELETE CASCADE,
    acao_recomendada TEXT,
    reconhecimento TEXT,
    condicao_abaixo_padrao TEXT,
    compromisso_formado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para planos_acao_oac
CREATE INDEX idx_planos_acao_oac_oac_id ON planos_acao_oac(oac_id);

-- RLS para planos_acao_oac
ALTER TABLE planos_acao_oac ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem gerenciar planos de ação" ON planos_acao_oac
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: desvios_oac
-- =====================================================
CREATE TABLE desvios_oac (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oac_id UUID NOT NULL REFERENCES oacs(id) ON DELETE CASCADE,
    item_desvio UUID NOT NULL REFERENCES subcategorias_oac(id),
    quantidade_desvios INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_desvios >= 0),
    descricao_desvio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para desvios_oac
CREATE INDEX idx_desvios_oac_oac_id ON desvios_oac(oac_id);
CREATE INDEX idx_desvios_oac_item_desvio ON desvios_oac(item_desvio);

-- RLS para desvios_oac
ALTER TABLE desvios_oac ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem gerenciar desvios" ON desvios_oac
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir categorias iniciais
INSERT INTO categorias_oac (categoria, topico_categoria) VALUES
('Comportamento Seguro', 'Avaliação de comportamentos seguros dos colaboradores'),
('Uso de EPIs', 'Verificação do uso correto de equipamentos de proteção individual'),
('Procedimentos', 'Cumprimento de procedimentos operacionais padrão'),
('Condições do Ambiente', 'Avaliação das condições de segurança do ambiente de trabalho');

-- Inserir subcategorias iniciais
INSERT INTO subcategorias_oac (categoria_pai, subcategoria, topico_subcategoria) 
SELECT c.id, s.subcategoria, s.topico_subcategoria
FROM categorias_oac c
CROSS JOIN (VALUES
    ('Comportamento Seguro', 'Postura Corporal', 'Avaliação da postura durante execução das atividades'),
    ('Comportamento Seguro', 'Atenção e Foco', 'Nível de atenção e concentração na tarefa'),
    ('Comportamento Seguro', 'Comunicação', 'Qualidade da comunicação entre equipe'),
    ('Uso de EPIs', 'Capacete', 'Uso correto do capacete de segurança'),
    ('Uso de EPIs', 'Óculos de Proteção', 'Uso adequado de óculos de proteção'),
    ('Uso de EPIs', 'Luvas', 'Uso correto de luvas de proteção'),
    ('Uso de EPIs', 'Calçado de Segurança', 'Uso adequado de calçados de segurança'),
    ('Procedimentos', 'Bloqueio e Etiquetagem', 'Cumprimento dos procedimentos de LOTO'),
    ('Procedimentos', 'Permissão de Trabalho', 'Verificação de permissões necessárias'),
    ('Procedimentos', 'Análise de Risco', 'Execução adequada de análise de riscos'),
    ('Condições do Ambiente', 'Organização e Limpeza', 'Estado de organização da área de trabalho'),
    ('Condições do Ambiente', 'Sinalização', 'Adequação da sinalização de segurança'),
    ('Condições do Ambiente', 'Iluminação', 'Adequação da iluminação do ambiente')
) AS s(cat_nome, subcategoria, topico_subcategoria)
WHERE c.categoria = s.cat_nome;

-- =====================================================
-- PERMISSÕES PARA ROLES
-- =====================================================

-- Conceder permissões para role anon
GRANT SELECT ON categorias_oac TO anon;
GRANT SELECT ON subcategorias_oac TO anon;

-- Conceder permissões para role authenticated
GRANT ALL PRIVILEGES ON categorias_oac TO authenticated;
GRANT ALL PRIVILEGES ON subcategorias_oac TO authenticated;
GRANT ALL PRIVILEGES ON oacs TO authenticated;
GRANT ALL PRIVILEGES ON planos_acao_oac TO authenticated;
GRANT ALL PRIVILEGES ON desvios_oac TO authenticated;

-- Comentários nas tabelas
COMMENT ON TABLE categorias_oac IS 'Categorias para classificação das observações comportamentais';
COMMENT ON TABLE subcategorias_oac IS 'Subcategorias detalhadas para avaliação específica';
COMMENT ON TABLE oacs IS 'Registro principal das observações comportamentais realizadas';
COMMENT ON TABLE planos_acao_oac IS 'Planos de ação associados às observações comportamentais';
COMMENT ON TABLE desvios_oac IS 'Desvios observados durante as OACs com suas quantidades e descrições';