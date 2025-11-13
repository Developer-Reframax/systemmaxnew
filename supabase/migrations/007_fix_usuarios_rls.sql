-- Migração para criar políticas RLS para a tabela usuarios
-- Problema: RLS estava habilitado mas sem políticas, bloqueando todas as consultas

-- Criar políticas RLS para a tabela usuarios
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "usuarios_delete_policy" ON usuarios
    FOR DELETE
    TO authenticated
    USING (true);

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'usuarios';