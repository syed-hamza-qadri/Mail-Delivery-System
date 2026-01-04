import { supabase } from '../../../lib/supabase';
import { getEmailPool } from '../../../lib/email-pool';
import { mergeTemplate } from '../../../lib/helpers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const emailPool = getEmailPool();
  const { template_id, contact_ids, variables_map } = req.body;

  if (emailPool.providers.length === 0) {
    return res.status(500).json({
      error: 'No email providers configured. Please configure at least one email provider.',
    });
  }

  if (!template_id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  try {
    // Get template
    const { data: templates, error: tError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .limit(1)
      .single();
    if (tError) throw tError;
    const template = templates;

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get contacts
    let contacts = [];
    if (contact_ids && contact_ids.length > 0) {
      const { data, error } = await supabase.from('contacts').select('*').in('id', contact_ids);
      if (error) throw error;
      contacts = data || [];
    } else {
      const { data, error } = await supabase.from('contacts').select('*');
      if (error) throw error;
      contacts = data || [];
    }

    if (contacts.length === 0) {
      return res.status(200).json({ message: 'No contacts found', results: [] });
    }

    const results = [];
    const promises = contacts.map(async (contact) => {
      let merged = null;
      try {
        const customFields = contact.custom_fields || {};
        const contactVariables =
          variables_map && variables_map[contact.id] ? variables_map[contact.id] : {};
        const allVariables = {
          name: contact.name || '',
          email: contact.email,
          ...customFields,
          ...contactVariables,
        };

        merged = mergeTemplate(template, allVariables);

        // Send email using unified function
        const result = await emailPool.sendEmail(contact.email, merged.subject, merged.body);

        const status = 'sent';
        const sentAt = new Date().toISOString();
        const providerName = result.provider || 'unknown';

        // Log to Supabase
        const { error: insertError } = await supabase.from('sent_emails').insert([
          {
            template_id,
            recipient_email: contact.email,
            recipient_name: contact.name || null,
            subject: merged.subject,
            body: merged.body,
            status,
            error_message: null,
            provider_name: providerName,
            sent_at: sentAt,
          },
        ]);
        if (insertError) console.error('Failed to log sent email:', insertError.message);

        // Increment daily usage counter for the provider using increment function
        try {
          const today = new Date().toISOString().split('T')[0];
          // First try to get the current count
          const { data: existing, error: fetchErr } = await supabase
            .from('provider_daily_usage')
            .select('*')
            .eq('provider_name', providerName)
            .eq('date', today)
            .maybeSingle();

          if (fetchErr && fetchErr.code !== 'PGRST116') {
            throw fetchErr;
          }

          if (existing) {
            // Update by incrementing count
            await supabase
              .from('provider_daily_usage')
              .update({ count: existing.count + 1 })
              .eq('provider_name', providerName)
              .eq('date', today);
          } else {
            // Insert new record
            await supabase.from('provider_daily_usage').insert({
              provider_name: providerName,
              date: today,
              count: 1,
              daily_limit: 100,
            });
          }
        } catch (usageErr) {
          console.error('Error updating daily usage:', usageErr.message);
        }

        results.push({
          contact_id: contact.id,
          email: contact.email,
          status: status,
          error: null,
        });
      } catch (error) {
        const status = 'failed';
        const errorMessage = error.message;

        // Merge template for error logging if not already merged
        if (!merged) {
          const customFields = contact.custom_fields || {};
          const contactVariables =
            variables_map && variables_map[contact.id] ? variables_map[contact.id] : {};
          const allVariables = {
            name: contact.name || '',
            email: contact.email,
            ...customFields,
            ...contactVariables,
          };
          merged = mergeTemplate(template, allVariables);
        }

        // Log to Supabase
        const { error: insertError } = await supabase.from('sent_emails').insert([
          {
            template_id,
            recipient_email: contact.email,
            recipient_name: contact.name || null,
            subject: merged.subject,
            body: merged.body,
            status,
            error_message: errorMessage,
            provider_name: 'none',
            sent_at: null,
          },
        ]);
        if (insertError) console.error('Failed to log failed send:', insertError.message);

        results.push({
          contact_id: contact.id,
          email: contact.email,
          status: status,
          error: errorMessage,
        });
      }
    });

    await Promise.all(promises);

    return res.status(200).json({
      message: `Processed ${contacts.length} emails`,
      results: results,
      success_count: results.filter((r) => r.status === 'sent').length,
      failure_count: results.filter((r) => r.status === 'failed').length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
