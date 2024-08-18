const dotenv = require('dotenv');
dotenv.config();

const IGNORE_LIST = [
    '.git',
    '.DS_Store',
    'Thumbs.db',
    '*.tmp',
    '*.log',
    'node_modules',
    '.idea',
    '.env'
];

const CLAUDE = { // Use env
    baseURL: process.env.API_BASE_URL,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
};

const MAX_FILE_SIZE = 100 * 1024; // 100 KB

module.exports = {
    IGNORE_LIST,
    CLAUDE,
    MAX_FILE_SIZE
};