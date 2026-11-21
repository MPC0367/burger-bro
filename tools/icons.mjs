// Site icons from media/favicon.svg (21 Nov 2026): /favicon.ico (16, 32, 48), media/icon-192.png and
// /apple-touch-icon.png (180, on the paper colour), so Google's results and phones have a raster icon.
// Run: node tools/icons.mjs   (uses the Suan Zen site's Playwright to draw the SVG)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), site = path.resolve(here, "..");
const { chromium } = await import(path.resolve(site, "../../Suan Zen Omakase/site/node_modules/playwright/index.mjs"));
const svg = fs.readFileSync(path.join(site, "media/favicon.svg"), "utf8");
const br = await chromium.launch();
async function png(size, bg, pad = 0) {
  const pg = await br.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await pg.setContent(`<html><body style="margin:0;background:${bg || "transparent"}"><div style="width:${size}px;height:${size}px;display:grid;place-items:center">${svg.replace("<svg", `<svg width="${size - pad * 2}" height="${size - pad * 2}"`)}</div></body></html>`);
  const b = await pg.screenshot({ omitBackground: !bg, type: "png" });
  await pg.close();
  return b;
}
const ico = async (sizes) => {
  const imgs = await Promise.all(sizes.map((s) => png(s)));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += imgs[i].length;
  });
  return Buffer.concat([head, ...imgs]);
};
fs.writeFileSync(path.join(site, "favicon.ico"), await ico([16, 32, 48]));
fs.writeFileSync(path.join(site, "media/icon-192.png"), await png(192));
fs.writeFileSync(path.join(site, "apple-touch-icon.png"), await png(180, "#F5EEDF", 14));
await br.close();
console.log("favicon.ico, media/icon-192.png, apple-touch-icon.png written");
