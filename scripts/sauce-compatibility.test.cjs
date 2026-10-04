const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createRequire} = require('node:module');
const {dirname} = require('node:path');
const {EventEmitter} = require('node:events');
const vm = require('node:vm');
const {test} = require('node:test');

// Load the installed SDK with every HTTP, download and child-process boundary
// replaced. These tests never contact Sauce, download a binary or use provider credentials.
function fixture() {
    const launcherRequire = createRequire(require.resolve('karma-sauce-launcher/package.json'));
    const filename = launcherRequire.resolve('saucelabs');
    const sdkRequire = createRequire(filename);
    const constants = sdkRequire('./constants');
    const calls = [];
    const child = {pid: 123, stdout: new EventEmitter(), stderr: new EventEmitter()};
    const api = async (url, options) => {
        calls.push({url, options});
        return {body: {ok: true}, headers: {'content-type': 'application/json'}};
    };
    for (const method of ['get', 'put', 'post', 'patch', 'delete']) api[method] = api;
    const got = {extend: () => api};
    const isolatedProcess = {env: {}, on: () => {}, cwd: () => process.cwd(), kill: (pid, signal) => {
        assert.equal(pid, child.pid);
        assert.equal(signal, 'SIGINT');
        setImmediate(() => child.stdout.emit('data', Buffer.from(constants.SC_CLOSE_MESSAGE)));
    }};
    const overrides = {
        got,
        child_process: {spawn: (path, args) => {
            calls.push({path, args});
            setImmediate(() => child.stdout.emit('data', Buffer.from(constants.SC_READY_MESSAGE)));
            return child;
        }},
        './constants': {...constants, DEFAULT_OPTIONS: {region: 'us', headers: {}}},
        './sauceConnectLoader': class {
            constructor(options) { this.path = '/synthetic/sauce-connect'; calls.push({loader: options}); }
            async verifyAlreadyDownloaded() { calls.push({verified: true}); }
        }
    };
    const module = {exports: {}};
    const context = {module, exports: module.exports, require: name => name in overrides ? overrides[name] : sdkRequire(name),
        __filename: filename, __dirname: dirname(filename), process: isolatedProcess, Buffer, console, setTimeout, clearTimeout};
    vm.runInNewContext(readFileSync(filename, 'utf8'), context, {filename});
    const client = new module.exports.default({user: 'synthetic-user', key: 'synthetic-key', region: 'us'});
    return {client, calls};
}

test('patched Sauce SDK keeps the launcher job-update and asset APIs without network access', async () => {
    const {client, calls} = fixture();
    for (const method of ['updateJob', 'downloadJobAsset', 'uploadJobAssets', 'startSauceConnect']) assert.equal(typeof client[method], 'function', method);
    await client.updateJob('synthetic-user', 'synthetic-job', {passed: true});
    assert.match(calls[0].url, /synthetic-user.*synthetic-job/);
    assert.equal(calls[0].options.json.passed, true);
    const asset = await client.downloadJobAsset('synthetic-job', 'log.json');
    assert.equal(asset.ok, true);
    assert.match(calls[1].url, /synthetic-job\/log\.json/);
    await client.uploadJobAssets('synthetic-job', {files: [{filename:'log.json', data: {synthetic:true}}]});
    assert.match(calls[2].options.body.getBuffer().toString(), /synthetic/);
});

test('patched SDK preserves the Sauce Connect 4 tunnel identifier and close lifecycle', async () => {
    const {client, calls} = fixture();
    const tunnel = await client.startSauceConnect({scVersion:'4.9.1', tunnelIdentifier:'synthetic-tunnel', logger:()=>{}});
    const spawn = calls.find(call => call.path);
    assert.equal(spawn.path, '/synthetic/sauce-connect');
    assert.ok(spawn.args.includes('--tunnel-name=synthetic-tunnel'));
    assert.ok(spawn.args.includes('--user=synthetic-user'));
    assert.ok(spawn.args.includes('--api-key=synthetic-key'));
    assert.equal(calls.find(call => call.loader).loader.sauceConnectVersion, '4.9.1');
    await tunnel.close();
});
