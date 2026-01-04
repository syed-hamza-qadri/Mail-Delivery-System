import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.status(200).json(data || []);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { email, name, custom_fields } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      try {
        const payload = { email, name: name || null, custom_fields: custom_fields || null };
        const { data, error } = await supabase.from('contacts').insert([payload]).select('id');
        if (error) {
          if (error.code === '23505') {
            return res.status(409).json({ error: 'Contact with this email already exists' });
          }
          throw error;
        }

        res
          .status(200)
          .json({ id: data && data[0] && data[0].id, message: 'Contact created successfully' });
      } catch (error) {
        if (error.message && error.message.includes('duplicate')) {
          res.status(409).json({ error: 'Contact with this email already exists' });
          return;
        }
        throw error;
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
