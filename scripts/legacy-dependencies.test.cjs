const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {test} = require('node:test');
const requestRequire = createRequire(require.resolve('request/package.json'));
const FormData = requestRequire('form-data');

test('the proxy request client uses the compatible patched multipart implementation', () => {
    assert.equal(requestRequire('form-data/package.json').version, '2.5.6');
    const form = new FormData();
    form.append('ordinary', 'synthetic value');
    const buffer = form.getBuffer();
    assert.equal(form.getLengthSync(), buffer.length);
    assert.match(buffer.toString(), /name="ordinary"\r\n\r\nsynthetic value/);
});

test('multipart field and filename input cannot inject additional headers', () => {
    const form = new FormData();
    form.append('field\r\nInjected-Field: yes', Buffer.from('fixture'), {
        filename: 'fixture\r\nInjected-File: yes.txt'
    });
    const text = form.getBuffer().toString();
    assert.equal(text.includes('\r\nInjected-Field:'), false);
    assert.equal(text.includes('\r\nInjected-File:'), false);
    assert.match(text, /fixture/);
});
