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

function getOrganizationUUID() {
    return getStore().get('organizationUUID');
}

function setOrganizationUUID(uuid) {
    getStore().set('organizationUUID', uuid);
}

function getProjectId() {
    return getStore().get('projectId');
}

function setProjectId(projectId) {
    getStore().set('projectId', projectId);
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
    getStore().set('syncItems', allSyncItems);
}

module.exports = {
    initStore,
    getStore,
    getOrganizationUUID,
    setOrganizationUUID,
    getProjectId,
    setProjectId,
    getCurrentProjectId,
    setCurrentProjectId,
    getSyncItemsForProject,
    setSyncItemsForProject
};