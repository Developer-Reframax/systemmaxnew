-- Atualizar usuário de teste com equipe_id válido
-- Primeiro, vamos verificar se existe uma equipe disponível
DO $$
DECLARE
    equipe_uuid UUID;
BEGIN
    -- Buscar a primeira equipe disponível
    SELECT id INTO equipe_uuid FROM equipes LIMIT 1;
    
    -- Se não houver equipes, criar uma equipe de teste
    IF equipe_uuid IS NULL THEN
        INSERT INTO equipes (equipe, codigo_contrato)
        VALUES ('Equipe Teste', 'CONT001')
        RETURNING id INTO equipe_uuid;
    END IF;
    
    -- Atualizar o usuário de teste (matricula 12345) com o equipe_id
    UPDATE usuarios 
    SET equipe_id = equipe_uuid
    WHERE matricula = 12345;
    
    -- Log para verificação
    RAISE NOTICE 'Usuário de teste atualizado com equipe_id: %', equipe_uuid;
END $$;

-- Verificar se a atualização foi bem-sucedida
SELECT 
    u.matricula,
    u.nome,
    u.equipe_id,
    e.equipe as nome_equipe
FROM usuarios u
LEFT JOIN equipes e ON u.equipe_id = e.id
WHERE u.matricula = 12345;