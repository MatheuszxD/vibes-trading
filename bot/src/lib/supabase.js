import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let supabase = null;

export function initSupabase() {
    if (!supabase) {
        supabase = createClient(config.supabaseUrl, config.supabaseKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
    }
    return supabase;
}

export function getSupabase() {
    if (!supabase) {
        throw new Error('Supabase not initialized. Call initSupabase() first.');
    }
    return supabase;
}

// System Status
export async function getSystemStatus() {
    const { data, error } = await getSupabase()
        .from('system_status')
        .select('*')
        .eq('id', 1)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function updateSystemStatus(updates) {
    const { data, error } = await getSupabase()
        .from('system_status')
        .upsert({ id: 1, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Stats
export async function getStats() {
    const { data, error } = await getSupabase()
        .from('stats')
        .select('*')
        .eq('id', 1)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function updateStats(updates) {
    const { data, error } = await getSupabase()
        .from('stats')
        .upsert({ id: 1, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Tokens
export async function insertToken(token) {
    const { data, error } = await getSupabase()
        .from('tokens')
        .insert(token)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateToken(mint, updates) {
    const { data, error } = await getSupabase()
        .from('tokens')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('mint', mint)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getToken(mint) {
    const { data, error } = await getSupabase()
        .from('tokens')
        .select('*')
        .eq('mint', mint)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function getTokens(limit = 50, status = null) {
    let query = getSupabase()
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// Trades
export async function insertTrade(trade) {
    const { data, error } = await getSupabase()
        .from('trades')
        .insert(trade)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTrade(id, updates) {
    const { data, error } = await getSupabase()
        .from('trades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getTrades(limit = 50, isPaper = null) {
    let query = getSupabase()
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (isPaper !== null) {
        query = query.eq('is_paper', isPaper);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getOpenTrades(isPaper = null) {
    let query = getSupabase()
        .from('trades')
        .select('*')
        .eq('side', 'BUY')
        .is('pnl_sol', null)
        .order('created_at', { ascending: false });

    if (isPaper !== null) {
        query = query.eq('is_paper', isPaper);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getRecentTrades(limit = 10) {
    const { data, error } = await getSupabase()
        .from('trades')
        .select('*')
        .not('pnl_sol', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// Thoughts
export async function insertThought(thought) {
    const { data, error } = await getSupabase()
        .from('thoughts')
        .insert(thought)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getThoughts(limit = 10) {
    const { data, error } = await getSupabase()
        .from('thoughts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// Realtime subscriptions
export function subscribeToTable(table, callback) {
    return getSupabase()
        .channel(`${table}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
}
