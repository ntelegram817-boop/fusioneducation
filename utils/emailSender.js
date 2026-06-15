const fs = require('fs').promises;
const path = require('path');

const EMAIL_LOG_FILE = path.join(__dirname, '../data/emails-sent.json');

// Mock email sender for development (logs to file)
// In production, replace with nodemailer SMTP
async function sendCredentialsEmail(email, fullName, password) {
  try {
    const emailRecord = {
      to: email,
      fullName,
      username: email,
      password,
      sentAt: new Date().toISOString(),
      subject: 'Your Fusion Education Login Credentials'
    };

    // Log email to file for verification in dev
    let emailLog = [];
    try {
      const existing = await fs.readFile(EMAIL_LOG_FILE, 'utf8');
      emailLog = JSON.parse(existing);
    } catch (err) {
      emailLog = [];
    }

    emailLog.push(emailRecord);
    await fs.writeFile(EMAIL_LOG_FILE, JSON.stringify(emailLog, null, 2), 'utf8');

    console.log(`📧 Email sent to ${email} with credentials`);
    return { success: true, email };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendCredentialsEmail };
