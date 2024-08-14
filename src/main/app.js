const { initStore } = require('./store');
const { createLoginWindow } = require('./windows');
const { setupIpcHandlers } = require('./ipc-handlers');

async function initApp() {
    await initStore();
    createLoginWindow();
    setupIpcHandlers();
}

module.exports = { initApp };