// API Base URL
const API_BASE = '/api';

// State
let templates = [];
let contacts = [];
let currentTemplateId = null;

// Initialize app - handle both DOMContentLoaded and if script runs after
function initializeApp() {
    setupTabs();
    loadTemplates();
    loadContacts();
    loadHistory();
    setupForms();
    setupButtons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded
    initializeApp();
}

// Tab navigation
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load data for the tab
            if (targetTab === 'history') {
                loadHistory();
            } else if (targetTab === 'send') {
                loadSendTab();
            } else if (targetTab === 'status') {
                loadProviderStatus();
            }
        });
    });
}

// Attach UI button listeners (modals, select/deselect, send, refresh)
function setupButtons() {
    const newTemplateBtn = document.getElementById('new-template-btn');
    if (newTemplateBtn) newTemplateBtn.addEventListener('click', () => showTemplateModal());

    const newContactBtn = document.getElementById('new-contact-btn');
    if (newContactBtn) newContactBtn.addEventListener('click', () => showContactModal());

    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', (e) => { e.preventDefault(); selectAllContacts(); });

    const deselectAllBtn = document.getElementById('deselect-all-btn');
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', (e) => { e.preventDefault(); deselectAllContacts(); });

    const sendEmailsBtn = document.getElementById('send-emails-btn');
    if (sendEmailsBtn) sendEmailsBtn.addEventListener('click', (e) => { e.preventDefault(); sendBulkEmails(); });

    const refreshStatusBtn = document.getElementById('refresh-status-btn');
    if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', (e) => { e.preventDefault(); loadProviderStatus(); });

    // Modal close controls
    const closeTemplate = document.getElementById('close-template-modal');
    if (closeTemplate) closeTemplate.addEventListener('click', closeTemplateModal);
    const cancelTemplate = document.getElementById('cancel-template-btn');
    if (cancelTemplate) cancelTemplate.addEventListener('click', closeTemplateModal);

    const closeContact = document.getElementById('close-contact-modal');
    if (closeContact) closeContact.addEventListener('click', closeContactModal);
    const cancelContact = document.getElementById('cancel-contact-btn');
    if (cancelContact) cancelContact.addEventListener('click', closeContactModal);
}

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/templates`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Error response from templates API:', err);
            showAlert(err.error || 'Error loading templates', 'error');
            templates = [];
            renderTemplates();
            updateTemplateSelects();
            return;
        }

        const data = await response.json().catch(() => null);
        // Ensure templates is an array
        if (Array.isArray(data)) {
            templates = data;
        } else if (data && Array.isArray(data.data)) {
            templates = data.data;
        } else {
            templates = [];
        }

        renderTemplates();
        updateTemplateSelects();
    } catch (error) {
        console.error('Error loading templates:', error);
        showAlert('Error loading templates', 'error');
    }
}

// Render templates
function renderTemplates() {
    const container = document.getElementById('templates-list');
    
    if (templates.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No templates yet. Create your first template!</p>';
        return;
    }
    
    container.innerHTML = templates.map(template => `
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">${escapeHtml(template.name)}</div>
                    <div class="card-subject">${escapeHtml(template.subject)}</div>
                </div>
            </div>
            <div class="card-body">${escapeHtml(template.body.substring(0, 150))}...</div>
            <div class="card-actions">
                <button class="btn btn-edit" onclick="editTemplate(${template.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteTemplate(${template.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Load contacts
async function loadContacts() {
    try {
        const response = await fetch(`${API_BASE}/contacts`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Error response from contacts API:', err);
            showAlert(err.error || 'Error loading contacts', 'error');
            contacts = [];
            renderContacts();
            updateContactCheckboxes();
            return;
        }

        const data = await response.json().catch(() => null);
        if (Array.isArray(data)) {
            contacts = data;
        } else if (data && Array.isArray(data.data)) {
            contacts = data.data;
        } else {
            contacts = [];
        }

        renderContacts();
        updateContactCheckboxes();
    } catch (error) {
        console.error('Error loading contacts:', error);
        showAlert('Error loading contacts', 'error');
    }
}

// Render contacts
function renderContacts() {
    const tbody = document.getElementById('contacts-table-body');
    
    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: #666;">No contacts yet. Add your first contact!</td></tr>';
        return;
    }
    
    tbody.innerHTML = contacts.map(contact => `
        <tr>
            <td>${escapeHtml(contact.name || 'N/A')}</td>
            <td>${escapeHtml(contact.email)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteContact(${contact.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Template modal
function showTemplateModal(templateId = null) {
    const modal = document.getElementById('template-modal');
    const form = document.getElementById('template-form');
    const title = document.getElementById('template-modal-title');
    
    currentTemplateId = templateId;
    
    if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            title.textContent = 'Edit Template';
            document.getElementById('template-id').value = template.id;
            document.getElementById('template-name').value = template.name;
            document.getElementById('template-subject').value = template.subject;
            document.getElementById('template-body').value = template.body;
        }
    } else {
        title.textContent = 'New Template';
        form.reset();
        document.getElementById('template-id').value = '';
    }
    
    modal.classList.add('active');
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.remove('active');
    document.getElementById('template-form').reset();
    currentTemplateId = null;
}

// Contact modal
function showContactModal() {
    document.getElementById('contact-modal').classList.add('active');
}

function closeContactModal() {
    document.getElementById('contact-modal').classList.remove('active');
    document.getElementById('contact-form').reset();
}

// Setup forms
function setupForms() {
    // Template form
    document.getElementById('template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateData = {
            name: document.getElementById('template-name').value,
            subject: document.getElementById('template-subject').value,
            body: document.getElementById('template-body').value,
            variables: []
        };
        
        const id = document.getElementById('template-id').value;
        const url = id ? `${API_BASE}/templates/${id}` : `${API_BASE}/templates`;
        const method = id ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData)
            });
            
            if (response.ok) {
                showAlert(id ? 'Template updated successfully!' : 'Template created successfully!', 'success');
                closeTemplateModal();
                loadTemplates();
            } else {
                const error = await response.json();
                showAlert(error.error || 'Error saving template', 'error');
            }
        } catch (error) {
            showAlert('Error saving template', 'error');
        }
    });
    
    // Contact form
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const contactData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value
        };
        
        try {
            const response = await fetch(`${API_BASE}/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactData)
            });
            
            if (response.ok) {
                showAlert('Contact added successfully!', 'success');
                closeContactModal();
                loadContacts();
            } else {
                const error = await response.json();
                showAlert(error.error || 'Error adding contact', 'error');
            }
        } catch (error) {
            showAlert('Error adding contact', 'error');
        }
    });
}

// Delete template
async function deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/templates/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Template deleted successfully!', 'success');
            loadTemplates();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Error deleting template', 'error');
        }
    } catch (error) {
        showAlert('Error deleting template', 'error');
    }
}

// Edit template
function editTemplate(id) {
    showTemplateModal(id);
}

// Delete contact
async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Contact deleted successfully!', 'success');
            loadContacts();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Error deleting contact', 'error');
        }
    } catch (error) {
        showAlert('Error deleting contact', 'error');
    }
}

// Update template selects
function updateTemplateSelects() {
    const select = document.getElementById('send-template');
    if (!select) {
        console.warn('send-template select element not found');
        return;
    }

    // Clear and rebuild options
    select.innerHTML = '<option value="">-- Select Template --</option>';
    
    const safeTemplates = Array.isArray(templates) ? templates : [];
    console.log('Updating template select with templates:', safeTemplates);
    
    if (safeTemplates.length > 0) {
        select.innerHTML += safeTemplates.map(t => `<option value="${t.id}">${escapeHtml(t.name || t.subject || 'Untitled')}</option>`).join('');
    }

    // Remove old listeners and add fresh one
    const newSelect = select.cloneNode(true);
    newSelect.addEventListener('change', updateEmailPreview);
    select.parentNode.replaceChild(newSelect, select);
}

// Update contact checkboxes
function updateContactCheckboxes() {
    const container = document.getElementById('contacts-checkboxes');
    if (!container) return;

    const safeContacts = Array.isArray(contacts) ? contacts : [];
    if (safeContacts.length === 0) {
        container.innerHTML = '<p style="color: #666;">No contacts available. Add contacts first.</p>';
        return;
    }

    container.innerHTML = safeContacts.map(contact => `
        <div class="checkbox-item">
            <input type="checkbox" id="contact-${contact.id}" value="${contact.id}">
            <label for="contact-${contact.id}">${escapeHtml(contact.name || contact.email)} (${escapeHtml(contact.email)})</label>
        </div>
    `).join('');
}

// Load send tab
function loadSendTab() {
    updateTemplateSelects();
    updateContactCheckboxes();
    updateEmailPreview();
}

// Update email preview
function updateEmailPreview() {
    const templateId = document.getElementById('send-template').value;
    const preview = document.getElementById('email-preview');
    
    if (!templateId) {
        preview.innerHTML = '<p style="color: #666;">Select a template to see preview</p>';
        return;
    }
    
    const template = templates.find(t => t.id == templateId);
    if (!template) return;
    
    // Sample merge
    const sampleVars = {
        name: 'John Doe',
        email: 'john@example.com'
    };
    
    let previewSubject = template.subject;
    let previewBody = template.body;
    
    Object.keys(sampleVars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        previewSubject = previewSubject.replace(regex, sampleVars[key]);
        previewBody = previewBody.replace(regex, sampleVars[key]);
    });
    
    preview.innerHTML = `
        <strong>Subject:</strong> ${escapeHtml(previewSubject)}<br><br>
        <strong>Body:</strong><br>
        <div style="margin-top: 10px;">${previewBody}</div>
    `;
}

// Select all contacts
function selectAllContacts() {
    document.querySelectorAll('#contacts-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
}

// Deselect all contacts
function deselectAllContacts() {
    document.querySelectorAll('#contacts-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// Send bulk emails
async function sendBulkEmails() {
    const templateId = document.getElementById('send-template').value;
    const selectedContacts = Array.from(document.querySelectorAll('#contacts-checkboxes input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value));
    
    if (!templateId) {
        showAlert('Please select a template', 'error');
        return;
    }
    
    if (selectedContacts.length === 0) {
        showAlert('Please select at least one contact', 'error');
        return;
    }
    
    if (!confirm(`Send email to ${selectedContacts.length} contact(s)?`)) return;
    
    try {
        showAlert('Sending emails...', 'info');
        
        const response = await fetch(`${API_BASE}/send-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                template_id: parseInt(templateId),
                contact_ids: selectedContacts
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(
                `Emails sent! Success: ${result.success_count}, Failed: ${result.failure_count}`,
                'success'
            );
            loadHistory();
        } else {
            showAlert(result.error || 'Error sending emails', 'error');
        }
    } catch (error) {
        showAlert('Error sending emails', 'error');
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/sent-emails?limit=100`);
        const history = await response.json();
        renderHistory(history);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Render history
function renderHistory(history) {
    const tbody = document.getElementById('history-table-body');
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No sent emails yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.map(email => {
        const date = new Date(email.created_at).toLocaleString();
        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(email.template_name || 'N/A')}</td>
                <td>${escapeHtml(email.recipient_email)}</td>
                <td>${escapeHtml(email.subject)}</td>
                <td><span class="status-badge status-${email.status}">${email.status}</span></td>
            </tr>
        `;
    }).join('');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification system
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"></div>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
}

// Backward compatibility - showAlert now calls showToast
function showAlert(message, type) {
    showToast(message, type);
}


// Load provider status
async function loadProviderStatus() {
    try {
        const response = await fetch(`${API_BASE}/providers/status`);
        const data = await response.json();
        renderProviderStatus(data);
    } catch (error) {
        console.error('Error loading provider status:', error);
        showAlert('Error loading provider status', 'error');
    }
}

// Render provider status
function renderProviderStatus(data) {
    const container = document.getElementById('providers-status');
    
    if (!data.providers || data.providers.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No email providers configured. Please configure at least one provider in your .env file.</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="status-summary">
            <div class="summary-card">
                <div class="summary-label">Total Providers</div>
                <div class="summary-value">${data.total_providers}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Active Providers</div>
                <div class="summary-value active">${data.active_providers}</div>
            </div>
        </div>
        ${data.providers.map(provider => {
            const dailyUsage = provider.dailyUsage || { count: 0, limit: 100, date: new Date().toISOString().split('T')[0], exhausted: false };
            const usagePercent = dailyUsage.limit > 0 ? Math.round((dailyUsage.count / dailyUsage.limit) * 100) : 0;
            const isExhausted = dailyUsage.exhausted || dailyUsage.count >= dailyUsage.limit;
            const statusClass = provider.status === 'active' && !isExhausted ? 'status-active' : 
                               provider.status === 'rate_limited' || isExhausted ? 'status-limited' : 
                               'status-failed';
            
            return `
                <div class="provider-card ${statusClass}">
                    <div class="provider-header">
                        <div class="provider-name">
                            <strong>${escapeHtml(provider.name)}</strong>
                            <span class="priority-badge">Priority ${provider.priority}</span>
                        </div>
                        <div class="provider-status-badge status-${provider.status}">
                            ${provider.status === 'active' && !isExhausted ? '✅ Active' : 
                              isExhausted ? '⏸️ Limit Reached' :
                              provider.status === 'rate_limited' ? '⚠️ Rate Limited' : 
                              '❌ Failed'}
                        </div>
                    </div>
                    
                    <div class="provider-daily-usage">
                        <div class="usage-header">
                            <span>Daily Usage (${dailyUsage.date})</span>
                            <span class="usage-count">${dailyUsage.count} / ${dailyUsage.limit}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(usagePercent, 100)}%; background: ${usagePercent >= 100 ? '#dc3545' : usagePercent >= 80 ? '#ffc107' : '#28a745'}"></div>
                        </div>
                        <div class="usage-percent">${usagePercent}%</div>
                    </div>
                    
                    <div class="provider-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Sent:</span>
                            <span class="stat-value">${provider.usage?.total || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Successful:</span>
                            <span class="stat-value success">${provider.usage?.successful || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Failed:</span>
                            <span class="stat-value failed">${provider.usage?.failed || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Errors:</span>
                            <span class="stat-value">${provider.errorCount || 0}</span>
                        </div>
                    </div>
                    
                    ${provider.lastError ? `
                        <div class="provider-error">
                            <strong>Last Error:</strong> ${escapeHtml(provider.lastError)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('')}
    `;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const templateModal = document.getElementById('template-modal');
    const contactModal = document.getElementById('contact-modal');
    
    if (event.target === templateModal) {
        closeTemplateModal();
    }
    if (event.target === contactModal) {
        closeContactModal();
    }
}

