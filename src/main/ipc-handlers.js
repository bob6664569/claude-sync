const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { getStore } = require('./store');
const { createMainWindow, closeLoginWindow, getMainWindow, createLoginWindow } = require('./windows');
const { shouldIgnore, getDirectoryContents, mergeItems } = require('../utils/file-utils');

class IpcHandlerManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.watcher = null;
        this.loginState = {
            email: null,
            totpSent: false
        };
    }

    setupHandlers() {
        this.setupLoginHandlers();
        this.setupFileSelectionHandler();
        this.setupStateHandlers();
        this.setupSyncHandlers();
    }

    setupLoginHandlers() {
        ipcMain.handle('request-totp', async (_, email) => {
            try {
                const result = await this.apiClient.sendMagicLink(email);
                if (result.sent) {
                    this.loginState.email = email;
                    this.loginState.totpSent = true;
                    return { success: true, message: 'TOTP sent to your email address' };
                } else {
                    return { success: false, message: 'Failed to send TOTP' };
                }
            } catch (error) {
                console.error('Error requesting TOTP:', error);
                return { success: false, message: 'Error while requesting TOTP' };
            }
        });

        ipcMain.handle('verify-totp', async (_, totp) => {
            try {
                if (!this.loginState.totpSent) {
                    return { success: false, message: 'Please request a magic link first' };
                }

                const result = await this.apiClient.verifyMagicLink(this.loginState.email, totp);
                console.log('Magic link verification result:', result);

                if (!result) {
                    return { success: false, message: 'No response from server' };
                }

                if (result.success) {
                    const organizationUUID = result.account?.memberships?.[0]?.organization?.uuid;
                    if (!organizationUUID) {
                        console.error('No organization UUID found in the response');
                        this.handleLogout();
                        return { success: false, message: 'The account must have an organization to function' };
                    }
                    this.storeSession(result.secret, organizationUUID);
                    await createMainWindow();
                    closeLoginWindow();
                    this.resetLoginState();
                    return { success: true };
                } else {
                    return { success: false, message: result.error || 'Invalid code' };
                }
            } catch (error) {
                console.error('Error verifying magic link:', error);
                return { success: false, message: 'Error while verifying the magic link' };
            }
        });

        ipcMain.handle('check-session', async () => {
            const { sessionKey, organizationUUID } = this.getStoredSession();
            if (sessionKey && organizationUUID) {
                try {
                    const isValid = await this.apiClient.verifySession(sessionKey);
                    if (isValid) {
                        await createMainWindow();
                        return { success: true };
                    }
                } catch (error) {
                    console.error('Error verifying session:', error);
                }
            }
            this.handleLogout();
            return { success: false };
        });

        ipcMain.handle('logout', () => {
            this.handleLogout();
        });
    }

    setupFileSelectionHandler() {
        ipcMain.handle('select-files-and-folders', async (_, existingItems) => {
            try {
                const result = await dialog.showOpenDialog(getMainWindow(), {
                    properties: ['openFile', 'openDirectory', 'multiSelections']
                });

                if (result.canceled) {
                    return existingItems;
                } else {
                    const newItems = this.processSelectedPaths(result.filePaths);
                    return mergeItems(existingItems, newItems);
                }
            } catch (error) {
                console.error('File selection error:', error);
                throw error;
            }
        });
    }

    setupStateHandlers() {
        ipcMain.handle('save-state', (_, state) => {
            try {
                console.log('Saving state:', state);
                getStore().set('syncItems', state);
            } catch (error) {
                console.error('Error saving state:', error);
                throw error;
            }
        });

        ipcMain.handle('load-state', () => {
            try {
                console.log('Loading state');
                const state = getStore().get('syncItems', []);
                console.log('Loaded state:', state);
                return state;
            } catch (error) {
                console.error('Error loading state:', error);
                throw error;
            }
        });
    }

    setupSyncHandlers() {
        ipcMain.on('start-sync', (_, items) => {
            console.log('Starting sync for items:', items);
            this.startFileWatcher(items);
        });

        ipcMain.on('stop-sync', () => {
            console.log('Stopping sync');
            this.stopFileWatcher();
        });
    }

    resetLoginState() {
        this.loginState = {
            email: null,
            totpSent: false
        };
    }

    storeSession(sessionKey, organizationUUID) {
        console.log('Storing session:', { sessionKey, organizationUUID });
        getStore().set('sessionKey', sessionKey);
        getStore().set('organizationUUID', organizationUUID);
    }

    getStoredSession() {
        const sessionKey = getStore().get('sessionKey');
        const organizationUUID = getStore().get('organizationUUID');
        console.log('Retrieved stored session:', { sessionKey, organizationUUID });
        return { sessionKey, organizationUUID };
    }

    clearSession() {
        console.log('Clearing session');
        getStore().delete('sessionKey');
        getStore().delete('organizationUUID');
    }

    handleLogout() {
        this.clearSession();
        this.resetLoginState();
        createLoginWindow();
        if (getMainWindow()) {
            getMainWindow().close();
        }
    }

    processSelectedPaths(filePaths) {
        return filePaths
            .filter(filePath => !shouldIgnore(filePath))
            .map(filePath => {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    return {
                        name: path.basename(filePath),
                        path: filePath,
                        isDirectory: true,
                        children: getDirectoryContents(filePath)
                    };
                } else {
                    return {
                        name: path.basename(filePath),
                        path: filePath,
                        isDirectory: false
                    };
                }
            });
    }

    startFileWatcher(items) {
        if (this.watcher) {
            this.watcher.close();
        }

        this.watcher = chokidar.watch(items, {
            ignored: shouldIgnore,
            persistent: true,
            ignoreInitial: false,
            usePolling: true,
            interval: 100,
            binaryInterval: 300,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', path => this.handleFileEvent('add', path))
            .on('change', path => this.handleFileEvent('change', path))
            .on('unlink', path => this.handleFileEvent('delete', path))
            .on('error', this.handleWatcherError.bind(this))
            .on('ready', this.handleWatcherReady.bind(this));
    }

    stopFileWatcher() {
        if (this.watcher) {
            this.watcher.close();
            getMainWindow().webContents.send('sync-stopped');
        }
    }

    handleFileEvent(eventType, path) {
        console.log(`File ${path} has been ${eventType}ed`);
        getMainWindow().webContents.send('file-change', { type: eventType, path });
    }

    handleWatcherError(error) {
        console.error(`Watcher error: ${error}`);
        getMainWindow().webContents.send('sync-error', error.toString());
    }

    handleWatcherReady() {
        console.log('Initial scan complete. Ready for changes.');
        getMainWindow().webContents.send('watcher-ready');
    }
}

function setupIpcHandlers(apiClient) {
    const handlerManager = new IpcHandlerManager(apiClient);
    handlerManager.setupHandlers();
    return handlerManager;
}

module.exports = { setupIpcHandlers };