// Initialize email provider pool (singleton)
const EmailProviderPool = require('../email-providers');

let emailPool = null;

function getEmailPool() {
  if (!emailPool) {
    emailPool = new EmailProviderPool();
    emailPool.initialize();
  }
  return emailPool;
}

module.exports = { getEmailPool };
