-- Adicionar relacionamento de chave estrangeira entre desvios.equipe_id e equipes.id
ALTER TABLE desvios 
ADD CONSTRAINT fk_desvios_equipe 
FOREIGN KEY (equipe_id) 
REFERENCES equipes(id);

-- Verificar se há dados inconsistentes antes de aplicar
-- SELECT d.id, d.equipe_id FROM desvios d 
-- LEFT JOIN equipes e ON d.equipe_id = e.id 
-- WHERE d.equipe_id IS NOT NULL AND e.id IS NULL;

-- Comentário: Este script adiciona o relacionamento de chave estrangeira
-- entre a tabela desvios e equipes que estava faltando