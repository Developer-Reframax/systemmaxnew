-- Verificar permissões atuais da tabela imagens_desvios
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'imagens_desvios' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões para os roles anon e authenticated
GRANT SELECT ON imagens_desvios TO anon;
GRANT ALL PRIVILEGES ON imagens_desvios TO authenticated;

-- Verificar permissões após concessão
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'imagens_desvios' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;