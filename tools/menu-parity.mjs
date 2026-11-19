#!/usr/bin/env node
/* Parity check: the full menu page's data (menu/menu-data.js) and styles (menu/home.css) must equal what
   the homepage's own HTML says right now. Fails (exit 1) on any difference — item ids, category order,
   EN/TH names, descriptions, prices, markers, proteins, tags, photos, add-ons, value sets or wording.
   No dependencies:  node tools/menu-parity.mjs */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readHome, extract, homeCss, renderCss } from "./menu-data.mjs";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readHome();
const want = JSON.parse(JSON.stringify(extract(html))); // plain objects, as the page sees them
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(SITE, "menu", "menu-data.js"), "utf8"), sandbox);
const have = sandbox.window.BB_MENU && JSON.parse(JSON.stringify(sandbox.window.BB_MENU)); // out of the sandbox realm

let failed = 0;
function check(label, fn) {
  try { fn(); console.log("ok   " + label); }
  catch (e) { failed++; console.log("FAIL " + label + "\n     " + String(e.message).split("\n").slice(0, 6).join("\n     ")); }
}
check("menu-data.js exists", () => assert.ok(have, "window.BB_MENU missing"));
if (have) {
  check("category ids and order", () => assert.deepEqual(have.categories.map(c => c.id), want.categories.map(c => c.id)));
  check("category titles EN/TH", () => assert.deepEqual(have.categories.map(c => c.title), want.categories.map(c => c.title)));
  check("item ids and order", () => assert.deepEqual(have.items.map(i => i.category + "/" + i.id), want.items.map(i => i.category + "/" + i.id)));
  check("item names EN/TH", () => assert.deepEqual(have.items.map(i => i.name), want.items.map(i => i.name)));
  check("item descriptions EN/TH", () => assert.deepEqual(have.items.map(i => i.description), want.items.map(i => i.description)));
  check("item prices (as shown)", () => assert.deepEqual(have.items.map(i => i.price), want.items.map(i => i.price)));
  check("markers, proteins, tags", () => assert.deepEqual(have.items.map(i => [i.markers, i.proteins, i.tags]), want.items.map(i => [i.markers, i.proteins, i.tags])));
  check("photos and alt text", () => assert.deepEqual(have.items.map(i => [i.image, i.imageAlt]), want.items.map(i => [i.image, i.imageAlt])));
  check("add-ons, sets title, tax wording", () => assert.deepEqual(have.wording, want.wording));
  check("value sets", () => assert.deepEqual(have.sets, want.sets));
  check("everything else", () => assert.deepEqual(have, want));
  check("homepage row count = data item count", () => assert.equal((html.match(/<li class="mrow"/g) || []).length, have.items.length));
}
check("menu/home.css equals the homepage stylesheet", () => assert.equal(fs.readFileSync(path.join(SITE, "menu", "home.css"), "utf8"), renderCss(homeCss(html))));
console.log(failed ? `\n${failed} check(s) failed — run: node tools/menu-data.mjs` : "\nparity: the full menu page and the homepage menu agree");
process.exit(failed ? 1 : 0);
