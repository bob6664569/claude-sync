const { app, BrowserWindow } = require('electron');
const { setupIpcHandlers } = require('./ipc-handlers');
const { initStore, getStore } = require('./store');
const { createMainWindow, createLoginWindow } = require('./windows');
const ApiClient = require('./api-client');

let ipcHandlerManager;
let apiClient;

async function initApp() {
    try {
        await initStore(); // Initialiser le store de manière asynchrone
        apiClient = new ApiClient();
        ipcHandlerManager = setupIpcHandlers(apiClient);

        // Vérifier la session au démarrage
        await checkAndHandleSession();
    } catch (error) {
        console.error('Error during app initialization:', error);
        createLoginWindow(); // Fallback to login window if there's an error
    }
}

async function checkAndHandleSession() {
    try {
        const store = getStore();
        const sessionKey = store.get('sessionKey');
        if (sessionKey) {
            const isValid = await apiClient.verifySession(sessionKey);
            if (isValid) {
                createMainWindow();
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