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

const CLAUDE = {
    baseURL: 'https://api.claude.ai/api',
    recaptchaSiteKey: '6LcdsFgmAAAAAMfrnC1hEdmeRQRXCjpy8qT_kvfy'
};

module.exports = {
    IGNORE_LIST,
    CLAUDE
};