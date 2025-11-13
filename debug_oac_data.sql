-- Script para verificar dados OAC no banco
-- Verificar se existem OACs registradas
SELECT 
    COUNT(*) as total_oacs,
    MIN(datahora_inicio) as primeira_oac,
    MAX(datahora_inicio) as ultima_oac,
    MIN(created_at) as primeiro_created_at,
    MAX(created_at) as ultimo_created_at
FROM oacs;

-- Verificar estrutura dos dados das OACs
SELECT 
    id,
    equipe,
    local,
    datahora_inicio,
    tempo_observacao,
    observador,
    qtd_pessoas_local,
    qtd_pessoas_abordadas,
    contrato,
    created_at,
    updated_at
FROM oacs 
ORDER BY datahora_inicio DESC 
LIMIT 5;

-- Verificar dados dos últimos 30 dias
SELECT 
    COUNT(*) as oacs_ultimos_30_dias,
    MIN(datahora_inicio) as primeira_data,
    MAX(datahora_inicio) as ultima_data
FROM oacs 
WHERE datahora_inicio >= NOW() - INTERVAL '30 days';

-- Verificar dados dos últimos 90 dias
SELECT 
    COUNT(*) as oacs_ultimos_90_dias,
    MIN(datahora_inicio) as primeira_data,
    MAX(datahora_inicio) as ultima_data
FROM oacs 
WHERE datahora_inicio >= NOW() - INTERVAL '90 days';

-- Verificar dados do último ano
SELECT 
    COUNT(*) as oacs_ultimo_ano,
    MIN(datahora_inicio) as primeira_data,
    MAX(datahora_inicio) as ultima_data
FROM oacs 
WHERE datahora_inicio >= NOW() - INTERVAL '1 year';

-- Verificar desvios relacionados
SELECT 
    COUNT(d.id) as total_desvios,
    COUNT(DISTINCT d.oac_id) as oacs_com_desvios
FROM desvios_oac d
JOIN oacs o ON d.oac_id = o.id;

-- Verificar relacionamentos de desvios por categoria
SELECT 
    c.categoria,
    COUNT(d.id) as total_desvios
FROM desvios_oac d
JOIN oacs o ON d.oac_id = o.id
JOIN subcategorias_oac s ON d.item_desvio = s.id
JOIN categorias_oac c ON s.categoria_pai = c.id
GROUP BY c.categoria
ORDER BY total_desvios DESC;