-- Adicionar colunas letra_id e equipe_id na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN letra_id UUID REFERENCES letras(id),
ADD COLUMN equipe_id UUID REFERENCES equipes(id);

-- Criar índices para melhor performance
CREATE INDEX idx_usuarios_letra_id ON usuarios(letra_id);
CREATE INDEX idx_usuarios_equipe_id ON usuarios(equipe_id);

-- Comentários para documentação
COMMENT ON COLUMN usuarios.letra_id IS 'ID da letra associada ao usuário, referencia a tabela letras';
COMMENT ON COLUMN usuarios.equipe_id IS 'ID da equipe associada ao usuário, referencia a tabela equipes';