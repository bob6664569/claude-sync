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

module.exports = { initStore, getStore };