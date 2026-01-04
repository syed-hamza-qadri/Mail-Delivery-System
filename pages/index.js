import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <Head>
        <title>Merge Email System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="container">
        <header>
          <h1>📧 Merge Email System</h1>
          <p>Store templates, manage contacts, and send personalized emails</p>
        </header>

        <nav className="tabs">
          <button className="tab-btn active" data-tab="templates">
            Templates
          </button>
          <button className="tab-btn" data-tab="contacts">
            Contacts
          </button>
          <button className="tab-btn" data-tab="send">
            Send Emails
          </button>
          <button className="tab-btn" data-tab="history">
            History
          </button>
          <button className="tab-btn" data-tab="status">
            Status
          </button>
        </nav>

        <div className="tab-content active" id="templates">
          <div className="section-header">
            <h2>Email Templates</h2>
            <button className="btn btn-primary" id="new-template-btn">
              + New Template
            </button>
          </div>
          <div id="templates-list" className="cards-grid"></div>
        </div>

        <div className="tab-content" id="contacts">
          <div className="section-header">
            <h2>Contacts</h2>
            <button className="btn btn-primary" id="new-contact-btn">
              + Add Contact
            </button>
          </div>
          <div id="contacts-list" className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="contacts-table-body"></tbody>
            </table>
          </div>
        </div>

        <div className="tab-content" id="send">
          <h2>Send Emails</h2>
          <div className="form-container">
            <div className="form-group">
              <label htmlFor="send-template">Select Template:</label>
              <select id="send-template" className="form-control">
                <option value="">-- Select Template --</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="send-contacts">Select Contacts:</label>
              <div id="contacts-checkboxes" className="checkboxes-container"></div>
              <button className="btn btn-secondary" id="select-all-btn">
                Select All
              </button>
              <button className="btn btn-secondary" id="deselect-all-btn">
                Deselect All
              </button>
            </div>
            <div className="form-group">
              <label>Preview:</label>
              <div id="email-preview" className="preview-box"></div>
            </div>
            <button className="btn btn-success" id="send-emails-btn">
              Send Emails
            </button>
          </div>
        </div>

        <div className="tab-content" id="history">
          <h2>Sent Emails History</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Template</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="history-table-body"></tbody>
            </table>
          </div>
        </div>

        <div className="tab-content" id="status">
          <div className="section-header">
            <h2>Email Provider Status</h2>
            <button className="btn btn-secondary" id="refresh-status-btn">
              🔄 Refresh
            </button>
          </div>
          <div className="alert alert-info">
            <strong>Info:</strong> Shows daily usage, limits, and status for all configured email
            providers.
            <br />
            System automatically rotates providers based on daily limits and availability.
          </div>
          <div id="providers-status" className="providers-grid"></div>
        </div>
      </div>

      <div id="template-modal" className="modal">
        <div className="modal-content">
          <span className="close" id="close-template-modal">
            &times;
          </span>
          <h2 id="template-modal-title">New Template</h2>
          <form id="template-form">
            <input type="hidden" id="template-id" />
            <div className="form-group">
              <label>Template Name:</label>
              <input type="text" id="template-name" className="form-control" required />
            </div>
            <div className="form-group">
              <label>Subject:</label>
              <input type="text" id="template-subject" className="form-control" required />
              <small>
                Use {'{{variable}}'} for merge fields (e.g., {'{{name}}'}, {'{{email}}'})
              </small>
            </div>
            <div className="form-group">
              <label>Body (HTML):</label>
              <textarea id="template-body" className="form-control" rows="10" required></textarea>
              <small>Use {'{{variable}}'} for merge fields</small>
            </div>
            <div className="form-group">
              <label>Available Variables:</label>
              <div className="variables-hint">
                <code>{'{{name}}'}</code> - Contact name
                <br />
                <code>{'{{email}}'}</code> - Contact email
                <br />
                <code>{'{{custom_field}}'}</code> - Any custom field
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" id="cancel-template-btn">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Template
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="contact-modal" className="modal">
        <div className="modal-content">
          <span className="close" id="close-contact-modal">
            &times;
          </span>
          <h2>Add Contact</h2>
          <form id="contact-form">
            <div className="form-group">
              <label>Name:</label>
              <input type="text" id="contact-name" className="form-control" />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input type="email" id="contact-email" className="form-control" required />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" id="cancel-contact-btn">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Contact
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="toast-container" className="toast-container"></div>

      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
