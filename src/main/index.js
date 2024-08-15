const { app, BrowserWindow } = require('electron');
const { setupIpcHandlers } = require('./ipc-handlers');
const { initStore, getStore } = require('./store');
const { createMainWindow, createLoginWindow, createProjectSelectionWindow } = require('./windows');
const ClaudeAPIClient = require('./api-client');
const { createMenu } = require('./menu');

let apiClient;

async function initApp() {
    try {
        await initStore();
        apiClient = new ClaudeAPIClient();
        setupIpcHandlers(apiClient);

        createMenu(); // Add this line to create the menu

        await checkAndHandleSession();
    } catch (error) {
        console.error('Error during app initialization:', error);
        createLoginWindow();
    }
}

async function checkAndHandleSession() {
    try {
        const store = getStore();
        const sessionKey = store.get('sessionKey');
        const organizationUUID = store.get('organizationUUID');

        if (sessionKey && organizationUUID) {
            apiClient.setSessionKey(sessionKey);
            const isValid = await apiClient.verifySession(organizationUUID);
            if (isValid) {
                const projectId = store.get('projectId');
                if (projectId) {
                    createMainWindow();
                } else {
                    createProjectSelectionWindow();
                }
                return;
            }
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
    createLoginWindow();
}

app.on('ready', () => {
    initApp().catch(error => {
        console.error('Failed to initialize app:', error);
        app.quit();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        initApp().catch(error => {
            console.error('Failed to initialize app on activate:', error);
            app.quit();
        });
    }
});