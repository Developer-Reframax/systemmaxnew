-- Criar bucket para armazenar evidências dos planos de ação
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidencias-planos-acao', 'evidencias-planos-acao', true, 52428800, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

-- Criar políticas de acesso para o bucket
-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública" ON storage.objects
    FOR SELECT USING (bucket_id = 'evidencias-planos-acao');

-- Permitir upload para usuários autenticados
CREATE POLICY "Permitir upload autenticado" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'evidencias-planos-acao');

-- Permitir update para usuários autenticados
CREATE POLICY "Permitir update autenticado" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'evidencias-planos-acao');

-- Permitir delete para usuários autenticados
CREATE POLICY "Permitir delete autenticado" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'evidencias-planos-acao');