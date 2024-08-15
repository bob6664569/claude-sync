const { ipcRenderer } = require('electron');

class LoginManager {
    constructor() {
        this.emailForm = document.getElementById('email-form');
        this.totpForm = document.getElementById('totp-form');
        this.messageElement = document.getElementById('message');

        this.initEventListeners();
    }

    initEventListeners() {
        this.emailForm.addEventListener('submit', (e) => this.handleRequestTotp(e));
        this.totpForm.addEventListener('submit', (e) => this.handleVerifyTotp(e));
    }

    async handleRequestTotp(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        try {
            const result = await ipcRenderer.invoke('request-totp', email);
            if (result.success) {
                this.emailForm.style.display = 'none';
                this.totpForm.style.display = 'block';
            }
            this.showMessage(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            console.error('Error requesting TOTP:', error);
            this.showMessage('An error occurred while requesting the code', 'error');
        }
    }

    async handleVerifyTotp(e) {
        e.preventDefault();
        const totp = document.getElementById('totp').value;
        try {
            const result = await ipcRenderer.invoke('verify-totp', totp);
            if (result.success) {
                this.showMessage('Connexion réussie', 'success');
                // The window will close automatically if the login is successful
            } else {
                this.showMessage(result.message, 'error');
                if (result.message === 'The account must have an organization to function') {
                    this.resetForms();
                }
            }
        } catch (error) {
            console.error('Error verifying TOTP:', error);
            this.showMessage('An error occurred while verifying the code', 'error');
        }
    }

    showMessage(message, type = 'info') {
        this.messageElement.textContent = message;
        this.messageElement.className = type;
    }

    resetForms() {
        this.emailForm.style.display = 'block';
        this.totpForm.style.display = 'none';
        document.getElementById('email').value = '';
        document.getElementById('totp').value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});