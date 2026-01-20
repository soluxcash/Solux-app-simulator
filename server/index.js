import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

const verificationCodes = new Map();

async function getResendClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  
  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: 'support@solux.cash'
  };
}

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const LITHIC_BASE_URL = 'https://sandbox.lithic.com/v1';
const LITHIC_API_KEY = process.env.LITHIC_API_KEY || process.env.VITE_LITHIC_API_KEY;

if (!LITHIC_API_KEY) {
  console.warn('Warning: LITHIC_API_KEY is not set. Lithic API calls will fail.');
}

async function lithicRequest(endpoint, method, body) {
  const response = await fetch(`${LITHIC_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': LITHIC_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw { status: response.status, data };
  }
  
  return data;
}

app.post('/api/lithic/accounts', async (req, res) => {
  try {
    const { first_name, last_name, email, dob, address, ssn_last_four } = req.body;
    
    const payload = {
      workflow: 'KYC_EXEMPT',
      tos_timestamp: new Date().toISOString(),
      kyc_exemption_type: 'AUTHORIZED_USER',
      first_name,
      last_name,
      email,
      phone_number: '+10000000000',
      address: {
        address1: address?.address1 || '123 Main St',
        city: address?.city || 'New York',
        state: address?.state || 'NY',
        postal_code: address?.postal_code || '10001',
        country: address?.country || 'USA',
      },
    };
    
    console.log('Lithic request payload:', JSON.stringify(payload, null, 2));
    
    const result = await lithicRequest('/account_holders', 'POST', payload);
    console.log('Lithic response:', JSON.stringify(result, null, 2));
    res.json({ token: result.token, account_token: result.account_token, ...result });
  } catch (error) {
    console.error('Lithic accounts error:', error);
    res.status(error.status || 500).json(error.data || { error: 'Failed to create account' });
  }
});

app.post('/api/lithic/cards', async (req, res) => {
  try {
    const result = await lithicRequest('/cards', 'POST', req.body);
    res.json(result);
  } catch (error) {
    console.error('Lithic cards error:', error);
    res.status(error.status || 500).json(error.data || { error: 'Failed to create card' });
  }
});

app.post('/api/lithic/simulate/authorize', async (req, res) => {
  try {
    const result = await lithicRequest('/simulate/authorize', 'POST', req.body);
    res.json(result);
  } catch (error) {
    console.error('Lithic simulate error:', error);
    res.status(error.status || 500).json(error.data || { error: 'Failed to simulate authorization' });
  }
});

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    const { client, fromEmail } = await getResendClient();
    
    console.log(`Sending email from: ${fromEmail} to: ${email}`);
    
    const result = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Solux - Your Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #000; font-size: 28px; margin-bottom: 10px;">SOLUX</h1>
          <p style="color: #3b82f6; font-size: 12px; letter-spacing: 2px; margin-bottom: 30px;">THE NEW STANDARD OF CREDIT</p>
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #000;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });
    
    console.log(`Resend response:`, JSON.stringify(result, null, 2));
    console.log(`Verification code sent to ${email}`);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

app.post('/api/auth/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    
    const stored = verificationCodes.get(email);
    
    if (!stored) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }
    
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }
    
    if (stored.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    verificationCodes.delete(email);
    res.json({ success: true, verified: true });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', lithicConfigured: !!LITHIC_API_KEY });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.listen(PORT, host, () => {
  console.log(`Backend server running on http://${host}:${PORT}`);
});
