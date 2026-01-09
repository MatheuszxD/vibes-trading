# Supabase Schema - Vibes Trading

## Como Configurar

### 1. Criar Projeto no Supabase
1. Acesse https://supabase.com
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Escolha um nome e senha para o banco
5. Aguarde o projeto ser criado (~2 min)

### 2. Executar o Schema
1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole todo o conteúdo do arquivo `schema.sql`
4. Clique em **Run** (ou Ctrl+Enter)
5. Deve aparecer "Success. No rows returned"

### 3. Verificar Tabelas
Vá em **Table Editor** e confirme que existem:
- `system_status`
- `tokens`
- `trades`
- `thoughts`
- `stats`

### 4. Verificar Realtime
1. Vá em **Database** > **Replication**
2. Na seção "supabase_realtime", verifique se todas as 5 tabelas estão listadas
3. Se alguma estiver faltando, execute no SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nome_da_tabela;
```

### 5. Pegar as Credenciais
1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: https://xxxxx.supabase.co)
   - **anon/public key** (a chave longa que começa com "eyJ...")

### 6. Configurar no Bot
Use essas credenciais no setup do bot ou no arquivo `.env`:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

## Estrutura das Tabelas

### system_status
Status geral do sistema (sempre 1 registro)
- `status`: OFFLINE, STARTING, ANALYZING, TRADING
- `mode`: PAPER ou LIVE
- `analysis_progress`: 0-100%

### tokens
Tokens analisados pelo bot
- `score`: 0-100 (pontuação da análise)
- `status`: ANALYZING, APPROVED, REJECTED, TRADED

### trades
Histórico de trades
- `side`: BUY ou SELL
- `is_paper`: true para simulação
- `pnl_sol`: lucro/prejuízo em SOL

### thoughts
Comentários gerados pelo Claude AI
- `trigger`: AUTO, TRADE, REFRESH
- `content`: texto do thought

### stats
Estatísticas agregadas (sempre 1 registro)
- Separado em stats gerais e paper mode

## Troubleshooting

### Erro "relation already exists"
Normal se executar o schema mais de uma vez. Ignore.

### Erro "publication does not exist"
Execute primeiro:
```sql
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
```

### Realtime não funciona
1. Verifique se as tabelas estão na publicação
2. No frontend, certifique-se de usar `subscribe()` corretamente
3. Pode levar alguns segundos para propagar
