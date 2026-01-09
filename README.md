# VIBES Trading

Bot de trading autonomo na Solana com dashboard em tempo real estilo terminal/retro, powered by Claude AI.

```
  ██╗   ██╗██╗██████╗ ███████╗███████╗
  ██║   ██║██║██╔══██╗██╔════╝██╔════╝
  ██║   ██║██║██████╔╝█████╗  ███████╗
  ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ╚════██║
   ╚████╔╝ ██║██████╔╝███████╗███████║
    ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
```

## Features

- **Analise Automatica** - Escuta novos tokens no Pump.fun via WebSocket
- **Score de Tokens** - Analisa market cap, holders, volume, momentum
- **Trading Autonomo** - Compra/vende baseado em criterios configurados
- **Paper Mode** - Simula trades sem gastar SOL real
- **Claude AI Thoughts** - Gera comentarios/roasts sobre performance
- **Dashboard Realtime** - Interface estilo terminal com atualizacoes em tempo real

## Estrutura

```
vibes-trading/
├── bot/           # Bot de trading (Node.js)
├── site/          # Dashboard (Next.js)
└── supabase-schema/   # Schema do banco de dados
```

## Requisitos

- Node.js 18+
- Conta no Supabase (gratuito)
- API Key do Helius (gratuito)
- API Key do Anthropic (Claude AI)

## Setup Rapido

### 1. Configurar Supabase

1. Crie uma conta em https://supabase.com
2. Crie um novo projeto
3. Va em **SQL Editor** e execute o conteudo de `supabase-schema/schema.sql`
4. Pegue as credenciais em **Settings > API**

### 2. Configurar e Rodar o Bot

```bash
cd bot
npm install
npm start
```

Na primeira execucao, o bot vai pedir suas API keys:

- **Helius API Key**: https://helius.xyz (gratuito)
- **Supabase URL e Key**: Do passo anterior
- **Anthropic API Key**: https://console.anthropic.com

### 3. Configurar e Rodar o Site

```bash
cd site
npm install

# Criar .env.local com suas credenciais
cp .env.local.example .env.local
# Edite o arquivo com suas credenciais do Supabase

npm run dev
```

Acesse http://localhost:3000

## Configuracao

### Bot (.env)

```
HELIUS_API_KEY=sua_key_helius
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_supabase
ANTHROPIC_API_KEY=sua_key_anthropic
PRIVATE_KEY=sua_private_key_opcional
API_PORT=3001
```

### Site (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_supabase
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Como Funciona

### Analise de Tokens (Score 0-100)

| Criterio | Pontos |
|----------|--------|
| Market cap ideal (5k-50k) | 25 |
| Holders >= 100 | 25 |
| Volume ratio >= 0.5 | 25 |
| Sem whale (>20%) | 15 |
| Momentum positivo | 10 |

- **Score >= 70**: Compra automatica
- **Score 50-69**: Observacao
- **Score < 50**: Ignorado

### Trading

- **Buy**: 0.1 SOL por trade (configuravel)
- **Take Profit**: +50%
- **Stop Loss**: -20%
- **Max Posicoes**: 5 simultaneas

### Thoughts (Claude AI)

A cada 5 trades, o bot gera um "roast" da performance usando Claude AI com linguagem casual de internet.

## API Endpoints

| Endpoint | Descricao |
|----------|-----------|
| GET /health | Status do servidor |
| GET /status | Status do sistema |
| GET /stats | Estatisticas |
| GET /tokens | Lista de tokens |
| GET /trades | Lista de trades |
| GET /thoughts | Lista de thoughts |
| POST /thoughts/generate | Gerar novo thought |
| POST /mode | Alternar Paper/Live |

## Deploy

### Bot

Pode ser rodado em qualquer servidor Node.js (Railway, Render, VPS, etc.)

### Site

```bash
# Deploy no Vercel
cd site
vercel
```

## Aviso Legal

Este projeto e apenas para fins educacionais. Trading de criptomoedas envolve riscos significativos. Use por sua conta e risco. Nao e aconselhamento financeiro.

## Licenca

MIT
