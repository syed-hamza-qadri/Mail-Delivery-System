/*
Run with:
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-to-supabase.js

This script reads `email_system.json` (created by the app) and inserts templates, contacts and sent_emails into Supabase.
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const dbPath = path.join(process.cwd(), 'email_system.json');
  if (!fs.existsSync(dbPath)) {
    console.error('email_system.json not found in project root');
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  console.log('Migrating templates...');
  let templatesCount = 0;
  for (const t of content.email_templates || []) {
    const { id, name, subject, body, variables, created_at, updated_at } = t;
    const payload = {
      id: id || undefined,
      name,
      subject,
      body,
      variables: variables ? (typeof variables === 'string' ? JSON.parse(variables) : variables) : null,
      created_at: created_at || undefined,
      updated_at: updated_at || undefined,
    };

    const { error } = await supabase.from('email_templates').upsert([payload], { onConflict: 'id', returning: 'minimal' });
    if (error) console.error('Template upsert error:', error.message);
    else templatesCount++;
  }
  console.log(`Templates migrated/upserted: ${templatesCount}`);

  console.log('Migrating contacts...');
  let contactsCount = 0;
  for (const c of content.contacts || []) {
    const { id, email, name, custom_fields, created_at } = c;
    const payload = {
      id: id || undefined,
      email,
      name,
      custom_fields: custom_fields ? (typeof custom_fields === 'string' ? JSON.parse(custom_fields) : custom_fields) : null,
      created_at: created_at || undefined,
    };

    const { error } = await supabase.from('contacts').upsert([payload], { onConflict: 'id', returning: 'minimal' });
    if (error) console.error('Contact upsert error:', error.message);
    else contactsCount++;
  }
  console.log(`Contacts migrated/upserted: ${contactsCount}`);

  console.log('Migrating sent_emails...');
  let sentCount = 0;
  for (const s of content.sent_emails || []) {
    const {
      id,
      template_id,
      recipient_email,
      recipient_name,
      subject,
      body,
      status,
      error_message,
      provider_name,
      sent_at,
      created_at,
    } = s;
    const payload = {
      id: id || undefined,
      template_id: template_id || null,
      recipient_email,
      recipient_name,
      subject,
      body,
      status,
      error_message,
      provider_name,
      sent_at: sent_at || undefined,
      created_at: created_at || undefined,
    };

    const { error } = await supabase.from('sent_emails').upsert([payload], { onConflict: 'id', returning: 'minimal' });
    if (error) console.error('Sent email upsert error:', error.message);
    else sentCount++;
  }
  console.log(`Sent emails migrated/upserted: ${sentCount}`);

  console.log('Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
});
