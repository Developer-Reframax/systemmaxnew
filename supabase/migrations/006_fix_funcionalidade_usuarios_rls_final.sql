-- Migração para ajustar políticas RLS da tabela funcionalidade_usuarios
-- seguindo o modelo de usuario_contratos

-- Primeiro, vamos remover as políticas existentes se houver
DROP POLICY IF EXISTS "funcionalidade_usuarios_select_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_insert_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_update_policy" ON funcionalidade_usuarios;
DROP POLICY IF EXISTS "funcionalidade_usuarios_delete_policy" ON funcionalidade_usuarios;

-- Garantir que RLS está habilitado
ALTER TABLE funcionalidade_usuarios ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS seguindo o modelo de usuario_contratos
-- Permitir SELECT para usuários autenticados
CREATE POLICY "funcionalidade_usuarios_select_policy" ON funcionalidade_usuarios
    FOR SELECT USING (true);

-- Permitir INSERT para usuários autenticados
CREATE POLICY "funcionalidade_usuarios_insert_policy" ON funcionalidade_usuarios
    FOR INSERT WITH CHECK (true);

-- Permitir UPDATE para usuários autenticados
CREATE POLICY "funcionalidade_usuarios_update_policy" ON funcionalidade_usuarios
    FOR UPDATE USING (true) WITH CHECK (true);

-- Permitir DELETE para usuários autenticados
CREATE POLICY "funcionalidade_usuarios_delete_policy" ON funcionalidade_usuarios
    FOR DELETE USING (true);

-- Garantir permissões para as roles anon e authenticated
GRANT ALL PRIVILEGES ON funcionalidade_usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON funcionalidade_usuarios TO anon;

-- Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'funcionalidade_usuarios'
ORDER BY policyname;

-- Verificar permissões das roles
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'funcionalidade_usuarios'
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;