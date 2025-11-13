-- Verificar usuários administradores existentes
SELECT 
  matricula,
  nome,
  email,
  role,
  status,
  created_at
FROM usuarios 
WHERE role = 'Admin' 
OR email LIKE '%admin%'
ORDER BY created_at DESC;

-- Verificar todos os usuários para referência
SELECT 
  matricula,
  nome,
  email,
  role,
  status
FROM usuarios 
ORDER BY role DESC, matricula ASC;