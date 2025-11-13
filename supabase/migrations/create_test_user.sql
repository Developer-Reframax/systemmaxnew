-- Criar usuário de teste para validar autenticação
INSERT INTO usuarios (
  matricula,
  nome,
  email,
  password_hash,
  role,
  status,
  termos,
  contrato_raiz
) VALUES (
  999999,
  'Administrador do Sistema',
  'admin@teste.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  'Admin',
  'ativo',
  true,
  'CONT001'
) ON CONFLICT (matricula) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  termos = EXCLUDED.termos,
  contrato_raiz = EXCLUDED.contrato_raiz;

-- Garantir permissões para as tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessoes TO anon;