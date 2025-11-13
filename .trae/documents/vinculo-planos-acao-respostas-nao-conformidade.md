# Vínculo de Planos de Ação às Respostas de Não Conformidade - Documentação Técnica

## 1. Análise do Problema Atual

### Situação Identificada
- O sistema possui um botão geral para "Cadastrar Plano de Ação" na finalização da inspeção
- O modal de plano de ação não recebe informações sobre qual pergunta específica está sendo tratada
- Não há indicadores visuais mostrando quais perguntas já possuem planos de ação criados
- A validação de finalização apenas verifica se existem planos de ação gerais, não por pergunta

### Impacto
- Usuários não conseguem criar planos de ação diretamente relacionados às não conformidades específicas
- Dificuldade em acompanhar o tratamento de cada não conformidade individualmente
- Possível criação de planos de ação desvinculados do contexto da inspeção

## 2. Estrutura de Dados Existente

### Tabelas Principais

#### `respostas_execucao`
```sql
CREATE TABLE respostas_execucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE,
    resposta VARCHAR(20) NOT NULL CHECK (resposta IN ('conforme', 'nao_conforme', 'nao_aplica')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(execucao_id, pergunta_id)
);
```

#### `planos_acao` (estrutura atual)
```sql
CREATE TABLE planos_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execucao_inspecao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE,
    desvio TEXT NOT NULL,
    o_que_fazer TEXT NOT NULL,
    como_fazer TEXT NOT NULL,
    responsavel_matricula INT NOT NULL REFERENCES usuarios(matricula),
    prazo DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    cadastrado_por_matricula INT NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_plano_por_pergunta UNIQUE(execucao_inspecao_id, pergunta_id)
);
```

### Observação Importante
A estrutura de dados **já está correta**! A tabela `planos_acao` possui:
- `execucao_inspecao_id`: vincula à execução
- `pergunta_id`: vincula à pergunta específica
- Constraint único para evitar múltiplos planos por pergunta

O problema está **apenas no frontend** que não está utilizando esse vínculo.

## 3. Alterações Necessárias no Frontend

### 3.1 Modificar Lista de Perguntas

**Arquivo:** `src/app/inspecoes/executar/[id]/page.tsx`

Adicionar botão de "Criar Plano de Ação" para cada pergunta não conforme:

```tsx
// Componente de Pergunta Individual
const PerguntaItem = ({ pergunta, resposta, onRespostaChange, onPlanoAcaoClick, temPlanoAcao }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{pergunta.texto}</h4>
        {resposta === 'nao_conforme' && (
          <Badge variant="destructive">Não Conforme</Badge>
        )}
      </div>
      
      {/* Opções de resposta */}
      <div className="flex space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={`pergunta-${pergunta.id}`}
            value="conforme"
            checked={resposta === 'conforme'}
            onChange={() => onRespostaChange(pergunta.id, 'conforme')}
          />
          <span>Conforme</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={`pergunta-${pergunta.id}`}
            value="nao_conforme"
            checked={resposta === 'nao_conforme'}
            onChange={() => onRespostaChange(pergunta.id, 'nao_conforme')}
          />
          <span>Não Conforme</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name={`pergunta-${pergunta.id}`}
            value="nao_aplica"
            checked={resposta === 'nao_aplica'}
            onChange={() => onRespostaChange(pergunta.id, 'nao_aplica')}
          />
          <span>Não se Aplica</span>
        </label>
      </div>
      
      {/* Botão de Plano de Ação para não conformidades */}
      {resposta === 'nao_conforme' && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          {temPlanoAcao ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Plano de ação criado</span>
            </div>
          ) : (
            <span className="text-sm text-orange-600">
              Necessário criar plano de ação
            </span>
          )}
          
          <Button
            size="sm"
            variant={temPlanoAcao ? "outline" : "default"}
            onClick={() => onPlanoAcaoClick(pergunta.id, pergunta.texto)}
          >
            {temPlanoAcao ? 'Ver Plano' : 'Criar Plano de Ação'}
          </Button>
        </div>
      )}
    </div>
  );
};
```

### 3.2 Atualizar Modal de Plano de Ação

**Arquivo:** `src/components/inspecoes/PlanoAcaoModal.tsx`

Adicionar props para receber informações da pergunta:

```tsx
interface PlanoAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  execucaoId: string;
  perguntaId?: string; // Novo: ID da pergunta
  perguntaTexto?: string; // Novo: texto da pergunta
  plano?: PlanoAcaoWithRelations;
  usuarios: Array<{
    matricula: number;
    nome: string;
    email: string;
  }>;
}

// Atualizar o formulário para mostrar contexto
export default function PlanoAcaoModal({
  isOpen,
  onClose,
  onSuccess,
  execucaoId,
  perguntaId,
  perguntaTexto,
  plano,
  usuarios
}: PlanoAcaoModalProps) {
  
  // Pré-preencher o desvio com o contexto da pergunta
  useEffect(() => {
    if (isOpen && perguntaTexto && !plano) {
      setFormData(prev => ({
        ...prev,
        desvio: `Não conformidade identificada na pergunta: ${perguntaTexto}`
      }));
    }
  }, [isOpen, perguntaTexto, plano]);
  
  const handleSubmit = async () => {
    // ... código existente ...
    
    if (!plano) {
      // Criar novo plano com pergunta_id
      const createData: CreatePlanoAcaoData = {
        execucao_id: execucaoId,
        pergunta_id: perguntaId!, // Garantir que temos o pergunta_id
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        desvio: formData.desvio.trim(), // Agora inclui o contexto da pergunta
        responsavel: formData.responsavel,
        prazo: formData.prazo,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes.trim()
      };
      
      // ... resto do código ...
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {plano ? 'Editar Plano de Ação' : 'Criar Plano de Ação'}
          </DialogTitle>
          {perguntaTexto && (
            <DialogDescription>
              Plano de ação para a não conformidade: <strong>{perguntaTexto}</strong>
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Resto do formulário existente */}
      </DialogContent>
    </Dialog>
  );
}
```

### 3.3 Buscar Planos por Pergunta

**Arquivo:** `src/app/inspecoes/executar/[id]/page.tsx`

Adicionar função para verificar planos por pergunta:

```tsx
const [planosPorPergunta, setPlanosPorPergunta] = useState<Record<string, boolean>>({});

// Função para buscar quais perguntas têm planos de ação
const buscarPlanosPorPergunta = useCallback(async () => {
  if (!execucaoId) return;
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const planos = data.data || [];
      
      // Criar mapa de perguntas com planos
      const mapa: Record<string, boolean> = {};
      planos.forEach((plano: any) => {
        if (plano.pergunta_id) {
          mapa[plano.pergunta_id] = true;
        }
      });
      
      setPlanosPorPergunta(mapa);
    }
  } catch (error) {
    console.error('Erro ao buscar planos por pergunta:', error);
  }
}, [execucaoId]);

// Chamar quando carregar a página ou quando criar/atualizar planos
useEffect(() => {
  buscarPlanosPorPergunta();
}, [buscarPlanosPorPergunta]);
```

### 3.4 Atualizar Validação de Finalização

**Arquivo:** `src/app/inspecoes/executar/[id]/page.tsx`

Modificar a validação para verificar planos por pergunta:

```tsx
const finalizarExecucao = async () => {
  // ... validações existentes ...
  
  // Verificar se existem perguntas "Não Conforme" sem planos de ação
  const perguntasNaoConforme = execucaoData.respostas.filter(r => r.valor === 'nao_conforme');
  
  if (perguntasNaoConforme.length > 0) {
    // Verificar se cada pergunta não conforme tem um plano de ação
    const perguntasSemPlano = perguntasNaoConforme.filter(resposta => 
      !planosPorPergunta[resposta.pergunta_id]
    );
    
    if (perguntasSemPlano.length > 0) {
      toast.error(`Existem ${perguntasSemPlano.length} perguntas "Não Conforme" sem planos de ação. Crie um plano de ação para cada não conformidade antes de finalizar.`);
      return;
    }
  }
  
  // ... resto do código de finalização ...
};
```

## 4. Alterações Necessárias no Backend

### 4.1 Atualizar API de Criação de Plano de Ação

**Arquivo:** `src/app/api/inspecoes/execucoes/[id]/planos-acao/route.ts`

Garantir que o `pergunta_id` seja recebido e validado:

```typescript
interface CreatePlanoAcaoData {
  execucao_id: string;
  pergunta_id: string; // Adicionar validação
  titulo: string;
  descricao: string;
  desvio: string;
  responsavel: number;
  prazo: string;
  prioridade: string;
  observacoes?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ... autenticação e validações existentes ...
    
    const { id } = await context.params;
    const body: CreatePlanoAcaoData = await request.json();
    
    // Validar pergunta_id
    if (!body.pergunta_id) {
      return NextResponse.json(
        { error: 'pergunta_id é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se a pergunta existe e pertence ao formulário da execução
    const { data: perguntaExistente } = await supabase
      .from('perguntas_formulario')
      .select('id, formulario_id')
      .eq('id', body.pergunta_id)
      .single();
    
    if (!perguntaExistente) {
      return NextResponse.json(
        { error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar se a pergunta pertence ao formulário da execução
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('formulario_id')
      .eq('id', id)
      .single();
    
    if (!execucao || execucao.formulario_id !== perguntaExistente.formulario_id) {
      return NextResponse.json(
        { error: 'Pergunta não pertence ao formulário desta execução' },
        { status: 400 }
      );
    }
    
    // Verificar se já existe plano para esta pergunta nesta execução
    const { data: planoExistente } = await supabase
      .from('planos_acao')
      .select('id')
      .eq('execucao_inspecao_id', id)
      .eq('pergunta_id', body.pergunta_id)
      .single();
    
    if (planoExistente) {
      return NextResponse.json(
        { error: 'Já existe um plano de ação para esta pergunta' },
        { status: 400 }
      );
    }
    
    // Criar o plano de ação
    const { data: plano, error } = await supabase
      .from('planos_acao')
      .insert({
        execucao_inspecao_id: id,
        pergunta_id: body.pergunta_id,
        titulo: body.titulo,
        descricao: body.descricao,
        desvio: body.desvio,
        o_que_fazer: body.descricao, // Mapear descrição para o_que_fazer
        como_fazer: body.descricao,  // Pode ser ajustado conforme necessário
        responsavel_matricula: body.responsavel,
        prazo: body.prazo,
        status: 'pendente',
        cadastrado_por_matricula: authResult.user?.matricula
      })
      .select()
      .single();
    
    // ... resto do código ...
  }
}
```

### 4.2 Adicionar Endpoint para Planos por Pergunta

**Novo arquivo:** `src/app/api/inspecoes/execucoes/[id]/planos-acao/pergunta/[perguntaId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/execucoes/[id]/planos-acao/pergunta/[perguntaId]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; perguntaId: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, perguntaId } = await context.params;

    // Buscar planos de ação para a pergunta específica
    const { data: planos, error } = await supabase
      .from('planos_acao')
      .select(`
        *,
        responsavel:usuarios!planos_acao_responsavel_matricula_fkey(nome, email),
        cadastrado_por:usuarios!planos_acao_cadastrado_por_matricula_fkey(nome, email),
        evidencias:evidencias_plano_acao(*)
      `)
      .eq('execucao_inspecao_id', id)
      .eq('pergunta_id', perguntaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar planos por pergunta:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar planos de ação' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: planos || []
    });

  } catch (error) {
    console.error('Erro no endpoint planos por pergunta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

## 5. Fluxo Completo do Usuário

### 5.1 Durante a Execução da Inspeção

1. **Usuário responde pergunta como "Não Conforme"**
   - Sistema identifica a não conformidade
   - Mostra botão "Criar Plano de Ação" abaixo da pergunta
   - Indica visualmente se já existe plano criado

2. **Usuário clica em "Criar Plano de Ação"**
   - Modal abre com:
     - Título pré-preenchido com contexto da pergunta
     - Campo "Desvio" com descrição da não conformidade
     - Informações da pergunta visíveis no cabeçalho

3. **Usuário preenche e salva o plano**
   - Plano é criado vinculado à pergunta específica
   - Botão muda para "Ver Plano" com ícone de check
   - Indicador visual mostra que a pergunta está tratada

### 5.2 Na Finalização da Inspeção

1. **Sistema valida perguntas não conformes**
   - Verifica cada pergunta marcada como "não conforme"
   - Confirma se existe plano de ação vinculado
   - Mostra mensagem específica sobre perguntas pendentes

2. **Se todas as não conformidades têm planos**
   - Permite finalização normalmente
   - Todos os planos ficam vinculados à execução

## 6. Benefícios da Solução

### 6.1 Para o Usuário
- **Clareza**: Sabe exatamente qual não conformidade está tratando
- **Rastreabilidade**: Cada plano está vinculado à pergunta específica
- **Validação**: Sistema impede finalização sem tratar todas as não conformidades
- **Interface intuitiva**: Botões contextuais por pergunta

### 6.2 Para o Sistema
- **Integridade**: Garante que todas as não conformidades sejam tratadas
- **Organização**: Planos organizados por pergunta/perigo
- **Relatórios**: Possível gerar relatórios por não conformidade
- **Auditoria**: Rastreamento completo do tratamento

## 7. Considerações Técnicas

### 7.1 Performance
- Busca de planos por pergunta é otimizada com índices
- Cache local pode ser implementado para evitar múltiplas requisições
- Lazy loading para informações de planos

### 7.2 Segurança
- Validação de propriedade da execução e pergunta
- Constraint único previne duplicação
- RLS já configurada nas tabelas

### 7.3 Manutenibilidade
- Código modular e reutilizável
- Tipos TypeScript bem definidos
- Separação clara de responsabilidades

## 8. Testes Recomendados

### 8.1 Testes de Integração
- Criar plano para pergunta não conforme
- Tentar criar plano duplicado para mesma pergunta
- Finalizar inspeção com não conformidades sem planos
- Verificar indicadores visuais após criar planos

### 8.2 Testes de Unidade
- Validação de dados do formulário
- Processamento de respostas múltiplas
- Cálculo de status por pergunta

Esta solução resolve completamente o problema de vinculação, mantendo a estrutura de dados existente e proporcionando uma experiência intuitiva para o usuário.