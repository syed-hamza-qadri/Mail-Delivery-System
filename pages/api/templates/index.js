import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing Supabase environment variables in templates API');
        return res.status(500).json({ 
          error: 'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables in Vercel.' 
        });
      }
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.status(200).json(data || []);
    } catch (error) {
      console.error('Templates API error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch templates' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, subject, body, variables } = req.body;
      if (!name || !subject || !body) {
        res.status(400).json({ error: 'Name, subject, and body are required' });
        return;
      }

      const payload = {
        name,
        subject,
        body,
        variables: variables || null,
      };

      const { data, error } = await supabase.from('email_templates').insert([payload]).select('id');
      if (error) throw error;
      res
        .status(200)
        .json({ id: data && data[0] && data[0].id, message: 'Template created successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
