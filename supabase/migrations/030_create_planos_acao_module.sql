-- Criação da tabela planos_acao para gerenciar planos de ação para não conformidades
CREATE TABLE planos_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execucao_inspecao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE,
    desvio TEXT NOT NULL,
    o_que_fazer TEXT NOT NULL,
    como_fazer TEXT NOT NULL,
    responsavel_matricula INT NOT NULL REFERENCES usuarios(matricula),
    prazo DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    cadastrado_por_matricula INT NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_plano_por_pergunta UNIQUE(execucao_inspecao_id, pergunta_id)
);

-- Criação da tabela evidencias_plano_acao para armazenar evidências dos planos de ação
CREATE TABLE evidencias_plano_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plano_acao_id UUID NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    bucket VARCHAR(100) NOT NULL,
    tipo_evidencia VARCHAR(20) NOT NULL DEFAULT 'nao_conformidade' CHECK (tipo_evidencia IN ('nao_conformidade', 'conclusao')),
    cadastrado_por_matricula INT NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_planos_acao_execucao_inspecao_id ON planos_acao(execucao_inspecao_id);
CREATE INDEX idx_planos_acao_pergunta_id ON planos_acao(pergunta_id);
CREATE INDEX idx_planos_acao_responsavel_matricula ON planos_acao(responsavel_matricula);
CREATE INDEX idx_planos_acao_status ON planos_acao(status);
CREATE INDEX idx_planos_acao_prazo ON planos_acao(prazo);
CREATE INDEX idx_evidencias_plano_acao_plano_acao_id ON evidencias_plano_acao(plano_acao_id);
CREATE INDEX idx_evidencias_plano_acao_tipo_evidencia ON evidencias_plano_acao(tipo_evidencia);

-- Permissões para a tabela planos_acao
GRANT SELECT ON planos_acao TO anon;
GRANT ALL ON planos_acao TO authenticated;
GRANT SELECT ON planos_acao TO service_role;

-- Permissões para a tabela evidencias_plano_acao
GRANT SELECT ON evidencias_plano_acao TO anon;
GRANT ALL ON evidencias_plano_acao TO authenticated;
GRANT SELECT ON evidencias_plano_acao TO service_role;

-- RLS (Row Level Security) para planos_acao
ALTER TABLE planos_acao ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de todos os planos de ação
CREATE POLICY "Permitir leitura de planos de ação" ON planos_acao
    FOR SELECT USING (true);

-- Política para permitir criação de planos de ação por usuários autenticados
CREATE POLICY "Permitir criação de planos de ação" ON planos_acao
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir atualização de planos de ação por usuários autenticados
CREATE POLICY "Permitir atualização de planos de ação" ON planos_acao
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Política para permitir exclusão de planos de ação por usuários autenticados
CREATE POLICY "Permitir exclusão de planos de ação" ON planos_acao
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS para evidencias_plano_acao
ALTER TABLE evidencias_plano_acao ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de todas as evidências
CREATE POLICY "Permitir leitura de evidências" ON evidencias_plano_acao
    FOR SELECT USING (true);

-- Política para permitir criação de evidências por usuários autenticados
CREATE POLICY "Permitir criação de evidências" ON evidencias_plano_acao
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para permitir exclusão de evidências por usuários autenticados
CREATE POLICY "Permitir exclusão de evidências" ON evidencias_plano_acao
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at na tabela planos_acao
CREATE TRIGGER update_planos_acao_updated_at
    BEFORE UPDATE ON planos_acao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();