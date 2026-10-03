const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {test} = require('node:test');
const {JSDOM} = require('jsdom');
const {parse} = require('acorn');
const {transformMocha} = require('./legacy-mocha.cjs');

test('current Mocha runs assertions after ES5 transformation in a polyfilled legacy global', async () => {
    const filename = require.resolve('mocha/mocha.js');
    const source = readFileSync(filename, 'utf8');
    assert.throws(() => parse(source, {ecmaVersion: 5}));
    const transformed = transformMocha(source, filename);
    parse(transformed, {ecmaVersion: 5});

    const dom = new JSDOM('<!doctype html><body></body>', {runScripts: 'outside-only'});
    const {window} = dom;
    try {
        window.eval('delete window.Map; delete window.Set; delete window.WeakMap; delete window.WeakSet; delete window.Symbol; delete window.Promise; delete window.Reflect; delete Object.values; delete Object.entries;');
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
