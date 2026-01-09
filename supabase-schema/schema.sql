-- ============================================
-- VIBES TRADING - SUPABASE SCHEMA
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query
-- ============================================

-- System Status (singleton - sempre id=1)
CREATE TABLE IF NOT EXISTS system_status (
    id INT PRIMARY KEY DEFAULT 1,
    wallet_address TEXT,
    balance_sol DECIMAL(20, 9),
    status TEXT DEFAULT 'OFFLINE',
    mode TEXT DEFAULT 'PAPER',
    analysis_progress INT DEFAULT 0,
    trades_analyzed INT DEFAULT 0,
    trades_remaining INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Tokens analisados
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mint TEXT UNIQUE NOT NULL,
    name TEXT,
    symbol TEXT,
    creator TEXT,
    initial_mcap DECIMAL(20, 2),
    current_mcap DECIMAL(20, 2),
    volume_24h DECIMAL(20, 2),
    holders INT DEFAULT 0,
    score INT DEFAULT 0,
    status TEXT DEFAULT 'ANALYZING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades executados
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    mint TEXT NOT NULL,
    symbol TEXT,
    side TEXT NOT NULL,
    amount_sol DECIMAL(20, 9),
    amount_tokens DECIMAL(30, 0),
    price_sol DECIMAL(30, 18),
    price_usd DECIMAL(20, 6),
    pnl_sol DECIMAL(20, 9),
    pnl_percent DECIMAL(10, 4),
    is_paper BOOLEAN DEFAULT true,
    signature TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thoughts do Claude AI
CREATE TABLE IF NOT EXISTS thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    trigger TEXT,
    trades_count INT,
    win_rate DECIMAL(5, 2),
    pnl_sol DECIMAL(20, 9),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats agregados (singleton - sempre id=1)
CREATE TABLE IF NOT EXISTS stats (
    id INT PRIMARY KEY DEFAULT 1,
    total_pnl_sol DECIMAL(20, 9) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    open_positions INT DEFAULT 0,
    paper_balance DECIMAL(20, 9) DEFAULT 10,
    paper_pnl_sol DECIMAL(20, 9) DEFAULT 0,
    paper_pnl_percent DECIMAL(10, 4) DEFAULT 0,
    paper_win_rate DECIMAL(5, 2) DEFAULT 0,
    paper_trades INT DEFAULT 0,
    paper_wins INT DEFAULT 0,
    paper_losses INT DEFAULT 0,
    paper_open INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_stats_row CHECK (id = 1)
);

-- ============================================
-- INDICES para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_score ON tokens(score DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_created ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_is_paper ON trades(is_paper);
CREATE INDEX IF NOT EXISTS idx_trades_side ON trades(side);
CREATE INDEX IF NOT EXISTS idx_trades_mint ON trades(mint);
CREATE INDEX IF NOT EXISTS idx_thoughts_created ON thoughts(created_at DESC);

-- ============================================
-- HABILITAR REALTIME (CRITICO!)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE system_status;
ALTER PUBLICATION supabase_realtime ADD TABLE tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE stats;

-- ============================================
-- INSERIR REGISTROS INICIAIS
-- ============================================

INSERT INTO system_status (id, status, mode)
VALUES (1, 'OFFLINE', 'PAPER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stats (id, paper_balance)
VALUES (1, 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNCOES UTILITARIAS (opcional)
-- ============================================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-update
DROP TRIGGER IF EXISTS update_system_status_updated_at ON system_status;
CREATE TRIGGER update_system_status_updated_at
    BEFORE UPDATE ON system_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tokens_updated_at ON tokens;
CREATE TRIGGER update_tokens_updated_at
    BEFORE UPDATE ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_stats_updated_at ON stats;
CREATE TRIGGER update_stats_updated_at
    BEFORE UPDATE ON stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VERIFICACAO
-- ============================================

-- Execute para verificar se tudo foi criado:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verificar Realtime:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
