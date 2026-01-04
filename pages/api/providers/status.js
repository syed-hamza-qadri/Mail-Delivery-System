import { supabase } from '../../../lib/supabase';
import { getEmailPool } from '../../../lib/email-pool';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const emailPool = getEmailPool();

  try {
    const status = emailPool.getStatus();
    const stats = emailPool.getStats();

    // Get provider usage from Supabase sent_emails table
    const { data: allSent, error: sentError } = await supabase
      .from('sent_emails')
      .select('provider_name, status');
    if (sentError) throw sentError;

    const usageMap = {};
    (allSent || []).forEach((e) => {
      if (!e.provider_name) return;
      if (!usageMap[e.provider_name])
        usageMap[e.provider_name] = { total_sent: 0, successful: 0, failed: 0 };
      usageMap[e.provider_name].total_sent += 1;
      if (e.status === 'sent') usageMap[e.provider_name].successful += 1;
      if (e.status === 'failed') usageMap[e.provider_name].failed += 1;
    });

    // Get daily usage from provider_daily_usage table
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyUsageData, error: dailyError } = await supabase
      .from('provider_daily_usage')
      .select('*')
      .eq('date', today);
    if (dailyError) throw dailyError;

    const dailyUsageMap = {};
    (dailyUsageData || []).forEach((du) => {
      dailyUsageMap[du.provider_name] = {
        count: du.count || 0,
        limit: du.daily_limit || 100,
        date: du.date,
        exhausted: (du.count || 0) >= (du.daily_limit || 100),
      };
    });

    // Merge status with usage stats and daily usage
    const providersWithUsage = status.map((provider) => {
      const usage = usageMap[provider.name] || { total_sent: 0, successful: 0, failed: 0 };
      const dailyUsage = dailyUsageMap[provider.name] || {
        count: 0,
        limit: provider.dailyLimit || 100,
        date: today,
        exhausted: false,
      };

      return {
        ...provider,
        usage: {
          total: usage.total_sent,
          successful: usage.successful,
          failed: usage.failed,
        },
        stats: stats[provider.name] || { success: 0, failed: 0 },
        dailyUsage,
      };
    });

    return res.status(200).json({
      providers: providersWithUsage,
      total_providers: status.length,
      active_providers: status.filter((p) => p.status === 'active').length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
