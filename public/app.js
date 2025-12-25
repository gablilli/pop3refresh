// UI Elements
const authButton = document.getElementById('auth-button');
const logoutButton = document.getElementById('logout-button');
const saveConfigButton = document.getElementById('save-config');
const checkNowButton = document.getElementById('check-now');
const enabledToggle = document.getElementById('enabled-toggle');
const checkIntervalInput = document.getElementById('check-interval');
const configCard = document.getElementById('config-card');
const messageDiv = document.getElementById('message');

// Status elements
const authStatus = document.getElementById('auth-status');
const enabledStatus = document.getElementById('enabled-status');
const intervalStatus = document.getElementById('interval-status');

// Show message
function showMessage(message, type = 'info') {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}

// Update UI based on status
async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        // Update authentication status
        if (status.authenticated) {
            authStatus.textContent = 'Connected';
            authStatus.className = 'status-value connected';
            authButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            configCard.style.display = 'block';
        } else {
            authStatus.textContent = 'Not Connected';
            authStatus.className = 'status-value disconnected';
            authButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            configCard.style.display = 'none';
        }
        
        // Update enabled status
        if (status.enabled) {
            enabledStatus.textContent = 'Enabled';
            enabledStatus.className = 'status-value enabled';
        } else {
            enabledStatus.textContent = 'Disabled';
            enabledStatus.className = 'status-value disabled';
        }
        
        // Update interval
        intervalStatus.textContent = `${status.checkInterval} minutes`;
        intervalStatus.className = 'status-value';
        
        // Update form inputs
        enabledToggle.checked = status.enabled;
        checkIntervalInput.value = status.checkInterval;
        
    } catch (error) {
        console.error('Error fetching status:', error);
        showMessage('Error loading status', 'error');
    }
}

// Authentication
authButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth');
        const data = await response.json();
        window.location.href = data.authUrl;
    } catch (error) {
        console.error('Error getting auth URL:', error);
        showMessage('Error initiating authentication', 'error');
    }
});

// Logout
logoutButton.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account?')) {
        return;
    }
    
    try {
        await fetch('/api/logout', { method: 'POST' });
        showMessage('Account disconnected successfully', 'success');
        await updateStatus();
    } catch (error) {
        console.error('Error logging out:', error);
        showMessage('Error disconnecting account', 'error');
    }
});

// Save configuration
saveConfigButton.addEventListener('click', async () => {
    const enabled = enabledToggle.checked;
    const checkInterval = parseInt(checkIntervalInput.value);
    
    if (checkInterval < 1 || checkInterval > 60) {
        showMessage('Check interval must be between 1 and 60 minutes', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, checkInterval })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Configuration saved successfully!', 'success');
            await updateStatus();
        } else {
            showMessage('Error saving configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showMessage('Error saving configuration', 'error');
    }
});

// Check now
checkNowButton.addEventListener('click', async () => {
    checkNowButton.disabled = true;
    checkNowButton.textContent = 'Checking...';
    
    try {
        const response = await fetch('/api/check-now', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showMessage('Mail check triggered successfully!', 'success');
        } else {
            showMessage(`Error: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error checking mail:', error);
        showMessage('Error checking mail', 'error');
    } finally {
        checkNowButton.disabled = false;
        checkNowButton.textContent = 'Check Mail Now';
    }
});

// Check for URL parameters (auth success/error)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('success')) {
    showMessage('Successfully authenticated with Gmail!', 'success');
    window.history.replaceState({}, document.title, '/');
} else if (urlParams.has('error')) {
    const error = urlParams.get('error');
    showMessage(`Authentication error: ${error}`, 'error');
    window.history.replaceState({}, document.title, '/');
}

// Initial status update
updateStatus();

// Refresh status every 30 seconds
setInterval(updateStatus, 30000);
