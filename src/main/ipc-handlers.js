const { ipcMain, BrowserWindow, dialog } = require('electron');
const { validate: uuidValidate } = require('uuid');
const fs = require('node:fs/promises');
const path = require('path');
const chokidar = require('chokidar');
const { getStore, getCurrentProjectId, setCurrentProjectId, getSyncItemsForProject, setSyncItemsForProject } = require('./store');
const { createMainWindow, createProjectSelectionWindow, closeLoginWindow, getMainWindow } = require('./windows');
const { shouldIgnore, getDirectoryContents, mergeItems } = require('../utils/file-utils');

let handlersSetup = false;

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
        this.setupProjectHandlers();
        ipcMain.handle('logout', () => {
            this.handleLogout();
        });
    }

    setupProjectHandlers() {
        ipcMain.handle('list-projects', async () => {
            const { organizationUUID } = this.getStoredSession();
            return await this.apiClient.listProjects(organizationUUID);
        });

        ipcMain.handle('set-project', async (_, projectId) => {
            console.log('Setting project:', projectId);
            setCurrentProjectId(projectId);
            const mainWindow = getMainWindow();
            if (mainWindow) {
                console.log('Sending project-changed event to main window');
                mainWindow.webContents.send('project-changed', projectId);
            }
            return { success: true };
        });

        ipcMain.handle('get-current-project', () => {
            return getCurrentProjectId();
        });

        ipcMain.handle('get-sync-items', () => {
            const currentProjectId = getCurrentProjectId();
            return getSyncItemsForProject(currentProjectId);
        });

        ipcMain.handle('save-sync-items', (_, items) => {
            const currentProjectId = getCurrentProjectId();
            setSyncItemsForProject(currentProjectId, items);
        });

        ipcMain.handle('confirm-project-selection', async (event, projectId) => {
            console.log('Confirming project selection:', projectId);
            setCurrentProjectId(projectId);

            const mainWindow = getMainWindow();
            if (mainWindow) {
                console.log('Sending project-changed event to main window');
                mainWindow.webContents.send('project-changed', projectId);
            } else {
                console.log('Main window not found, creating new main window');
                await createMainWindow();
            }

            const projectSelectionWindow = BrowserWindow.fromWebContents(event.sender);
            if (projectSelectionWindow) {
                projectSelectionWindow.close();
            }

            return { success: true };
        });
    }

    setupLoginHandlers() {
        if (!ipcMain.listenerCount('request-totp')) {
            ipcMain.handle('request-totp', async (_, email) => {
                try {
                    const result = await this.apiClient.sendMagicLink(email);
                    if (result.sent) {
                        this.loginState.email = email;
                        this.loginState.totpSent = true;
                        return {success: true, message: 'TOTP sent to your email address'};
                    } else {
                        return {success: false, message: 'Failed to send TOTP'};
                    }
                } catch (error) {
                    console.error('Error requesting TOTP:', error);
                    return {success: false, message: 'Error while requesting TOTP'};
                }
            });
        }

        if (!ipcMain.listenerCount('verify-totp')) {
            ipcMain.handle('verify-totp', async (_, totp) => {
                try {
                    if (!this.loginState.totpSent) {
                        return {success: false, message: 'Please request a magic link first'};
                    }

                    const result = await this.apiClient.verifyMagicLink(this.loginState.email, totp);
                    console.log('Magic link verification result:', result);

                    if (!result) {
                        return {success: false, message: 'No response from server'};
                    }

                    if (result.success) {
                        const organizationUUID = result.account?.memberships?.[0]?.organization?.uuid;
                        if (!organizationUUID || !uuidValidate(organizationUUID)) {
                            console.error('Invalid or missing organization UUID in the response');
                            this.handleLogout();
                            return {success: false, message: 'Invalid organization UUID'};
                        }
                        const sessionKey = this.apiClient.getSessionKey();
                        this.storeSession(sessionKey, organizationUUID);
                        await createMainWindow();
                        closeLoginWindow();
                        this.resetLoginState();
                        return {success: true};
                    } else {
                        return {success: false, message: result.error || 'Invalid code'};
                    }
                } catch (error) {
                    console.error('Error verifying magic link:', error);
                    return {success: false, message: 'Error while verifying the magic link'};
                }
            });
        }

        ipcMain.handle('check-session', async () => {
            return await this.verifySession();
        });
    }

    setupFileSelectionHandler() {
        ipcMain.handle('select-files-and-folders', async (_, existingItems) => {
            try {
                const mainWindow = getMainWindow();
                if (!mainWindow) {
                    throw new Error('Main window not found');
                }

                const result = await dialog.showOpenDialog(mainWindow, {
                    properties: ['openFile', 'openDirectory', 'multiSelections']
                });

                if (result.canceled) {
                    return existingItems;
                } else {
                    const newItems = this.processSelectedPaths(result.filePaths);
                    const mergedItems = mergeItems(existingItems, newItems);
                    console.log('Merged items:', mergedItems);
                    return mergedItems;
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
            console.log('Received start-sync event with items:', items);
            this.startFileWatcher(items);
        });

        ipcMain.on('stop-sync', () => {
            console.log('Received stop-sync event');
            this.stopFileWatcher();
        });
    }

    resetLoginState() {
        this.loginState = {
            email: null,
            totpSent: false
        };
    }

    async verifySession() {
        try {
            const { organizationUUID } = this.getStoredSession();
            if (!organizationUUID || !uuidValidate(organizationUUID)) {
                console.error('Invalid or missing organization UUID:', organizationUUID);
                return { success: false, message: 'Invalid organization UUID' };
            }

            const isValid = await this.apiClient.verifySession(organizationUUID);
            if (isValid) {
                return { success: true };
            } else {
                return { success: false, message: 'Session is not valid' };
            }
        } catch (error) {
            console.error('Error verifying session:', error);
            return { success: false, message: 'Error while verifying the session' };
        }
    }

    storeSession(sessionKey, organizationUUID) {
        console.log('Storing session:', { sessionKey, organizationUUID });
        if (!sessionKey) {
            console.error('Attempt to store null or undefined sessionKey');
            return;
        }
        if (!organizationUUID || !uuidValidate(organizationUUID)) {
            console.error('Invalid organization UUID:', organizationUUID);
            return;
        }
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
        console.log('Starting file watcher for items:', items);
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

    async handleFileEvent(eventType, filePath) {
        console.log(`File ${filePath} has been ${eventType}ed`);

        const { organizationUUID } = this.getStoredSession();
        const projectUUID = getCurrentProjectId();
        const rootInfo = this.getSyncRootForFile(filePath);

        if (!rootInfo) {
            console.error(`No sync root found for file: ${filePath}`);
            return;
        }

        const { syncRoot } = rootInfo;

        try {
            if (eventType === 'add' || eventType === 'change') {
                await this.syncFile(organizationUUID, projectUUID, filePath, syncRoot);
            } else if (eventType === 'unlink') {
                await this.deleteRemoteFile(organizationUUID, projectUUID, filePath, syncRoot);
            }

            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('file-change', { type: eventType, path: filePath });
            }
        } catch (error) {
            console.error(`Error handling file event (${eventType}):`, error);
            const mainWindow = getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('sync-error', `Error syncing file: ${filePath}`);
            }
        }
    }

    getSyncRootForFile(filePath) {
        const currentProjectId = getCurrentProjectId();
        const syncItems = getSyncItemsForProject(currentProjectId);

        for (const item of syncItems) {
            if (path.normalize(filePath).startsWith(path.normalize(item.path))) {
                return {
                    syncRoot: item.path,
                    rootFolder: path.basename(item.path)
                };
            }
        }

        console.error(`No sync root found for file: ${filePath}`);
        return null;
    }

    async syncFile(organizationUUID, projectUUID, filePath, syncRoot) {
        const rootFolder = path.basename(syncRoot);
        const relativeFilePath = path.relative(syncRoot, filePath);
        const apiFileName = path.join(rootFolder, relativeFilePath).replace(/\\/g, '/');

        try {
            const existingFiles = await this.apiClient.listProjectFiles(organizationUUID, projectUUID);
            const existingFile = existingFiles.find(file => file.file_name === apiFileName);

            if (existingFile) {
                // File exists, delete it
                await this.apiClient.deleteFile(organizationUUID, projectUUID, existingFile.uuid);
                console.log(`Deleted existing file ${apiFileName}`);
            }

            // Upload the file (whether it existed before or not)
            await this.apiClient.uploadFile(organizationUUID, projectUUID, apiFileName, filePath);
            console.log(`Uploaded ${apiFileName}`);

            return { synced: true };
        } catch (error) {
            console.error(`Error syncing file ${filePath}:`, error);
            throw error;
        }
    }

    async deleteRemoteFile(organizationUUID, projectUUID, filePath, syncRoot) {
        const rootFolder = path.basename(syncRoot);
        const relativeFilePath = path.relative(syncRoot, filePath);
        const apiFileName = path.join(rootFolder, relativeFilePath).replace(/\\/g, '/');

        const existingFiles = await this.apiClient.listProjectFiles(organizationUUID, projectUUID);
        const existingFile = existingFiles.find(file => file.file_name === apiFileName);

        if (existingFile) {
            await this.apiClient.deleteFile(organizationUUID, projectUUID, existingFile.uuid);
        }
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
    if (handlersSetup) {
        console.log('IPC handlers already set up. Skipping...');
        return;
    }

    const handlerManager = new IpcHandlerManager(apiClient);
    handlerManager.setupHandlers();
    handlersSetup = true;
    return handlerManager;
}

module.exports = { setupIpcHandlers };