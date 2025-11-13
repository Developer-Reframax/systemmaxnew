-- Criar bucket para armazenar imagens de desvios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'desvios-images',
  'desvios-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'desvios-images');

-- Política para permitir que usuários autenticados vejam suas próprias imagens
CREATE POLICY "Users can view their own images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'desvios-images');

-- Política para permitir acesso público de leitura (para visualização das imagens)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'desvios-images');

-- Política para permitir que usuários autenticados deletem suas próprias imagens
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'desvios-images');

-- Garantir permissões para as tabelas relacionadas
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO authenticated;

-- Permitir acesso anônimo para leitura das imagens
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;