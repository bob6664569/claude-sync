const IGNORE_LIST = [
    '.DS_Store',
    'Thumbs.db',
    '*.tmp',
    '*.log',
    'node_modules',
    '.idea'
];

const CLAUDE = {
    baseURL: 'https://api.claude.ai/api',
    recaptchaSiteKey: '6LcdsFgmAAAAAMfrnC1hEdmeRQRXCjpy8qT_kvfy'
};

module.exports = {
    IGNORE_LIST,
    CLAUDE
};