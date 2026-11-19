#!/usr/bin/env node
/* ============================================================
   Burger Bro — one menu dataset, two presentations.

   The homepage menu in index.html (its HTML rows and the Thai dictionary window.BB_TH) is the
   ONLY place the menu is written. This script reads it and writes, for the full menu page:
     menu/menu-data.js — window.BB_MENU: categories, items, add-ons, value sets, wording (EN + TH)
     menu/home.css     — the homepage's own stylesheet, so rows look exactly the same
   Both files are generated: edit index.html, then run   node tools/menu-data.mjs
   Check they are current with                           node tools/menu-parity.mjs
   No dependencies (Node 18+).
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readHome() { return fs.readFileSync(path.join(SITE, "index.html"), "utf8"); }

/* the Thai dictionary, run in an empty sandbox (it is a plain object literal) */
export function thaiDict(html) {
  const m = html.match(/window\.BB_TH = (\{[\s\S]*?\n\});/);
  if (!m) throw new Error("window.BB_TH not found in index.html");
  return vm.runInNewContext("(" + m[1] + ")", {});
}

function attr(tag, name) {
  const m = tag.match(new RegExp("\\s" + name + "=\"([^\"]*)\""));
  return m ? m[1] : null;
}
function slug(text) {
  return text.toLowerCase().replace(/&amp;/g, "and").replace(/<[^>]+>/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function extract(html) {
  const TH = thaiDict(html);
  const t = (key, en) => ({ en, th: TH[key] != null ? TH[key] : en, thMissing: TH[key] == null });
  const sec = html.slice(html.indexOf('<section class="menu" id="menu"'), html.indexOf("<!-- ============ STORY"));
  if (!sec) throw new Error("menu section not found");

  const one = (re, what) => { const m = sec.match(re); if (!m) throw new Error(what + " not found"); return m; };
  const wording = {};
  for (const k of ["menu.l1", "menu.meta", "menu.addons", "menu.sets", "menu.vat"]) {
    // up to the element's OWN closing tag (the wording can hold inline <b> tags)
    const m = one(new RegExp('<(p|span)[^>]*data-i18n="' + k.replace(".", "\\.") + '">([\\s\\S]*?)</\\1>'), k);
    m[1] = m[2];
    wording[k] = t(k, m[1]);
  }

  // category rail labels, in order
  const rail = [...sec.matchAll(/<li><a href="#([^"]+)" data-i18n="(rail\.g\d)">([\s\S]*?)<\/a><\/li>/g)]
    .map(m => ({ anchor: m[1], key: m[2], label: t(m[2], m[3]) }));

  const categories = [];
  const items = [];
  const groupRe = /<div class="menu-group" id="([^"]+)" data-group="([^"]+)">\s*<h3 class="menu-gtitle mono" data-i18n="([^"]+)">([\s\S]*?)<\/h3>\s*<ul class="menu-list">([\s\S]*?)<\/ul>/g;
  let g;
  while ((g = groupRe.exec(sec))) {
    const [, anchor, id, titleKey, titleEn, body] = g;
    const r = rail.find(x => x.anchor === anchor);
    categories.push({ id, anchor, title: t(titleKey, titleEn), rail: r ? r.label : null, order: categories.length });
    const rowRe = /<li class="mrow"([^>]*)>([\s\S]*?)<\/li>/g;
    let row;
    while ((row = rowRe.exec(body))) {
      const tag = row[1], inner = row[2];
      const nm = inner.match(/<span class="mrow-name"><span data-i18n="([^"]+)">([\s\S]*?)<\/span>([\s\S]*?)<\/span>\s*<span class="mrow-desc"/);
      if (!nm) throw new Error("row name not parsed in " + id);
      const tags = [...nm[3].matchAll(/<i class="(tag[^"]*)" data-i18n="([^"]+)">([\s\S]*?)<\/i>/g)]
        .map(x => ({ key: x[2], cls: x[1], label: t(x[2], x[3]) }));
      const ds = inner.match(/<span class="mrow-desc" data-i18n="([^"]+)">([\s\S]*?)<\/span>/);
      const pr = inner.match(/<span class="mrow-price mono"( data-i18n="([^"]+)")?>([\s\S]*?)<\/span>/);
      if (!ds || !pr) throw new Error("row desc/price not parsed: " + nm[2]);
      const proteins = (attr(" " + tag, "data-protein") || "").split(/\s+/).filter(Boolean);
      const img = attr(" " + tag, "data-img");
      const markers = (ds[2].match(/·\s*((?:[BPC]\s*)+)$/) || [, ""])[1].trim().split(/\s+/).filter(Boolean);
      items.push({
        id: slug(nm[2]),
        key: nm[1].replace(/^m\./, "").replace(/n$/, ""), // a stable short alias, e.g. "b1"
        category: id,
        order: items.length,
        name: t(nm[1], nm[2]),
        description: t(ds[1], ds[2]),
        price: pr[2] ? t(pr[2], pr[3]) : { en: pr[3], th: pr[3], thMissing: false },
        priceBasis: "THB, before 7% VAT",
        markers,              // B / P / C as printed on the board
        proteins,             // from the row's data-protein (written only from the menu's own words)
        tags,
        image: img,           // the 640px file; a -960 copy sits beside it
        imageAlt: img ? { en: nm[2], th: nm[2] } : null // the homepage uses the dish name, which stays English in Thai
      });
    }
  }

  const sets = [...sec.matchAll(/<li class="set-stub([^"]*)"><em class="mono"( data-i18n="([^"]+)")?>([\s\S]*?)<\/em><span data-i18n="([^"]+)">([\s\S]*?)<\/span><b class="mono">([\s\S]*?)<\/b><\/li>/g)]
    .map(m => ({
      id: slug(m[4]),
      label: m[3] ? t(m[3], m[4]) : { en: m[4], th: m[4], thMissing: false },
      name: t(m[5], m[6]),
      price: m[7],
      share: /set-stub-share/.test(m[1])
    }));
  const setsAnchor = (sec.match(/<div class="menu-sets" id="([^"]+)"/) || [])[1];

  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate item ids: " + ids.join(","));
  return { source: "index.html", categories, items, sets, setsAnchor, rail, wording };
}

export function homeCss(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error("<style> not found");
  return m[1];
}

export function render(data) {
  return "/* GENERATED by tools/menu-data.mjs from the homepage menu in index.html — do not edit by hand.\n" +
    "   Run `node tools/menu-data.mjs` after changing the menu; `node tools/menu-parity.mjs` checks it. */\n" +
    "window.BB_MENU = " + JSON.stringify(data, null, 1) + ";\n";
}
export function renderCss(css) {
  return "/* GENERATED by tools/menu-data.mjs: the homepage's own stylesheet (index.html <style>), shared so the\n" +
    "   full menu's rows look exactly like the homepage's. Do not edit by hand. */\n" + css;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = readHome();
  const data = extract(html);
  fs.mkdirSync(path.join(SITE, "menu"), { recursive: true });
  fs.writeFileSync(path.join(SITE, "menu", "menu-data.js"), render(data));
  fs.writeFileSync(path.join(SITE, "menu", "home.css"), renderCss(homeCss(html)));
  console.log(`menu/menu-data.js: ${data.categories.length} categories, ${data.items.length} items, ${data.sets.length} sets` +
    `; Thai missing for ${data.items.filter(i => i.name.thMissing).length} names (they stay English, as on the homepage)`);
  console.log("menu/home.css written");
}
