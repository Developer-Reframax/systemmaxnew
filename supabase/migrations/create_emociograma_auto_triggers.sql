-- Migration: Criar triggers automáticos para emociograma
-- Objetivo: Quando um emociograma "regular" ou "pessimo" for inserido,
-- automaticamente criar alertas, notificações e tratativas

-- 1. Função para buscar líder e supervisor baseado no usuário
CREATE OR REPLACE FUNCTION get_user_responsaveis(user_matricula INTEGER)
RETURNS TABLE(
    lider_matricula INTEGER,
    supervisor_matricula INTEGER,
    equipe_nome VARCHAR,
    letra_nome VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.lider as lider_matricula,
        e.supervisor as supervisor_matricula,
        e.equipe as equipe_nome,
        l.letra as letra_nome
    FROM usuarios u
    LEFT JOIN letras l ON u.letra_id = l.id
    LEFT JOIN equipes e ON u.equipe_id = e.id
    WHERE u.matricula = user_matricula;
END;
$$ LANGUAGE plpgsql;

-- 2. Função trigger para criar alerta automático
CREATE OR REPLACE FUNCTION create_emociograma_alert()
RETURNS TRIGGER AS $$
DECLARE
    responsaveis RECORD;
    alert_id UUID;
    usuario_nome_var VARCHAR(255);
BEGIN
    -- Só processa se o estado for "regular" ou "pessimo" e requer_tratativa = true
    IF NEW.estado_emocional IN ('regular', 'pessimo') AND NEW.requer_tratativa = true THEN
        
        -- Busca os responsáveis do usuário
        SELECT * INTO responsaveis 
        FROM get_user_responsaveis(NEW.matricula_usuario);
        
        -- Busca o nome do usuário
        SELECT nome INTO usuario_nome_var 
        FROM usuarios 
        WHERE matricula = NEW.matricula_usuario;
        
        -- Cria o alerta
        INSERT INTO alertas_emociograma (
            id,
            usuario_matricula,
            usuario_nome,
            equipe,
            letra,
            estado_emocional,
            observacoes,
            data_registro,
            lider_matricula,
            supervisor_matricula,
            status,
            emociograma_id
        ) VALUES (
            gen_random_uuid(),
            NEW.matricula_usuario,
            COALESCE(usuario_nome_var, 'Usuário não encontrado'),
            COALESCE(responsaveis.equipe_nome, 'N/A'),
            COALESCE(responsaveis.letra_nome, 'N/A'),
            NEW.estado_emocional,
            NEW.observacoes,
            NEW.data_registro,
            responsaveis.lider_matricula,
            responsaveis.supervisor_matricula,
            'ativo',
            NEW.id
        ) RETURNING id INTO alert_id;
        
        -- Cria notificações para líder e supervisor
        IF responsaveis.lider_matricula IS NOT NULL THEN
            INSERT INTO notificacoes_emociograma (
                id,
                destinatario_matricula,
                tipo,
                usuario_afetado,
                estado_emocional,
                data_registro,
                observacoes
            ) VALUES (
                gen_random_uuid(),
                responsaveis.lider_matricula,
                'lider',
                COALESCE(usuario_nome_var, 'Usuário não encontrado'),
                NEW.estado_emocional,
                NEW.data_registro,
                'Funcionário com emociograma ' || NEW.estado_emocional || ' requer atenção'
            );
        END IF;
        
        IF responsaveis.supervisor_matricula IS NOT NULL THEN
            INSERT INTO notificacoes_emociograma (
                id,
                destinatario_matricula,
                tipo,
                usuario_afetado,
                estado_emocional,
                data_registro,
                observacoes
            ) VALUES (
                gen_random_uuid(),
                responsaveis.supervisor_matricula,
                'supervisor',
                COALESCE(usuario_nome_var, 'Usuário não encontrado'),
                NEW.estado_emocional,
                NEW.data_registro,
                'Funcionário com emociograma ' || NEW.estado_emocional || ' requer atenção'
            );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar o trigger na tabela emociogramas
DROP TRIGGER IF EXISTS trigger_create_emociograma_alert ON emociogramas;
CREATE TRIGGER trigger_create_emociograma_alert
    AFTER INSERT ON emociogramas
    FOR EACH ROW
    EXECUTE FUNCTION create_emociograma_alert();

-- 4. Comentários para documentação
COMMENT ON FUNCTION get_user_responsaveis(INTEGER) IS 'Busca líder e supervisor responsáveis por um usuário baseado em sua equipe e letra';
COMMENT ON FUNCTION create_emociograma_alert() IS 'Trigger function que cria automaticamente alertas, notificações e tratativas para emociogramas que requerem tratativa';
COMMENT ON TRIGGER trigger_create_emociograma_alert ON emociogramas IS 'Trigger que executa após inserção de emociograma para criar fluxo automático de tratativas';