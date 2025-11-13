-- Migration: Create Almoxarifado Images Storage Bucket
-- Description: Create storage bucket for almoxarifado item images with proper policies

-- Create bucket for almoxarifado item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'almoxarifado-images',
  'almoxarifado-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated users to upload images
CREATE POLICY "Authenticated users can upload almoxarifado images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'almoxarifado-images');

-- Policy for authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update almoxarifado images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'almoxarifado-images');

-- Policy for authenticated users to delete images (restricted to admins and managers)
CREATE POLICY "Admins can delete almoxarifado images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'almoxarifado-images' 
  AND EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.matricula::text = (auth.jwt() ->> 'matricula')
    AND u.funcao IN ('Administrador', 'Gestor Almoxarifado')
  )
);

-- Policy for public read access to images
CREATE POLICY "Public can view almoxarifado images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'almoxarifado-images');

-- Grant necessary permissions
GRANT SELECT ON storage.buckets TO anon;
GRANT SELECT ON storage.objects TO anon;