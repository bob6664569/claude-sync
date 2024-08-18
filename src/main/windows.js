const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let loginWindow;
let projectSelectionWindow;
let iconPath;

if (process.platform.startsWith('win')) {
    iconPath = path.join(process.cwd(), 'assets/icons/win/app.ico');
} else if (process.platform === 'darwin') {
    iconPath = path.join(process.cwd(), 'assets/icons/mac/icon.icns');
} else {
    iconPath = path.join(process.cwd(), 'assets/icons/png/256x256.png');
}

function createLoginWindow() {
    if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
    }

    loginWindow = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: iconPath
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
            },
            icon: iconPath
        });

        await mainWindow.loadFile(path.join(__dirname, '../renderer/main.html'));

        mainWindow.webContents.on('did-finish-load', () => {
            const currentProjectId = getCurrentProjectId();
            console.log('Main window loaded, current project ID:', currentProjectId);
            mainWindow.webContents.send('project-changed', currentProjectId);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    } else {
        mainWindow.focus();
    }
    return mainWindow;
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
        },
        icon: iconPath
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