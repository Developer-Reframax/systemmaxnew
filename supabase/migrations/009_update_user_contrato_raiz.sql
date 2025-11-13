-- Atualizar usuário 127520 com contrato_raiz
UPDATE usuarios 
SET contrato_raiz = 'CONT001'
WHERE matricula = 127520;

-- Verificar se a atualização foi bem-sucedida
SELECT matricula, nome, contrato_raiz 
FROM usuarios 
WHERE matricula = 127520;