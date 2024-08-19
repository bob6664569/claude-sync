let store;

async function initStore() {
    if (!store) {
        try {
            const Store = await import('electron-store');
            store = new Store.default();
            console.log('Store initialized');
        } catch (error) {
            console.error('Failed to initialize store:', error);
            throw error;
        }
    }
}

function getStore() {
    if (!store) {
        throw new Error('Store not initialized');
    }
    return store;
}

function getCurrentProjectId() {
    return getStore().get('currentProjectId');
}

function setCurrentProjectId(projectId) {
    getStore().set('currentProjectId', projectId);
}

function getSyncItemsForProject(projectId) {
    const allSyncItems = getStore().get('syncItems', {});
    return allSyncItems[projectId] || [];
}

function setSyncItemsForProject(projectId, items) {
    const allSyncItems = getStore().get('syncItems', {});
    allSyncItems[projectId] = items;
    console.log('Saving sync items:', projectId, items);
    getStore().set('syncItems', allSyncItems);
}

module.exports = {
    initStore,
    getStore,
    getCurrentProjectId,
    setCurrentProjectId,
    getSyncItemsForProject,
    setSyncItemsForProject
};