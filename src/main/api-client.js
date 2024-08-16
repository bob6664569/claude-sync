const fs = require('node:fs/promises');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

const { CLAUDE, MAX_FILE_SIZE } = require('../utils/config');
const { getStore } = require('./store');

class ClaudeAPIClient {
    constructor() {
        this.cookieJar = new tough.CookieJar();
        this.client = this.createAxiosClient();
    }

    createAxiosClient() {
        return wrapper(axios.create({
            baseURL: CLAUDE.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'User-Agent': 'PostmanRuntime/7.41.0',
                'Postman-Token': 'ac8a7bcc-f2f8-46a1-b3f7-b6187e3043c6'
            },
            jar: this.cookieJar,
            withCredentials: true
        }));
    }

    setSessionKey(sessionKey) {
        const cookie = new tough.Cookie({
            key: 'sessionKey',
            value: sessionKey,
            domain: 'claude.ai',
            httpOnly: true,
            secure: true
        });
        this.cookieJar.setCookieSync(cookie, 'https://claude.ai');
        console.log('Session key set in cookie jar');
    }

    initializeSession() {
        const store = getStore();
        const sessionKey = store.get('sessionKey');
        const organizationUUID = store.get('organizationUUID');

        console.log('Initializing session...');
        console.log('Session Key found in store:', sessionKey ? 'Yes' : 'No');
        console.log('Organization UUID found in store:', organizationUUID ? 'Yes' : 'No');

        if (sessionKey) {
            console.log('Session Key:', sessionKey);
            this.setSessionKey(sessionKey); // Changé de setSessionCookie à setSessionKey
            console.log('Session key set from stored sessionKey');
        } else {
            console.log('No session key found in store');
        }

        if (organizationUUID) {
            console.log('Organization UUID:', organizationUUID);
        } else {
            console.log('No organization UUID found in store');
        }
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
            throw error;
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
        try {
            const response = await this.client.post('/auth/verify_magic_link', payload);
            console.log('API response:', response.data);

            // Extract sessionKey from cookies
            const cookies = this.cookieJar.getCookiesSync('https://claude.ai');
            const sessionKeyCookie = cookies.find(cookie => cookie.key === 'sessionKey');

            if (sessionKeyCookie) {
                this.updateSessionKey(sessionKeyCookie.value);
            } else {
                console.error('Session key not found in cookies');
            }

            // Extract organization UUID from the response
            if (response.data && response.data.account && response.data.account.memberships && response.data.account.memberships.length > 0) {
                const organizationUUID = response.data.account.memberships[0].organization.uuid;
                this.updateOrganizationUUID(organizationUUID);
            } else {
                console.error('Organization UUID not found in the response');
            }

            return response.data;
        } catch (error) {
            console.error('Error verifying magic link:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async listProjects(organizationUUID) {
        try {
            const response = await this.client.get(`/organizations/${organizationUUID}/projects`);
            return response.data;
        } catch (error) {
            console.error('Error listing projects:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async listProjectFiles(organizationUUID, projectUUID) {
        try {
            const response = await this.client.get(`/organizations/${organizationUUID}/projects/${projectUUID}/docs`);
            return response.data;
        } catch (error) {
            console.error('Error listing project files:', error);
            throw error;
        }
    }

    async deleteFile(organizationUUID, projectUUID, docUUID) {
        try {
            await this.client.delete(`/organizations/${organizationUUID}/projects/${projectUUID}/docs/${docUUID}`, {
                data: { docUuid: docUUID }
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    async uploadFile(organizationUUID, projectUUID, fileName, filePath) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.size > MAX_FILE_SIZE) {
                console.log(`Skipping ${fileName}: File size exceeds limit`);
                return { skipped: true, reason: 'File size exceeds limit' };
            }

            const content = await fs.readFile(filePath, 'utf-8');
            const response = await this.client.post(`/organizations/${organizationUUID}/projects/${projectUUID}/docs`, {
                file_name: fileName,
                content: content
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async verifySession(organizationUUID) {
        try {
            const response = await this.client.get(`/bootstrap/${organizationUUID}/statsig`);
            if (response.data && response.data.user && response.data.user.userID) {
                return true; // Session is valid
            }
            return false; // Session is not valid
        } catch (error) {
            console.error('Error verifying session:', error.response ? error.response.data : error.message);
            return false; // In case of error, consider the session as invalid
        }
    }

    updateSessionKey(sessionKey) {
        const store = getStore();
        store.set('sessionKey', sessionKey);
        console.log('Session Key updated in store:', sessionKey);
        this.setSessionKey(sessionKey);
    }

    updateOrganizationUUID(organizationUUID) {
        const store = getStore();
        store.set('organizationUUID', organizationUUID);
        console.log('Organization UUID updated in store:', organizationUUID);
    }

    getSessionKey() {
        const cookies = this.cookieJar.getCookiesSync('https://claude.ai');
        const sessionKeyCookie = cookies.find(cookie => cookie.key === 'sessionKey');
        return sessionKeyCookie ? sessionKeyCookie.value : null;
    }
}

module.exports = ClaudeAPIClient;