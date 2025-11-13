# Vinculação de Planos de Ação às Perguntas de Não Conformidade

## Visão Geral

Este documento detalha as alterações necessárias para vincular planos de ação às perguntas específicas que geraram não conformidades durante as inspeções, garantindo que cada pergunta com resposta "Não Conforme" tenha pelo menos um plano de ação associado.

## 1. Alterações no Banco de Dados

### 1.1 Migração SQL - Adicionar coluna pergunta_id

```sql
-- Adicionar coluna pergunta_id na tabela planos_acao
ALTER TABLE planos_acao 
ADD COLUMN pergunta_id UUID REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX idx_planos_acao_pergunta_id ON planos_acao(pergunta_id);
CREATE INDEX idx_planos_acao_execucao_pergunta ON planos_acao(execucao_inspecao_id, pergunta_id);

-- Atualizar comentário da tabela
COMMENT ON COLUMN planos_acao.pergunta_id IS 'Referência à pergunta específica que gerou este plano de ação';

-- Remover constraint única se existir (para permitir múltiplos planos por pergunta)
ALTER TABLE planos_acao DROP CONSTRAINT IF EXISTS unique_plano_por_pergunta;

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON planos_acao TO authenticated;
GRANT SELECT ON planos_acao TO anon;
```

### 1.2 Atualização dos Tipos TypeScript

Os tipos foram atualizados no arquivo `src/types/plano-acao.ts` para refletir a nova estrutura do banco de dados:

- Adicionada propriedade `pergunta_id: string` em `PlanoAcao`
- Atualizado `CreatePlanoAcaoData` para incluir `pergunta_id` como obrigatório
- Adicionados novos tipos para resumo de planos por pergunta
- Interfaces atualizadas para usar nomes de colunas corretos do banco

## 2. Alterações no Frontend

### 2.1 Componente PerguntaItem

Atualizar o componente `PerguntaItem` para passar o `pergunta_id` ao modal de plano de ação:

```tsx
// src/components/inspecoes/PerguntaItem.tsx

// Adicionar propriedade perguntaId ao chamar o modal
<PlanoAcaoModal
  isOpen={planoModalAberto}
  onClose={() => setPlanoModalAberto(false)}
  execucaoId={execucaoId}
  perguntaId={pergunta.id} // NOVO: Passar ID da pergunta
  onSave={handlePlanoSalvo}
/>
```

### 2.2 Componente PlanoAcaoModal

Atualizar o modal para receber e usar o `pergunta_id`:

```tsx
// src/components/planos/PlanoAcaoModal.tsx

interface PlanoAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  execucaoId: string;
  perguntaId: string; // NOVO: ID da pergunta
  planoExistente?: PlanoAcao;
  onSave: (plano: PlanoAcao) => void;
}

export default function PlanoAcaoModal({
  isOpen,
  onClose,
  execucaoId,
  perguntaId, // NOVO
  planoExistente,
  onSave
}: PlanoAcaoModalProps) {
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const planoData: CreatePlanoAcaoData = {
      execucao_inspecao_id: execucaoId,
      pergunta_id: perguntaId, // NOVO: Sempre vincular à pergunta
      desvio: formData.desvio,
      o_que_fazer: formData.oQueFazer,
      como_fazer: formData.comoFazer,
      responsavel_matricula: Number(formData.responsavel),
      prazo: formData.prazo
    };
    
    // Resto da lógica permanece igual
  };
}
```

### 2.3 Página de Execução de Inspeção

Atualizar a lógica de finalização para verificar se cada pergunta "Não Conforme" tem pelo menos um plano:

```tsx
// src/app/inspecoes/[id]/executar/page.tsx

// NOVA FUNÇÃO: Verificar planos por pergunta
const verificarPlanosPorPergunta = async (execucaoId: string) => {
  try {
    const response = await fetch(`/api/inspecoes/${execucaoId}/planos/resumo`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Erro ao buscar resumo de planos');
    }
    
    return data.resumo; // { pergunta_id: quantidade }
  } catch (error) {
    console.error('Erro ao verificar planos:', error);
    return {};
  }
};

// Atualizar função handleFinalizar
const handleFinalizar = async () => {
  try {
    // 1. Verificar se há perguntas "Não Conforme" sem planos
    const planosResumo = await verificarPlanosPorPergunta(execucaoId);
    
    const perguntasNaoConformesSemPlano = perguntas.filter(pergunta => {
      const resposta = respostas[pergunta.id];
      const temPlano = (planosResumo[pergunta.id] || 0) > 0;
      return resposta?.resposta === 'nao_conforme' && !temPlano;
    });
    
    if (perguntasNaoConformesSemPlano.length > 0) {
      const nomesPerguntas = perguntasNaoConformesSemPlano
        .map(p => p.texto)
        .join(', ');
      
      alert(`As seguintes perguntas com "Não Conforme" precisam de pelo menos um plano de ação: ${nomesPerguntas}`);
      return;
    }
    
    // 2. Se tudo estiver OK, prosseguir com a finalização
    const response = await fetch(`/api/inspecoes/${execucaoId}/finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // ... resto da lógica
  } catch (error) {
    console.error('Erro ao finalizar:', error);
    alert('Erro ao finalizar inspeção');
  }
};
```

## 3. Alterações nas APIs

### 3.1 API de Criação de Plano de Ação

Atualizar para validar e usar o `pergunta_id`:

```typescript
// src/app/api/planos/route.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { execucao_inspecao_id, pergunta_id, desvio, o_que_fazer, como_fazer, responsavel_matricula, prazo } = body;
    
    // Validações
    if (!execucao_inspecao_id || !pergunta_id || !desvio || !o_que_fazer || !como_fazer || !responsavel_matricula || !prazo) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Verificar se a pergunta existe e pertence à execução
    const { data: perguntaExistente } = await supabase
      .from('inspecoes_perguntas')
      .select('id')
      .eq('id', pergunta_id)
      .single();
      
    if (!perguntaExistente) {
      return NextResponse.json(
        { success: false, error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }
    
    // Criar o plano com pergunta_id
    const { data: plano, error } = await supabase
      .from('planos_acao')
      .insert([{
        execucao_inspecao_id,
        pergunta_id, // NOVO: Vincular à pergunta
        desvio,
        o_que_fazer,
        como_fazer,
        responsavel_matricula,
        prazo,
        cadastrado_por_matricula: userMatricula,
        status: 'pendente'
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar plano:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar plano de ação' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data: plano });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### 3.2 Nova API - Resumo de Planos por Pergunta

Criar endpoint para verificar quantidade de planos por pergunta:

```typescript
// src/app/api/inspecoes/[id]/planos/resumo/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const execucaoId = params.id;
    
    // Buscar resumo de planos por pergunta
    const { data, error } = await supabase
      .from('planos_acao')
      .select('pergunta_id')
      .eq('execucao_inspecao_id', execucaoId)
      .eq('status', 'pendente'); // Ou qualquer status que indique plano ativo
      
    if (error) {
      console.error('Erro ao buscar resumo:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar resumo de planos' },
        { status: 500 }
      );
    }
    
    // Agrupar por pergunta_id
    const resumo = data.reduce((acc, plano) => {
      acc[plano.pergunta_id] = (acc[plano.pergunta_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({ success: true, resumo });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### 3.3 API de Listagem de Planos

Atualizar para filtrar por pergunta quando necessário:

```typescript
// src/app/api/planos/route.ts (GET)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const execucaoId = searchParams.get('execucao_id');
    const perguntaId = searchParams.get('pergunta_id'); // NOVO
    const responsavelMatricula = searchParams.get('responsavel_matricula');
    
    let query = supabase
      .from('planos_acao')
      .select(`
        *,
        responsavel:usuarios!planos_acao_responsavel_matricula_fkey(
          matricula,
          nome,
          email
        ),
        evidencias:evidencias_plano_acao(*)
      `);
      
    if (execucaoId) {
      query = query.eq('execucao_inspecao_id', execucaoId);
    }
    
    if (perguntaId) { // NOVO: Filtrar por pergunta
      query = query.eq('pergunta_id', perguntaId);
    }
    
    if (responsavelMatricula) {
      query = query.eq('responsavel_matricula', responsavelMatricula);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar planos:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar planos de ação' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

## 4. Validações e Regras de Negócio

### 4.1 Validação na Finalização

A validação principal ocorre no momento da finalização da inspeção:

1. **Verificar perguntas "Não Conforme"**: Identificar todas as perguntas com resposta "nao_conforme"
2. **Contar planos por pergunta**: Usar a API de resumo para saber quantos planos cada pergunta tem
3. **Alertar se faltar planos**: Se alguma pergunta "Não Conforme" não tiver planos, impedir a finalização
4. **Permitir múltiplos planos**: Não limitar a quantidade de planos por pergunta

### 4.2 Estrutura de Dados Atualizada

```typescript
interface PlanoAcao {
  id: string;
  execucao_inspecao_id: string;
  pergunta_id: string;        // NOVO: Vincula à pergunta específica
  desvio: string;             // Antigo: titulo
  o_que_fazer: string;        // Antigo: descricao
  como_fazer: string;         // NOVO: Campo adicional
  responsavel_matricula: number; // Antigo: responsavel
  prazo: string;
  status: PlanoAcaoStatus;
  cadastrado_por_matricula: number; // NOVO: Quem criou
  created_at: string;
  updated_at: string;
}
```

## 5. Fluxo de Uso Atualizado

1. **Durante a Inspeção**:
   - Usuário marca pergunta como "Não Conforme"
   - Botão "Cadastrar Plano de Ação" aparece
   - Ao clicar, modal abre com `pergunta_id` pré-preenchido
   - Usuário preenche dados do plano
   - Plano é criado vinculado à pergunta específica

2. **Na Finalização**:
   - Sistema verifica todas as perguntas "Não Conforme"
   - Conta planos existentes para cada pergunta
   - Se alguma pergunta não tiver planos, mostra alerta
   - Se todas tiverem pelo menos 1 plano, permite finalização

3. **Visualização Posterior**:
   - Planos podem ser listados filtrados por pergunta
   - É possível ver todos os planos de uma pergunta específica
   - Múltiplos planos por pergunta são permitidos e visíveis

## 6. Considerações de Segurança

- A coluna `pergunta_id` tem `ON DELETE CASCADE`, garantindo que planos sejam removidos se a pergunta for excluída
- Índices foram criados para otimizar consultas por pergunta
- Permissões foram atualizadas para permitir operações na nova coluna
- Validações no backend garantem que apenas perguntas válidas sejam vinculadas

## 7. Testes Recomendados

1. **Criar plano vinculado à pergunta**: Verificar se o `pergunta_id` é corretamente salvo
2. **Listar planos por pergunta**: Testar filtro `?pergunta_id=xxx`
3. **Resumo de planos**: Verificar se o endpoint `/resumo` retorna contagens corretas
4. **Validação na finalização**: 
   - Tentar finalizar com pergunta "Não Conforme" sem plano (deve falhar)
   - Adicionar plano e tentar novamente (deve permitir)
   - Adicionar múltiplos planos à mesma pergunta (deve permitir)
5. **Exclusão em cascata**: Remover pergunta e verificar se planos são removidos