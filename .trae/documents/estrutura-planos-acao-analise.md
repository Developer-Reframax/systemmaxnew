# Análise Técnica: Estrutura da Tabela Planos de Ação

## 1. Visão Geral

Este documento analisa a estrutura completa da tabela `planos_acao` e suas relações, esclarecendo questões sobre as colunas disponíveis e seu uso correto no sistema.

## 2. Confirmação da Estrutura Atual

### 2.1 Estrutura da Tabela (Migração 030 - Versão Correta)

```sql
CREATE TABLE planos_acao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execucao_inspecao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES inspecoes_perguntas(id) ON DELETE CASCADE,
    desvio TEXT NOT NULL,                    -- Descrição do problema encontrado
    o_que_fazer TEXT NOT NULL,               -- O que deve ser feito para corrigir
    como_fazer TEXT NOT NULL,                -- Como executar a correção (detalhamento)
    responsavel_matricula INT NOT NULL REFERENCES usuarios(matricula),
    prazo DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    cadastrado_por_matricula INT NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_plano_por_pergunta UNIQUE(execucao_inspecao_id, pergunta_id)
);
```

### 2.2 Colunas de Texto Disponíveis

| Coluna | Finalidade | Obrigatório |
|--------|------------|-------------|
| `desvio` | Descrição do problema/não conformidade | Sim |
| `o_que_fazer` | Ação principal a ser tomada | Sim |
| `como_fazer` | Detalhamento de como executar a ação | Sim |
| `observacoes` | Observações adicionais (não existe na estrutura atual) | Não |

## 3. Migrações Encontradas

### 3.1 Migração 030 - Estrutura Completa (Correta)
- ✅ Possui `como_fazer TEXT NOT NULL`
- ✅ Possui `pergunta_id UUID NOT NULL`
- ✅ Possui `desvio TEXT NOT NULL`
- ✅ Possui `o_que_fazer TEXT NOT NULL`
- ✅ Constraint única por execução+pergunta

### 3.2 Migração 031 - Adição de pergunta_id (Redundante)
- Adiciona `pergunta_id` (já existe na 030)
- Remove constraint único (permitindo múltiplos planos)

### 3.3 Migração 20241213 - Estrutura Antiga (Incompleta)
- ❌ Não possui `como_fazer`
- ❌ Não possui `pergunta_id`
- ❌ Não possui `desvio` nem `o_que_fazer`
- ⚠️ **Esta migração está desatualizada**

## 4. APIs Relacionadas

### 4.1 API de Planos de Ação
- **GET** `/api/planos-acao` - Lista planos com filtros
- **POST** `/api/planos-acao` - Cria novo plano
- **PUT** `/api/planos-acao/[id]` - Atualiza plano
- **DELETE** `/api/planos-acao/[id]` - Remove plano

### 4.2 API de Finalização de Inspeção
- **POST** `/api/inspecoes/finalizar` - Valida planos por pergunta
- Verifica perguntas "Não Conforme" sem planos de ação

## 5. Frontend - Componentes Encontrados

### 5.1 PlanoAcaoModal.tsx
```typescript
// Campos mapeados corretamente:
titulo: data.titulo || '',
descricao: data.descricao || '',
responsavel_matricula: data.responsavel_matricula || '',
prazo: data.prazo || '',
prioridade: data.prioridade || 'media',
status: data.status || 'pendente',
observacoes: data.observacoes || ''
```

⚠️ **Problema Identificado**: O modal está usando `titulo` e `descricao`, mas a tabela usa `desvio`, `o_que_fazer` e `como_fazer`.

### 5.2 Finalização de Inspeção (page.tsx)
```typescript
// Verificação de planos por pergunta
if (pergunta.resposta === 'nao_conforme' && !pergunta.planosAcao?.length) {
    // Validação correta por pergunta_id
}
```

## 6. Problemas Identificados

### 6.1 Inconsistência de Campos
- **Backend/DB**: Usa `desvio`, `o_que_fazer`, `como_fazer`
- **Frontend**: Usa `titulo`, `descricao`, `observacoes`
- **Resultado**: Falha na comunicação entre frontend e backend

### 6.2 Migrações Conflitantes
- Existem múltiplas versões da estrutura
- A migração 031 tenta adicionar campos que já existem

## 7. Solução Proposta

### 7.1 Atualizar Frontend (Prioridade Alta)
Modificar `PlanoAcaoModal.tsx` para usar os campos corretos:

```typescript
// Mapeamento correto:
desvio: data.desvio || '',           // Título do problema
o_que_fazer: data.o_que_fazer || '', // Descrição da ação
como_fazer: data.como_fazer || '',   // Como executar
```

### 7.2 Remover Migrações Redundantes
- Desativar/Remover migração 031 (redundante)
- Desativar/Remover migração 20241213 (desatualizada)

### 7.3 Atualizar APIs
Garantir que as APIs esperem e retornem os campos corretos:
- `desvio` (título do problema)
- `o_que_fazer` (descrição da ação)
- `como_fazer` (detalhamento da execução)

## 8. Conclusão

A tabela `planos_acao` **JÁ POSSUI** a coluna `como_fazer TEXT NOT NULL` conforme definido na migração 030. O problema está na inconsistência entre o frontend (que usa campos diferentes) e o backend/DB (que usa os campos corretos).

**Ação Imediata**: Atualizar o componente `PlanoAcaoModal.tsx` para usar os campos `desvio`, `o_que_fazer` e `como_fazer` ao invés de `titulo`, `descricao` e `observacoes`.

## 9. Checklist de Verificação

- [ ] Confirmar migração 030 aplicada no banco
- [ ] Verificar se tabela possui coluna `como_fazer`
- [ ] Atualizar frontend para usar campos corretos
- [ ] Testar criação de plano com novo mapeamento
- [ ] Validar vinculação pergunta-plano na finalização