# Gmail POP3 Auto-Refresh Web Application

A web application that automatically checks POP3 mail accounts configured in Gmail, without requiring a browser window to stay open. This is a standalone server implementation that replicates the functionality of the [Gmail POP3 Auto-Refresh browser extension](https://github.com/Ayce45/gmail-pop3-auto-refresh).

## 🌟 Features

- **Automatic POP3 Mail Checking**: Periodically triggers Gmail to check your POP3 accounts for new mail
- **Background Operation**: Runs as a server - no need to keep browser open
- **Secure OAuth2 Authentication**: Uses Google's official OAuth2 for secure access to your Gmail account
- **Configurable Intervals**: Set custom check intervals from 1 to 60 minutes
- **Web-Based Interface**: Simple, user-friendly dashboard for configuration
- **Persistent Configuration**: Saves your settings and continues working after server restarts

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- A Gmail account with POP3 accounts configured
- Google Cloud Project with Gmail API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gablilli/pop3refresh.git
   cd pop3refresh
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google OAuth2 credentials**
   
   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Create a new project (or select an existing one)
   
   c. Enable the Gmail API:
      - Navigate to "APIs & Services" > "Library"
      - Search for "Gmail API" and enable it
   
   d. Create OAuth2 credentials:
      - Go to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "OAuth client ID"
      - Choose "Web application"
      - Add authorized redirect URIs: `http://localhost:3000/oauth2callback`
      - Save your Client ID and Client Secret
   
4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Google OAuth2 credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   PORT=3000
   REDIRECT_URI=http://localhost:3000/oauth2callback
   SESSION_SECRET=your_random_session_secret_here
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the web interface**
   
   Open your browser and navigate to: `http://localhost:3000`

## 📖 Usage

1. **Connect Your Gmail Account**
   - Click "Connect Gmail Account" button
   - Sign in with your Google account
   - Grant the necessary permissions (read-only access to Gmail)

2. **Configure Settings**
   - Set your preferred check interval (in minutes)
   - Enable automatic checking
   - Click "Save Configuration"

3. **Test the Connection**
   - Use the "Check Mail Now" button to trigger an immediate check
   - Verify that the status shows "Enabled" and "Connected"

4. **Run in Background**
   - Once configured, you can close your browser
   - The server will continue checking your POP3 mail at the specified interval
   - You can keep the server running using tools like PM2, systemd, or Docker

## 🔧 Advanced Configuration

### Running as a Service (Linux)

Create a systemd service file at `/etc/systemd/system/pop3refresh.service`:

```ini
[Unit]
Description=Gmail POP3 Auto-Refresh
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/pop3refresh
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable pop3refresh
sudo systemctl start pop3refresh
```

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start server.js --name pop3refresh
pm2 save
pm2 startup
```

### Docker Support

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t pop3refresh .
docker run -d -p 3000:3000 --env-file .env --name pop3refresh pop3refresh
```

## 🔒 Security

- Uses OAuth2 for secure authentication (no password storage)
- Tokens are stored locally in `config.json` - keep this file secure
- Only requests read-only access to Gmail
- Session secrets should be changed from defaults in production
- Consider using HTTPS in production environments

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 📝 How It Works

The application works by:

1. Authenticating with Gmail using OAuth2
2. Periodically calling the Gmail API to list labels and messages
3. These API calls trigger Gmail's internal POP3 check mechanism
4. Running as a persistent server process (no browser needed)

This replicates what the browser extension does but as a standalone service.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 🙏 Acknowledgments

Based on the [Gmail POP3 Auto-Refresh](https://github.com/Ayce45/gmail-pop3-auto-refresh) browser extension by Ayce45.

## ⚠️ Troubleshooting

### "Error: invalid_client" during authentication
- Double-check your Client ID and Client Secret in `.env`
- Ensure the redirect URI is correctly configured in Google Cloud Console

### POP3 checks not triggering
- Verify that you have POP3 accounts configured in Gmail settings
- Check the server logs for any error messages
- Ensure automatic checking is enabled in the web interface

### Server stops after closing terminal
- Use PM2, systemd, or Docker to run the service persistently
- Alternatively, use `nohup npm start &` for a quick solution