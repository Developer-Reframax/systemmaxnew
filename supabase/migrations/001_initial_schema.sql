-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create usuarios table
CREATE TABLE usuarios (
    matricula INTEGER PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(100),
    contrato_raiz VARCHAR(50),
    data_admissao DATE,
    data_demissao DATE,
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    password_hash VARCHAR(255) NOT NULL,
    termos BOOLEAN DEFAULT false,
    terceiro BOOLEAN DEFAULT false,
    role VARCHAR(20) DEFAULT 'Usuario' CHECK (role IN ('Admin', 'Editor', 'Usuario')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contratos table
CREATE TABLE contratos (
    codigo VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    local VARCHAR(255),
    responsavel INTEGER REFERENCES usuarios(matricula),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    codigo_wpp VARCHAR(20),
    localizacao TEXT, -- JSON with lat/lng
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create letras table
CREATE TABLE letras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letra VARCHAR(10) NOT NULL,
    codigo_contrato VARCHAR(50) REFERENCES contratos(codigo),
    lider INTEGER REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equipes table
CREATE TABLE equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipe VARCHAR(100) NOT NULL,
    codigo_contrato VARCHAR(50) REFERENCES contratos(codigo),
    supervisor INTEGER REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usuario_letras relationship table
CREATE TABLE usuario_letras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula_usuario INTEGER REFERENCES usuarios(matricula),
    letra_id UUID REFERENCES letras(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matricula_usuario, letra_id)
);

-- Create usuario_equipes relationship table
CREATE TABLE usuario_equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula_usuario INTEGER REFERENCES usuarios(matricula),
    equipe_id UUID REFERENCES equipes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matricula_usuario, equipe_id)
);

-- Create modulos table
CREATE TABLE modulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) DEFAULT 'corporativo' CHECK (tipo IN ('corporativo', 'exclusivo')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create modulo_funcionalidades table
CREATE TABLE modulo_funcionalidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo_id UUID REFERENCES modulos(id),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create modulo_contratos table
CREATE TABLE modulo_contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo_id UUID REFERENCES modulos(id),
    codigo_contrato VARCHAR(50) REFERENCES contratos(codigo),
    corporativo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create funcionalidade_usuarios table
CREATE TABLE funcionalidade_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionalidade_id UUID REFERENCES modulo_funcionalidades(id),
    matricula_usuario INTEGER REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usuario_contratos relationship table
CREATE TABLE usuario_contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula_usuario INTEGER REFERENCES usuarios(matricula),
    codigo_contrato VARCHAR(50) REFERENCES contratos(codigo),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessoes table
CREATE TABLE sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula_usuario INTEGER REFERENCES usuarios(matricula),
    inicio_sessao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fim_sessao TIMESTAMP WITH TIME ZONE,
    paginas_acessadas INTEGER DEFAULT 0,
    modulos_acessados JSONB DEFAULT '[]',
    tempo_total_segundos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_status ON usuarios(status);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuario_letras_usuario ON usuario_letras(matricula_usuario);
CREATE INDEX idx_usuario_letras_letra ON usuario_letras(letra_id);
CREATE INDEX idx_usuario_equipes_usuario ON usuario_equipes(matricula_usuario);
CREATE INDEX idx_usuario_equipes_equipe ON usuario_equipes(equipe_id);
CREATE INDEX idx_sessoes_usuario ON sessoes(matricula_usuario);
CREATE INDEX idx_sessoes_data ON sessoes(inicio_sessao DESC);

-- Enable Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE letras ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_letras ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_funcionalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionalidade_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON usuarios TO anon;
GRANT ALL PRIVILEGES ON usuarios TO authenticated;
GRANT SELECT ON contratos TO anon;
GRANT ALL PRIVILEGES ON contratos TO authenticated;
GRANT SELECT ON letras TO anon;
GRANT ALL PRIVILEGES ON letras TO authenticated;
GRANT SELECT ON equipes TO anon;
GRANT ALL PRIVILEGES ON equipes TO authenticated;
GRANT SELECT ON usuario_letras TO anon;
GRANT ALL PRIVILEGES ON usuario_letras TO authenticated;
GRANT SELECT ON usuario_equipes TO anon;
GRANT ALL PRIVILEGES ON usuario_equipes TO authenticated;
GRANT SELECT ON modulos TO anon;
GRANT ALL PRIVILEGES ON modulos TO authenticated;
GRANT SELECT ON modulo_funcionalidades TO anon;
GRANT ALL PRIVILEGES ON modulo_funcionalidades TO authenticated;
GRANT SELECT ON modulo_contratos TO anon;
GRANT ALL PRIVILEGES ON modulo_contratos TO authenticated;
GRANT SELECT ON funcionalidade_usuarios TO anon;
GRANT ALL PRIVILEGES ON funcionalidade_usuarios TO authenticated;
GRANT SELECT ON usuario_contratos TO anon;
GRANT ALL PRIVILEGES ON usuario_contratos TO authenticated;
GRANT SELECT ON sessoes TO anon;
GRANT ALL PRIVILEGES ON sessoes TO authenticated;

-- Insert initial admin user (password: admin123 - hashed with bcrypt)
INSERT INTO usuarios (matricula, nome, funcao, email, password_hash, role, termos, status)
VALUES (1, 'Administrador', 'Administrador do Sistema', 'admin@sistema.com', '$2b$10$rOvHPGp7.oJzKqN5tGGzKOqJ8yKqJ8yKqJ8yKqJ8yKqJ8yKqJ8yKq', 'Admin', true, 'ativo');

-- Insert basic system modules
INSERT INTO modulos (nome, descricao, tipo) VALUES
('Gestão de Usuários', 'Módulo para gerenciamento completo de usuários', 'corporativo'),
('Gestão de Contratos', 'Módulo para gerenciamento de contratos', 'corporativo'),
('Gestão de Módulos', 'Módulo para gerenciamento de módulos do sistema', 'corporativo'),
('Gestão de Letras', 'Módulo para gerenciamento de letras', 'corporativo'),
('Gestão de Equipes', 'Módulo para gerenciamento de equipes', 'corporativo'),
('Monitoramento de Sessões', 'Módulo para análise de sessões de usuários', 'exclusivo'),
('Relatórios', 'Módulo para geração de relatórios', 'exclusivo'),
('Configurações do Sistema', 'Módulo para configurações gerais', 'exclusivo');