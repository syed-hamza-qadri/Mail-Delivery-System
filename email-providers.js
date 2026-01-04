// Email Provider Pool System
// Supports multiple email APIs with priority-based rotation and failover

const { Resend } = require('resend');
const brevo = require('@getbrevo/brevo');
const Mailjet = require('node-mailjet');
const sgMail = require('@sendgrid/mail');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const nodemailer = require('nodemailer');

// Provider status tracking
class EmailProviderPool {
  constructor() {
    this.providers = [];
    this.providerStats = new Map();
    this.cooldownPeriod = 60 * 60 * 1000; // 1 hour cooldown for rate-limited providers
    this.dailyUsage = new Map(); // Track daily usage per provider: { providerName: { count: 0, limit: 300, date: '2024-01-01' } }

    // Daily limits per provider (can be overridden via env)
    this.dailyLimits = {
      Brevo: parseInt(process.env.BREVO_DAILY_LIMIT) || 300,
      Mailjet: parseInt(process.env.MAILJET_DAILY_LIMIT) || 200,
      SendPulse: parseInt(process.env.SENDPULSE_DAILY_LIMIT) || 500,
      Resend: parseInt(process.env.RESEND_DAILY_LIMIT) || 100,
      SendGrid: parseInt(process.env.SENDGRID_DAILY_LIMIT) || 100,
      Mailgun: parseInt(process.env.MAILGUN_DAILY_LIMIT) || 100,
      SMTP: parseInt(process.env.SMTP_DAILY_LIMIT) || 1000,
    };
  }

  // Initialize all available providers based on environment variables
  initialize() {
    // Priority 1: Brevo (Sendinblue) - 9,000 emails/month
    this.initializeBrevo();

    // Priority 2: Mailjet - 6,000 emails/month
    this.initializeMailjet();

    // Priority 3: SendPulse - 15,000 emails/month
    this.initializeSendPulse();

    // Priority 4: Resend - 3,000 emails/month (supports multiple keys)
    this.initializeResend();

    // Priority 5: SendGrid - 3,000 emails/month
    this.initializeSendGrid();

    // Priority 6: Mailgun - 3,000 emails/month (trial)
    this.initializeMailgun();

    // Priority 7: SMTP (fallback)
    this.initializeSMTP();

    console.log(`Initialized ${this.providers.length} email provider(s)`);
    this.providers.forEach((p) => {
      console.log(`  - ${p.name} (Priority ${p.priority})`);
    });
  }

  initializeBrevo() {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return;

    try {
      const defaultClient = brevo.ApiClient.instance;
      const apiKeyAuth = defaultClient.authentications['api-key'];
      apiKeyAuth.apiKey = apiKey;

      const apiInstance = new brevo.TransactionalEmailsApi();

      this.providers.push({
        name: 'Brevo',
        priority: 1,
        type: 'brevo',
        client: apiInstance,
        apiKey: apiKey,
        fromEmail: process.env.BREVO_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM,
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing Brevo:', error.message);
    }
  }

  initializeMailjet() {
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !secretKey) return;

    try {
      const mailjet = new Mailjet({
        apiKey: apiKey,
        apiSecret: secretKey,
      });

      this.providers.push({
        name: 'Mailjet',
        priority: 2,
        type: 'mailjet',
        client: mailjet,
        apiKey: apiKey,
        secretKey: secretKey,
        fromEmail: process.env.MAILJET_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM,
        fromName: process.env.MAILJET_FROM_NAME || 'Mailjet',
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing Mailjet:', error.message);
    }
  }

  initializeSendPulse() {
    const apiId = process.env.SENDPULSE_API_ID;
    const apiSecret = process.env.SENDPULSE_API_SECRET;
    if (!apiId || !apiSecret) return;

    try {
      // SendPulse uses REST API, we'll use fetch/axios
      this.providers.push({
        name: 'SendPulse',
        priority: 3,
        type: 'sendpulse',
        apiId: apiId,
        apiSecret: apiSecret,
        fromEmail: process.env.SENDPULSE_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM,
        fromName: process.env.SENDPULSE_FROM_NAME || 'SendPulse',
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing SendPulse:', error.message);
    }
  }

  initializeResend() {
    // Support multiple Resend API keys
    let keyIndex = 1;
    while (
      process.env[`RESEND_API_KEY_${keyIndex}`] ||
      (keyIndex === 1 && process.env.RESEND_API_KEY)
    ) {
      const apiKey = process.env[`RESEND_API_KEY_${keyIndex}`] || process.env.RESEND_API_KEY;
      if (!apiKey) break;

      try {
        const resend = new Resend(apiKey);
        const providerName = keyIndex === 1 ? 'Resend' : `Resend-${keyIndex}`;
        this.providers.push({
          name: providerName,
          priority: 4,
          type: 'resend',
          client: resend,
          apiKey: apiKey,
          fromEmail: process.env.RESEND_FROM || process.env.SMTP_FROM,
          status: 'active',
          lastError: null,
          errorCount: 0,
        });
        // Set daily limit for this Resend instance
        if (!this.dailyLimits[providerName]) {
          this.dailyLimits[providerName] = parseInt(process.env.RESEND_DAILY_LIMIT) || 100;
        }
      } catch (error) {
        console.error(`Error initializing Resend-${keyIndex}:`, error.message);
      }
      keyIndex++;
    }
  }

  initializeSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) return;

    try {
      sgMail.setApiKey(apiKey);
      this.providers.push({
        name: 'SendGrid',
        priority: 5,
        type: 'sendgrid',
        client: sgMail,
        apiKey: apiKey,
        fromEmail: process.env.SENDGRID_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM,
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing SendGrid:', error.message);
    }
  }

  initializeMailgun() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!apiKey || !domain) return;

    try {
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({
        username: 'api',
        key: apiKey,
      });

      this.providers.push({
        name: 'Mailgun',
        priority: 6,
        type: 'mailgun',
        client: mg,
        apiKey: apiKey,
        domain: domain,
        fromEmail: process.env.MAILGUN_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM,
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing Mailgun:', error.message);
    }
  }

  initializeSMTP() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      this.providers.push({
        name: 'SMTP',
        priority: 7,
        type: 'smtp',
        client: transporter,
        fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
        status: 'active',
        lastError: null,
        errorCount: 0,
      });
    } catch (error) {
      console.error('Error initializing SMTP:', error.message);
    }
  }

  // Get current date string for daily tracking
  getCurrentDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Get daily usage for a provider
  getDailyUsage(providerName) {
    const today = this.getCurrentDate();
    const usage = this.dailyUsage.get(providerName);

    // If no usage tracked or different day, reset
    if (!usage || usage.date !== today) {
      const limit =
        this.dailyLimits[providerName] || this.dailyLimits[providerName.split('-')[0]] || 100;
      this.dailyUsage.set(providerName, { count: 0, limit: limit, date: today });
      return { count: 0, limit: limit, date: today };
    }

    return usage;
  }

  // Increment daily usage for a provider
  incrementDailyUsage(providerName) {
    const usage = this.getDailyUsage(providerName);
    usage.count++;
    this.dailyUsage.set(providerName, usage);
    return usage;
  }

  // Check if provider has hit daily limit
  hasHitDailyLimit(providerName) {
    const usage = this.getDailyUsage(providerName);
    return usage.count >= usage.limit;
  }

  // Check if all providers have hit their daily limits
  allProvidersExhausted() {
    const today = this.getCurrentDate();
    let allExhausted = true;

    for (const provider of this.providers) {
      const usage = this.getDailyUsage(provider.name);
      // Check if usage is from today
      if (usage.date === today && usage.count < usage.limit) {
        // Also check if provider is not permanently failed
        if (
          provider.status !== 'failed' ||
          (provider.lastErrorTime && Date.now() - provider.lastErrorTime < this.cooldownPeriod)
        ) {
          allExhausted = false;
          break;
        }
      }
    }

    return allExhausted;
  }

  // Reset all daily counters (when all providers exhausted)
  resetDailyCounters() {
    const today = this.getCurrentDate();
    console.log('🔄 All providers exhausted. Resetting daily counters...');

    for (const provider of this.providers) {
      const limit =
        this.dailyLimits[provider.name] || this.dailyLimits[provider.name.split('-')[0]] || 100;
      this.dailyUsage.set(provider.name, { count: 0, limit: limit, date: today });
      // Also reset provider status if it was rate limited
      if (provider.status === 'rate_limited') {
        provider.status = 'active';
        provider.errorCount = 0;
      }
    }

    console.log('✅ Daily counters reset. Starting from Priority 1 again.');
  }

  // Get active providers sorted by priority (excluding those that hit daily limits)
  getActiveProviders() {
    const now = Date.now();
    const today = this.getCurrentDate();

    return this.providers
      .filter((p) => {
        // Check if provider has hit daily limit
        const usage = this.getDailyUsage(p.name);
        if (usage.date === today && usage.count >= usage.limit) {
          return false; // Skip providers that hit daily limit
        }

        // Check provider status
        if (p.status === 'active') return true;
        if (p.status === 'rate_limited' || p.status === 'failed') {
          // Check if cooldown period has passed
          const lastErrorTime = p.lastErrorTime || 0;
          if (now - lastErrorTime > this.cooldownPeriod) {
            p.status = 'active';
            p.errorCount = 0;
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  // Mark provider as rate limited
  markRateLimited(provider) {
    provider.status = 'rate_limited';
    provider.lastErrorTime = Date.now();
    provider.errorCount++;
    console.log(`⚠️  ${provider.name} rate limited. Switching to next provider.`);
  }

  // Mark provider as failed
  markFailed(provider, error) {
    provider.status = 'failed';
    provider.lastError = error.message;
    provider.lastErrorTime = Date.now();
    provider.errorCount++;
    console.log(`❌ ${provider.name} failed: ${error.message}`);
  }

  // Send email using provider
  async sendWithProvider(provider, to, subject, html) {
    const from = provider.fromEmail;

    switch (provider.type) {
      case 'brevo':
        return await this.sendBrevo(provider, to, subject, html, from);

      case 'mailjet':
        return await this.sendMailjet(provider, to, subject, html, from);

      case 'sendpulse':
        return await this.sendSendPulse(provider, to, subject, html, from);

      case 'resend':
        return await this.sendResend(provider, to, subject, html, from);

      case 'sendgrid':
        return await this.sendSendGrid(provider, to, subject, html, from);

      case 'mailgun':
        return await this.sendMailgun(provider, to, subject, html, from);

      case 'smtp':
        return await this.sendSMTP(provider, to, subject, html, from);

      default:
        throw new Error(`Unknown provider type: ${provider.type}`);
    }
  }

  async sendBrevo(provider, to, subject, html, from) {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { email: from };
    sendSmtpEmail.to = [{ email: to }];

    const result = await provider.client.sendTransacEmail(sendSmtpEmail);
    return { success: true, messageId: result.body?.messageId || 'sent' };
  }

  async sendMailjet(provider, to, subject, html, from) {
    const result = await provider.client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: from,
            Name: provider.fromName,
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

    return { success: true, messageId: result.body.Messages[0].To[0].MessageID || 'sent' };
  }

  async sendSendPulse(provider, to, subject, html, from) {
    // SendPulse REST API
    const https = require('https');
    const querystring = require('querystring');

    // Get access token first
    const tokenData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: provider.apiId,
      client_secret: provider.apiSecret,
    });

    const tokenOptions = {
      hostname: 'api.sendpulse.com',
      path: '/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': tokenData.length,
      },
    };

    const token = await new Promise((resolve, reject) => {
      const req = https.request(tokenOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.access_token);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(tokenData);
      req.end();
    });

    // Send email
    const emailData = JSON.stringify({
      email: {
        subject: subject,
        html: html,
        from: {
          name: provider.fromName,
          email: from,
        },
        to: [
          {
            email: to,
          },
        ],
      },
    });

    const emailOptions = {
      hostname: 'api.sendpulse.com',
      path: '/smtp/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': emailData.length,
      },
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(emailOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(emailData);
      req.end();
    });

    return { success: true, messageId: result.id || 'sent' };
  }

  async sendResend(provider, to, subject, html, from) {
    const { data, error } = await provider.client.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) throw error;
    return { success: true, messageId: data?.id || 'sent' };
  }

  async sendSendGrid(provider, to, subject, html, from) {
    const msg = {
      to: to,
      from: from,
      subject: subject,
      html: html,
    };

    const result = await provider.client.send(msg);
    return { success: true, messageId: result[0]?.headers?.['x-message-id'] || 'sent' };
  }

  async sendMailgun(provider, to, subject, html, from) {
    const messageData = {
      from: from,
      to: to,
      subject: subject,
      html: html,
    };

    const result = await provider.client.messages.create(provider.domain, messageData);
    return { success: true, messageId: result.id || 'sent' };
  }

  async sendSMTP(provider, to, subject, html, from) {
    return new Promise((resolve, reject) => {
      provider.client.sendMail(
        {
          from: from,
          to: to,
          subject: subject,
          html: html,
        },
        (error, info) => {
          if (error) reject(error);
          else resolve({ success: true, messageId: info.messageId || 'sent' });
        }
      );
    });
  }

  // Main send function with automatic failover
  async sendEmail(to, subject, html) {
    // Check if all providers are exhausted, reset if needed
    if (this.allProvidersExhausted()) {
      this.resetDailyCounters();
    }

    let activeProviders = this.getActiveProviders();

    if (activeProviders.length === 0) {
      // If still no active providers, try resetting and getting again
      this.resetDailyCounters();
      activeProviders = this.getActiveProviders();

      if (activeProviders.length === 0) {
        throw new Error(
          'No active email providers available. Please configure at least one provider.'
        );
      }
    }

    let lastError = null;

    for (const provider of activeProviders) {
      // Double-check daily limit before sending (in case it changed)
      if (this.hasHitDailyLimit(provider.name)) {
        console.log(
          `⏭️  ${provider.name} has hit daily limit (${this.getDailyUsage(provider.name).count}/${this.getDailyUsage(provider.name).limit}). Skipping...`
        );
        continue;
      }

      try {
        const result = await this.sendWithProvider(provider, to, subject, html);

        // Increment daily usage on success
        const usage = this.incrementDailyUsage(provider.name);
        console.log(`✅ ${provider.name} sent successfully (${usage.count}/${usage.limit} today)`);

        // Track successful send
        if (!this.providerStats.has(provider.name)) {
          this.providerStats.set(provider.name, { success: 0, failed: 0 });
        }
        const stats = this.providerStats.get(provider.name);
        stats.success++;

        return { ...result, provider: provider.name };
      } catch (error) {
        lastError = error;

        // Track failed send
        if (!this.providerStats.has(provider.name)) {
          this.providerStats.set(provider.name, { success: 0, failed: 0 });
        }
        const stats = this.providerStats.get(provider.name);
        stats.failed++;

        // Check if it's a rate limit error
        const errorMsg = error.message?.toLowerCase() || '';
        const isRateLimit =
          errorMsg.includes('rate limit') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('limit exceeded') ||
          errorMsg.includes('429') ||
          error.statusCode === 429;

        if (isRateLimit) {
          // Mark as rate limited and also mark as hit daily limit
          this.markRateLimited(provider);
          const usage = this.getDailyUsage(provider.name);
          usage.count = usage.limit; // Set to limit to prevent further use today
          this.dailyUsage.set(provider.name, usage);
          console.log(`⚠️  ${provider.name} rate limited. Marked as daily limit reached.`);
        } else {
          // For other errors, mark as failed and immediately try next
          this.markFailed(provider, error);
          console.log(
            `❌ ${provider.name} error: ${error.message}. Moving to next provider immediately...`
          );
        }

        // Continue to next provider immediately on any error
        continue;
      }
    }

    // All providers failed or exhausted
    // Try resetting and retrying once
    if (this.allProvidersExhausted()) {
      this.resetDailyCounters();
      activeProviders = this.getActiveProviders();

      if (activeProviders.length > 0) {
        // Retry with first available provider
        const provider = activeProviders[0];
        try {
          const result = await this.sendWithProvider(provider, to, subject, html);
          const usage = this.incrementDailyUsage(provider.name);
          console.log(
            `✅ ${provider.name} sent successfully after reset (${usage.count}/${usage.limit} today)`
          );
          return { ...result, provider: provider.name };
        } catch (error) {
          throw new Error(
            `All email providers failed even after reset. Last error: ${error.message}`
          );
        }
      }
    }

    throw new Error(
      `All email providers failed or exhausted. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  // Get provider statistics
  getStats() {
    const stats = {};
    this.providerStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  // Get provider status
  getStatus() {
    return this.providers.map((p) => {
      const usage = this.getDailyUsage(p.name);
      return {
        name: p.name,
        priority: p.priority,
        status: p.status,
        errorCount: p.errorCount,
        lastError: p.lastError,
        dailyUsage: {
          count: usage.count,
          limit: usage.limit,
          date: usage.date,
          exhausted: usage.count >= usage.limit,
        },
      };
    });
  }
}

module.exports = EmailProviderPool;
