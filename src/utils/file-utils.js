const path = require('path');
const fs = require('fs');
const { IGNORE_LIST } = require('./config');

function shouldIgnore(filePath) {
    const fileName = path.basename(filePath);
    return IGNORE_LIST.some(ignoreItem => {
        if (ignoreItem.startsWith('*')) {
            return fileName.endsWith(ignoreItem.slice(1));
        }
        return fileName === ignoreItem;
    });
}

function getDirectoryContents(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items
        .filter(item => !shouldIgnore(path.join(dir, item.name)))
        .map(item => {
            const res = { name: item.name, path: path.join(dir, item.name), isDirectory: item.isDirectory() };
            if (item.isDirectory()) {
                res.children = getDirectoryContents(res.path);
            }
            return res;
        });
}

function isSubPath(parent, child) {
    const relative = path.relative(parent, child);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function mergeItems(existingItems, newItems) {
    const mergedItems = [...existingItems];

    newItems.forEach(newItem => {
        const existingIndex = mergedItems.findIndex(item => item.path === newItem.path);

        if (existingIndex !== -1) {
            return;
        }

        const parentIndex = mergedItems.findIndex(item =>
            item.isDirectory && isSubPath(item.path, newItem.path)
        );

        if (parentIndex !== -1) {
            if (!mergedItems[parentIndex].children) {
                mergedItems[parentIndex].children = [];
            }
            mergedItems[parentIndex].children.push(newItem);
        } else {
            mergedItems.push(newItem);
        }
    });

    return mergedItems;
}

module.exports = {
    shouldIgnore,
    getDirectoryContents,
    mergeItems
};