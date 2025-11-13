-- Migração para corrigir políticas RLS da tabela funcionalidade_usuarios
-- Criada para resolver erro: new row violates row-level security policy

-- Primeiro, vamos remover políticas existentes se houver
DROP POLICY IF EXISTS "funcionalidade_usuarios_select_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_insert_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_update_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_delete_policy" ON funcionalidade_usuarios;

-- Garantir que RLS está habilitado
ALTER TABLE funcionalidade_usuarios ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários autenticados podem ver todos os registros
CREATE POLICY "funcionalidade_usuarios_select_policy" ON funcionalidade_usuarios
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para INSERT - usuários autenticados podem inserir registros
CREATE POLICY "funcionalidade_usuarios_insert_policy" ON funcionalidade_usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para UPDATE - usuários autenticados podem atualizar registros
CREATE POLICY "funcionalidade_usuarios_update_policy" ON funcionalidade_usuarios
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para DELETE - usuários autenticados podem deletar registros
CREATE POLICY "funcionalidade_usuarios_delete_policy" ON funcionalidade_usuarios
    FOR DELETE
    TO authenticated
    USING (true);

-- Garantir permissões básicas para as roles
GRANT ALL PRIVILEGES ON funcionalidade_usuarios TO authenticated;
GRANT SELECT ON funcionalidade_usuarios TO anon;

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'funcionalidade_usuarios';

-- Verificar permissões das roles
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'funcionalidade_usuarios' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee, privilege_type;