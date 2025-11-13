-- Migration: Adicionar coluna emociograma_id na tabela alertas_emociograma
-- Data: 2024-12-01
-- Descrição: Adiciona referência ao emociograma original que gerou o alerta

-- 1. Adicionar coluna emociograma_id na tabela alertas_emociograma
ALTER TABLE alertas_emociograma 
ADD COLUMN emociograma_id UUID REFERENCES emociogramas(id);

-- 2. Comentário para documentação
COMMENT ON COLUMN alertas_emociograma.emociograma_id IS 'Referência ao emociograma original que gerou este alerta';