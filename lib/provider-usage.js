// Provider usage persistence - can use Supabase if configured
let supabaseClient = null;

try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { supabase } = require('./supabase');
    supabaseClient = supabase;
  }
} catch (e) {
  // Supabase not configured, continue with in-memory only
}

async function saveProviderUsage(providerName, count, limit = 100) {
  if (!supabaseClient) return; // Not configured

  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabaseClient
      .from('provider_daily_usage')
      .upsert([{ provider_name: providerName, date: today, count, daily_limit: limit }], {
        onConflict: 'provider_name',
      });
    if (error) console.error('Failed to save provider usage to Supabase:', error.message);
  } catch (err) {
    console.error('Error saving provider usage:', err.message);
  }
}

async function getProviderUsageFromSupabase(providerName) {
  if (!supabaseClient) return null;

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('provider_daily_usage')
      .select('*')
      .eq('provider_name', providerName)
      .limit(1)
      .single();

    if (error) return null; // No row found or other error
    if (!data || data.date !== today) return null;

    return data;
  } catch (err) {
    return null;
  }
}

module.exports = {
  saveProviderUsage,
  getProviderUsageFromSupabase,
  isSupabaseConfigured: () => !!supabaseClient,
};
