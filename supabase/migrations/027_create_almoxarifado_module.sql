-- Migration: Create Almoxarifado Module
-- Description: Complete stockroom management system with items, requisitions, approvals and deliveries

-- Create function for updating updated_at column if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABELA: itens_almoxarifado
-- =====================================================
CREATE TABLE itens_almoxarifado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 0,
    imagem_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_itens_categoria ON itens_almoxarifado(categoria);
CREATE INDEX idx_itens_ativo ON itens_almoxarifado(ativo);
CREATE INDEX idx_itens_estoque ON itens_almoxarifado(estoque_atual);
CREATE INDEX idx_itens_nome ON itens_almoxarifado(nome);

-- =====================================================
-- TABELA: requisicoes
-- =====================================================
CREATE TABLE requisicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_solicitante INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'entregue', 'cancelada')),
    observacoes TEXT,
    matricula_aprovador INTEGER,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    justificativa_aprovacao TEXT,
    matricula_entregador INTEGER,
    data_entrega TIMESTAMP WITH TIME ZONE,
    observacoes_entrega TEXT,
    valor_total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (matricula_solicitante) REFERENCES usuarios(matricula),
    FOREIGN KEY (matricula_aprovador) REFERENCES usuarios(matricula),
    FOREIGN KEY (matricula_entregador) REFERENCES usuarios(matricula)
);

-- Índices
CREATE INDEX idx_requisicoes_solicitante ON requisicoes(matricula_solicitante);
CREATE INDEX idx_requisicoes_status ON requisicoes(status);
CREATE INDEX idx_requisicoes_data ON requisicoes(created_at DESC);
CREATE INDEX idx_requisicoes_aprovador ON requisicoes(matricula_aprovador);

-- =====================================================
-- TABELA: requisicoes_itens
-- =====================================================
CREATE TABLE requisicoes_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisicao_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantidade_solicitada INTEGER NOT NULL,
    quantidade_entregue INTEGER DEFAULT 0,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (requisicao_id) REFERENCES requisicoes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES itens_almoxarifado(id)
);

-- Índices
CREATE INDEX idx_requisicoes_itens_requisicao ON requisicoes_itens(requisicao_id);
CREATE INDEX idx_requisicoes_itens_item ON requisicoes_itens(item_id);

-- =====================================================
-- TABELA: movimentacoes_estoque
-- =====================================================
CREATE TABLE movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    quantidade INTEGER NOT NULL,
    estoque_anterior INTEGER NOT NULL,
    estoque_atual INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    matricula_responsavel INTEGER NOT NULL,
    requisicao_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (item_id) REFERENCES itens_almoxarifado(id),
    FOREIGN KEY (matricula_responsavel) REFERENCES usuarios(matricula),
    FOREIGN KEY (requisicao_id) REFERENCES requisicoes(id)
);

-- Índices
CREATE INDEX idx_movimentacoes_item ON movimentacoes_estoque(item_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque(created_at DESC);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX idx_movimentacoes_responsavel ON movimentacoes_estoque(matricula_responsavel);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION atualizar_estoque_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE itens_almoxarifado 
    SET estoque_atual = NEW.estoque_atual,
        updated_at = NOW()
    WHERE id = NEW.item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_estoque
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_estoque_item();

-- Triggers para updated_at
CREATE TRIGGER trigger_updated_at_itens
    BEFORE UPDATE ON itens_almoxarifado
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_updated_at_requisicoes
    BEFORE UPDATE ON requisicoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE itens_almoxarifado ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - itens_almoxarifado
-- =====================================================

-- Política para leitura (todos os usuários autenticados podem ver itens ativos)
CREATE POLICY "Usuários podem visualizar itens ativos" ON itens_almoxarifado
    FOR SELECT TO authenticated
    USING (ativo = true);

-- Política para gestão (apenas gestores do almoxarifado e administradores)
CREATE POLICY "Gestores podem gerenciar itens" ON itens_almoxarifado
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Almoxarifado', 'Administrador')
        )
    );

-- =====================================================
-- RLS POLICIES - requisicoes
-- =====================================================

-- Usuários podem ver suas próprias requisições
CREATE POLICY "Usuários veem suas requisições" ON requisicoes
    FOR SELECT TO authenticated
    USING (matricula_solicitante = (auth.jwt() ->> 'matricula')::integer);

-- Usuários podem criar suas próprias requisições
CREATE POLICY "Usuários podem criar requisições" ON requisicoes
    FOR INSERT TO authenticated
    WITH CHECK (matricula_solicitante = (auth.jwt() ->> 'matricula')::integer);

-- Usuários podem atualizar suas próprias requisições (apenas se pendente)
CREATE POLICY "Usuários podem atualizar suas requisições pendentes" ON requisicoes
    FOR UPDATE TO authenticated
    USING (
        matricula_solicitante = (auth.jwt() ->> 'matricula')::integer 
        AND status = 'pendente'
    );

-- Líderes e supervisores podem ver requisições para aprovação
CREATE POLICY "Aprovadores veem requisições da equipe" ON requisicoes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u1
            JOIN usuarios u2 ON u2.matricula = requisicoes.matricula_solicitante
            WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
            AND u1.contrato_raiz = u2.contrato_raiz
            AND (
                (u1.funcao = 'Líder' AND u1.letra_id = u2.letra_id) OR
                (u1.funcao = 'Supervisor' AND u1.equipe_id = u2.equipe_id) OR
                u1.funcao IN ('Almoxarifado', 'Gestor Almoxarifado', 'Administrador')
            )
        )
    );

-- Aprovadores podem atualizar requisições da equipe
CREATE POLICY "Aprovadores podem atualizar requisições" ON requisicoes
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u1
            JOIN usuarios u2 ON u2.matricula = requisicoes.matricula_solicitante
            WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
            AND u1.contrato_raiz = u2.contrato_raiz
            AND (
                (u1.funcao = 'Líder' AND u1.letra_id = u2.letra_id) OR
                (u1.funcao = 'Supervisor' AND u1.equipe_id = u2.equipe_id) OR
                u1.funcao IN ('Almoxarifado', 'Gestor Almoxarifado', 'Administrador')
            )
        )
    );

-- =====================================================
-- RLS POLICIES - requisicoes_itens
-- =====================================================

-- Acesso via requisição (herda permissões da requisição)
CREATE POLICY "Acesso via requisição" ON requisicoes_itens
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM requisicoes r
            WHERE r.id = requisicoes_itens.requisicao_id
        )
    );

-- =====================================================
-- RLS POLICIES - movimentacoes_estoque
-- =====================================================

-- Usuários podem ver movimentações do seu contrato
CREATE POLICY "Usuários veem movimentações do contrato" ON movimentacoes_estoque
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.matricula = (auth.jwt() ->> 'matricula')::integer
            AND (
                u.funcao IN ('Almoxarifado', 'Gestor Almoxarifado', 'Administrador') OR
                u.matricula = movimentacoes_estoque.matricula_responsavel
            )
        )
    );

-- Apenas almoxarifado e gestores podem criar movimentações
CREATE POLICY "Almoxarifado pode criar movimentações" ON movimentacoes_estoque
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.matricula = (auth.jwt() ->> 'matricula')::integer
            AND u.funcao IN ('Almoxarifado', 'Gestor Almoxarifado', 'Administrador')
        )
    );

-- =====================================================
-- PERMISSÕES BÁSICAS
-- =====================================================

-- Conceder permissões básicas para usuários autenticados
GRANT SELECT ON itens_almoxarifado TO authenticated;
GRANT ALL PRIVILEGES ON requisicoes TO authenticated;
GRANT ALL PRIVILEGES ON requisicoes_itens TO authenticated;
GRANT SELECT, INSERT ON movimentacoes_estoque TO authenticated;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir categorias padrão de itens
INSERT INTO itens_almoxarifado (nome, descricao, categoria, preco_unitario, estoque_atual, estoque_minimo, imagem_url) VALUES
('Capacete de Segurança Branco', 'Capacete de proteção individual cor branca, classe A', 'EPI', 25.90, 50, 10, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=white%20safety%20helmet%20construction%20hard%20hat%20professional%20equipment&image_size=square'),
('Luvas de Segurança Látex', 'Luvas de proteção em látex natural, antiderrapante', 'EPI', 8.50, 100, 20, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=latex%20safety%20gloves%20work%20protection%20equipment%20industrial&image_size=square'),
('Óculos de Proteção', 'Óculos de segurança com lente transparente, proteção UV', 'EPI', 15.30, 75, 15, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=safety%20glasses%20protective%20eyewear%20clear%20lens%20industrial&image_size=square'),
('Colete Refletivo', 'Colete de alta visibilidade com faixas refletivas', 'EPI', 18.90, 40, 8, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=reflective%20safety%20vest%20high%20visibility%20orange%20construction&image_size=square'),
('Botina de Segurança', 'Botina com bico de aço e solado antiderrapante', 'EPI', 89.90, 30, 6, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=steel%20toe%20safety%20boots%20work%20shoes%20industrial%20protection&image_size=square'),
('Martelo 500g', 'Martelo com cabo de madeira, cabeça de aço 500 gramas', 'Ferramenta', 35.00, 25, 5, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=hammer%20tool%20wooden%20handle%20steel%20head%20construction&image_size=square'),
('Chave de Fenda 6mm', 'Chave de fenda com cabo isolado, ponta 6mm', 'Ferramenta', 12.80, 40, 8, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=screwdriver%20tool%20insulated%20handle%20professional%20equipment&image_size=square'),
('Furadeira Elétrica', 'Furadeira elétrica 650W com maleta e brocas', 'Ferramenta', 180.00, 10, 2, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20drill%20power%20tool%20case%20professional%20equipment&image_size=square'),
('Alicate Universal', 'Alicate universal com cabo isolado, 8 polegadas', 'Ferramenta', 28.50, 20, 4, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=universal%20pliers%20insulated%20handle%20tool%20professional&image_size=square'),
('Trena 5m', 'Trena metálica com trava, 5 metros', 'Ferramenta', 22.90, 15, 3, 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=measuring%20tape%20metal%20ruler%20construction%20tool%205%20meters&image_size=square');

-- Inserir movimentações iniciais de entrada para os itens
INSERT INTO movimentacoes_estoque (item_id, tipo, quantidade, estoque_anterior, estoque_atual, motivo, matricula_responsavel)
SELECT 
    id,
    'entrada',
    estoque_atual,
    0,
    estoque_atual,
    'Estoque inicial do sistema',
    1 -- Assumindo que existe um usuário com matrícula 1
FROM itens_almoxarifado
WHERE EXISTS (SELECT 1 FROM usuarios WHERE matricula = 1);

-- Comentário final
COMMENT ON TABLE itens_almoxarifado IS 'Tabela de itens do almoxarifado (ferramentas e EPIs)';
COMMENT ON TABLE requisicoes IS 'Tabela de requisições de materiais';
COMMENT ON TABLE requisicoes_itens IS 'Tabela de itens das requisições';
COMMENT ON TABLE movimentacoes_estoque IS 'Tabela de movimentações de estoque';