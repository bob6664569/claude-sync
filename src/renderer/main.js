const { ipcRenderer } = require('electron');

class SyncApp {
    constructor() {
        this.syncItems = [];
        this.isWatching = false;
        this.domElements = {
            addItemsButton: document.getElementById('add-items'),
            toggleSyncButton: document.getElementById('toggle-sync'),
            itemTree: document.getElementById('item-tree'),
            console: document.getElementById('console')
        };

        this.initEventListeners();
        this.initIpcListeners();
    }

    init() {
        console.log('Initializing application');
        this.loadState();
    }

    initEventListeners() {
        this.domElements.addItemsButton.addEventListener('click', () => this.handleAddItems());
        this.domElements.toggleSyncButton.addEventListener('click', () => this.handleToggleSync());
    }

    initIpcListeners() {
        ipcRenderer.on('initial-state', (_, initialState) => this.handleInitialState(initialState));
        ipcRenderer.on('file-change', (_, change) => this.handleFileChange(change));
        ipcRenderer.on('watcher-ready', () => this.handleWatcherReady());
        ipcRenderer.on('sync-stopped', () => this.handleSyncStopped());
        ipcRenderer.on('sync-error', (_, error) => this.handleSyncError(error));
    }

    async loadState() {
        try {
            const state = await ipcRenderer.invoke('load-state');
            console.log('State loaded:', state);
            this.syncItems = state;
            this.updateItemTree();
        } catch (error) {
            console.error('Error loading state:', error);
            this.addConsoleEntry('error', 'Error loading state');
        }
    }

    async handleAddItems() {
        try {
            this.syncItems = await ipcRenderer.invoke('select-files-and-folders', this.syncItems);
            this.updateItemTree();
            this.saveState();
        } catch (error) {
            console.error('Error adding items:', error);
            this.addConsoleEntry('error', 'Error adding items');
        }
    }

    handleToggleSync() {
        if (this.isWatching) {
            ipcRenderer.send('stop-sync');
        } else {
            const itemsToSync = this.getAllPaths(this.syncItems);
            console.log('Starting sync with items:', itemsToSync);
            ipcRenderer.send('start-sync', itemsToSync);
        }
    }

    handleInitialState(initialState) {
        console.log('Received initial state:', initialState);
        this.syncItems = initialState;
        this.updateItemTree();
    }

    handleFileChange(change) {
        console.log('File change detected:', change);
        this.addConsoleEntry(change.type, `${change.type}: ${change.path}`);
    }

    handleWatcherReady() {
        console.log('Watcher is ready');
        this.isWatching = true;
        this.domElements.toggleSyncButton.textContent = 'Stop Synchronization';
        this.addConsoleEntry('info', 'Synchronization started and ready');
    }

    handleSyncStopped() {
        console.log('Sync stopped');
        this.isWatching = false;
        this.domElements.toggleSyncButton.textContent = 'Start Synchronization';
        this.addConsoleEntry('info', 'Synchronization stopped');
    }

    handleSyncError(error) {
        console.error('Sync error:', error);
        this.addConsoleEntry('error', `Synchronization error: ${error}`);
    }

    updateItemTree() {
        console.log('Updating item tree with:', this.syncItems);
        this.domElements.itemTree.innerHTML = '';
        this.syncItems.forEach(item => {
            this.domElements.itemTree.appendChild(this.createTreeItem(item));
        });

        this.addTreeItemListeners();
    }

    createTreeItem(item, parentPath = '') {
        const div = document.createElement('div');
        div.className = 'tree-item';
        const itemClass = item.isDirectory ? 'folder' : 'file';
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.path;

        div.innerHTML = `
            <span class="${itemClass}">
                ${item.isDirectory ? '<span class="expander">▶</span>' : ''}
                ${item.name}
            </span>
            <span class="remove-btn" data-path="${fullPath}">✕</span>
        `;

        if (item.isDirectory && item.children) {
            const ul = document.createElement('ul');
            item.children.forEach(child => {
                ul.appendChild(this.createTreeItem(child, fullPath));
            });
            div.appendChild(ul);
        }

        return div;
    }

    addTreeItemListeners() {
        this.domElements.itemTree.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pathToRemove = e.target.getAttribute('data-path');
                this.removeItemByPath(pathToRemove);
                this.updateItemTree();
                this.saveState();
            });
        });

        this.domElements.itemTree.querySelectorAll('.expander').forEach(expander => {
            expander.addEventListener('click', (e) => {
                e.stopPropagation();
                const treeItem = e.target.closest('.tree-item');
                treeItem.classList.toggle('collapsed');
                e.target.classList.toggle('expanded');
                e.target.textContent = e.target.classList.contains('expanded') ? '▼' : '▶';
            });
        });
    }

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

    getAllPaths(items) {
        return items.reduce((acc, item) => {
            acc.push(item.path);
            if (item.isDirectory && item.children) {
                acc.push(...this.getAllPaths(item.children));
            }
            return acc;
        }, []);
    }

    saveState() {
        ipcRenderer.invoke('save-state', this.syncItems);
    }

    addConsoleEntry(type, message) {
        const entry = document.createElement('div');
        entry.className = `console-entry ${type}`;
        entry.textContent = message;
        this.domElements.console.appendChild(entry);
        this.domElements.console.scrollTop = this.domElements.console.scrollHeight;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new SyncApp();
    app.init();
});