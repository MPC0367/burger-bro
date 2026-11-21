/* ============================================================
   BURGER BRO! — the full menu page (menu/index.html).
   Data: window.BB_MENU (menu-data.js, generated from the homepage's own menu HTML).
   Context: window.BBPrefs / BB_BRANCHES (../shared/site.js) — the same language and branch
   resolver as the homepage. This page loads no map, no burger sequence and no arcade
   (the arcade is imported only if a "Win a coupon" button is pressed).
   State in the address, so it can be shared and Back/Forward restores it:
     ?q=   search (live edits replace the entry)      ?cat=  category id
     ?protein= beef | pork | chicken | seafood         ?item= the open detail view
     ?branch= rama9 | pattanakarn                      ?lang= en | th
   ============================================================ */
(function () {
  "use strict";
  var M = window.BB_MENU, P = window.BBPrefs, BR = window.BB_BRANCHES, S = window.BBSite;
  if (!M || !P || !BR) return;
  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (e) { reduceMotion = e.matches; });

  var UI = {
    en: {
      skip: "Skip to content", brand: "Burger Bro — home", primary: "Primary", navBro: "The Bro", navMenu: "Menu", navStory: "The Shop", navFind: "Find us",
      win: "Win a coupon", order: "Order", orderNow: "Order now", back: "← Back to Burger Bro", title: "THE MENU",
      menuFor: "Ordering from", search: "Search menu", searchPh: "Burger, fries, shake…", protein: "Protein", reset: "Reset filters", cats: "Menu categories", all: "All",
      pAll: "All", beef: "Beef", pork: "Pork", chicken: "Chicken", seafood: "Fish & shrimp",
      count: function (n, t) { return n === t ? t + " items" : n + " of " + t + " items"; },
      empty: function (q) { return (q ? "Nothing on the menu matches “" + q + "”" : "Nothing on the menu matches these filters") + ". Try another word or a different category — or reset the filters to see everything."; },
      photo: "View photo", details: "Details", close: "Close", orderThis: "Order this",
      orderThisNote: "You choose it again in the delivery app — nothing is added for you here.",
      pick: function (n) { return "Find " + n + " in the delivery app and add it there — nothing is added for you from this site."; },
      orderTitle: "ORDER FROM YOUR BRO.", orderFor: function (b) { return "ORDERING FROM " + b.name.en.toUpperCase() + " · " + b.short.en.toUpperCase(); },
      lineman: "Order on LINE MAN", grab: "Order on GrabFood", grabFind: function (b) { return "Find " + b.name.en + " on Grab"; },
      grabNote: function (b) { return "No Grab link for " + b.name.en + " yet — the button opens Grab; search “Burger Bro " + b.name.en + "” there. LINE MAN goes straight to the branch. Phone not confirmed yet."; },
      handoff: "The order button takes you to the delivery app; you choose your food and pay there, not on this site.",
      more: "Call, walk in or see the map →", grabTitle: "Scan to order on GrabFood", grabQr: "QR code that opens this branch in the Grab app",
      grabP: "GrabFood orders happen in the Grab app. Point your phone's camera at the code and the shop opens in Grab.", grabLink: "Open the link here instead",
      copy: "© 2026 BURGER BRO — SALT &amp; LIGHT CO., LTD · RAMA 9, BANGKOK",
      disc: "CONCEPT REDESIGN · MENU &amp; PRICES FROM THE RAMA 9 BOARD, BEFORE 7% VAT — CONFIRM IN STORE",
      proteins: "Proteins", photoOf: "Photo of ", arcadeFail: "The arcade isn't available right now.", priceNote: "THB · before 7% VAT"
    },
    th: {
      skip: "ข้ามไปยังเนื้อหา", brand: "Burger Bro — หน้าแรก", primary: "เมนูหลัก", navBro: "เดอะโบร", navMenu: "เมนู", navStory: "ร้านของเรา", navFind: "มาหาเรา",
      win: "ลุ้นรับคูปอง", order: "สั่งเลย", orderNow: "สั่งเลยตอนนี้", back: "← กลับไปหน้า Burger Bro", title: "เมนู",
      menuFor: "สั่งจากสาขา", search: "ค้นหาเมนู", searchPh: "เบอร์เกอร์ เฟรนช์ฟรายส์ เชค…", protein: "เนื้อสัตว์", reset: "ล้างตัวกรอง", cats: "หมวดเมนู", all: "ทั้งหมด",
      pAll: "ทั้งหมด", beef: "เนื้อวัว", pork: "หมู", chicken: "ไก่", seafood: "ปลา & กุ้ง",
      count: function (n, t) { return n === t ? "ทั้งหมด " + t + " รายการ" : "แสดง " + n + " จาก " + t + " รายการ"; },
      empty: function (q) { return (q ? "ไม่มีเมนูไหนตรงกับ “" + q + "”" : "ไม่มีเมนูไหนตรงกับตัวกรองนี้") + " ลองคำอื่นหรือหมวดอื่นดู หรือล้างตัวกรองเพื่อดูทั้งหมด"; },
      photo: "ดูรูป", details: "รายละเอียด", close: "ปิด", orderThis: "สั่งเมนูนี้",
      orderThisNote: "ต้องเลือกเมนูนี้อีกครั้งในแอปเดลิเวอรี — เว็บนี้ไม่ได้ใส่ตะกร้าให้",
      pick: function (n) { return "เลือก " + n + " ในแอปเดลิเวอรีอีกครั้งนะ — เว็บนี้ไม่ได้ใส่ให้ในตะกร้า"; },
      orderTitle: "สั่งจากโบรของคุณ", orderFor: function (b) { return "สั่งจากสาขา" + b.name.th + " · " + b.short.th; },
      lineman: "สั่งผ่าน LINE MAN", grab: "สั่งผ่าน GRABFOOD", grabFind: function (b) { return "หาสาขา" + b.name.th + "ใน GRAB"; },
      grabNote: function (b) { return "ยังไม่มีลิงก์ GRAB ของสาขา" + b.name.th + " — ปุ่มจะเปิดหน้า GRAB ให้ค้นหา “BURGER BRO " + b.name.en.toUpperCase() + "” เอง ส่วน LINE MAN พาไปที่สาขาโดยตรง · ยังไม่ได้ยืนยันเบอร์โทร"; },
      handoff: "ปุ่มสั่งจะพาไปที่แอปเดลิเวอรี เลือกเมนูและจ่ายเงินในแอปนั้น ไม่ได้สั่งผ่านเว็บนี้",
      more: "โทร เดินเข้าร้าน หรือดูแผนที่ →", grabTitle: "สแกนเพื่อสั่งผ่าน GrabFood", grabQr: "คิวอาร์โค้ดสำหรับเปิดสาขานี้ในแอป Grab",
      grabP: "การสั่ง GrabFood ทำในแอป Grab เปิดกล้องมือถือส่องโค้ดนี้ แล้วร้านจะเปิดขึ้นในแอป Grab", grabLink: "เปิดลิงก์ในเครื่องนี้แทน",
      copy: "© 2026 BURGER BRO — บริษัท ซอล์ท แอนด์ ไลท์ จำกัด · พระราม 9 กรุงเทพฯ",
      disc: "งานออกแบบคอนเซปต์ · เมนูและราคาจากบอร์ดสาขาพระราม 9 ยังไม่รวม VAT 7% — เช็กที่ร้านอีกครั้ง",
      proteins: "เนื้อสัตว์", photoOf: "รูป ", arcadeFail: "ตอนนี้ยังเล่นเกมไม่ได้ ลองใหม่ภายหลังนะ", priceNote: "บาท · ยังไม่รวม VAT 7%"
    }
  };
  var PROTEINS = ["beef", "pork", "chicken", "seafood"].filter(function (p) { // only the proteins the data really has
    return M.items.some(function (i) { return i.proteins.indexOf(p) > -1; });
  });
  var CAT_IDS = M.categories.map(function (c) { return c.id; }).concat(["sets"]);

  /* ---- state from the address (validated; anything unknown is dropped) */
  var state = { lang: "en", branch: "rama9", q: "", cat: "", protein: "", item: "" };
  function readUrl() {
    var u = new URLSearchParams(window.location.search);
    state.lang = P.resolve("lang").value;
    state.branch = P.resolve("branch").value;
    state.q = (u.get("q") || "").slice(0, 60);
    state.cat = CAT_IDS.indexOf(u.get("cat")) > -1 ? u.get("cat") : "";
    state.protein = PROTEINS.indexOf(u.get("protein")) > -1 ? u.get("protein") : "";
    var it = u.get("item");
    state.item = M.items.some(function (i) { return i.id === it; }) ? it : "";
  }
  function writeUrl(push) {
    var u = new URL(window.location.href);
    [["q", state.q], ["cat", state.cat], ["protein", state.protein], ["item", state.item]].forEach(function (kv) {
      if (kv[1]) u.searchParams.set(kv[0], kv[1]); else u.searchParams.delete(kv[0]);
    });
    var next = u.pathname + u.search + u.hash;
    if (next === window.location.pathname + window.location.search + window.location.hash) return;
    if (push) window.history.pushState({ bbMenu: 1 }, "", next); else window.history.replaceState(window.history.state, "", next);
  }

  function L() { return UI[state.lang]; }
  function txt(o) { return o ? (o[state.lang] != null ? o[state.lang] : o.en) : ""; }
  function plain(html) { var d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function track(n, p) { try { if (window.bbTrack) window.bbTrack(n, p || {}); } catch (e) {} }

  /* ---- build the rows once, with the homepage's own row markup and classes */
  var groupsBox = document.getElementById("mpGroups");
  var rows = [];
  M.categories.forEach(function (c) {
    var g = el("div", "menu-group");
    g.id = c.anchor;
    g.setAttribute("data-group", c.id);
    var h = el("h2", "menu-gtitle mono");
    g.appendChild(h);
    var ul = el("ul", "menu-list");
    g.appendChild(ul);
    groupsBox.appendChild(g);
    c.__el = g; c.__h = h;
    M.items.filter(function (i) { return i.category === c.id; }).forEach(function (it) {
      var li = el("li", "mrow");
      li.id = "item-" + it.id;
      var name = el("span", "mrow-name");
      var nm = el("span", null);
      nm.id = "nm-" + it.id;
      name.appendChild(nm);
      var tags = it.tags.map(function (t) { var i = el("i", t.cls); name.appendChild(i); return i; });
      var btn = el("button", "mrow-view");
      btn.type = "button";
      btn.id = "vw-" + it.id;
      btn.setAttribute("aria-haspopup", "dialog");
      btn.setAttribute("aria-labelledby", btn.id + " " + nm.id);
      btn.addEventListener("click", function () { openItem(it, btn, true); });
      name.appendChild(btn);
      var desc = el("span", "mrow-desc"), price = el("span", "mrow-price mono");
      li.appendChild(name); li.appendChild(desc); li.appendChild(price);
      ul.appendChild(li);
      rows.push({ it: it, li: li, nm: nm, tags: tags, desc: desc, price: price, btn: btn, group: c });
    });
  });

  /* ---- words */
  function paintWords() {
    var l = L(), lang = state.lang;
    docEl.lang = lang;
    document.body.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-t]").forEach(function (e) { var v = l[e.getAttribute("data-t")]; if (typeof v === "string") e.innerHTML = v; });
    document.querySelectorAll("[data-t-aria]").forEach(function (e) { var v = l[e.getAttribute("data-t-aria")]; if (typeof v === "string") e.setAttribute("aria-label", v); });
    document.getElementById("mpQ").placeholder = l.searchPh;
    document.getElementById("mpMeta").innerHTML = txt(M.wording["menu.meta"]);
    document.getElementById("mpAddons").innerHTML = txt(M.wording["menu.addons"]);
    document.getElementById("mpSetsT").innerHTML = txt(M.wording["menu.sets"]);
    document.getElementById("mpVat").innerHTML = txt(M.wording["menu.vat"]);
    var lb = document.getElementById("langBtn");
    lb.querySelectorAll(".lang-opt").forEach(function (o) { o.classList.toggle("is-on", o.getAttribute("data-l") === lang); });
    lb.setAttribute("aria-label", lang === "th" ? "Switch to English — เปลี่ยนเป็นภาษาอังกฤษ" : "เปลี่ยนเป็นภาษาไทย — switch language");
    P.head(lang); // title, description, sharing lines and canonical in this language (../shared/site.js)
    M.categories.forEach(function (c) { c.__h.innerHTML = txt(c.title); });
    rows.forEach(function (r) {
      var it = r.it;
      r.nm.innerHTML = txt(it.name);
      if (lang === "th" && it.name.thMissing) r.nm.lang = "en"; else r.nm.removeAttribute("lang"); // the dish names stay English, as on the board
      r.tags.forEach(function (t, k) { t.innerHTML = txt(it.tags[k].label); });
      r.desc.innerHTML = txt(it.description);
      r.price.innerHTML = txt(it.price);
      r.btn.textContent = it.image ? l.photo : l.details;
    });
    paintSets();
    paintCats();
    paintChips();
    paintBranch();
    paintCount();
    document.querySelectorAll("[data-carry]").forEach(function (a) { a.href = P.carry(a.getAttribute("data-carry"), lang, state.branch); });
    if (lastPick) paintPick();
  }
  var setsBox = document.getElementById("mpSets");
  var setEls = M.sets.map(function (s) {
    var li = el("li", "set-stub" + (s.share ? " set-stub-share" : ""));
    var em = el("em", "mono"), sp = el("span"), b = el("b", "mono", s.price);
    li.appendChild(em); li.appendChild(sp); li.appendChild(b);
    setsBox.appendChild(li);
    return { s: s, li: li, em: em, sp: sp };
  });
  function paintSets() { setEls.forEach(function (x) { x.em.innerHTML = txt(x.s.label); x.sp.innerHTML = txt(x.s.name); }); }

  /* ---- category navigation (buttons that choose a category; the homepage rail's look) */
  var catsBox = document.getElementById("mpCats");
  var catBtns = [{ id: "", label: null }].concat(M.categories.map(function (c) { return { id: c.id, label: c.rail || c.title }; }))
    .concat([{ id: "sets", label: (M.rail.filter(function (r) { return r.anchor === M.setsAnchor; })[0] || {}).label }])
    .map(function (c) {
      var li = el("li"), b = el("button", "mp-cat");
      b.type = "button";
      b.addEventListener("click", function () { state.cat = c.id; state.item = ""; apply(true); });
      li.appendChild(b); catsBox.appendChild(li);
      return { c: c, b: b };
    });
  function paintCats() {
    catBtns.forEach(function (x) {
      x.b.innerHTML = x.c.id ? txt(x.c.label) : L().all;
      x.b.setAttribute("aria-pressed", String(state.cat === x.c.id));
    });
  }
  /* ---- protein filter (only proteins present in the data) */
  var chipsBox = document.querySelector(".mp-chips");
  var chipBtns = [""].concat(PROTEINS).map(function (p) {
    var b = el("button", "mp-chip");
    b.type = "button";
    b.addEventListener("click", function () { state.protein = p; apply(true); });
    chipsBox.appendChild(b);
    return { p: p, b: b };
  });
  function paintChips() {
    chipBtns.forEach(function (x) {
      x.b.textContent = x.p ? L()[x.p] : L().pAll;
      x.b.setAttribute("aria-pressed", String(state.protein === x.p));
    });
  }

  /* ---- search: visible text in both languages, plus each dish's stable id and short alias */
  function norm(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
  rows.forEach(function (r) {
    var it = r.it;
    r.hay = norm([plain(it.name.en), plain(it.name.th), plain(it.description.en), plain(it.description.th), it.id.replace(/-/g, " "), it.key,
      it.tags.map(function (t) { return plain(t.label.en) + " " + plain(t.label.th); }).join(" "),
      it.proteins.map(function (p) { return UI.en[p] + " " + UI.th[p]; }).join(" ")].join(" "));
  });
  setEls.forEach(function (x) { x.hay = norm([plain(x.s.label.en), plain(x.s.label.th), plain(x.s.name.en), plain(x.s.name.th), x.s.id].join(" ")); });
  var shown = 0;
  function apply(push) {
    var words = norm(state.q).split(" ").filter(Boolean);
    shown = 0;
    var anyInGroup = {};
    rows.forEach(function (r) {
      var ok = (!state.cat || state.cat === r.it.category) &&
        (!state.protein || r.it.proteins.indexOf(state.protein) > -1) &&
        words.every(function (w) { return r.hay.indexOf(w) > -1; });
      r.li.hidden = !ok;
      if (ok) { shown++; anyInGroup[r.it.category] = true; }
    });
    M.categories.forEach(function (c) { c.__el.hidden = !anyInGroup[c.id]; });
    // value sets: shown for All or Value sets, filtered by the search, not by protein (sets name no meat)
    var setsVisible = 0;
    setEls.forEach(function (x) {
      var ok = (!state.cat || state.cat === "sets") && !state.protein && words.every(function (w) { return x.hay.indexOf(w) > -1; });
      x.li.hidden = !ok; if (ok) setsVisible++;
    });
    document.getElementById("menu-sets").hidden = setsVisible === 0;
    document.getElementById("mpEmpty").hidden = shown + setsVisible > 0;
    document.getElementById("mpEmptyP").textContent = L().empty(state.q.trim());
    document.getElementById("mpReset").disabled = !(state.q || state.cat || state.protein);
    paintCats(); paintChips(); paintCount();
    writeUrl(push);
  }
  function paintCount() {
    var c = document.getElementById("mpCount");
    if (c) c.textContent = L().count(shown, rows.length);
  }
  var q = document.getElementById("mpQ"), qTimer = 0, qPushed = false;
  q.addEventListener("input", function () {
    state.q = q.value.slice(0, 60);
    state.item = "";
    // the first keystroke of a search makes one history entry; the rest of the typing replaces it
    apply(!qPushed);
    qPushed = true;
    window.clearTimeout(qTimer);
    qTimer = window.setTimeout(function () { qPushed = false; if (state.q.trim()) track("menu_search", { branch: state.branch }); }, 1200);
  });
  q.addEventListener("keydown", function (e) { if (e.key === "Escape" && q.value) { e.preventDefault(); resetAll(); } });
  function resetAll() { state.q = ""; state.cat = ""; state.protein = ""; q.value = ""; apply(true); q.focus({ preventScroll: true }); }
  document.getElementById("mpReset").addEventListener("click", resetAll);
  document.getElementById("mpEmptyReset").addEventListener("click", resetAll);

  /* ---- detail view: a native dialog; Back closes it (it has its own history entry); focus returns to the opener */
  var dlg = document.getElementById("mpDlg"), opener = null, openId = "";
  function openItem(it, from, push) {
    if (!dlg.showModal) return;
    opener = from || opener;
    openId = it.id;
    var l = L(), cat = M.categories.filter(function (c) { return c.id === it.category; })[0];
    document.getElementById("mpDlgCat").innerHTML = cat ? txt(cat.title) : "";
    var t = document.getElementById("mpDlgT");
    t.innerHTML = txt(it.name);
    if (state.lang === "th" && it.name.thMissing) t.lang = "en"; else t.removeAttribute("lang");
    document.getElementById("mpDlgD").innerHTML = txt(it.description);
    var meta = (it.price.en ? "฿" + txt(it.price) + " · " + l.priceNote : "");
    if (it.proteins.length) meta += " · " + l.proteins + ": " + it.proteins.map(function (p) { return l[p]; }).join(" / ");
    document.getElementById("mpDlgMeta").textContent = meta;
    var media = document.getElementById("mpDlgMedia");
    media.textContent = "";
    media.hidden = !it.image;
    if (it.image) {
      var im = document.createElement("img");
      im.src = "../" + (window.devicePixelRatio > 1.5 ? it.image.replace("-640.", "-960.") : it.image);
      im.alt = l.photoOf + txt(it.imageAlt);
      im.width = 640; im.height = 480;
      media.appendChild(im);
    }
    document.getElementById("mpDlgOrder").onclick = function (e) {
      e.preventDefault();
      lastPick = plain(txt(it.name));
      paintPick();
      opener = null; // focus goes to ordering, not back to the row
      dlg.close();
      window.setTimeout(function () { // after the dialog has stepped back over its own history entry
        var o = document.getElementById("mpOrderT");
        o.tabIndex = -1;
        o.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
        o.focus({ preventScroll: true });
      }, 80);
    };
    if (!dlg.open) dlg.showModal();
    state.item = it.id;
    if (push) writeUrl(true);
  }
  dlg.addEventListener("close", function () {
    openId = "";
    if (state.item) { // closed by the visitor: go back past its history entry if it made one, else just tidy the address
      state.item = "";
      if (window.history.state && window.history.state.bbMenu === 2) window.history.back(); else writeUrl(false);
    }
    if (opener && opener.isConnected && !opener.closest("[hidden]")) opener.focus({ preventScroll: true });
  });
  document.getElementById("mpDlgX").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  // mark the item's own history entry so closing can step back over it
  var _push = writeUrl;
  writeUrl = function (push) {
    var before = window.location.search;
    _push(push);
    if (push && state.item && window.location.search !== before) window.history.replaceState({ bbMenu: 2 }, "", window.location.pathname + window.location.search + window.location.hash);
  };

  /* ---- Back / Forward: re-read the address and show exactly that */
  window.addEventListener("popstate", function () {
    readUrl();
    q.value = state.q;
    apply(false);
    var it = M.items.filter(function (i) { return i.id === state.item; })[0];
    if (it) { var r = rows.filter(function (x) { return x.it === it; })[0]; openItem(it, r && r.btn, false); }
    else if (dlg.open) { state.item = ""; dlg.close(); }
  });

  /* ---- branch: the same resolver as the homepage; a choice here is the visitor's choice (saved, in the address) */
  var lastPick = "";
  function paintPick() {
    var p = document.getElementById("mpPick");
    p.textContent = L().pick(lastPick);
    p.hidden = !lastPick;
  }
  var branchBtns = Array.prototype.slice.call(document.querySelectorAll(".mp-branch-b"));
  function selectBranch(id, origin) { // origin: "url" | "saved" | "default" | "menu-selector"
    var i = S.branchIndex(id);
    if (i < 0) return;
    state.branch = id;
    if (origin === "menu-selector") { P.save("branch", id); P.toUrl("branch", id, i === 0); track("branch_select", { branch: id }); }
    paintBranch();
    document.querySelectorAll("[data-carry]").forEach(function (a) { a.href = P.carry(a.getAttribute("data-carry"), state.lang, state.branch); });
  }
  branchBtns.forEach(function (b) { b.addEventListener("click", function () { selectBranch(b.getAttribute("data-branch"), "menu-selector"); }); });
  function paintBranch() {
    var b = BR[S.branchIndex(state.branch)], l = L();
    branchBtns.forEach(function (x) {
      var bb = BR[S.branchIndex(x.getAttribute("data-branch"))];
      x.textContent = bb.name[state.lang];
      x.setAttribute("aria-pressed", String(x.getAttribute("data-branch") === state.branch));
    });
    document.getElementById("mpOrderFor").textContent = l.orderFor(b);
    var lm = document.getElementById("mpLineman"), gr = document.getElementById("mpGrab"), note = document.getElementById("mpGrabNote");
    lm.href = b.lineman;
    gr.href = b.grab || S.GRAB_SEARCH;
    gr.textContent = b.grab ? l.grab : l.grabFind(b);
    gr.classList.toggle("is-search", !b.grab);
    gr.setAttribute("data-qr", b.grabQr ? "../" + b.grabQr : "");
    note.hidden = !!b.grab;
    note.textContent = b.grab ? "" : l.grabNote(b);
  }
  [["mpLineman", "lineman"], ["mpGrab", "grab"]].forEach(function (p) {
    document.getElementById(p[0]).addEventListener("click", function () { track("provider_handoff", { provider: p[1], branch: state.branch }); });
  });
  /* GrabFood on a computer: the branch's code to scan (as on the homepage) */
  (function () {
    var btn = document.getElementById("mpGrab"), g = document.getElementById("grabDlg");
    if (!g.showModal) return;
    btn.addEventListener("click", function (e) {
      var qr = btn.getAttribute("data-qr");
      if (!qr || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      e.preventDefault();
      var box = document.getElementById("grabDlgQrBox"); box.textContent = "";
      var im = document.createElement("img");
      im.className = "grab-dlg-qr"; im.width = 372; im.height = 372; im.src = qr; im.alt = L().grabQr;
      box.appendChild(im);
      document.getElementById("grabDlgLink").href = btn.href;
      document.getElementById("grabDlgBranch").textContent = BR[S.branchIndex(state.branch)].name[state.lang];
      g.showModal();
    });
    document.getElementById("grabDlgX").addEventListener("click", function () { g.close(); });
    g.addEventListener("click", function (e) { if (e.target === g) g.close(); });
  })();

  /* ---- language: same resolver; the switch saves the choice and puts it in the address */
  document.getElementById("langBtn").addEventListener("click", function () {
    state.lang = state.lang === "en" ? "th" : "en";
    P.save("lang", state.lang);
    P.toUrl("lang", state.lang, false);
    paintWords();
    document.getElementById("mpEmptyP").textContent = L().empty(state.q.trim());
  });

  /* ---- the arcade: nothing loads until a "Win a coupon" button is pressed */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-arcade-open]") : null;
    if (!b || b.getAttribute("aria-busy") === "true") return;
    e.preventDefault();
    // On a host without the arcade server (GitHub Pages), the arcade lives at its own address.
    var playMeta = document.querySelector('meta[name="bb-arcade-play"]');
    if (playMeta && !document.querySelector('meta[name="bb-arcade-api"]')) {
      var dest = playMeta.getAttribute("content");
      window.location.href = dest + (dest.indexOf("?") < 0 ? "?" : "&") + "lang=" + (document.body.getAttribute("data-lang") === "th" ? "th" : "en");
      return;
    }
    b.setAttribute("aria-busy", "true");
    try { if (window.bbTrack) window.bbTrack("arcade_open", {}); } catch (err) {}
    import("../arcade/arcade.js").then(function (mod) {
      b.removeAttribute("aria-busy");
      if (!mod || typeof mod.openArcade !== "function") throw new Error("no openArcade");
      return mod.openArcade({ returnFocus: b });
    }).catch(function () {
      b.removeAttribute("aria-busy");
      var t = document.querySelector(".bb-toast") || document.body.appendChild(el("div", "bb-toast"));
      t.setAttribute("role", "status");
      t.textContent = L().arcadeFail;
      t.hidden = false;
      window.setTimeout(function () { t.hidden = true; }, 4500);
    });
  });

  /* ---- go */
  readUrl();
  q.value = state.q;
  selectBranch(state.branch, P.resolve("branch").source);
  paintWords();
  apply(false);
  if (state.item) {
    var it0 = M.items.filter(function (i) { return i.id === state.item; })[0];
    var r0 = rows.filter(function (x) { return x.it === it0; })[0];
    if (it0) openItem(it0, r0 && r0.btn, false);
  }
  track("menu_view", { branch: state.branch });
  window.__mpState = function () { return { lang: state.lang, branch: state.branch, q: state.q, cat: state.cat, protein: state.protein, item: state.item, shown: shown }; }; // QA hook
})();
