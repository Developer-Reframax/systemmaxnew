-- Migração 018: Criar funções SQL para estatísticas OAC e corrigir relacionamentos
-- Data: 2024-12-01
-- Descrição: Criação das funções SQL faltantes para o módulo OAC e correção de relacionamentos

-- =====================================================
-- CORREÇÃO DE RELACIONAMENTOS
-- =====================================================

-- Adicionar foreign keys para relacionamentos corretos
-- Nota: oacs.local é varchar que deve referenciar locais.local (não locais.id)
-- Nota: oacs.equipe é varchar que deve referenciar equipes.equipe (não equipes.id)

-- Criar índices para melhorar performance dos JOINs
CREATE INDEX IF NOT EXISTS idx_locais_local ON locais(local);
CREATE INDEX IF NOT EXISTS idx_equipes_equipe ON equipes(equipe);

-- =====================================================
-- FUNÇÃO: get_oac_estatisticas_gerais
-- =====================================================
CREATE OR REPLACE FUNCTION get_oac_estatisticas_gerais(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    observador_filter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    total_oacs BIGINT,
    total_pessoas_observadas BIGINT,
    total_pessoas_abordadas BIGINT,
    tempo_total_observacao BIGINT,
    media_tempo_observacao NUMERIC,
    media_pessoas_por_oac NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_oacs,
        COALESCE(SUM(o.qtd_pessoas_local), 0)::BIGINT as total_pessoas_observadas,
        COALESCE(SUM(o.qtd_pessoas_abordadas), 0)::BIGINT as total_pessoas_abordadas,
        COALESCE(SUM(o.tempo_observacao), 0)::BIGINT as tempo_total_observacao,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(o.tempo_observacao), 2)
            ELSE 0
        END as media_tempo_observacao,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(o.qtd_pessoas_local), 2)
            ELSE 0
        END as media_pessoas_por_oac
    FROM oacs o
    WHERE 
        (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
        AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
        AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
        AND (observador_filter IS NULL OR o.observador = observador_filter);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_oacs_por_periodo
-- =====================================================
CREATE OR REPLACE FUNCTION get_oacs_por_periodo(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    observador_filter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    data DATE,
    total_oacs BIGINT,
    total_pessoas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.datahora_inicio::DATE as data,
        COUNT(*)::BIGINT as total_oacs,
        COALESCE(SUM(o.qtd_pessoas_local), 0)::BIGINT as total_pessoas
    FROM oacs o
    WHERE 
        (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
        AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
        AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
        AND (observador_filter IS NULL OR o.observador = observador_filter)
    GROUP BY o.datahora_inicio::DATE
    ORDER BY data DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_desvios_por_categoria
-- =====================================================
CREATE OR REPLACE FUNCTION get_desvios_por_categoria(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    observador_filter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    categoria TEXT,
    total_desvios BIGINT,
    percentual NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH desvios_totais AS (
        SELECT 
            c.categoria,
            COUNT(d.id)::BIGINT as total_desvios
        FROM desvios_oac d
        JOIN oacs o ON d.oac_id = o.id
        JOIN subcategorias_oac s ON d.item_desvio = s.id
        JOIN categorias_oac c ON s.categoria_pai = c.id
        WHERE 
            (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
            AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
            AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
            AND (observador_filter IS NULL OR o.observador = observador_filter)
        GROUP BY c.categoria
    ),
    total_geral AS (
        SELECT SUM(total_desvios) as total FROM desvios_totais
    )
    SELECT 
        dt.categoria,
        dt.total_desvios,
        CASE 
            WHEN tg.total > 0 THEN ROUND((dt.total_desvios::NUMERIC / tg.total::NUMERIC) * 100, 2)
            ELSE 0
        END as percentual
    FROM desvios_totais dt
    CROSS JOIN total_geral tg
    ORDER BY dt.total_desvios DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_top_observadores
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_observadores(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    limite INTEGER DEFAULT 10
)
RETURNS TABLE(
    observador_matricula INTEGER,
    observador_nome TEXT,
    total_oacs BIGINT,
    total_pessoas_observadas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.observador as observador_matricula,
        u.nome as observador_nome,
        COUNT(*)::BIGINT as total_oacs,
        COALESCE(SUM(o.qtd_pessoas_local), 0)::BIGINT as total_pessoas_observadas
    FROM oacs o
    JOIN usuarios u ON o.observador = u.matricula
    WHERE 
        (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
        AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
        AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
    GROUP BY o.observador, u.nome
    ORDER BY total_oacs DESC
    LIMIT limite;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_top_locais_oac
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_locais_oac(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    limite INTEGER DEFAULT 10,
    observador_filter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    local_nome TEXT,
    total_oacs BIGINT,
    total_pessoas_observadas BIGINT,
    total_desvios BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.local as local_nome,
        COUNT(DISTINCT o.id)::BIGINT as total_oacs,
        COALESCE(SUM(o.qtd_pessoas_local), 0)::BIGINT as total_pessoas_observadas,
        COUNT(d.id)::BIGINT as total_desvios
    FROM oacs o
    LEFT JOIN desvios_oac d ON o.id = d.oac_id
    WHERE 
        (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
        AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
        AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
        AND (observador_filter IS NULL OR o.observador = observador_filter)
    GROUP BY o.local
    ORDER BY total_oacs DESC
    LIMIT limite;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: get_media_pessoas_oac
-- =====================================================
CREATE OR REPLACE FUNCTION get_media_pessoas_oac(
    data_inicio TEXT DEFAULT NULL,
    data_fim TEXT DEFAULT NULL,
    contrato_filter TEXT DEFAULT NULL,
    observador_filter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    media_pessoas_local NUMERIC,
    media_pessoas_abordadas NUMERIC,
    percentual_abordagem NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(o.qtd_pessoas_local), 2)
            ELSE 0
        END as media_pessoas_local,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(AVG(o.qtd_pessoas_abordadas), 2)
            ELSE 0
        END as media_pessoas_abordadas,
        CASE 
            WHEN SUM(o.qtd_pessoas_local) > 0 THEN 
                ROUND((SUM(o.qtd_pessoas_abordadas)::NUMERIC / SUM(o.qtd_pessoas_local)::NUMERIC) * 100, 2)
            ELSE 0
        END as percentual_abordagem
    FROM oacs o
    WHERE 
        (data_inicio IS NULL OR o.datahora_inicio >= data_inicio::TIMESTAMPTZ)
        AND (data_fim IS NULL OR o.datahora_inicio <= data_fim::TIMESTAMPTZ)
        AND (contrato_filter IS NULL OR o.contrato = contrato_filter)
        AND (observador_filter IS NULL OR o.observador = observador_filter);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION get_oac_estatisticas_gerais IS 'Retorna estatísticas gerais das OACs com filtros opcionais';
COMMENT ON FUNCTION get_oacs_por_periodo IS 'Retorna OACs agrupadas por período (dia) com filtros opcionais';
COMMENT ON FUNCTION get_desvios_por_categoria IS 'Retorna desvios agrupados por categoria com percentuais';
COMMENT ON FUNCTION get_top_observadores IS 'Retorna ranking dos observadores mais ativos';
COMMENT ON FUNCTION get_top_locais_oac IS 'Retorna ranking dos locais com mais observações';
COMMENT ON FUNCTION get_media_pessoas_oac IS 'Retorna médias de pessoas observadas e abordadas';