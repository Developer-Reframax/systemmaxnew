-- Migração para corrigir tipos de dados e chaves estrangeiras na tabela desvios
-- Problema: natureza_id, tipo_id e riscoassociado_id estão como UUID mas as tabelas referenciadas usam INTEGER

-- 1. Primeiro, vamos alterar os tipos de dados das colunas de UUID para INTEGER
ALTER TABLE desvios 
  ALTER COLUMN natureza_id TYPE INTEGER USING NULL,
  ALTER COLUMN tipo_id TYPE INTEGER USING NULL,
  ALTER COLUMN riscoassociado_id TYPE INTEGER USING NULL;

-- 2. Adicionar as constraints de chave estrangeira
ALTER TABLE desvios 
  ADD CONSTRAINT fk_desvios_natureza 
    FOREIGN KEY (natureza_id) 
    REFERENCES natureza(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;

ALTER TABLE desvios 
  ADD CONSTRAINT fk_desvios_tipos 
    FOREIGN KEY (tipo_id) 
    REFERENCES tipos(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;

ALTER TABLE desvios 
  ADD CONSTRAINT fk_desvios_riscos_associados 
    FOREIGN KEY (riscoassociado_id) 
    REFERENCES riscos_associados(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;

-- 3. Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_desvios_natureza_id ON desvios(natureza_id);
CREATE INDEX IF NOT EXISTS idx_desvios_tipo_id ON desvios(tipo_id);
CREATE INDEX IF NOT EXISTS idx_desvios_riscoassociado_id ON desvios(riscoassociado_id);

-- 4. Comentários para documentação
COMMENT ON CONSTRAINT fk_desvios_natureza ON desvios IS 'Chave estrangeira para tabela natureza';
COMMENT ON CONSTRAINT fk_desvios_tipos ON desvios IS 'Chave estrangeira para tabela tipos';
COMMENT ON CONSTRAINT fk_desvios_riscos_associados ON desvios IS 'Chave estrangeira para tabela riscos_associados';