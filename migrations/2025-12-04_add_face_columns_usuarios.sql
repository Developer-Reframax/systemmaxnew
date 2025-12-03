-- Adiciona campos para biometria facial no perfil de usuarios
DO $$
BEGIN
  -- Vetores/descritores das poses (front/right/left) em jsonb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'face_descriptors'
  ) THEN
    ALTER TABLE public.usuarios
      ADD COLUMN face_descriptors jsonb;
  END IF;

  -- Snapshots (imagens base64) das poses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'face_snapshots'
  ) THEN
    ALTER TABLE public.usuarios
      ADD COLUMN face_snapshots jsonb;
  END IF;

  -- Status do cadastro facial
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'face_enrollment_status'
  ) THEN
    ALTER TABLE public.usuarios
      ADD COLUMN face_enrollment_status text DEFAULT 'pendente';
  END IF;

  -- Data/hora do último treinamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'face_last_enrolled_at'
  ) THEN
    ALTER TABLE public.usuarios
      ADD COLUMN face_last_enrolled_at timestamptz;
  END IF;

  -- Versão do modelo usada no treinamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'face_model_version'
  ) THEN
    ALTER TABLE public.usuarios
      ADD COLUMN face_model_version text;
  END IF;
END $$;
