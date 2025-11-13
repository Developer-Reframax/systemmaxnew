-- Migration: Criar tabelas de planos de ação para inspeções
-- Criar tabela de planos de ação
CREATE TABLE IF NOT EXISTS planos_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execucao_id UUID NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    responsavel INTEGER NOT NULL,
    prazo DATE NOT NULL,
    prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
    observacoes TEXT,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de evidências dos planos de ação
CREATE TABLE IF NOT EXISTS evidencias_plano_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plano_acao_id UUID NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    url_storage TEXT NOT NULL,
    tamanho INTEGER NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar chaves estrangeiras
ALTER TABLE planos_acao 
    ADD CONSTRAINT planos_acao_execucao_id_fkey 
    FOREIGN KEY (execucao_id) REFERENCES execucoes_inspecao(id) ON DELETE CASCADE;

ALTER TABLE planos_acao 
    ADD CONSTRAINT planos_acao_responsavel_fkey 
    FOREIGN KEY (responsavel) REFERENCES usuarios(matricula);

ALTER TABLE evidencias_plano_acao 
    ADD CONSTRAINT evidencias_plano_acao_plano_acao_id_fkey 
    FOREIGN KEY (plano_acao_id) REFERENCES planos_acao(id) ON DELETE CASCADE;

-- Criar índices para melhor performance
CREATE INDEX idx_planos_acao_execucao_id ON planos_acao(execucao_id);
CREATE INDEX idx_planos_acao_responsavel ON planos_acao(responsavel);
CREATE INDEX idx_planos_acao_status ON planos_acao(status);
CREATE INDEX idx_planos_acao_prazo ON planos_acao(prazo);
CREATE INDEX idx_evidencias_plano_acao_plano_acao_id ON evidencias_plano_acao(plano_acao_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION atualizar_updated_at_planos_acao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trigger_atualizar_updated_at_planos_acao
    BEFORE UPDATE ON planos_acao
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at_planos_acao();

-- Grant permissions
GRANT ALL ON planos_acao TO authenticated;
GRANT ALL ON evidencias_plano_acao TO authenticated;
GRANT SELECT ON planos_acao TO anon;
GRANT SELECT ON evidencias_plano_acao TO anon;