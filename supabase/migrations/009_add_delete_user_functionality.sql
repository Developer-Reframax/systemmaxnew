-- Migração para adicionar funcionalidade de deletar usuários
-- Esta funcionalidade será associada ao módulo de Gestão de Usuários

-- Primeiro, vamos buscar o ID do módulo de Gestão de Usuários
-- Se não existir, vamos criar
DO $$
DECLARE
    user_module_id UUID;
BEGIN
    -- Buscar módulo de Gestão de Usuários
    SELECT id INTO user_module_id 
    FROM modulos 
    WHERE nome ILIKE '%usuário%' OR nome ILIKE '%user%' OR nome ILIKE '%gestão%'
    LIMIT 1;
    
    -- Se não encontrar, criar o módulo
    IF user_module_id IS NULL THEN
        INSERT INTO modulos (nome, descricao, tipo, ativo)
        VALUES ('Gestão de Usuários', 'Módulo para gerenciamento de usuários do sistema', 'corporativo', true)
        RETURNING id INTO user_module_id;
        
        RAISE NOTICE 'Módulo "Gestão de Usuários" criado com ID: %', user_module_id;
    ELSE
        RAISE NOTICE 'Módulo encontrado com ID: %', user_module_id;
    END IF;
    
    -- Verificar se a funcionalidade já existe
    IF NOT EXISTS (
        SELECT 1 FROM modulo_funcionalidades 
        WHERE modulo_id = user_module_id 
        AND (nome ILIKE '%deletar%' OR nome ILIKE '%excluir%' OR nome ILIKE '%delete%')
    ) THEN
        -- Inserir funcionalidade de deletar usuários
        INSERT INTO modulo_funcionalidades (modulo_id, nome, descricao, ativa)
        VALUES (
            user_module_id,
            'Deletar Usuários',
            'Permite deletar/excluir usuários do sistema',
            true
        );
        
        RAISE NOTICE 'Funcionalidade "Deletar Usuários" criada com sucesso!';
    ELSE
        RAISE NOTICE 'Funcionalidade de deletar usuários já existe!';
    END IF;
END $$;

-- Verificar se a funcionalidade foi criada
SELECT 
    m.nome as modulo_nome,
    mf.nome as funcionalidade_nome,
    mf.descricao,
    mf.ativa
FROM modulo_funcionalidades mf
JOIN modulos m ON m.id = mf.modulo_id
WHERE mf.nome ILIKE '%deletar%' OR mf.nome ILIKE '%excluir%' OR mf.nome ILIKE '%delete%';