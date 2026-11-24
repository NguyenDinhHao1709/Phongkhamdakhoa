// Xuất ảnh PNG từ file .bpmn bằng bpmn-js chạy trong Chrome headless.
// Dùng: cd docs/bpmn/tools && npm install && node render.mjs ../01_kham_benh_truc_tiep.bpmn ../01_kham_benh_truc_tiep.png
// Đổi CHROME_PATH nếu Chrome cài ở chỗ khác.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const [, , inFile, outFile] = process.argv;
const xml = readFileSync(inFile, 'utf8');
const dist = resolve(dirname(fileURLToPath(import.meta.url)), 'node_modules/bpmn-js/dist');

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
await page.setContent('<html><body style="margin:0;background:#fff"><div id="c" style="width:100vw;height:100vh"></div></body></html>');
await page.addStyleTag({ content: readFileSync(`${dist}/assets/diagram-js.css`, 'utf8') + readFileSync(`${dist}/assets/bpmn-js.css`, 'utf8') });
await page.addScriptTag({ content: readFileSync(`${dist}/bpmn-viewer.production.min.js`, 'utf8') });

const res = await page.evaluate(async (xml) => {
  const viewer = new BpmnJS({ container: '#c' });
  const { warnings } = await viewer.importXML(xml);
  const { svg } = await viewer.saveSVG();
  return { svg, warnings: warnings.map((w) => w.message) };
}, xml);
if (res.warnings.length) console.log('WARN', res.warnings);

const m = res.svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
const [w, h] = [Math.ceil(+m[3]), Math.ceil(+m[4])];
await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;background:#fff">${res.svg}</body></html>`);
await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: w, height: h } });
await browser.close();
console.log('png', w, 'x', h);
