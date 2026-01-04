import { supabase } from '../../../lib/supabase';
import { getEmailPool } from '../../../lib/email-pool';
import { mergeTemplate } from '../../../lib/helpers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const emailPool = getEmailPool();
  const { template_id, recipient_email, recipient_name, variables } = req.body;

  if (emailPool.providers.length === 0) {
    return res.status(500).json({
      error: 'No email providers configured. Please configure at least one email provider.',
    });
  }

  if (!template_id || !recipient_email) {
    return res.status(400).json({ error: 'Template ID and recipient email are required' });
  }

  try {
    // Get template
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .limit(1)
      .single();
    if (templateError) throw templateError;
    const template = templateData;

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Merge template with variables
    const merged = mergeTemplate(template, variables || {});

    // Send email using unified function
    try {
      const result = await emailPool.sendEmail(recipient_email, merged.subject, merged.body);

      // Log to database (Supabase)
      const status = 'sent';
      const sentAt = new Date().toISOString();
      const providerName = result.provider || 'unknown';

      const { error: insertError } = await supabase.from('sent_emails').insert([
        {
          template_id,
          recipient_email,
          recipient_name: recipient_name || null,
          subject: merged.subject,
          body: merged.body,
          status,
          error_message: null,
          provider_name: providerName,
          sent_at: sentAt,
        },
      ]);
      if (insertError) console.error('Failed to log sent email:', insertError.message);

      return res.status(200).json({
        message: 'Email sent successfully',
        messageId: result.messageId,
        provider: providerName,
      });
    } catch (error) {
      // Log error to database
      const status = 'failed';
      const errorMessage = error.message;

      const { error: insertError } = await supabase.from('sent_emails').insert([
        {
          template_id,
          recipient_email,
          recipient_name: recipient_name || null,
          subject: merged.subject,
          body: merged.body,
          status,
          error_message: errorMessage,
          provider_name: 'none',
          sent_at: null,
        },
      ]);
      if (insertError) console.error('Failed to log failed send:', insertError.message);

      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
