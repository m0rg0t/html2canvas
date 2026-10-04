import assert from 'node:assert/strict';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {resolve, relative, join, extname, sep} from 'node:path';
import {chromium} from 'playwright';

assert.ok(process.env.BASELINE_SITE, 'BASELINE_SITE must point to the original static website build');
const roots = [resolve(process.env.BASELINE_SITE), resolve('www/public')];
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2'};
async function routes(root, folder = root) {
    const result = [];
    if (/^tests[\/](reftests|assets)([\/]|$)/.test(relative(root, folder))) return result;
    for (const entry of await readdir(folder, {withFileTypes: true})) {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) result.push(...await routes(root, path));
        else if (entry.name === 'index.html') result.push('/' + relative(root, folder).split(sep).filter(Boolean).join('/') + (folder === root ? '' : '/'));
    }
    return result.sort();
}
const pages = await routes(roots[0]);
assert.ok(pages.length >= 9);
assert.deepEqual(await routes(roots[1]), pages, 'Website routes changed');
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || undefined});
const blocked = new Set();
try {
    for (const width of [1280, 390]) {
        for (const routePath of pages) {
            const outputs = [];
            for (let index = 0; index < roots.length; index++) {
                const origin = `http://site-${index}.test`;
                const context = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: 1, colorScheme: 'light'});
                await context.route('**/*', async route => {
                    const url = new URL(route.request().url());
                    if (url.origin !== origin) { blocked.add(url.origin); return route.abort(); }
                    let pathname = decodeURIComponent(url.pathname);
                    if (pathname.endsWith('/')) pathname += 'index.html';
                    const file = resolve(roots[index], '.' + pathname);
                    assert.ok(file.startsWith(roots[index] + sep));
                    try {
                        await route.fulfill({contentType: mime[extname(file)] ?? 'application/octet-stream', body: await readFile(file)});
                    } catch (error) {
                        if (error.code !== 'ENOENT') throw error;
                        await route.fulfill({status: 404, body: ''});
                    }
                });
                const page = await context.newPage();
                await page.goto(origin + routePath, {waitUntil: 'networkidle'});
                await page.evaluate(() => document.fonts.ready);
                if (routePath === '/tests/') {
                    await page.waitForFunction(() => document.querySelector('#test_selector')?.options.length > 0);
                    await page.locator('#test_selector').selectOption({index: 1});
                    await page.waitForFunction(() => document.querySelector('#preview_image')?.naturalWidth > 0);
                }
                // This generated build statistic legitimately changes with the library bundle.
                const size = page.getByText(/^\d+kb gzipped$/, {exact: true});
                if (routePath === '/') {
                    assert.equal(await size.count(), 1);
                    await size.evaluate(element => { element.textContent = '[bundle size]kb gzipped'; });
                }
                const content = await page.evaluate(() => ({
                    title: document.title,
                    text: document.body.innerText,
                    links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
                }));
                outputs.push({content, pixels: await page.screenshot({fullPage: true, animations: 'disabled'})});
                await context.close();
            }
            const directory = 'test-results/website';
            await mkdir(directory, {recursive: true});
            const name = `${width}-${routePath.replaceAll('/', '_')}`;
            await writeFile(`${directory}/${name}-baseline.png`, outputs[0].pixels);
            await writeFile(`${directory}/${name}-candidate.png`, outputs[1].pixels);
            await writeFile(`${directory}/${name}-content.json`, JSON.stringify(outputs.map(output => output.content), null, 2));
            assert.deepEqual(outputs[1].content, outputs[0].content, `Content/links differ at ${routePath} (${width}px)`);
            assert.ok(outputs[1].pixels.equals(outputs[0].pixels), `Website pixels differ at ${routePath} (${width}px); diagnostics saved in ${directory}`);
            console.log(`Website content and pixels match: ${routePath} (${width}px)`);
        }
    }
    console.log(`Verified ${pages.length} routes at two widths; external analytics/ads/fonts requests were blocked (${blocked.size} origins)`);
} finally {
    await browser.close();
}
