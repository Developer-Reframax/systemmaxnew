-- Migração para corrigir foreign keys na tabela apadrinhamentos
-- Problema: A tabela apadrinhamentos foi criada sem foreign keys explícitas para usuarios
-- Solução: Adicionar constraints de foreign key para estabelecer relacionamentos corretos

-- Primeiro, vamos verificar se existem dados inválidos que possam impedir a criação das foreign keys
-- (Opcional: remover dados órfãos se existirem)

-- Adicionar foreign key para matricula_novato
ALTER TABLE apadrinhamentos 
ADD CONSTRAINT apadrinhamentos_matricula_novato_fkey 
FOREIGN KEY (matricula_novato) REFERENCES usuarios(matricula)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Adicionar foreign key para matricula_padrinho  
ALTER TABLE apadrinhamentos 
ADD CONSTRAINT apadrinhamentos_matricula_padrinho_fkey 
FOREIGN KEY (matricula_padrinho) REFERENCES usuarios(matricula)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Adicionar foreign key para matricula_supervisor
ALTER TABLE apadrinhamentos 
ADD CONSTRAINT apadrinhamentos_matricula_supervisor_fkey 
FOREIGN KEY (matricula_supervisor) REFERENCES usuarios(matricula)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Criar índices adicionais para melhorar performance das consultas com joins
CREATE INDEX IF NOT EXISTS idx_apadrinhamentos_novato_fk ON apadrinhamentos(matricula_novato);
CREATE INDEX IF NOT EXISTS idx_apadrinhamentos_padrinho_fk ON apadrinhamentos(matricula_padrinho);
CREATE INDEX IF NOT EXISTS idx_apadrinhamentos_supervisor_fk ON apadrinhamentos(matricula_supervisor);

-- Comentários sobre as correções:
-- 1. As foreign keys garantem integridade referencial entre apadrinhamentos e usuarios
-- 2. ON DELETE RESTRICT impede exclusão de usuários que estão em apadrinhamentos ativos
-- 3. ON UPDATE CASCADE atualiza automaticamente as matrículas se alteradas na tabela usuarios
-- 4. Os índices melhoram performance de consultas que fazem join entre as tabelas