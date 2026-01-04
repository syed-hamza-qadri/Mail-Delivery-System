// Database utility for Next.js - JSON-based replacement
const path = require('path');
const fs = require('fs');

const dbDir = process.env.VERCEL ? '/tmp' : process.cwd();

const dbPath = path.join(dbDir, 'email_system.json');

// Initialize database file structure
function initializeDatabase() {
  if (!fs.existsSync(dbPath)) {
    const initialDb = {
      email_templates: [],
      contacts: [],
      sent_emails: [],
      _nextIds: {
        email_templates: 1,
        contacts: 1,
        sent_emails: 1,
      },
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2));
  }
}

function getDatabase() {
  initializeDatabase();

  // Return a simple object with methods
  return {
    prepare: (sql) => {
      return {
        run: (...params) => {
          const data = readDb();

          // Handle INSERT
          if (sql.includes('INSERT INTO email_templates')) {
            const [name, subject, body, variables] = params;
            const id = data._nextIds.email_templates++;
            data.email_templates.push({
              id,
              name,
              subject,
              body,
              variables,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            writeDb(data);
            return { changes: 1, lastInsertRowid: id };
          }

          if (sql.includes('INSERT INTO contacts')) {
            const [email, name, customFields] = params;
            const id = data._nextIds.contacts++;
            data.contacts.push({
              id,
              email,
              name,
              custom_fields: customFields,
              created_at: new Date().toISOString(),
            });
            writeDb(data);
            return { changes: 1, lastInsertRowid: id };
          }

          if (sql.includes('INSERT INTO sent_emails')) {
            const [
              templateId,
              recipientEmail,
              recipientName,
              subject,
              body,
              status,
              errorMsg,
              providerName,
            ] = params;
            const id = data._nextIds.sent_emails++;
            data.sent_emails.push({
              id,
              template_id: templateId,
              recipient_email: recipientEmail,
              recipient_name: recipientName,
              subject,
              body,
              status: status || 'pending',
              error_message: errorMsg,
              provider_name: providerName,
              sent_at: null,
              created_at: new Date().toISOString(),
            });
            writeDb(data);
            return { changes: 1 };
          }

          // Handle UPDATE
          if (sql.includes('UPDATE')) {
            let changes = 0;
            const match = sql.match(/UPDATE (\w+)/);
            const table = match ? match[1] : null;

            if (table === 'email_templates' && sql.includes('WHERE id')) {
              const lastParam = params[params.length - 1];
              const idx = data.email_templates.findIndex((t) => t.id === lastParam);
              if (idx !== -1) {
                const [name, subject, body, variables] = params;
                data.email_templates[idx] = {
                  ...data.email_templates[idx],
                  name,
                  subject,
                  body,
                  variables,
                  updated_at: new Date().toISOString(),
                };
                changes = 1;
              }
            }

            if (table === 'sent_emails' && sql.includes('WHERE id')) {
              const lastParam = params[params.length - 1];
              const idx = data.sent_emails.findIndex((e) => e.id === lastParam);
              if (idx !== -1) {
                const [status, sentAt] = params;
                data.sent_emails[idx] = { ...data.sent_emails[idx], status, sent_at: sentAt };
                changes = 1;
              }
            }

            if (changes > 0) writeDb(data);
            return { changes };
          }

          // Handle DELETE
          if (sql.includes('DELETE FROM')) {
            let changes = 0;
            const match = sql.match(/DELETE FROM (\w+)/);
            const table = match ? match[1] : null;

            if (table && sql.includes('WHERE id')) {
              const idToDelete = params[0];
              const before = data[table].length;
              data[table] = data[table].filter((item) => item.id !== idToDelete);
              changes = before - data[table].length;
            }

            if (changes > 0) writeDb(data);
            return { changes };
          }

          return { changes: 0 };
        },
        all: (...params) => {
          const data = readDb();

          if (sql.includes('SELECT * FROM email_templates')) {
            if (sql.includes('WHERE id')) {
              return [data.email_templates.find((t) => t.id === params[0])];
            }
            return data.email_templates;
          }

          if (sql.includes('SELECT * FROM contacts')) {
            if (sql.includes('WHERE id')) {
              return [data.contacts.find((c) => c.id === params[0])];
            }
            if (sql.includes('WHERE email')) {
              return [data.contacts.find((c) => c.email === params[0])];
            }
            return data.contacts;
          }

          if (sql.includes('SELECT * FROM sent_emails')) {
            if (sql.includes('WHERE template_id')) {
              return data.sent_emails.filter((e) => e.template_id === params[0]);
            }
            return data.sent_emails;
          }

          return [];
        },
        get: function (...params) {
          const results = this.all(...params);
          return results[0] || null;
        },
      };
    },
    exec: () => {
      // CREATE TABLE statements can be ignored
      return null;
    },
  };
}

function readDb() {
  try {
    const content = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {
      email_templates: [],
      contacts: [],
      sent_emails: [],
      _nextIds: {
        email_templates: 1,
        contacts: 1,
        sent_emails: 1,
      },
    };
  }
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { getDatabase };
