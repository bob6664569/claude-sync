const { BrowserWindow } = require('electron');
const path = require('path');
const { getStore } = require('./store');

let mainWindow;
let loginWindow;

function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    loginWindow.loadFile(path.join(__dirname, '../renderer/login.html'));
}

async function createMainWindow() {
    if (!mainWindow) {
        mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        mainWindow.loadFile(path.join(__dirname, '../renderer/main.html'));

        mainWindow.webContents.on('did-finish-load', () => {
            const initialState = getStore().get('syncItems', []);
            console.log('Sending initial state:', initialState);
            mainWindow.webContents.send('initial-state', initialState);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    } else {
        mainWindow.focus();
    }
}

function closeLoginWindow() {
    if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
    }
}

module.exports = {
    createLoginWindow,
    createMainWindow,
    closeLoginWindow,
    getMainWindow: () => mainWindow
};