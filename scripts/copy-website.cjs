'use strict';
const {copyFileSync, mkdirSync, readdirSync} = require('node:fs');
const {join, resolve} = require('node:path');

function copyTree(source, destination, extension, recursive) {
    mkdirSync(destination, {recursive: true});
    for (const entry of readdirSync(source, {withFileTypes: true})) {
        const from = join(source, entry.name);
        const to = join(destination, entry.name);
        if (entry.isDirectory() && recursive) copyTree(from, to, extension, true);
        else if (entry.isFile() && entry.name.endsWith(extension)) copyFileSync(from, to);
    }
}

function copyWebsite(kind, root = resolve(__dirname, '..')) {
    if (kind !== 'src' && kind !== 'dist') throw new Error('Choose src or dist');
    copyTree(join(root, kind), join(root, 'www/public', kind), kind === 'src' ? '.ts' : '.js', kind === 'src');
}
if (require.main === module) copyWebsite(process.argv[2]);
module.exports = {copyWebsite};
