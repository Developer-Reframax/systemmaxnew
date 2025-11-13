-- Atualizar senha do usuário admin com hash correto
UPDATE usuarios 
SET password_hash = '$2b$10$er7vLXb8x/Vc7D9UNKxek.zdSPzFngbFqp694rRTG8QrPSWcBgzi2'
WHERE email = 'admin@sistema.com';

-- Verificar se a atualização foi bem-sucedida
SELECT matricula, nome, email, role, status, 
       substring(password_hash, 1, 20) || '...' as password_hash_preview
FROM usuarios 
WHERE email = 'admin@sistema.com';