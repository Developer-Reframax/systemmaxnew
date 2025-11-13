-- Criar usuário admin no sistema
-- Email: admin@sistema.com
-- Senha: admin123 (hash bcrypt)

INSERT INTO usuarios (
  email,
  senha,
  nome,
  matricula,
  cargo,
  status,
  aceite_termos,
  data_aceite_termos,
  created_at,
  updated_at
) VALUES (
  'admin@sistema.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash para 'admin123'
  'Administrador do Sistema',
  'ADMIN001',
  'Admin',
  'ativo',
  true,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  senha = EXCLUDED.senha,
  nome = EXCLUDED.nome,
  matricula = EXCLUDED.matricula,
  cargo = EXCLUDED.cargo,
  status = EXCLUDED.status,
  aceite_termos = EXCLUDED.aceite_termos,
  data_aceite_termos = EXCLUDED.data_aceite_termos,
  updated_at = NOW();

-- Verificar se o usuário foi criado
SELECT 
  id,
  email,
  nome,
  matricula,
  cargo,
  status,
  aceite_termos,
  created_at