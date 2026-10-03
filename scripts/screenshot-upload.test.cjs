const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {test} = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync('tests/screenshot-upload.ts', 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
}).outputText;
const request = {screenshot: 'data:image/png;base64,c3ludGhldGlj', test: '/fixture.html',
    platform: {name: 'fixture', version: '1'}, devicePixelRatio: 1, windowWidth: 800, windowHeight: 600};

function fixture(legacy) {
    const transports = [];
    const timers = [];
    class Transport {
        constructor() { transports.push(this); this.status = legacy ? undefined : 200; }
        open(...args) { this.opened = args; }
        send(body) {
            if (legacy) {
                for (const event of ['onload', 'onerror', 'ontimeout', 'onprogress']) {
                    assert.equal(typeof this[event], 'function', `Missing XDR ${event}`);
                }
                assert.equal(timers.length, 0, 'XDR send must run on the deferred task');
            }
            this.body = body;
        }
    }
    const context = vm.createContext({exports: {}, require,
        XMLHttpRequest: legacy ? class {} : class extends Transport { constructor() { super(); this.withCredentials = false; } },
        window: {XDomainRequest: Transport},
        setTimeout: (callback, delay) => { assert.equal(delay, 0); timers.push(callback); }
    });
    vm.runInContext(source, context);
    return {upload: context.exports.uploadScreenshot, transports,
        flush: () => { while (timers.length) timers.shift()(); }};
}

test('standard screenshot upload sends the unchanged metadata and rejects HTTP failures', async () => {
    const {upload, transports} = fixture(false);
    const success = upload(request);
    assert.equal(transports[0].body, JSON.stringify(request));
    assert.deepEqual(transports[0].opened, ['POST', 'http://localhost:8000/screenshot', true]);
    transports[0].onload();
    await success;
    const failed = upload(request);
    transports[1].status = 500;
    transports[1].onload();
    await assert.rejects(failed, /status 500/);
});

test('legacy upload defers send, installs all events and supports repeated requests', async () => {
    const {upload, transports, flush} = fixture(true);
    for (let index = 0; index < 2; index++) {
        const result = upload(request);
        assert.equal(transports[index].body, undefined);
        flush();
        assert.equal(transports[index].body, JSON.stringify(request));
        transports[index].onprogress();
        transports[index].onload();
        transports[index].onerror(); // Late duplicate events must not change settlement.
        await result;
    }
});

test('legacy network errors, timeout and synchronous send failures reject', async () => {
    const {upload, transports, flush} = fixture(true);
    const error = upload(request);
    flush();
    transports[0].onerror();
    await assert.rejects(error, /Failed to send screenshot/);
    const timeout = upload(request);
    flush();
    transports[1].ontimeout();
    await assert.rejects(timeout, /timed out/);
    const thrown = upload(request);
    transports[2].send = () => { throw new Error('synthetic send failure'); };
    flush();
    await assert.rejects(thrown, /synthetic send failure/);
});
