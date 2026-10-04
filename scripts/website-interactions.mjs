import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {chromium} from 'playwright';

assert.ok(process.env.BASELINE_SITE, 'Provide the immutable original website build');
const roots = [resolve(process.env.BASELINE_SITE), resolve('www/public')];
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg'};
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || undefined});
try {
    for (const root of roots) {
        for (const width of [1280, 390]) {
            const context = await browser.newContext({viewport: {width, height: 900}, deviceScaleFactor: 1});
            const origin = 'http://website-interaction.test';
            await context.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.origin !== origin) return route.abort();
                let pathname = decodeURIComponent(url.pathname);
                if (pathname.endsWith('/')) pathname += 'index.html';
                const file = resolve(root, '.' + pathname);
                assert.ok(file.startsWith(root + sep));
                try {
                    await route.fulfill({contentType: mime[extname(file)] ?? 'application/octet-stream', body: await readFile(file)});
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                    await route.fulfill({status: 404, body: ''});
                }
            });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            try {
                await page.goto(origin + '/documentation/', {waitUntil: 'networkidle'});
                const menu = page.getByAltText('Menu', {exact: true});
                const configuration = page.getByRole('link', {name: 'Configuration', exact: true});
                if (width < 1000) {
                    assert.equal(await configuration.isVisible(), false);
                    await menu.click();
                    await configuration.waitFor({state: 'visible'});
                    await menu.click();
                    await configuration.waitFor({state: 'hidden'});
                    await menu.click();
                    await configuration.waitFor({state: 'visible'});
                }
                await page.evaluate(() => { window.__navigationFixture = 'retained'; });
                await configuration.click();
                await page.waitForURL(url => /^\/configuration\/?$/.test(url.pathname));
                assert.equal(await page.evaluate(() => window.__navigationFixture), 'retained', 'Gatsby navigation reloaded the document');
                await page.goBack({waitUntil: 'networkidle'});
                await page.waitForURL(url => /^\/documentation\/?$/.test(url.pathname));
                assert.equal(await page.evaluate(() => window.__navigationFixture), 'retained');

                await page.goto(origin + '/', {waitUntil: 'networkidle'});
                await page.getByText('Try it out', {exact: true}).click();
                const capture = page.getByText('Capture', {exact: true});
                await capture.waitFor({state: 'visible'});
                for (let attempt = 0; attempt < 2; attempt++) {
                    await capture.click();
                    await page.waitForFunction(() => {
                        const canvas = document.querySelector('[data-html2canvas-ignore] canvas');
                        return canvas && canvas.width > 0 && canvas.height > 0;
                    });
                    await page.getByAltText('Close', {exact: true}).click();
                    await page.locator('[data-html2canvas-ignore] canvas').waitFor({state: 'detached'});
                }
                assert.deepEqual(errors, [], 'Website emitted browser or hydration errors');
                console.log(`Hydration, menu, navigation/Back and repeated capture pass: ${root} (${width}px)`);
            } finally {
                await context.close();
            }
        }
    }
} finally {
    await browser.close();
}
