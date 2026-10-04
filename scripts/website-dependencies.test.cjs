const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {resolve} = require('node:path');
const {test} = require('node:test');
const siteRequire = createRequire(resolve('www/package.json'));

test('Gatsby 5 removes the retired URL parser and GraphQL download-loader vulnerability paths', () => {
    const packages = Object.keys(require('../www/package-lock.json').packages);
    for (const name of ['git-up', 'parse-url', '@graphql-tools/url-loader', 'contentful-management']) {
        assert.equal(packages.some(path => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`), false, name);
    }
});

test('current development helpers retain diagnostics and safe argument quoting', () => {
    const format = siteRequire('react-dev-utils/formatWebpackMessages');
    const messages = format({errors: ['sample.js\nSyntaxError: synthetic failure'], warnings: ['synthetic warning']});
    assert.equal(messages.errors.length, 1);
    assert.equal(messages.warnings.length, 1);
    assert.match(messages.errors[0], /synthetic failure/);
    assert.equal(typeof siteRequire('react-dev-utils/launchEditor'), 'function');
    const utilsRequire = createRequire(siteRequire.resolve('react-dev-utils/package.json'));
    const shell = utilsRequire('shell-quote');
    const values = ['file with spaces.js', 'quote"and\'apostrophe', 'literal$variable', 'semicolon;data'];
    assert.deepEqual(shell.parse(shell.quote(values)), values);
});

test('website multipart data cannot inject headers', () => {
    const FormData = siteRequire('form-data');
    const data = new FormData();
    data.append('field\r\nInjected-Field: value', Buffer.from('synthetic'), {filename: 'file\r\nInjected-File: value.txt'});
    const buffer = data.getBuffer();
    assert.equal(data.getLengthSync(), buffer.length);
    assert.equal(buffer.toString().includes('\r\nInjected-Field:'), false);
    assert.equal(buffer.toString().includes('\r\nInjected-File:'), false);
});
