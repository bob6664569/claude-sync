const { BrowserWindow } = require('electron');
const path = require('path');
const { getStore } = require('./store');

let mainWindow;
let loginWindow;
let projectSelectionWindow;

function createLoginWindow() {
    // Close existing login window if it exists
    if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
    }

    loginWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    loginWindow.loadFile(path.join(__dirname, '../renderer/login.html'));

    loginWindow.on('closed', () => {
        loginWindow = null;
    });
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

function createProjectSelectionWindow() {
    if (projectSelectionWindow && !projectSelectionWindow.isDestroyed()) {
        projectSelectionWindow.focus();
        return projectSelectionWindow;
    }

    projectSelectionWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    projectSelectionWindow.loadFile(path.join(__dirname, '../renderer/project-selection.html'));

    projectSelectionWindow.on('closed', () => {
        projectSelectionWindow = null;
        console.log('Project selection window closed');
    });

    return projectSelectionWindow;
}

function getMainWindow() {
    return mainWindow;
}

module.exports = {
    createLoginWindow,
    createMainWindow,
    closeLoginWindow,
    createProjectSelectionWindow,
    getMainWindow
};