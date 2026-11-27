import { firefox, webkit } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const results = [];
for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
  let browser;
  try {
    browser = await engine.launch({ headless: true, timeout: 15000 });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 15000 });
    const result = await page.evaluate(() => ({ rtl: document.documentElement.dir, heading: document.querySelector('h1')?.textContent, noOverflow: document.documentElement.scrollWidth <= innerWidth }));
    if (!result.heading || result.rtl !== 'rtl' || !result.noOverflow) throw new Error('Public rendering assertion failed.');
    await page.screenshot({ path: `test-results/prompt10/screenshots/${name}-public-mobile.png` });
    results.push({ engine: name, status: 'PASS', scope: 'Public anonymous mobile render only', ...result });
  } catch (error) {
    results.push({ engine: name, status: /EPERM|EACCES|Executable doesn't exist/.test(String(error)) ? 'BLOCKED' : 'FAIL', reason: /EPERM/.test(String(error)) ? 'Official launcher subprocess spawn EPERM; no fallback or policy bypass attempted.' : String(error).slice(0, 700) });
  } finally { await browser?.close(); }
}
await writeFile('test-results/prompt10/cross-engine.json', JSON.stringify(results, null, 2));
for (const result of results) console.log(`${result.engine}: ${result.status}${result.reason ? ' — ' + result.reason : ''}`);
if (results.some(r => r.status !== 'PASS')) process.exitCode = 2;
