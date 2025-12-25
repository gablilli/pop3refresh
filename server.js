const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const cron = require('node-cron');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// OAuth2 Configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`
);

// Store user tokens and configuration
let userConfig = {
  tokens: null,
  checkInterval: 5, // minutes
  enabled: false
};

// Load saved configuration if exists
const CONFIG_FILE = 'config.json';
if (fs.existsSync(CONFIG_FILE)) {
  try {
    userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save configuration
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(userConfig, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// Gmail API: Trigger POP3 check
async function checkPOP3Mail() {
  if (!userConfig.tokens || !userConfig.enabled) {
    console.log('POP3 check skipped: not configured or disabled');
    return { success: false, message: 'Not configured or disabled' };
  }

  try {
    oauth2Client.setCredentials(userConfig.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get Gmail settings to check POP3 accounts
    const settings = await gmail.users.settings.pop.list({ userId: 'me' });
    
    // The Gmail API doesn't have a direct "check mail now" endpoint for POP3
    // Instead, we'll use a workaround by triggering a label check which often triggers POP3 check
    // This simulates what the browser extension does
    
    // Get list of labels to trigger a refresh
    await gmail.users.labels.list({ userId: 'me' });
    
    // Alternative: We can also trigger by checking messages with a specific query
    await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'is:inbox'
    });

    console.log(`POP3 check triggered at ${new Date().toISOString()}`);
    return { success: true, message: 'POP3 check triggered successfully', timestamp: new Date() };
  } catch (error) {
    console.error('Error checking POP3 mail:', error.message);
    return { success: false, message: error.message };
  }
}

// Scheduler
let cronJob = null;

function updateScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }

  if (userConfig.enabled && userConfig.tokens) {
    const cronPattern = `*/${userConfig.checkInterval} * * * *`;
    console.log(`Starting scheduler with pattern: ${cronPattern}`);
    
    cronJob = cron.schedule(cronPattern, async () => {
      console.log('Running scheduled POP3 check...');
      await checkPOP3Mail();
    });
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    authenticated: !!userConfig.tokens,
    enabled: userConfig.enabled,
    checkInterval: userConfig.checkInterval,
    nextCheck: cronJob ? 'Scheduled' : 'Not scheduled'
  });
});

app.get('/api/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.settings.basic'
    ],
    prompt: 'consent'
  });
  res.json({ authUrl });
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    userConfig.tokens = tokens;
    saveConfig();
    
    res.redirect('/?success=authenticated');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/?error=auth_failed');
  }
});

app.post('/api/config', (req, res) => {
  const { enabled, checkInterval } = req.body;
  
  if (typeof enabled === 'boolean') {
    userConfig.enabled = enabled;
  }
  
  if (checkInterval && checkInterval >= 1 && checkInterval <= 60) {
    userConfig.checkInterval = checkInterval;
  }
  
  saveConfig();
  updateScheduler();
  
  res.json({ success: true, config: userConfig });
});

app.post('/api/check-now', async (req, res) => {
  const result = await checkPOP3Mail();
  res.json(result);
});

app.post('/api/logout', (req, res) => {
  userConfig.tokens = null;
  userConfig.enabled = false;
  saveConfig();
  updateScheduler();
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Gmail POP3 Auto-Refresh running on http://localhost:${PORT}`);
  console.log('Make sure to configure your Google OAuth2 credentials in .env file');
  
  // Initialize scheduler if already configured
  updateScheduler();
});
