const debug = require('debug');

const APP_NAMESPACE = 'claude-sync';

module.exports = {
    main: debug(`${APP_NAMESPACE}:main`),
    renderer: debug(`${APP_NAMESPACE}:renderer`),
    ipc: debug(`${APP_NAMESPACE}:ipc`),
    fileUtils: debug(`${APP_NAMESPACE}:file-utils`),
};