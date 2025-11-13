# Teste e Verificação: Sistema de Planos de Ação Corrigido

## 1. Resumo das Correções Aplicadas

### 1.1 Frontend - PlanoAcaoModal.tsx
- ✅ **Campos atualizados:** `desvio`, `o_que_fazer`, `como_fazer`
- ✅ **Removidos:** `titulo`, `descricao`, `observacoes`
- ✅ **Labels atualizados:** Descrição do Desvio, O que deve ser feito, Como executar
- ✅ **Validações:** Todas as validações atualizadas para novos campos

### 1.2 APIs Backend
- ✅ **POST /api/inspecoes/execucoes/[id]/planos-acao** - Validações atualizadas
- ✅ **PUT /api/inspecoes/execucoes/[id]/planos-acao/[planoId]** - Campos corretos
- ✅ **GET /api/inspecoes/execucoes/[id]/planos-acao** - Relacionamentos fixos
- ✅ **Evidências:** Upload com campos corretos do banco

### 1.3 Banco de Dados
- ✅ **Tabela planos_acao:** Já possui `como_fazer TEXT NOT NULL`
- ✅ **Estrutura correta:** Migração 030 definida corretamente
- ✅ **Relacionamentos:** `pergunta_id` vinculado a `inspecoes_perguntas`

## 2. Checklist de Verificação

### 2.1 Verificações de Banco de Dados
- [ ] Confirmar que migração 030 está aplicada
- [ ] Verificar existência da coluna `como_fazer`
- [ ] Confirmar constraint `unique_plano_por_pergunta`
- [ ] Validar índices em `pergunta_id` e `execucao_inspecao_id`

### 2.2 Verificações de Frontend
- [ ] Abrir modal de criação de plano de ação
- [ ] Verificar labels dos campos (Descrição do Desvio, O que deve ser feito, Como executar)
- [ ] Testar validações de campos obrigatórios
- [ ] Confirmar envio com novos nomes de campos

### 2.3 Verificações de APIs
- [ ] Testar POST com campos `desvio`, `o_que_fazer`, `como_fazer`
- [ ] Testar PUT com mesmos campos
- [ ] Verificar resposta da API inclui campos corretos
- [ ] Confirmar vinculação por `pergunta_id`

## 3. Testes Funcionais Recomendados

### 3.1 Fluxo Completo de Criação
```bash
# 1. Criar uma execução de inspeção
POST /api/inspecoes/execucoes
{
  "formulario_id": "uuid-do-formulario",
  "local_id": "uuid-do-local",
  "participantes": [12345, 67890]
}

# 2. Responder perguntas com não conformidade
POST /api/inspecoes/execucoes/[id]/respostas
{
  "pergunta_id": "uuid-pergunta",
  "resposta": "nao_conforme",
  "observacoes": "Problema identificado"
}

# 3. Criar plano de ação vinculado à pergunta
POST /api/inspecoes/execucoes/[id]/planos-acao
{
  "pergunta_id": "uuid-pergunta",
  "desvio": "Equipamento sem manutenção",
  "o_que_fazer": "Realizar manutenção preventiva",
  "como_fazer": "Verificar manual do fabricante, agendar com manutenção, aplicar checklist",
  "responsavel_matricula": 12345,
  "prazo": "2024-12-31",
  "prioridade": "alta"
}
```

### 3.2 Teste de Vinculação Pergunta-Plano
```bash
# Verificar se plano foi criado vinculado à pergunta
GET /api/inspecoes/execucoes/[id]/planos-acao

# Resposta esperada:
{
  "success": true,
  "data": [{
    "id": "uuid-plano",
    "pergunta_id": "uuid-pergunta",
    "desvio": "Equipamento sem manutenção",
    "o_que_fazer": "Realizar manutenção preventiva", 
    "como_fazer": "Verificar manual do fabricante...",
    "responsavel_info": {
      "matricula": 12345,
      "nome": "João Silva"
    }
  }]
}
```

### 3.3 Teste de Finalização de Inspeção
```bash
# Tentar finalizar inspeção sem plano para pergunta não conforme
POST /api/inspecoes/finalizar
{
  "execucao_id": "uuid-execucao"
}

# Resposta esperada (erro):
{
  "success": false,
  "error": "Existem perguntas 'Não Conforme' sem planos de ação associados"
}

# Após criar plano, finalizar deve funcionar
POST /api/inspecoes/finalizar
{
  "execucao_id": "uuid-execucao"
}

# Resposta esperada (sucesso):
{
  "success": true,
  "message": "Inspeção finalizada com sucesso"
}
```

## 4. Testes de Upload de Evidências

### 4.1 Upload de Arquivo
```bash
# Upload de evidência para plano de ação
POST /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias
Content-Type: multipart/form-data

# Campos:
# - arquivo: [arquivo binário]
# - descricao: "Foto do equipamento com problema"
# - tipo_evidencia: "nao_conformidade"
```

### 4.2 Verificação de Evidências
```bash
# Listar evidências do plano
GET /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias

# Resposta esperada:
{
  "success": true,
  "data": [{
    "id": "uuid-evidencia",
    "nome_arquivo": "foto_problema.jpg",
    "caminho_arquivo": "evidencias/planos/123/foto_problema.jpg",
    "tamanho_bytes": 1024000,
    "tipo_mime": "image/jpeg",
    "tipo_evidencia": "nao_conformidade"
  }]
}
```

## 5. Testes de Permissões

### 5.1 Criação de Plano
- [ ] **Executor da inspeção:** Deve conseguir criar planos
- [ ] **Admin:** Deve conseguir criar planos em qualquer inspeção
- [ ] **Outro usuário:** Não deve conseguir criar planos

### 5.2 Edição de Plano
- [ ] **Criador do plano:** Deve conseguir editar
- [ ] **Admin:** Deve conseguir editar qualquer plano
- [ ] **Outro usuário:** Não deve conseguir editar

### 5.3 Upload de Evidências
- [ ] **Executor da inspeção:** Deve conseguir fazer upload
- [ ] **Admin:** Deve conseguir fazer upload em qualquer plano
- [ ] **Outro usuário:** Não deve conseguir fazer upload

## 6. Validações de Campos

### 6.1 Campos Obrigatórios
```bash
# Testar sem campo obrigatório
POST /api/inspecoes/execucoes/[id]/planos-acao
{
  "pergunta_id": "uuid-pergunta",
  "desvio": "",  // Vazio
  "o_que_fazer": "Realizar manutenção",
  "como_fazer": "Verificar manual",
  "responsavel_matricula": 12345,
  "prazo": "2024-12-31",
  "prioridade": "alta"
}

# Resposta esperada:
{
  "success": false,
  "error": "Dados inválidos",
  "details": {
    "desvio": "Descrição do desvio é obrigatória"
  }
}
```

### 6.2 Formato de Dados
- [ ] **Data de prazo:** Deve estar no formato YYYY-MM-DD
- [ ] **Prioridade:** Deve ser uma das opções válidas (baixa, media, alta, urgente)
- [ ] **Matrícula:** Deve existir no banco de dados
- [ ] **Pergunta ID:** Deve existir e pertencer ao formulário da execução

## 7. Testes de Integração Frontend-Backend

### 7.1 Modal de Criação
1. Abrir modal em pergunta não conforme
2. Preencher todos os campos obrigatórios
3. Clicar em "Salvar"
4. Verificar se plano aparece na lista
5. Confirmar vinculação à pergunta

### 7.2 Modal de Edição
1. Clicar em editar plano existente
2. Alterar campo "como_fazer"
3. Salvar alterações
4. Verificar se atualização foi aplicada

### 7.3 Upload de Evidências
1. Clicar em "Adicionar Evidência"
2. Selecionar arquivo (imagem/documento)
3. Adicionar descrição
4. Confirmar upload
5. Verificar se arquivo aparece na lista

## 8. Testes de Performance

### 8.1 Carregamento de Planos
- [ ] Listar planos deve carregar em < 2 segundos para 50 registros
- [ ] Filtros devem aplicar em < 1 segundo
- [ ] Upload de arquivo deve completar em < 10 segundos (dependendo do tamanho)

### 8.2 Validações
- [ ] Validações de campos devem ser instantâneas
- [ ] Verificações de permissão devem ser rápidas
- [ ] Verificação de existência de planos por pergunta deve ser eficiente

## 9. Casos de Teste Específicos

### 9.1 Múltiplos Planos por Pergunta
```bash
# Criar primeiro plano
POST /api/inspecoes/execucoes/[id]/planos-acao
{
  "pergunta_id": "uuid-pergunta-1",
  "desvio": "Problema 1",
  "o_que_fazer": "Ação 1",
  "como_fazer": "Como fazer 1",
  "responsavel_matricula": 12345,
  "prazo": "2024-12-31",
  "prioridade": "alta"
}

# Tentar criar segundo plano para mesma pergunta
# Deve falhar devido ao constraint unique_plano_por_pergunta
```

### 9.2 Planos para Perguntas Diferentes
```bash
# Criar planos para perguntas diferentes na mesma execução
# Deve permitir (constraint é por pergunta, não por execução)
```

### 9.3 Exclusão de Plano com Evidências
```bash
# Criar plano com evidências
# Deletar plano
# Verificar se evidências também foram deletadas (ON DELETE CASCADE)
```

## 10. Documentação de Resultados

### 10.1 Formato de Registro
Para cada teste realizado, registrar:
```
Data: YYYY-MM-DD HH:MM:SS
Teste: [Nome do teste]
Resultado: [Sucesso/Falha]
Detalhes: [Observações específicas]
Screenshots: [Se aplicável]
```

### 10.2 Métricas de Sucesso
- ✅ **100% dos testes de criação** devem passar
- ✅ **100% dos testes de vinculação** devem passar
- ✅ **100% dos testes de permissão** devem passar
- ✅ **95% dos testes de performance** devem passar (margem para variações)

## 11. Próximos Passos Após Testes

### 11.1 Se Todos os Testes Passarem
1. Marcar funcionalidade como "Pronta para Produção"
2. Atualizar documentação de usuário
3. Treinar usuários sobre novo fluxo
4. Monitorar métricas de uso