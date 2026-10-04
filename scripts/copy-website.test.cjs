const assert = require('node:assert/strict');
const {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {test} = require('node:test');
const {copyWebsite} = require('./copy-website.cjs');

test('website copies retain source paths and only distribute top-level JavaScript bundles', () => {
    const root = mkdtempSync(join(tmpdir(), 'html2canvas-copy-'));
    try {
        for (const directory of ['src/core', 'dist/lib', 'www/public']) mkdirSync(join(root, directory), {recursive: true});
        for (const [path, value] of Object.entries({'src/index.ts':'root source', 'src/core/context.ts':'nested source', 'src/notes.md':'not source', 'dist/html2canvas.js':'bundle', 'dist/html2canvas.min.js':'minified', 'dist/html2canvas.js.map':'map', 'dist/lib/index.js':'internal'})) writeFileSync(join(root,path),value);
        copyWebsite('src', root);
        copyWebsite('dist', root);
        for (const path of ['src/index.ts','src/core/context.ts','dist/html2canvas.js','dist/html2canvas.min.js']) assert.equal(readFileSync(join(root,'www/public',path),'utf8'),readFileSync(join(root,path),'utf8'));
        for (const path of ['src/notes.md','dist/html2canvas.js.map','dist/lib/index.js']) assert.equal(existsSync(join(root,'www/public',path)),false);
        writeFileSync(join(root,'src/index.ts'),'updated source');
        copyWebsite('src',root);
        assert.equal(readFileSync(join(root,'www/public/src/index.ts'),'utf8'),'updated source');
        assert.throws(()=>copyWebsite('unknown',root), /Choose src or dist/);
    } finally { rmSync(root,{recursive:true,force:true}); }
});
