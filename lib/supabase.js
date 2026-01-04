// Server-side Supabase client
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn(
    'SUPABASE_URL and SUPABASE_SERVICE_KEY are not set. Supabase client will fail until they are provided.'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Provider usage helpers
async function getProviderUsage(providerName) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('provider_daily_usage')
    .select('*')
    .eq('provider_name', providerName)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = No rows returned for single()
    return { provider_name: providerName, date: today, count: 0, limit: null };
  }

  if (!data || data.date !== today) {
    return {
      provider_name: providerName,
      date: today,
      count: 0,
      daily_limit: data ? data.daily_limit : null,
    };
  }

  return data;
}

async function incrementProviderUsage(providerName, limit = 100) {
  const today = new Date().toISOString().split('T')[0];

  // Try to upsert: if exists and same date, increment; otherwise set to today with count=1
  const { data, error } = await supabase
    .from('provider_daily_usage')
    .select('*')
    .eq('provider_name', providerName)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data || data.date !== today) {
    const insert = await supabase
      .from('provider_daily_usage')
      .upsert([{ provider_name: providerName, date: today, count: 1, daily_limit: limit }], {
        onConflict: 'provider_name',
      });
    if (insert.error) throw insert.error;
    return { provider_name: providerName, date: today, count: 1, daily_limit: limit };
  }

  // Update increment
  const updated = await supabase
    .from('provider_daily_usage')
    .update({ count: data.count + 1 })
    .eq('provider_name', providerName);
  if (updated.error) throw updated.error;
  return {
    provider_name: providerName,
    date: today,
    count: data.count + 1,
    daily_limit: data.daily_limit || limit,
  };
}

async function resetDailyCounters() {
  const today = new Date().toISOString().split('T')[0];
  // Set all provider rows to today's date and count 0
  const { data, error } = await supabase.from('provider_daily_usage').select('*');
  if (error) throw error;

  for (const row of data || []) {
    const resp = await supabase
      .from('provider_daily_usage')
      .update({ date: today, count: 0 })
      .eq('provider_name', row.provider_name);
    if (resp.error) throw resp.error;
  }

  return true;
}

module.exports = { supabase, getProviderUsage, incrementProviderUsage, resetDailyCounters };
