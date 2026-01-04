-- Supabase / Postgres schema for Merge Email System

-- email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- contacts
CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- sent_emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id BIGINT PRIMARY KEY,
  template_id BIGINT REFERENCES email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  provider_name TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- provider_daily_usage
CREATE TABLE IF NOT EXISTS provider_daily_usage (
  provider_name TEXT PRIMARY KEY,
  date DATE NOT NULL,
  count BIGINT DEFAULT 0,
  daily_limit BIGINT DEFAULT 100
);

-- simple sequences for IDs
CREATE SEQUENCE IF NOT EXISTS email_templates_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS contacts_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS sent_emails_seq START WITH 1;

-- trigger functions to set IDs if not provided
CREATE OR REPLACE FUNCTION set_default_id() RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    IF (TG_TABLE_NAME = 'email_templates') THEN
      NEW.id := nextval('email_templates_seq');
    ELSIF (TG_TABLE_NAME = 'contacts') THEN
      NEW.id := nextval('contacts_seq');
    ELSIF (TG_TABLE_NAME = 'sent_emails') THEN
      NEW.id := nextval('sent_emails_seq');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_id_email_templates BEFORE INSERT ON email_templates FOR EACH ROW EXECUTE FUNCTION set_default_id();
CREATE TRIGGER set_id_contacts BEFORE INSERT ON contacts FOR EACH ROW EXECUTE FUNCTION set_default_id();
CREATE TRIGGER set_id_sent_emails BEFORE INSERT ON sent_emails FOR EACH ROW EXECUTE FUNCTION set_default_id();
