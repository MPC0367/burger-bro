/* ============================================================
   BURGER BRO! — shared by the homepage (index.html) and the full menu (menu/index.html).
   Loaded as a plain script before first paint. Small on purpose: no map, no story, no arcade.

   BBPrefs  — one validated resolver for the visitor's language and branch:
              a valid value in the address (?lang=, ?branch=) wins, then the saved choice,
              then the default. Invalid values are ignored (normalised to the next source).
              A value from the address is shown but not saved; only a deliberate choice saves.
   BB_BRANCHES — each branch's facts and links. A fact a branch has not confirmed is null
              (the pages then say so); it never borrows the other branch's. The JSON-LD in
              index.html repeats these facts for search engines: keep it in step by hand.
   ============================================================ */
(function (w) {
  "use strict";

  var BRANCHES = [
    { id: "rama9", name: { en: "Rama 9", th: "พระราม 9" },
      short: { en: "443 Rama 9 Soi 49", th: "443 พระราม 9 ซอย 49" },
      lat: 13.7437797, lng: 100.6320785,
      open: "https://maps.google.com/?cid=4340520789969302256",
      dir: "https://www.google.com/maps/dir/?api=1&destination=Burger+Bro%2C+Rama+IX+Soi+49%2C+Suan+Luang%2C+Bangkok",
      embed: "https://maps.google.com/maps?q=Burger+Bro,+Rama+IX+Soi+49,+Suan+Luang,+Bangkok+10250&z=16&output=embed",
      lineman: "https://lin.ee/OyZp7FP",
      grab: "https://app.grab.com/s/olrOpBCF", grabQr: "media/grab-rama9-qr.png", // the shop's own share link, verified
      tel: "+66827938855", telText: "082-793-8855",
      // Asia/Bangkok, minutes from midnight, by weekday (0 = Sunday); a close past 1440 runs past midnight
      hours: [[660, 1440], [660, 1440], [660, 1410], [660, 1440], [660, 1440], [660, 1560], [660, 1560]] },
    { id: "pattanakarn", name: { en: "Pattanakarn", th: "พัฒนาการ" },
      short: { en: "1348 Phatthanakan Rd", th: "1348 ถ.พัฒนาการ" },
      lat: 13.7360497, lng: 100.6234688,
      open: "https://maps.google.com/?cid=12405364053160930417",
      dir: "https://www.google.com/maps/dir/?api=1&destination=Burger+Bro+Pattanakarn%2C+1348+Phatthanakan+Rd%2C+Bangkok",
      embed: "https://maps.google.com/maps?q=Burger+Bro+Pattanakarn,+1348+Phatthanakan+Rd,+Suan+Luang,+Bangkok&z=16&output=embed",
      lineman: "https://lin.ee/nPi5Qzb",
      grab: null, grabQr: null,       // no verified Grab share link yet: the button says it searches
      tel: null, telText: null,       // not confirmed
      hours: null }                   // not confirmed
  ];
  var GRAB_SEARCH = "https://www.grab.com/th/food/";

  var OPTIONS = {
    lang: { values: ["en", "th"], key: "bb-lang", def: "en" },
    branch: { values: BRANCHES.map(function (b) { return b.id; }), key: "bb-branch", def: "rama9" }
  };

  function fromUrl(name, search) {
    try { return new URLSearchParams(search == null ? w.location.search : search).get(name); } catch (e) { return null; }
  }
  function fromStore(key) {
    try { return w.localStorage.getItem(key); } catch (e) { return null; }
  }
  /* resolve(name) -> { value, source: "url" | "saved" | "default" } */
  function resolve(name, search) {
    var o = OPTIONS[name];
    if (!o) throw new Error("unknown preference " + name);
    var u = fromUrl(name, search);
    if (u != null) u = String(u).trim().toLowerCase();
    if (o.values.indexOf(u) > -1) return { value: u, source: "url" };
    var s = fromStore(o.key);
    if (o.values.indexOf(s) > -1) return { value: s, source: "saved" };
    return { value: o.def, source: "default" };
  }
  function save(name, value) {
    var o = OPTIONS[name];
    if (!o || o.values.indexOf(value) < 0) return false;
    try { w.localStorage.setItem(o.key, value); return true; } catch (e) { return false; }
  }
  /* keep the address in step with what is on screen, without adding history steps */
  function toUrl(name, value, isDefault) {
    try {
      var u = new URL(w.location.href);
      if (isDefault) u.searchParams.delete(name); else u.searchParams.set(name, value);
      w.history.replaceState(w.history.state, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }
  /* a link that carries the visitor's language and branch to another page of the site */
  function carry(href, lang, branch) {
    try {
      var u = new URL(href, w.location.href);
      if (lang && lang !== OPTIONS.lang.def) u.searchParams.set("lang", lang); else u.searchParams.delete("lang");
      if (branch && branch !== OPTIONS.branch.def) u.searchParams.set("branch", branch); else u.searchParams.delete("branch");
      return u.href;
    } catch (e) { return href; }
  }
  function branchIndex(id) {
    for (var i = 0; i < BRANCHES.length; i++) if (BRANCHES[i].id === id) return i;
    return -1;
  }
  /* Asia/Bangkok (UTC+7, no daylight saving): open now / closes soon from a branch's hours */
  function openState(hours, at) {
    if (!hours) return null;
    var bkk = new Date((at ? at.getTime() : Date.now()) + 7 * 3600000);
    var day = bkk.getUTCDay(), m = bkk.getUTCHours() * 60 + bkk.getUTCMinutes();
    var today = hours[day], prev = hours[(day + 6) % 7];
    var close = -1;
    if (prev[1] > 1440 && m < prev[1] - 1440) close = prev[1] - 1440;   // still in last night's late opening
    else if (m >= today[0] && m < today[1]) close = today[1];
    function hm(x) { x = x % 1440; return (x < 600 ? "0" : "") + Math.floor(x / 60) + ":" + (x % 60 < 10 ? "0" : "") + (x % 60); }
    if (close > -1) return { state: close - m <= 60 ? "soon" : "open", at: close === 1440 ? "24:00" : hm(close) };
    return { state: "closed", at: hm(m < today[0] ? today[0] : hours[(day + 1) % 7][0]) };
  }

  w.BBPrefs = { resolve: resolve, save: save, toUrl: toUrl, carry: carry, options: OPTIONS };
  w.BB_BRANCHES = BRANCHES;
  w.BBSite = { branchIndex: branchIndex, openState: openState, GRAB_SEARCH: GRAB_SEARCH };

  /* bbTrack(name, props) — privacy-aware events. Does nothing at all unless window.BB_ANALYTICS_URL
     is set (it is not, today). Then it sends {name, props, t} with navigator.sendBeacon.
     Only branch, provider, locale and device (phone | tablet | desktop) ever leave the page:
     never a phone number, a name, a username, a code or anything typed. */
  w.bbTrack = function (name, props) {
    var url = w.BB_ANALYTICS_URL;
    if (!url || !navigator.sendBeacon || typeof name !== "string") return false;
    var allow = { branch: 1, provider: 1, locale: 1, device: 1 }, clean = {};
    props = props || {};
    for (var k in props) if (allow[k] && typeof props[k] === "string") clean[k] = props[k].slice(0, 32);
    if (!clean.locale) clean.locale = document.documentElement.lang === "th" ? "th" : "en";
    if (!clean.device) { var vw = w.innerWidth; clean.device = vw < 600 ? "phone" : vw < 1025 ? "tablet" : "desktop"; }
    try {
      return navigator.sendBeacon(url, new Blob([JSON.stringify({ name: name.slice(0, 40), props: clean, t: Date.now() })], { type: "application/json" }));
    } catch (e) { return false; }
  };

  /* before first paint: the language on <html> (the canonical follows a Thai address) */
  var L = resolve("lang");
  document.documentElement.lang = L.value;
  if (L.source === "url" && L.value === "th") {
    var c = document.getElementById("canonical");
    if (c && c.getAttribute("data-th")) c.href = c.getAttribute("data-th");
  }
})(window);
