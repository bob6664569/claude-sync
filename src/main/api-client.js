const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

const { CLAUDE } = require('../utils/config');

class ClaudeAPIClient {
    constructor() {
        this.baseURL = CLAUDE.baseURL;
        this.cookieJar = new tough.CookieJar();
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'User-Agent': 'PostmanRuntime/7.41.0',
                'Postman-Token': 'ac8a7bcc-f2f8-46a1-b3f7-b6187e3043c6'
            },
            jar: this.cookieJar,
            withCredentials: true
        });
    }

    async sendMagicLink(email) {
        const payload = {
            utc_offset: -120,
            email_address: email,
            recaptcha_token: "",
            recaptcha_site_key: "",
            source: "claude"
        };

        try {
            const response = await this.client.post('/auth/send_magic_link', payload);
            return response.data;
        } catch (error) {
            console.error('Error sending magic link:', error.response ? error.response.data : error.message);
        }
    }

    async verifyMagicLink(email, code) {
        const payload = {
            credentials: {
                method: "code",
                email_address: email,
                code: code
            },
            recaptcha_token: "",
            recaptcha_site_key: "",
            source: "claude"
        };
        console.log(this.client);
        console.log(payload);
        try {
            const response = await this.client.post('/auth/verify_magic_link', payload);
            console.log(response.data);
            const sessionKey = this.cookieJar.getCookiesSync(this.baseURL).find(cookie => cookie.key === 'sessionKey');
            return { ...response.data, sessionKey: sessionKey ? sessionKey.value : null };
        } catch (error) {
            console.error('Error verifying magic link:', error.response ? error.response.data : error.message);
        }
    }

    // TODO: Fix this
    async verifySession(sessionKey) {
        try {
            const response = await this.client.get('/verify-session', {
                body: JSON.stringify({ sessionKey })
            });
            const data = await response.json();
            return data.isValid;
        } catch (error) {
            console.error('Error verifying session:', error);
            return false;
        }
    }
}

module.exports = ClaudeAPIClient;