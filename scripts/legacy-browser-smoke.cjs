const assert = require('node:assert/strict');
const http = require('node:http');
const {Chromeless} = require('chromeless');

async function main() {
    const server = http.createServer((_request, response) => {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('<!doctype html><title>Local dependency fixture</title><p id="result">Synthetic only</p>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const timeout = setTimeout(() => { console.error('Legacy browser smoke exceeded 60 seconds'); process.exit(1); }, 60000);
    timeout.unref();
    console.log('Starting patched local Chrome launcher/CDP fixture');
    const browser = new Chromeless({remote: false, debug: true, waitTimeout: 10000, viewport: {width: 800, height: 600}});
    try {
        const value = await browser.goto(`http://127.0.0.1:${server.address().port}/`).evaluate(() => ({
            title: document.title,
            text: document.getElementById('result').textContent
        }));
        console.log('Navigation and evaluation returned');
        assert.deepEqual(value, {title: 'Local dependency fixture', text: 'Synthetic only'});
        console.log('Retained Chromeless goto/evaluate/end API passes with patched launcher and current CDP transport');
    } finally {
        console.log('Closing local Chrome session');
        await browser.end();
        clearTimeout(timeout);
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
