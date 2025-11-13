-- Verificar e corrigir permissões para as tabelas modulos e modulo_funcionalidades

-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('modulos', 'modulo_funcionalidades')
ORDER BY table_name, grantee;

-- Conceder permissões para a role authenticated
GRANT SELECT ON modulos TO authenticated;
GRANT SELECT ON modulo_funcionalidades TO authenticated;

-- Conceder permissões para a role anon (se necessário)
GRANT SELECT ON modulos TO anon;
GRANT SELECT ON modulo_funcionalidades TO anon;

-- Verificar se RLS está habilitado e criar políticas se necessário

-- Política para modulos
DROP POLICY IF EXISTS "Allow read access to modulos" ON modulos;
CREATE POLICY "Allow read access to modulos" ON modulos
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Política para modulo_funcionalidades
DROP POLICY IF EXISTS "Allow read access to modulo_funcionalidades" ON modulo_funcionalidades;
CREATE POLICY "Allow read access to modulo_funcionalidades" ON modulo_funcionalidades
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Verificar dados nas tabelas
SELECT 'Contagem de módulos:' as info, COUNT(*) as total FROM modulos;
SELECT 'Contagem de funcionalidades:' as info, COUNT(*) as total FROM modulo_funcionalidades;

-- Verificar permissões após as alterações
SELECT 'Permissões após correção:' as info;
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
AND table_name IN ('modulos', 'modulo_funcionalidades')
ORDER BY table_name, grantee;