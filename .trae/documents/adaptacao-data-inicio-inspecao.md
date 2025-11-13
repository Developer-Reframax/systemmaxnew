# Documentação Técnica - Adaptação: Data e Horário de Início da Inspeção

## Descrição da Funcionalidade

Esta adaptação adiciona um campo de **data e horário de início da inspeção** na primeira etapa do processo de execução (seleção de local), tanto na página de execução quanto na página de continuação. O valor será armazenado na coluna `data_inicio` da tabela `execucoes_inspecao`.

## Alterações Necessárias

### 1. Frontend - Páginas de Execução e Continuação

#### 1.1 Interface ExecucaoData
Adicionar o campo `data_inicio` à interface:

```typescript
interface ExecucaoData {
  id?: string;
  formulario_id: string;
  local_id: number | null;
  data_inicio: string; // Novo campo - ISO string
  participantes: string[];
  respostas: RespostaExecucao[];
  status: 'em_andamento' | 'concluida';
}
```

#### 1.2 Estado Inicial
Atualizar o estado inicial para incluir `data_inicio`:

```typescript
const [execucaoData, setExecucaoData] = useState<ExecucaoData>({
  formulario_id: formularioId,
  local_id: null,
  data_inicio: new Date().toISOString(), // Data/hora atual como padrão
  participantes: [],
  respostas: [],
  status: 'em_andamento'
});
```

#### 1.3 Componente de Input
Adicionar campo de input do tipo `datetime-local` na etapa de seleção de local:

```tsx
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Data e Horário de Início da Inspeção *
  </label>
  <input
    type="datetime-local"
    value={execucaoData.data_inicio ? new Date(execucaoData.data_inicio).toISOString().slice(0, 16) : ''}
    onChange={(e) => setExecucaoData(prev => ({
      ...prev,
      data_inicio: new Date(e.target.value).toISOString()
    }))}
    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    required
  />
</div>
```

#### 1.4 Página de Continuação - Carregamento de Dados
Na função `fetchExecucaoExistente`, garantir que `data_inicio` seja carregado:

```typescript
const fetchExecucaoExistente = async () => {
  // ... código existente ...
  
  setExecucaoData({
    id: data.id,
    formulario_id: data.formulario_id,
    local_id: data.local_id,
    data_inicio: data.data_inicio || new Date().toISOString(), // Carregar data existente ou usar atual
    participantes: data.participantes?.map((p: any) => p.matricula_participante) || [],
    respostas: data.respostas || [],
    status: data.status
  });
};
```

### 2. APIs - Métodos POST e PUT

#### 2.1 Método POST (/api/inspecoes/execucoes)
Atualizar a inserção para incluir `data_inicio`:

```typescript
const { data: novaExecucao, error: insertError } = await supabase
  .from('execucoes_inspecao')
  .insert({
    formulario_id,
    local_id: parseInt(local_id),
    matricula_executor: authResult.user?.matricula,
    status: statusExecucao,
    data_inicio: body.data_inicio || new Date().toISOString(), // Novo campo
    data_conclusao: dataConclusao
  })
  .select()
  .single();
```

#### 2.2 Método PUT (/api/inspecoes/execucoes)
Adicionar atualização de `data_inicio` quando fornecido:

```typescript
// Atualizar data_inicio se fornecida
if (body.data_inicio !== undefined) {
  const { error: erroAtualizarDataInicio } = await supabase
    .from('execucoes_inspecao')
    .update({ data_inicio: body.data_inicio })
    .eq('id', execucao_id);

  if (erroAtualizarDataInicio) {
    console.error('Erro ao atualizar data de início:', erroAtualizarDataInicio);
    return NextResponse.json({ error: 'Erro ao atualizar data de início' }, { status: 500 });
  }
}
```

### 3. Validações

#### 3.1 Validações no Frontend
- Campo obrigatório - não pode estar vazio
- Data não pode ser futura (máximo: data/hora atual)
- Formato válido de datetime-local

#### 3.2 Validações no Backend
- Validar formato ISO da data
- Validar se a data é válida (não futura)
- Opcional: garantir que a data não seja anterior à data de criação do formulário

### 4. Estrutura do Payload Atualizado

#### 4.1 POST /api/inspecoes/execucoes
```json
{
  "formulario_id": "uuid-do-formulario",
  "local_id": 123,
  "data_inicio": "2024-01-15T14:30:00.000Z", // Novo campo
  "participantes": ["12345", "67890"],
  "respostas": [
    {
      "pergunta_id": "uuid-pergunta-1",
      "resposta": "conforme",
      "observacoes": "Tudo OK"
    }
  ],
  "status": "em_andamento"
}
```

#### 4.2 PUT /api/inspecoes/execucoes
```json
{
  "execucao_id": "uuid-da-execucao",
  "local_id": 123,
  "data_inicio": "2024-01-15T14:30:00.000Z", // Novo campo (opcional)
  "participantes": ["12345", "67890"],
  "respostas": [
    {
      "pergunta_id": "uuid-pergunta-1",
      "resposta": "conforme",
      "observacoes": "Tudo OK"
    }
  ],
  "status": "em_andamento"
}
```

### 5. Testes Recomendados

#### 5.1 Testes de Frontend
1. Verificar se o campo aparece corretamente na primeira etapa
2. Testar validação de campo obrigatório
3. Testar seleção de data/hora
4. Verificar se o valor é mantido ao navegar entre etapas
5. Testar carregamento de data existente na continuação

#### 5.2 Testes de API
1. Criar execução com `data_inicio` - verificar se é salvo corretamente
2. Atualizar execução alterando `data_inicio` - verificar se é atualizado
3. Testar validações de data inválida
4. Verificar se a data é retornada nas consultas

### 6. Considerações de UX

1. **Posicionamento**: O campo deve estar logo após a seleção de local, na mesma etapa
2. **Valor padrão**: Sugerir data/hora atual como padrão, mas permitir alteração
3. **Formato**: Usar input datetime-local para melhor experiência em dispositivos móveis
4. **Validação visual**: Indicar claramente quando a data for inválida
5. **Feedback**: Mostrar mensagem de erro apropriada se a data for futura

### 7. Estrutura do Banco de Dados

A tabela `execucoes_inspecao` já possui a coluna `data_inicio` com as seguintes características:
- Tipo: `timestamp with time zone`
- Valor padrão: `NOW()`
- Permite valores nulos: Sim (mas será obrigatório no frontend)

### 8. Implementação por Etapas

1. **Etapa 1**: Atualizar interfaces e estados no frontend
2. **Etapa 2**: Adicionar inputs nas páginas
3. **Etapa 3**: Atualizar APIs (POST e PUT)
4. **Etapa 4**: Adicionar validações
5. **Etapa 5**: Testar fluxo completo

Esta documentação cobre todas as alterações necessárias para implementar a funcionalidade de data e horário de início da inspeção de forma sistemática e consistente em todo o fluxo.