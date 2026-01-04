import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const limit = parseInt(req.query.limit) || 100;

  try {
    const { data: emails, error: emailsError } = await supabase
      .from('sent_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (emailsError) throw emailsError;

    const templateIds = Array.from(
      new Set((emails || []).map((e) => e.template_id).filter(Boolean))
    );
    let templatesMap = {};
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from('email_templates')
        .select('id, name')
        .in('id', templateIds);
      templatesMap = (templates || []).reduce((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {});
    }

    const enriched = (emails || []).map((e) => ({
      ...e,
      template_name: templatesMap[e.template_id] || null,
    }));

    return res.status(200).json(enriched);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
