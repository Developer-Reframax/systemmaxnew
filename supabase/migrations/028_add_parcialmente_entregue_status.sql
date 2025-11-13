-- Migration: Add 'parcialmente_entregue' status to requisicoes table
-- Date: 2025-01-29
-- Description: Updates the status check constraint to include 'parcialmente_entregue' as a valid status

-- Drop the existing constraint
ALTER TABLE requisicoes DROP CONSTRAINT requisicoes_status_check;

-- Add the new constraint with 'parcialmente_entregue' included
ALTER TABLE requisicoes ADD CONSTRAINT requisicoes_status_check 
    CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'entregue', 'parcialmente_entregue', 'cancelada'));