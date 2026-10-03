import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const baselinePath = process.env.BASELINE_BUNDLE;
assert.ok(baselinePath, 'BASELINE_BUNDLE must point to the verified original build');
const baseline = await readFile(baselinePath, 'utf8');
const candidate = await readFile('dist/html2canvas.js', 'utf8');
const minified = await readFile('dist/html2canvas.min.js', 'utf8');
const browser = await chromium.launch();
try {
    const page = await browser.newPage({viewport: {width: 800, height: 600}, deviceScaleFactor: 1});
    const requests = [];
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        requests.push(url.origin);
        assert.equal(url.origin, 'http://render.test');
        return route.fulfill({contentType: 'text/html', body: `<!doctype html><html><head><style>
            body { margin: 0; background: white; font: 16px Arial, sans-serif; }
            .fixture { box-sizing: border-box; width: 400px; padding: 16px; margin: 8px; }
            #paint { background: linear-gradient(35deg, #f8e2a6, #6aaada); border: 3px solid #35465b;
                border-radius: 14px; box-shadow: 3px 4px 6px #777; }
            #layout { background: #fafafa; border: 2px dashed #6b4097; }
            table { border-collapse: collapse; } td { border: 1px solid #333; padding: 8px; }
            .clip { overflow: hidden; width: 140px; height: 30px; border: 1px solid black; }
            .rotated { transform: rotate(4deg); color: #26374b; }
        </style></head><body>
            <section id="paint" class="fixture"><h2>Rendering 0123</h2><p>Unicode: Привет 世界</p>
                <p style="opacity:.65">Transparency <b>and bold text</b></p>
                <div class="clip"><span style="white-space:nowrap">Clipped text remains clipped across builds</span></div>
            </section>
            <section id="layout" class="fixture"><div class="rotated">Transformed text</div>
                <table><tr><td>Alpha</td><td>Beta</td></tr></table>
                <input value="Synthetic input" aria-label="Synthetic input"><ul><li>One</li><li>Two</li></ul>
            </section>
        </body></html>`});
    });
    await page.goto('http://render.test/');
    await page.evaluate(() => document.fonts.ready);
    const outputs = [];
    for (const source of [baseline, candidate, minified]) {
        await page.addScriptTag({content: source});
        outputs.push(await page.evaluate(async () => {
            const results = [];
            for (const id of ['paint', 'layout']) {
                const canvas = await window.html2canvas(document.getElementById(id), {
                    scale: 1, logging: false, backgroundColor: '#fff'
                });
                results.push({width: canvas.width, height: canvas.height, pixels: canvas.toDataURL('image/png')});
            }
            return results;
        }));
    }
    assert.deepEqual(outputs[1], outputs[0], 'Updated UMD rendering differs from the original build');
    assert.deepEqual(outputs[2], outputs[0], 'Minified rendering differs from the original build');
    assert.ok(requests.every(origin => origin === 'http://render.test'));
    console.log('Two synthetic fixtures match the original build pixel-for-pixel in UMD and minified output');
} finally {
    await browser.close();
}
