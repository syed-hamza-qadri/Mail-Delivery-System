import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
