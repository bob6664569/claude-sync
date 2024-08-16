const { ipcRenderer } = require('electron');
const { main: debug } = require('../utils/logger');

class SyncApp {
    constructor() {
        this.syncItems = [];
        this.currentProjectId = null;
        this.isWatching = false;
        this.domElements = {
            addItemsButton: document.getElementById('add-items'),
            toggleSyncButton: document.getElementById('toggle-sync'),
            itemTree: document.getElementById('item-tree'),
            console: document.getElementById('console')
        };
        this.syncStatuses = new Map();

        this.initializeApp();
        this.setupIpcListeners();
    }

    setupIpcListeners() {
        ipcRenderer.on('file-change', (_, data) => {
            console.log('Received file-change event:', data);
            this.addConsoleEntry(data.type, `${data.type.charAt(0).toUpperCase() + data.type.slice(1)}: ${data.path}`);
        });

        ipcRenderer.on('sync-status-update', (_, data) => {
            this.updateSyncStatus(data.filePath, data.status);
        });

        ipcRenderer.on('sync-error', (_, error) => {
            console.error('Received sync-error event:', error);
            this.addConsoleEntry('error', `Sync error: ${error}`);
        });

        ipcRenderer.on('watcher-ready', () => {
            console.log('Received watcher-ready event');
            this.addConsoleEntry('info', 'File watcher is ready');
        });

        ipcRenderer.on('sync-error', (_, error) => {
            console.error('Received sync-error event:', error);
            this.addConsoleEntry('error', `Sync error: ${error}`);
        });
    }

    async initializeApp() {
        await this.loadCurrentProject();
        await this.loadSyncItems();
        this.setupEventListeners();
        this.updateItemTree();
    }

    // Load the current project ID from the main process
    async loadCurrentProject() {
        this.currentProjectId = await ipcRenderer.invoke('get-current-project');
    }

    // Load sync items for the current project
    async loadSyncItems() {
        try {
            this.syncItems = await ipcRenderer.invoke('get-sync-items');
        } catch (error) {
            console.error('Error loading sync items:', error);
            this.addConsoleEntry('error', 'Error loading sync items');
        }
    }

    // Set up event listeners for IPC and DOM events
    setupEventListeners() {
        // Listen for project changes from the main process
        ipcRenderer.on('project-changed', async (_, projectId) => {
            console.log('Received project-changed event:', projectId);
            this.currentProjectId = projectId;
            await this.loadSyncItems();
            this.updateItemTree();
        });

        // DOM event listeners
        this.domElements.addItemsButton.addEventListener('click', () => this.handleAddItems());
        this.domElements.toggleSyncButton.addEventListener('click', () => this.handleToggleSync());
    }

    // Save the current sync items to the store
    async saveSyncItems() {
        try {
            console.log('Saving sync items:', this.syncItems);
            await ipcRenderer.invoke('save-sync-items', this.syncItems);
            console.log('Sync items saved successfully');
        } catch (error) {
            console.error('Error saving sync items:', error);
            this.addConsoleEntry('error', 'Error saving sync items: ' + error.message);
        }
    }

    updateSyncStatus(filePath, status) {
        this.syncStatuses.set(filePath, status);
        this.updateParentStatuses(filePath, status);
        this.updateItemTree();
    }

    updateParentStatuses(filePath, status) {
        const parts = filePath.split('/');
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('/');
            const parentStatus = this.getHighestPriorityStatus(parentPath);
            this.syncStatuses.set(parentPath, parentStatus);
        }
    }

    getHighestPriorityStatus(dirPath) {
        const statusPriority = ['error', 'syncing', 'queued', 'synced'];
        let highestStatus = 'synced';

        for (const [path, status] of this.syncStatuses.entries()) {
            if (path.startsWith(dirPath + '/')) {
                const priority = statusPriority.indexOf(status);
                const highestPriority = statusPriority.indexOf(highestStatus);
                if (priority < highestPriority) {
                    highestStatus = status;
                }
            }
        }

        return highestStatus;
    }

    getSyncStatusIcon(status) {
        switch (status) {
            case 'queued':
                return '<span class="sync-status queued">🕒</span>';
            case 'syncing':
                return '<span class="sync-status syncing">↻</span>';
            case 'synced':
                return '<span class="sync-status synced">✓</span>';
            case 'error':
                return '<span class="sync-status error">❌</span>';
            default:
                return '';
        }
    }

    createTreeItem(item, parentPath = '') {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.path;
        const div = document.createElement('div');
        div.className = 'tree-item';

        const status = this.syncStatuses.get(fullPath) || 'synced';
        const content = `
            <span class="${item.isDirectory ? 'folder' : 'file'}">
                ${item.isDirectory ? '<span class="expander">▶</span>' : ''}
                ${item.name}
                ${this.getSyncStatusIcon(status)}
            </span>
            <span class="remove-btn" data-path="${fullPath}">✕</span>
        `;
        div.innerHTML = content;

        if (item.isDirectory && item.children) {
            const ul = document.createElement('ul');
            item.children.forEach(child => ul.appendChild(this.createTreeItem(child, fullPath)));
            div.appendChild(ul);
        }

        return div;
    }

    updateItemTree() {
        console.log('Updating item tree with:', this.syncItems);
        this.domElements.itemTree.innerHTML = '';
        this.syncItems.forEach(item => {
            this.domElements.itemTree.appendChild(this.createTreeItem(item));
        });
        this.addTreeItemListeners();
    }

    // Add event listeners to tree items
    addTreeItemListeners() {
        this.domElements.itemTree.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pathToRemove = e.target.getAttribute('data-path');
                this.removeItemByPath(pathToRemove);
                this.updateItemTree();
                this.saveSyncItems();
            });
        });

        this.domElements.itemTree.querySelectorAll('.expander').forEach(expander => {
            expander.addEventListener('click', (e) => {
                e.stopPropagation();
                const treeItem = e.target.closest('.tree-item');
                treeItem.classList.toggle('collapsed');
                e.target.textContent = treeItem.classList.contains('collapsed') ? '▶' : '▼';
                const childrenContainer = treeItem.querySelector('ul');
                if (childrenContainer) {
                    childrenContainer.style.display = treeItem.classList.contains('collapsed') ? 'none' : 'block';
                }
            });
        });
    }

    // Remove an item from syncItems by its path
    removeItemByPath(pathToRemove) {
        const removeFromArray = (items) => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].path === pathToRemove) {
                    items.splice(i, 1);
                    return true;
                }
                if (items[i].isDirectory && items[i].children) {
                    if (removeFromArray(items[i].children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        removeFromArray(this.syncItems);
    }

    // Handle adding new items
    async handleAddItems() {
        try {
            console.log('Current syncItems before adding:', this.syncItems);
            const updatedItems = await ipcRenderer.invoke('select-files-and-folders', this.syncItems);
            console.log('Updated items received:', updatedItems);
            this.syncItems = updatedItems;
            this.updateItemTree();
            await this.saveSyncItems();
            console.log('SyncItems after update:', this.syncItems);
        } catch (error) {
            console.error('Error adding items:', error);
            this.addConsoleEntry('error', 'Error adding items: ' + error.message);
        }
    }

    // Handle toggling sync
    handleToggleSync() {
        console.log('Toggle sync button clicked');
        if (this.isWatching) {
            console.log('Stopping sync');
            ipcRenderer.send('stop-sync');
        } else {
            console.log('Starting sync');
            const itemsToSync = this.getAllPaths(this.syncItems);
            console.log('Items to sync:', itemsToSync);
            ipcRenderer.send('start-sync', itemsToSync);
        }
        this.isWatching = !this.isWatching;
        this.domElements.toggleSyncButton.textContent = this.isWatching ? 'Stop Synchronization' : 'Start Synchronization';
        this.addConsoleEntry('info', this.isWatching ? 'Synchronization started' : 'Synchronization stopped');
    }

    // Get all paths from syncItems
    getAllPaths(items) {
        return items.reduce((acc, item) => {
            acc.push(item.path);
            if (item.isDirectory && item.children) {
                acc.push(...this.getAllPaths(item.children));
            }
            return acc;
        }, []);
    }

    addConsoleEntry(type, message) {
        const entry = document.createElement('div');
        entry.className = `console-entry ${type}`;
        entry.textContent = message;
        this.domElements.console.appendChild(entry);
        this.domElements.console.scrollTop = this.domElements.console.scrollHeight;
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new SyncApp();
});