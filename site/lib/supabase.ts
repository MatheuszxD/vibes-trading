import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Hardcode the values to ensure they work on Vercel
const SUPABASE_URL = 'https://xumydwyfwhbmdlffapue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bXlkd3lmd2hibWRsZmZhcHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTIzMTksImV4cCI6MjA4MzQ2ODMxOX0.rTy8Em9hnbjMTYaK_Wvw_17w1x2Jj6QFd7q1J6G9168';

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization - only creates client when called on the browser
function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Export for backwards compatibility
export const supabase = {
  get client() {
    return getSupabase();
  },
  removeChannel(channel: RealtimeChannel) {
    const client = getSupabase();
    if (client) client.removeChannel(channel);
  }
};

// Types
export interface SystemStatus {
  id: number;
  wallet_address: string | null;
  balance_sol: number;
  status: 'OFFLINE' | 'STARTING' | 'ANALYZING' | 'TRADING';
  mode: 'PAPER' | 'LIVE';
  analysis_progress: number;
  trades_analyzed: number;
  trades_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  initial_mcap: number;
  current_mcap: number;
  volume_24h: number;
  holders: number;
  score: number;
  status: 'ANALYZING' | 'APPROVED' | 'REJECTED' | 'TRADED';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  token_id: string | null;
  mint: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount_sol: number;
  amount_tokens: number;
  price_sol: number;
  price_usd: number;
  pnl_sol: number | null;
  pnl_percent: number | null;
  is_paper: boolean;
  signature: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  created_at: string;
}

export interface Thought {
  id: string;
  content: string;
  trigger: 'AUTO' | 'TRADE' | 'REFRESH';
  trades_count: number;
  win_rate: number;
  pnl_sol: number;
  created_at: string;
}

export interface Stats {
  id: number;
  total_pnl_sol: number;
  win_rate: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  open_positions: number;
  paper_balance: number;
  paper_pnl_sol: number;
  paper_pnl_percent: number;
  paper_win_rate: number;
  paper_trades: number;
  paper_wins: number;
  paper_losses: number;
  paper_open: number;
  updated_at: string;
}

// Fetch functions
export async function getSystemStatus(): Promise<SystemStatus | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('system_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching system status:', error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getStats(): Promise<Stats | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getTokens(limit = 50): Promise<Token[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function getTrades(limit = 50): Promise<Trade[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function getThoughts(limit = 10): Promise<Thought[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('thoughts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching thoughts:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// Realtime subscriptions
export function subscribeToTable<T>(
  table: string,
  callback: (payload: { new: T; old: T; eventType: string }) => void
): RealtimeChannel | null {
  const client = getSupabase();
  if (!client) return null;
  return client
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        callback({
          new: payload.new as T,
          old: payload.old as T,
          eventType: payload.eventType,
        });
      }
    )
    .subscribe();
}

// API functions (for bot endpoints)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function generateThought(): Promise<Thought | null> {
  try {
    const response = await fetch(`${apiUrl}/thoughts/generate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate thought');
    return await response.json();
  } catch (error) {
    console.error('Error generating thought:', error);
    return null;
  }
}

export async function toggleMode(paper: boolean): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error toggling mode:', error);
    return false;
  }
}
