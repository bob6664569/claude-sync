const { app, Menu, BrowserWindow } = require('electron');
const { getStore } = require('./store');
const { createLoginWindow, createProjectSelectionWindow } = require('./windows');

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Project',
            submenu: [
                {
                    label: 'Change Project',
                    click: () => {
                        changeProject();
                    }
                }
            ]
        },
        {
            label: 'Account',
            submenu: [
                {
                    label: 'Logout',
                    click: () => {
                        logout();
                    }
                }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        template.unshift({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function changeProject() {
    createProjectSelectionWindow();
}

function logout() {
    const store = getStore();
    store.clear(); // This will remove all data from the store

    // Close all windows
    BrowserWindow.getAllWindows().forEach((window) => {
        window.close();
    });

    // Create a new login window
    createLoginWindow();
}

module.exports = { createMenu };