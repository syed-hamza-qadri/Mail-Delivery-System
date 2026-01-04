import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (error) throw error;
      const template = data && data[0];
      if (!template) return res.status(404).json({ error: 'Template not found' });
      return res.status(200).json(template);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, subject, body, variables } = req.body;
      const payload = {
        name,
        subject,
        body,
        variables: variables || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('email_templates').update(payload).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ message: 'Template updated successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ message: 'Template deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
