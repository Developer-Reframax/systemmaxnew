-- =====================================================
-- MÓDULO INSPEÇÕES E CHECKS
-- Migração para criação de todas as tabelas e estruturas
-- =====================================================

-- Criar tabela de categorias de inspeção
CREATE TABLE categorias_inspecao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para categorias
CREATE INDEX idx_categorias_inspecao_nome ON categorias_inspecao(nome);

-- Trigger para updated_at em categorias
CREATE TRIGGER trigger_updated_at_categorias_inspecao
    BEFORE UPDATE ON categorias_inspecao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- Criar tabela de formulários de inspeção
CREATE TABLE formularios_inspecao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    corporativo BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (categoria_id) REFERENCES categorias_inspecao(id)
);

-- Índices para formulários
CREATE INDEX idx_formularios_categoria ON formularios_inspecao(categoria_id);
CREATE INDEX idx_formularios_ativo ON formularios_inspecao(ativo);
CREATE INDEX idx_formularios_corporativo ON formularios_inspecao(corporativo);

-- Trigger para updated_at em formulários
CREATE TRIGGER trigger_updated_at_formularios_inspecao
    BEFORE UPDATE ON formularios_inspecao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- Criar tabela de perguntas do formulário
CREATE TABLE perguntas_formulario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id UUID NOT NULL,
    pergunta TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    permite_conforme BOOLEAN DEFAULT true,
    permite_nao_conforme BOOLEAN DEFAULT true,
    permite_nao_aplica BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (formulario_id) REFERENCES formularios_inspecao(id) ON DELETE CASCADE
);

-- Índices para perguntas
CREATE INDEX idx_perguntas_formulario ON perguntas_formulario(formulario_id);
CREATE INDEX idx_perguntas_ordem ON perguntas_formulario(formulario_id, ordem);

-- =====================================================

-- Criar tabela de execuções de inspeção
CREATE TABLE execucoes_inspecao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id UUID NOT NULL,
    local_id INTEGER NOT NULL,
    matricula_executor INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida', 'cancelada')),
    nota_final DECIMAL(5,2),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_conclusao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (formulario_id) REFERENCES formularios_inspecao(id),
    FOREIGN KEY (local_id) REFERENCES locais(id),
    FOREIGN KEY (matricula_executor) REFERENCES usuarios(matricula)
);

-- Índices para execuções
CREATE INDEX idx_execucoes_formulario ON execucoes_inspecao(formulario_id);
CREATE INDEX idx_execucoes_executor ON execucoes_inspecao(matricula_executor);
CREATE INDEX idx_execucoes_status ON execucoes_inspecao(status);
CREATE INDEX idx_execucoes_data ON execucoes_inspecao(created_at DESC);

-- Trigger para updated_at em execuções
CREATE TRIGGER trigger_updated_at_execucoes_inspecao
    BEFORE UPDATE ON execucoes_inspecao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- Criar tabela de respostas da execução
CREATE TABLE respostas_execucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID NOT NULL,
    pergunta_id UUID NOT NULL,
    resposta VARCHAR(20) NOT NULL CHECK (resposta IN ('conforme', 'nao_conforme', 'nao_aplica')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (execucao_id) REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    FOREIGN KEY (pergunta_id) REFERENCES perguntas_formulario(id),
    
    UNIQUE(execucao_id, pergunta_id)
);

-- Índices para respostas
CREATE INDEX idx_respostas_execucao ON respostas_execucao(execucao_id);
CREATE INDEX idx_respostas_pergunta ON respostas_execucao(pergunta_id);

-- =====================================================

-- Criar tabela de participantes da execução
CREATE TABLE participantes_execucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID NOT NULL,
    matricula_participante INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (execucao_id) REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    FOREIGN KEY (matricula_participante) REFERENCES usuarios(matricula),
    
    UNIQUE(execucao_id, matricula_participante)
);

-- Índices para participantes
CREATE INDEX idx_participantes_execucao ON participantes_execucao(execucao_id);
CREATE INDEX idx_participantes_matricula ON participantes_execucao(matricula_participante);

-- =====================================================
-- FUNÇÃO PARA CÁLCULO DE NOTA
-- =====================================================

-- Função para calcular nota da execução
CREATE OR REPLACE FUNCTION calcular_nota_execucao(execucao_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_respostas INTEGER;
    respostas_conforme INTEGER;
    nota DECIMAL(5,2);
BEGIN
    -- Contar total de respostas (excluindo "não se aplica")
    SELECT COUNT(*) INTO total_respostas
    FROM respostas_execucao
    WHERE execucao_id = execucao_uuid
    AND resposta != 'nao_aplica';
    
    -- Contar respostas conformes
    SELECT COUNT(*) INTO respostas_conforme
    FROM respostas_execucao
    WHERE execucao_id = execucao_uuid
    AND resposta = 'conforme';
    
    -- Calcular nota
    IF total_respostas > 0 THEN
        nota := (respostas_conforme::DECIMAL / total_respostas::DECIMAL) * 100;
    ELSE
        nota := 0;
    END IF;
    
    -- Atualizar execução com a nota
    UPDATE execucoes_inspecao
    SET nota_final = nota,
        updated_at = NOW()
    WHERE id = execucao_uuid;
    
    RETURN nota;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA CÁLCULO AUTOMÁTICO DE NOTA
-- =====================================================

-- Função trigger para recalcular nota quando respostas são alteradas
CREATE OR REPLACE FUNCTION trigger_recalcular_nota_execucao()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular nota da execução
    PERFORM calcular_nota_execucao(COALESCE(NEW.execucao_id, OLD.execucao_id));
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular nota quando respostas são inseridas/atualizadas/deletadas
CREATE TRIGGER trigger_recalcular_nota_insert_update
    AFTER INSERT OR UPDATE ON respostas_execucao
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalcular_nota_execucao();

CREATE TRIGGER trigger_recalcular_nota_delete
    AFTER DELETE ON respostas_execucao
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalcular_nota_execucao();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE categorias_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE perguntas_formulario ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucoes_inspecao ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_execucao ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA CATEGORIAS
-- =====================================================

-- Todos podem visualizar categorias
CREATE POLICY "Todos podem visualizar categorias" ON categorias_inspecao
    FOR SELECT TO authenticated
    USING (true);

-- Gestores podem gerenciar categorias
CREATE POLICY "Gestores podem gerenciar categorias" ON categorias_inspecao
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Qualidade', 'Administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA FORMULÁRIOS
-- =====================================================

-- Usuários veem formulários do contrato ou corporativos
CREATE POLICY "Usuários veem formulários do contrato" ON formularios_inspecao
    FOR SELECT TO authenticated
    USING (
        corporativo = true OR
        EXISTS (
            SELECT 1 FROM usuarios u1
            WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
            AND EXISTS (
                SELECT 1 FROM usuarios u2
                WHERE u2.contrato_raiz = u1.contrato_raiz
            )
        )
    );

-- Gestores podem gerenciar formulários
CREATE POLICY "Gestores podem gerenciar formulários" ON formularios_inspecao
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Qualidade', 'Administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA PERGUNTAS
-- =====================================================

-- Usuários veem perguntas de formulários que podem acessar
CREATE POLICY "Usuários veem perguntas de formulários acessíveis" ON perguntas_formulario
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM formularios_inspecao f
            WHERE f.id = formulario_id
            AND (
                f.corporativo = true OR
                EXISTS (
                    SELECT 1 FROM usuarios u1
                    WHERE u1.matricula = (auth.jwt() ->> 'matricula')::integer
                    AND EXISTS (
                        SELECT 1 FROM usuarios u2
                        WHERE u2.contrato_raiz = u1.contrato_raiz
                    )
                )
            )
        )
    );

-- Gestores podem gerenciar perguntas
CREATE POLICY "Gestores podem gerenciar perguntas" ON perguntas_formulario
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Qualidade', 'Administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA EXECUÇÕES
-- =====================================================

-- Usuários veem suas execuções e participações
CREATE POLICY "Usuários veem suas execuções" ON execucoes_inspecao
    FOR SELECT TO authenticated
    USING (
        matricula_executor = (auth.jwt() ->> 'matricula')::integer OR
        EXISTS (
            SELECT 1 FROM participantes_execucao p
            WHERE p.execucao_id = id
            AND p.matricula_participante = (auth.jwt() ->> 'matricula')::integer
        ) OR
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Qualidade', 'Administrador')
        )
    );

-- Usuários podem criar execuções
CREATE POLICY "Usuários podem criar execuções" ON execucoes_inspecao
    FOR INSERT TO authenticated
    WITH CHECK (
        matricula_executor = (auth.jwt() ->> 'matricula')::integer
    );

-- Usuários podem atualizar suas execuções
CREATE POLICY "Usuários podem atualizar suas execuções" ON execucoes_inspecao
    FOR UPDATE TO authenticated
    USING (
        matricula_executor = (auth.jwt() ->> 'matricula')::integer OR
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE matricula = (auth.jwt() ->> 'matricula')::integer
            AND funcao IN ('Gestor Qualidade', 'Administrador')
        )
    );

-- =====================================================
-- POLÍTICAS PARA RESPOSTAS
-- =====================================================

-- Usuários veem respostas de execuções que podem acessar
CREATE POLICY "Usuários veem respostas de execuções acessíveis" ON respostas_execucao
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM execucoes_inspecao e
            WHERE e.id = execucao_id
            AND (
                e.matricula_executor = (auth.jwt() ->> 'matricula')::integer OR
                EXISTS (
                    SELECT 1 FROM participantes_execucao p
                    WHERE p.execucao_id = e.id
                    AND p.matricula_participante = (auth.jwt() ->> 'matricula')::integer
                ) OR
                EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE matricula = (auth.jwt() ->> 'matricula')::integer
                    AND funcao IN ('Gestor Qualidade', 'Administrador')
                )
            )
        )
    );

-- Usuários podem gerenciar respostas de suas execuções
CREATE POLICY "Usuários podem gerenciar respostas de suas execuções" ON respostas_execucao
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM execucoes_inspecao e
            WHERE e.id = execucao_id
            AND e.matricula_executor = (auth.jwt() ->> 'matricula')::integer
        )
    );

-- =====================================================
-- POLÍTICAS PARA PARTICIPANTES
-- =====================================================

-- Usuários veem participantes de execuções que podem acessar
CREATE POLICY "Usuários veem participantes de execuções acessíveis" ON participantes_execucao
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM execucoes_inspecao e
            WHERE e.id = execucao_id
            AND (
                e.matricula_executor = (auth.jwt() ->> 'matricula')::integer OR
                matricula_participante = (auth.jwt() ->> 'matricula')::integer OR
                EXISTS (
                    SELECT 1 FROM usuarios 
                    WHERE matricula = (auth.jwt() ->> 'matricula')::integer
                    AND funcao IN ('Gestor Qualidade', 'Administrador')
                )
            )
        )
    );

-- Usuários podem gerenciar participantes de suas execuções
CREATE POLICY "Usuários podem gerenciar participantes de suas execuções" ON participantes_execucao
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM execucoes_inspecao e
            WHERE e.id = execucao_id
            AND e.matricula_executor = (auth.jwt() ->> 'matricula')::integer
        )
    );

-- =====================================================
-- PERMISSÕES PARA ROLES
-- =====================================================

-- Conceder permissões para o role authenticated
GRANT ALL PRIVILEGES ON categorias_inspecao TO authenticated;
GRANT ALL PRIVILEGES ON formularios_inspecao TO authenticated;
GRANT ALL PRIVILEGES ON perguntas_formulario TO authenticated;
GRANT ALL PRIVILEGES ON execucoes_inspecao TO authenticated;
GRANT ALL PRIVILEGES ON respostas_execucao TO authenticated;
GRANT ALL PRIVILEGES ON participantes_execucao TO authenticated;

-- Conceder permissões para o role anon (apenas leitura limitada)
GRANT SELECT ON categorias_inspecao TO anon;
GRANT SELECT ON formularios_inspecao TO anon;
GRANT SELECT ON perguntas_formulario TO anon;

-- =====================================================
-- DADOS INICIAIS DE TESTE
-- =====================================================

-- Inserir algumas categorias de exemplo
INSERT INTO categorias_inspecao (nome, descricao) VALUES
('Segurança do Trabalho', 'Inspeções relacionadas à segurança e saúde ocupacional'),
('Qualidade', 'Verificações de qualidade de processos e produtos'),
('Meio Ambiente', 'Auditorias ambientais e sustentabilidade'),
('Infraestrutura', 'Inspeções de instalações e equipamentos'),
('Conformidade Regulatória', 'Verificações de conformidade com normas e regulamentos');

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Módulo de Inspeções e Checks criado com sucesso!
-- Estrutura completa com:
-- - 6 tabelas principais com relacionamentos
-- - Índices para performance
-- - Triggers para updated_at e cálculo automático de notas
-- - Políticas RLS para segurança baseada em contrato_raiz
-- - Função para cálculo de conformidade
-- - Dados iniciais de teste