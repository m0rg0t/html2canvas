const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {parse} = require('acorn');
const {transformMocha} = require('./legacy-mocha.cjs');

test('every configured IE launcher receives framework adaptation without changing fixture files', () => {
    const configure = require('../karma.conf.js');
    const previous = process.env.TARGET_BROWSER;
    try {
        for (const browser of ['IE_9', 'IE_10', 'IE_11', 'SauceLabs_IE9', 'SauceLabs_IE10', 'SauceLabs_IE11', 'Chrome_Stable']) {
            process.env.TARGET_BROWSER = browser;
            let config;
            configure({set: value => { config = value; }});
            const framework = config.plugins.find(plugin => typeof plugin === 'object' && plugin['framework:inline-mocha-fix']);
            const files = [];
            framework['framework:inline-mocha-fix'][1](files);
            const isIE = browser !== 'Chrome_Stable';
            assert.equal(Boolean(config.preprocessors['**/node_modules/mocha/mocha.js']), isIE, browser);
            assert.equal(files.some(file => file.pattern.endsWith('legacy-console.js')), isIE, browser);
            assert.ok(config.files.some(file => file.pattern === './tests/**/*'), 'Original fixture list must stay served');
            assert.ok(config.files.every(file => file.pattern !== './node_modules/**/*'), 'Do not reopen the whole dependency tree');
        }
    } finally {
        if (previous === undefined) delete process.env.TARGET_BROWSER;
        else process.env.TARGET_BROWSER = previous;
    }
});

test('current Mocha runs assertions after ES5 transformation in a polyfilled legacy global', async () => {
    const filename = require.resolve('mocha/mocha.js');
    const source = readFileSync(filename, 'utf8');
    assert.throws(() => parse(source, {ecmaVersion: 5}));
    const transformed = transformMocha(source, filename);
    parse(transformed, {ecmaVersion: 5});

    const dom = new JSDOM('<!doctype html><body></body>', {runScripts: 'outside-only'});
    const {window} = dom;
    try {
        window.eval('delete window.Map; delete window.Set; delete window.WeakMap; delete window.WeakSet; delete window.Symbol; delete window.Promise; delete window.Reflect; delete Object.values; delete Object.entries; delete console.assert;');
        window.eval(readFileSync(require.resolve('./legacy-console.js'), 'utf8'));
        assert.throws(() => window.console.assert(false, 'synthetic assertion'), /synthetic assertion/);
        for (const name of ['es5', 'es6', 'es2017']) {
            const polyfill = readFileSync(require.resolve(`js-polyfills/${name}.js`), 'utf8');
            parse(polyfill, {ecmaVersion: 5});
            window.eval(polyfill);
        }
        window.eval(transformed);
        window.mocha.setup({ui: 'bdd', reporter: function () {}});
        let calls = 0;
        window.describe('synthetic legacy fixture', function () {
            window.it('runs a Promise assertion', function () {
                return window.Promise.resolve().then(function () {
                    assert.equal(2 + 2, 4);
                    calls += 1;
                });
            });
        });
        const failures = await new Promise(resolve => window.mocha.run(resolve));
        assert.equal(failures, 0);
        assert.equal(calls, 1);
    } finally {
        window.close();
    }
});
