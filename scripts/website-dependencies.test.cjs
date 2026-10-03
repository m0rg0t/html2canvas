const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {resolve} = require('node:path');
const {test} = require('node:test');
const siteRequire = createRequire(resolve('www/package.json'));

test('Gatsby telemetry URL normalization keeps the used repository fields', () => {
    const parse = siteRequire('git-up');
    for (const url of ['https://github.com/example/repo.git', 'git@github.com:example/repo.git',
        'ssh://git@github.com/example/repo.git', 'git+https://github.com/example/repo.git']) {
        const parsed = parse(url);
        assert.equal(parsed.resource, 'github.com');
        assert.equal(parsed.pathname.replace(/^\//, ''), 'example/repo.git');
    }
});

test('patched development helpers retain Webpack 4 diagnostics and argument quoting', () => {
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

test('GraphQL loader multipart data cannot inject headers', () => {
    const loaderRequire = createRequire(siteRequire.resolve('@graphql-tools/url-loader'));
    const FormData = loaderRequire('form-data');
    const data = new FormData();
    data.append('field\r\nInjected-Field: value', Buffer.from('synthetic'), {filename: 'file\r\nInjected-File: value.txt'});
    const buffer = data.getBuffer();
    assert.equal(data.getLengthSync(), buffer.length);
    assert.equal(buffer.toString().includes('\r\nInjected-Field:'), false);
    assert.equal(buffer.toString().includes('\r\nInjected-File:'), false);
});
