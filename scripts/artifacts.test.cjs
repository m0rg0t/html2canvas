const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {test} = require('node:test');
const acorn = require('acorn');
const manifest = require('../package.json');

test('published UMD and minified bundles retain ES5 syntax', () => {
    for (const file of ['dist/html2canvas.js', 'dist/html2canvas.min.js']) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotThrow(() => acorn.parse(source, {ecmaVersion: 5}), file);
        assert.ok(source.startsWith('/*!'), `${file} must retain its license banner`);
    }
});

test('package keeps the existing consumer engine and distribution entry points', () => {
    assert.equal(manifest.engines.node, '>=8.0.0');
    assert.equal(manifest.main, 'dist/html2canvas.js');
    assert.equal(manifest.browser, manifest.main);
    assert.equal(manifest.module, 'dist/html2canvas.esm.js');
    assert.equal(manifest.typings, 'dist/types/index.d.ts');
    assert.ok(existsSync(manifest.typings));
    assert.equal(typeof require('../dist/html2canvas.js'), 'function');
});

test('ESM exports the same default renderer and maps retain TypeScript sources', async () => {
    const source = readFileSync(manifest.module, 'utf8');
    const esm = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    assert.deepEqual(Object.keys(esm), ['default']);
    assert.equal(typeof esm.default, 'function');
    for (const file of [manifest.main, manifest.module]) {
        const map = JSON.parse(readFileSync(`${file}.map`, 'utf8'));
        assert.ok(map.sources.some(name => name.endsWith('src/index.ts')));
        assert.ok(map.sourcesContent.some(content => content && content.includes('renderElement')));
    }
});
