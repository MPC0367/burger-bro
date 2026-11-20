// Burger Bro Block Party — the arcade, loaded only when a visitor opens it.
// Entry: openArcade({ returnFocus }) from the site's [data-arcade-open] buttons.
import { api, available, opKey, ApiError, apiBase } from "./api.js";
import { t, lang, errText } from "./i18n.js";
import { Game, INPUT } from "./game.js";
import { unlockAudio, sfx } from "./sound.js";

const CSS_ID = "bba-css";
let root = null; // the <dialog>
let state = { session: null, view: null, game: null, run: null, returnFocus: null, lastView: "lobby", lb: "week", celebrated: new Set() };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n) => Number(n || 0).toLocaleString(lang() === "th" ? "th-TH" : "en-US");
const track = (name, props = {}) => { try { window.bbTrack && window.bbTrack(name, { locale: lang(), ...props }); } catch {} };
const pick = (o, base) => (lang() === "th" ? o[base + "_th"] : o[base + "_en"]) || o[base + "_en"] || "";
const bkk = (iso, withTime = false) => new Date(iso).toLocaleString(lang() === "th" ? "th-TH" : "en-GB", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
});
// Score mode: the target and the coupon it wins.
const reward = () => (state.session && state.session.reward) || null;
const benefit = () => (reward() ? pick(reward(), "benefit") : "");
const isGuest = () => !!(state.session && state.session.me && state.session.me.guest);
const phoneOn = () => !!(state.session && state.session.sms && state.session.sms.enabled !== false);
const lineOn = () => !!(state.session && state.session.line && state.session.line.enabled);
// A note carried back from LINE (?line=…) on the play page.
function lineNote() {
  const q = new URLSearchParams(location.search);
  const v = q.get("line");
  if (!v) return null;
  q.delete("line");
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  return { cancelled: "lineCancelled", error: "lineError", linked: "lineLinked", in_use: "lineInUse" }[v] || null;
}
const BRANCH = { rama9: { en: "Rama 9", th: "พระราม 9" }, pattanakarn: { en: "Pattanakarn", th: "พัฒนาการ" } };
const branchName = (id) => (BRANCH[id] ? BRANCH[id][lang()] : id);

function loadCss() {
  if (document.getElementById(CSS_ID)) return Promise.resolve();
  return new Promise((resolve) => {
    const l = document.createElement("link");
    l.id = CSS_ID;
    l.rel = "stylesheet";
    l.href = new URL("./arcade.css", import.meta.url).href;
    l.onload = l.onerror = () => resolve();
    document.head.appendChild(l);
  });
}

// ---------- open / close ----------
export async function openArcade({ returnFocus = null } = {}) {
  await loadCss();
  state.returnFocus = returnFocus || document.activeElement;
  if (!root) build();
  // Browser tests read the board through this; it is set only when a test asks for it.
  if (window.BB_ARCADE_TEST) window.__bba = state;
  if (!root.open) root.showModal();
  document.body.classList.add("bba-open");
  document.dispatchEvent(new CustomEvent("bb:arcade-open"));
  track("arcade_open");
  show("loading");
  if (!(await available())) return show("unavailable");
  try {
    state.session = await api("GET", "session");
  } catch { return show("unavailable"); }
  const note = lineNote();
  if (state.session.pendingUsername) return show("taken", { via: state.session.pendingVia });
  if (!state.session.me) return show(note ? "signup" : "start", { note });
  return show("lobby", { note });
}

async function closeArcade() {
  if (state.game) {
    state.game.setPaused(true);
    try { await Promise.race([state.game.flush(), new Promise((r) => setTimeout(r, 2500))]); } catch {}
    state.game.destroy();
    state.game = null;
  }
  detachKeys();
  if (root && root.open) root.close();
  document.body.classList.remove("bba-open");
  document.dispatchEvent(new CustomEvent("bb:arcade-close"));
  const f = state.returnFocus;
  if (f && document.contains(f)) f.focus();
}

function build() {
  root = document.createElement("dialog");
  root.className = "bba";
  root.setAttribute("aria-labelledby", "bba-title");
  root.innerHTML = `
    <header class="bba-bar">
      <span class="bba-mark" aria-hidden="true">${emblem()}</span>
      <p class="bba-brand" id="bba-title"><span>BURGERBRO!</span> <b>${esc(t("title"))}</b></p>
      <div class="bba-bar-r">
        <button type="button" class="bba-chip" data-act="sound" aria-pressed="${Game.soundOn}"></button>
        <button type="button" class="bba-chip bba-x" data-act="close"><span aria-hidden="true">✕</span> <span class="bba-x-l"></span></button>
      </div>
    </header>
    <main class="bba-main" tabindex="-1"></main>
    <p class="bba-live" aria-live="polite"></p>`;
  document.body.appendChild(root);
  root.addEventListener("cancel", (e) => {
    // Escape pauses a game first; a second Escape (or the button) leaves.
    if (state.game && !state.game.paused) { e.preventDefault(); state.game.setPaused(true); }
    else { e.preventDefault(); closeArcade(); }
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act;
    if (act === "close") closeArcade();
    else if (act === "sound") { Game.setSound(!Game.soundOn); paintBar(); }
    else if (actions[act]) actions[act](b);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.game) state.game.setPaused(true); });
  // Browsers allow sound only after a press: wake the audio on the first one.
  for (const ev of ["pointerdown", "keydown"]) document.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  paintBar();
}

function paintBar() {
  const s = root.querySelector('[data-act="sound"]');
  s.setAttribute("aria-pressed", String(Game.soundOn));
  s.innerHTML = `<span aria-hidden="true">♪</span> <span class="bba-sl">${esc(t("sound"))}: </span>${esc(Game.soundOn ? t("on") : t("off"))}`;
  s.setAttribute("aria-label", `${t("sound")}: ${Game.soundOn ? t("on") : t("off")}`);
  root.querySelector(".bba-x-l").textContent = t("exit");
  root.querySelector(".bba-x").setAttribute("aria-label", t("close"));
  root.querySelector(".bba-brand b").textContent = t("title");
  root.setAttribute("lang", lang());
}

function main() { return root.querySelector(".bba-main"); }
function say(text) { const l = root.querySelector(".bba-live"); l.textContent = ""; setTimeout(() => { l.textContent = text; }, 30); }

function emblem() {
  // Original pixel arcade cabinet (the same idea as the site's entry emblem).
  return `<svg viewBox="0 0 16 16" width="28" height="28" shape-rendering="crispEdges" focusable="false">
    <rect x="3" y="1" width="10" height="14" fill="#C42B1C"/><rect x="3" y="1" width="10" height="1" fill="#221511"/>
    <rect x="4" y="3" width="8" height="6" fill="#221511"/><rect x="5" y="4" width="2" height="1" fill="#F1A62B"/><rect x="7" y="5" width="2" height="1" fill="#6A3A22"/>
    <rect x="5" y="6" width="3" height="1" fill="#58A33A"/><rect x="5" y="7" width="6" height="1" fill="#D8A35A"/>
    <rect x="5" y="10" width="2" height="2" fill="#F1A62B"/><rect x="9" y="10" width="1" height="1" fill="#F5EEDF"/><rect x="11" y="10" width="1" height="1" fill="#F5EEDF"/>
    <rect x="4" y="13" width="8" height="1" fill="#6E150D"/></svg>`;
}

// ---------- views ----------
function show(view, data) {
  if (state.game && view !== "game") { state.game.setPaused(true); }
  if (view !== "game") detachKeys();
  state.view = view;
  paintBar();
  const m = main();
  m.className = "bba-main bba-v-" + view;
  m.innerHTML = VIEWS[view](data) || "";
  if (WIRE[view]) WIRE[view](data);
  const focus = m.querySelector("[data-autofocus]") || m.querySelector("h1, h2");
  if (focus) { if (!focus.hasAttribute("tabindex") && /^H\d$/.test(focus.tagName)) focus.setAttribute("tabindex", "-1"); focus.focus({ preventScroll: true }); }
  m.scrollTop = 0;
}

function errorBox(code) { return `<p class="bba-err" role="alert">${esc(errText(code))}</p>`; }
function noteBox(key) { return key ? `<p class="bba-note" role="status">${esc(t(key))}</p>` : ""; }
function lineButton() {
  if (!lineOn()) return "";
  return `<a class="bba-btn bba-line bba-wide" href="${esc(apiBase() + "auth/line/start")}"><span class="bba-line-mark" aria-hidden="true">LINE</span> ${esc(t("lineBtn"))}</a>
    <p class="bba-fine">${esc(t("linePrivacy"))}</p>${phoneOn() ? `<p class="bba-or bba-mono">${esc(t("orPhone"))}</p>` : ""}`;
}

const COUNTRIES = [["TH", "+66"], ["LA", "+856"], ["KH", "+855"], ["MM", "+95"], ["MY", "+60"], ["SG", "+65"], ["VN", "+84"], ["CN", "+86"], ["HK", "+852"], ["JP", "+81"], ["KR", "+82"], ["IN", "+91"], ["GB", "+44"], ["US", "+1"], ["AU", "+61"]];
function countrySelect(id) {
  const allowed = (state.session && state.session.sms && state.session.sms.countries) || ["TH"];
  return `<select id="${id}" name="country" autocomplete="tel-country-code">${COUNTRIES.filter(([c]) => allowed.includes(c)).map(([c, d]) => `<option value="${c}" ${c === "TH" ? "selected" : ""}>${c} ${d}</option>`).join("")}</select>`;
}

const VIEWS = {
  loading: () => `<div class="bba-center"><p class="bba-mono">${esc(t("loading"))}</p></div>`,
  unavailable: () => `<section class="bba-panel bba-narrow"><p class="bba-kick">${esc(t("kicker"))}</p><h1 class="bba-h">${esc(t("unavailable"))}</h1><p>${esc(t("unavailableBody"))}</p>
    <p><button type="button" class="bba-btn bba-red" data-act="close">${esc(t("close"))}</button></p></section>`,

  start: (d = {}) => `<section class="bba-lobby">
      <div class="bba-lobby-l">
        <p class="bba-kick">${esc(t("kicker"))}</p>
        <h1 class="bba-hero">${esc(t("title"))}</h1>
        <p class="bba-tag-l">${esc(t("startTitle"))}</p>
        ${reward() ? `<p class="bba-welcome">${esc(t("startLead", { n: fmt(reward().target), benefit: benefit() }))}</p>` : ""}
        <div class="bba-actions">
          <button type="button" class="bba-btn bba-red bba-big" data-act="playGuest" data-autofocus>${esc(t("playNow"))}</button>
          ${lineOn() || phoneOn() ? `<button type="button" class="bba-btn" data-act="toSignin">${esc(t("signInSave"))}</button>` : ""}
        </div>
        ${noteBox(d.note)}${d.error ? errorBox(d.error) : ""}
      </div>
      <div class="bba-card bba-how"><h2 class="bba-h3">${esc(t("howTo"))}</h2><p>${esc(howToText())}</p><p class="bba-mono bba-keys">${esc(t("keys"))}</p></div>
    </section>`,

  signup: (d = {}) => `<section class="bba-onb">
    <p class="bba-kick">${esc(t("kicker"))}</p>
    <h1 class="bba-h">${esc(isGuest() ? t("saveTitle") : t("signupTitle"))}</h1>
    <p class="bba-sub bba-mono">${esc(isGuest() ? t("saveLead") : phoneOn() ? t("signupSub") : t("lineSub"))}</p>
    ${noteBox(d.note)}
    ${isGuest() || d.signin ? "" : `<p><button type="button" class="bba-link" data-act="${state.session && state.session.me ? "toLobby" : "toStart"}">← ${esc(t("back"))}</button></p>`}
    <div class="bba-card bba-step">${lineButton()}${lineOn() || phoneOn() ? "" : `<p>${esc(t("err_phone_disabled"))}</p>`}
      <div ${phoneOn() ? "" : "hidden"}>
      <span class="bba-tag">${esc(t("step1"))}</span>
      <h2 class="bba-h2">${d.signin ? esc(t("signInTitle")) : esc(t("pickName"))}</h2>
      <p>${d.signin ? esc(t("signInLead")) : esc(t("pickNameLead"))}</p>
      <form class="bba-form" data-form="send" novalidate>
        ${d.signin ? "" : `<label class="bba-lab" for="bba-user">${esc(t("username"))}</label>
        <input id="bba-user" name="username" autocomplete="nickname" autocapitalize="off" spellcheck="false" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" required data-autofocus aria-describedby="bba-user-h" value="${esc(d.username || "")}">
        <p class="bba-hint" id="bba-user-h">${esc(t("usernameHint"))}</p>`}
        <label class="bba-lab" for="bba-phone">${esc(t("phone"))}</label>
        <div class="bba-phone">${countrySelect("bba-cc")}<input id="bba-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" required ${d.signin ? "data-autofocus" : ""} value="${esc(d.phone || "")}" placeholder="08X XXX XXXX"></div>
        <div class="bba-msg">${d.error ? errorBox(d.error) : ""}</div>
        <button class="bba-btn bba-red bba-wide" type="submit">${esc(t("sendCode"))}</button>
      </form>
      <button type="button" class="bba-link" data-act="${d.signin ? "toSignup" : "toSignin"}">${esc(d.signin ? t("newPlayer") : t("already"))}</button>
      <p class="bba-fine">${esc(t("privacy"))}</p>
      </div>
    </div></section>`,

  code: (d) => `<section class="bba-onb">
    <p class="bba-kick">${esc(t("kicker"))}</p>
    <div class="bba-card bba-step">
      <span class="bba-tag">${esc(t("step2"))}</span>
      <h1 class="bba-h2">${esc(t("checkTitle"))}</h1>
      <p>${esc(t("checkLead", { to: d.sentTo }))}</p>
      <form class="bba-form" data-form="verify" novalidate>
        <label class="bba-lab" for="bba-code">${esc(t("code"))}</label>
        <input id="bba-code" class="bba-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" required data-autofocus>
        <div class="bba-msg">${d.error ? errorBox(d.error) : ""}</div>
        <button class="bba-btn bba-red bba-wide" type="submit">${esc(t("verify"))}</button>
      </form>
      <p class="bba-mono bba-resend" aria-live="polite"></p>
      <button type="button" class="bba-link" data-act="changeNumber">${esc(t("changeNumber"))}</button>
      ${state.session && state.session.sms.demo ? `<p class="bba-demo">${esc(t("demoNote"))} <a href="${esc(new URL("/dev/sms", location.href).href)}" target="_blank" rel="noopener">${esc(t("demoInbox"))}</a></p>` : ""}
      <p class="bba-fine">${esc(t("afterVerify"))}</p>
    </div></section>`,

  taken: (d = {}) => `<section class="bba-onb"><div class="bba-card bba-step">
      <h1 class="bba-h2">${esc(d.via === "line" ? t("pickName") : t("takenTitle"))}</h1><p>${esc(d.via === "line" ? t("pickNameLine") : t("takenLead"))}</p>
      <form class="bba-form" data-form="username" novalidate>
        <label class="bba-lab" for="bba-user2">${esc(t("username"))}</label>
        <input id="bba-user2" name="username" autocapitalize="off" spellcheck="false" maxlength="16" required data-autofocus>
        <p class="bba-hint">${esc(t("usernameHint"))}</p>
        <div class="bba-msg">${d.error ? errorBox(d.error) : ""}</div>
        <button class="bba-btn bba-red bba-wide" type="submit">${esc(t("finish"))}</button>
      </form></div></section>`,

  lobby: (d = {}) => {
    const me = state.session.me;
    return `<section class="bba-lobby">
      <div class="bba-lobby-l">
        <p class="bba-kick">${esc(t("kicker"))}</p>
        <h1 class="bba-hero">${esc(t("title"))}</h1>
        <p class="bba-tag-l">${esc(t("tagline"))}</p>
        <p class="bba-welcome">${esc(me.guest ? t("welcomeGuest") : t("welcome", { name: me.username }))}</p>
        ${me.guest ? `<p class="bba-fine">${esc(t("guestNote"))}</p>` : ""}
        <div class="bba-actions">
          ${d.active ? `<button type="button" class="bba-btn bba-red bba-big" data-act="resume" data-autofocus>${esc(t("resume"))}</button>` : `<button type="button" class="bba-btn bba-red bba-big" data-act="play" data-autofocus>${esc(t("play"))}</button>`}
          ${me.guest ? `<button type="button" class="bba-btn bba-mustard" data-act="toSave">${esc(t("saveBtn"))}</button>` : ""}
          <button type="button" class="bba-btn" data-act="toBoard">${esc(t("board"))}</button>
          <button type="button" class="bba-btn" data-act="toWallet">${esc(t("rewards"))}</button>
          ${me.guest ? "" : `<button type="button" class="bba-btn" data-act="toAccount">${esc(t("account"))}</button>`}
        </div>
        ${noteBox(d.note)}${d.error ? errorBox(d.error) : ""}
        <dl class="bba-stats"><div><dt>${esc(t("personalBest"))}</dt><dd>${fmt(me.personalBest)}</dd></div><div><dt>${esc(t("points"))}</dt><dd>${fmt(me.points)}</dd></div></dl>
      </div>
      <div class="bba-card bba-how"><h2 class="bba-h3">${esc(t("howTo"))}</h2><p>${esc(howToText())}</p><p class="bba-mono bba-keys">${esc(t("keys"))}</p></div>
    </section>`;
  },

  game: () => `<section class="bba-game">
    <aside class="bba-side bba-card" aria-label="${esc(t("player"))}">
      <p class="bba-lab">${esc(t("player"))}</p><p class="bba-name">${esc(isGuest() ? t("guestName") : state.session.me.username)}</p>
      <p class="bba-lab">${esc(t("score"))}</p><p class="bba-score" data-hud="score">0</p>
      <p class="bba-lvl"><span class="bba-mono">${esc(t("level"))} <b data-hud="level">1</b></span> <span class="bba-mono" data-hud="lines"></span></p>
      <div class="bba-prog" aria-hidden="true"><i data-hud="prog"></i></div>
      <div class="bba-prev"><div><p class="bba-lab">${esc(t("next"))}</p><canvas class="bba-pv" data-next="0"></canvas><canvas class="bba-pv bba-pv-s" data-next="1"></canvas></div>
        <div><p class="bba-lab">${esc(t("hold"))}</p><canvas class="bba-pv" data-hold></canvas></div></div>
      <p class="bba-lab">${esc(t("personalBest"))}</p><p class="bba-mono">${fmt(state.session.me.personalBest)}</p>
      <p class="bba-runlab bba-mono" data-hud="runlab"></p>
      ${reward() ? `<p class="bba-goal" data-hud="goal"></p>` : ""}
    </aside>
    <div class="bba-cab">
      <p class="bba-cab-t bba-mono">${esc(t("tagline"))}</p>
      <div class="bba-wrap"><canvas class="bba-board" role="img" aria-label="${esc(t("title"))}"></canvas>
        <div class="bba-pausecard" hidden><p class="bba-h3">${esc(t("paused"))}</p><button type="button" class="bba-btn bba-red" data-act="resumeGame">${esc(t("resumeGame"))}</button>
          <button type="button" class="bba-btn" data-act="endRun">${esc(t("endRun"))}</button><p class="bba-fine bba-idle"></p></div>
      </div>
      <p class="bba-cab-t bba-mono bba-status" aria-live="polite"></p>
    </div>
    <aside class="bba-side bba-right">
      <div class="bba-strip" aria-hidden="true"><span class="bba-mono">${esc(t("score"))}</span> <b data-hud="score2">0</b> <span class="bba-mono">${esc(t("level"))} <b data-hud="level2">1</b></span> <span class="bba-mono" data-hud="lines2"></span>${reward() ? ` <span class="bba-goal bba-mono" data-hud="goal2"></span>` : ""}</div>
      <div class="bba-card bba-week" data-week></div>
      <div class="bba-ctlrow"><button type="button" class="bba-btn" data-act="pauseGame">${esc(t("pause"))}</button></div>
    </aside>
    <div class="bba-pad" aria-label="Controls">
      <button type="button" class="bba-pb" data-in="${INPUT.LEFT}">${esc(t("left"))}</button>
      <button type="button" class="bba-pb" data-in="${INPUT.RIGHT}">${esc(t("right"))}</button>
      <button type="button" class="bba-pb bba-pb-rot" data-in="${INPUT.CW}">${esc(t("rotate"))}</button>
      <button type="button" class="bba-pb bba-pb-drop" data-in="${INPUT.HARD}">${esc(t("drop"))}</button>
      <button type="button" class="bba-pb" data-in="${INPUT.HOLD}">${esc(t("hold"))}</button>
      <button type="button" class="bba-pb" data-in="${INPUT.SOFT_ON}">${esc(t("soft"))}</button>
      <button type="button" class="bba-pb bba-pb-p" data-act="pauseGame">${esc(t("pause"))}</button>
    </div>
  </section>`,

  choice: (run) => {
    const blocked = run.spinAvailable;
    const odds = run.wheel ? run.wheel.segments.map((s) => `<li><span>${esc(pick(s, "label"))}</span> <b>${(s.chance * 100).toFixed(s.chance < 0.1 ? 1 : 0)}%</b></li>`).join("") : "";
    return `<section class="bba-choice">
      <h1 class="bba-clear">${esc(t("clear"))}</h1>
      <p>${esc(t("clearSub"))}</p>
      <p class="bba-scorebar bba-mono">${esc(t("scoreLines", { score: fmt(run.milestone.score), lines: run.milestone.lines }))}</p>
      <div class="bba-choices">
        <div class="bba-card bba-opt">
          <p class="bba-kick">${esc(t("takePromo"))}</p><h2 class="bba-h2">${esc(t("spinTitle"))}</h2><p>${esc(t("spinBody"))}</p>
          ${blocked ? `<p class="bba-note" role="note">${esc(t("spinUnavailable_" + blocked))}</p>` : ""}
          <button type="button" class="bba-btn bba-mustard bba-wide" data-act="chooseSpin" ${blocked ? "disabled" : ""}>${esc(t("spinTitle"))}</button>
        </div>
        <div class="bba-card bba-opt">
          <p class="bba-kick">${esc(t("playTop3"))}</p><h2 class="bba-h2">${esc(t("keepTitle"))}</h2><p>${esc(t("keepBody"))}</p>
          <button type="button" class="bba-btn bba-red bba-wide" data-act="chooseKeep">${esc(t("keepTitle"))}</button>
        </div>
      </div>
      <p class="bba-forfeit">${esc(t("forfeit"))}</p>
      <p class="bba-fine">${esc(t("bothSave"))}</p>
      ${odds ? `<details class="bba-odds"><summary>${esc(t("odds"))}</summary><ul>${odds}</ul></details>` : ""}
      <div class="bba-msg"></div>
    </section>`;
  },

  wheel: (run) => `<section class="bba-wheelv">
    <h1 class="bba-h2">${esc(t("wheelTitle"))}</h1><p>${esc(t("wheelLead"))}</p>
    <div class="bba-wheelrow">
      <div class="bba-wheel-box"><div class="bba-pointer" aria-hidden="true"></div>${wheelSvg(run)}</div>
      <div class="bba-reveal bba-card" hidden aria-live="polite"></div>
    </div></section>`,

  over: (run) => `<section class="bba-panel bba-narrow bba-overv">
    <p class="bba-kick">${esc(run && run.result && run.state !== "rejected" ? t("runSaved") : t("gameOver"))}</p>
    <h1 class="bba-h">${esc(t("gameOver"))}</h1>
    ${!run ? `<p>${esc(t("verifyingScore"))}</p>` : run.state === "rejected" ? `<p class="bba-err">${esc(t("rejected"))}</p>` : `
      <p class="bba-lab">${esc(t("finalScore"))}</p><p class="bba-score">${fmt(run.result.score)}</p>
      <p class="bba-mono">${esc(t("verified"))} · ${esc(t("level"))} ${run.result.level} · ${run.result.lines} ${esc(t("lines"))}</p>
      ${run.reward && run.reward.coupon ? `<div class="bba-card bba-won"><p class="bba-h2">${esc(t("couponWon", { benefit: pick(run.reward.coupon, "benefit") }))}</p><p>${esc(t("couponWonLead"))}</p>
        ${isGuest() ? `<p class="bba-fine">${esc(t("couponWonGuest"))}</p>` : ""}<p><button type="button" class="bba-btn bba-mustard" data-act="toWallet">${esc(t("viewCoupon"))}</button></p></div>`
        : run.reward ? `<p class="bba-mono">${esc(t("goal", { n: fmt(run.reward.target), benefit: pick(run.reward, "benefit") }))}</p>` : ""}
      <p>${esc(isGuest() ? t("notWeeklyGuest") : run.result.weekly ? t("weeklyEntry") : t("notWeekly"))}</p>${run.result.held ? `<p class="bba-note">${esc(t("heldReview"))}</p>` : ""}`}
    <div class="bba-actions">${run && isGuest() ? `<button type="button" class="bba-btn bba-mustard" data-act="toSave">${esc(t("saveBtn"))}</button>` : ""}<button type="button" class="bba-btn bba-red" data-act="play" data-autofocus${run ? "" : " disabled"}>${esc(t("playAgain"))}</button>
      <button type="button" class="bba-btn" data-act="toBoard">${esc(t("board"))}</button><button type="button" class="bba-btn" data-act="toLobby">${esc(t("back"))}</button></div></section>`,

  board: () => `<section class="bba-boardv">
    <div class="bba-head"><button type="button" class="bba-link" data-act="back">← ${esc(t("back"))}</button></div>
    <h1 class="bba-h">${esc(t("weeklyTitle"))}</h1><p>${esc(t("weeklyLead"))}</p>
    <div class="bba-tabs" role="group" aria-label="${esc(t("board"))}">
      <button type="button" class="bba-tab" data-act="lbWeek" aria-pressed="${state.lb === "week"}">${esc(t("thisWeek"))}</button>
      <button type="button" class="bba-tab" data-act="lbAll" aria-pressed="${state.lb === "alltime"}">${esc(t("allTime"))}</button>
      <button type="button" class="bba-tab" data-act="lbMine" aria-pressed="${state.lb === "mine"}">${esc(t("myScores"))}</button>
      <span class="bba-mono bba-tz">${esc(t("bangkokTime"))}</span>
    </div>
    <div class="bba-lb" data-lb><p class="bba-mono">${esc(t("loading"))}</p></div></section>`,

  wallet: () => `<section class="bba-walletv">
    <div class="bba-head"><button type="button" class="bba-link" data-act="back">← ${esc(t("back"))}</button></div>
    <h1 class="bba-h">${esc(t("walletTitle"))}</h1><p class="bba-mono">${esc(isGuest() ? t("savedToGuest") : t("savedTo", { name: state.session.me.username }))}</p>
    <div data-wallet><p class="bba-mono">${esc(t("loading"))}</p></div></section>`,

  account: (d = {}) => {
    const me = state.session.me;
    return `<section class="bba-panel bba-narrow">
      <div class="bba-head"><button type="button" class="bba-link" data-act="back">← ${esc(t("back"))}</button></div>
      <h1 class="bba-h">${esc(t("account"))}</h1>
      <dl class="bba-dl"><div><dt>${esc(t("username"))}</dt><dd>${esc(me.username)}</dd></div><div><dt>${esc(me.phone ? t("phoneOnFile") : t("signedInWith"))}</dt><dd class="bba-mono">${esc(me.phone || t("viaLine"))}${me.phone && me.line ? " · LINE" : ""}</dd></div>
        <div><dt>${esc(t("memberSince"))}</dt><dd>${esc(bkk(me.since))}</dd></div></dl>
      <form class="bba-form bba-card" data-form="rename" novalidate><h2 class="bba-h3">${esc(t("changeName"))}</h2><p class="bba-fine">${esc(t("changeNameNote"))}</p>
        <label class="bba-lab" for="bba-rn">${esc(t("username"))}</label><input id="bba-rn" name="username" maxlength="16" autocapitalize="off" spellcheck="false" required>
        <div class="bba-msg">${d.error ? errorBox(d.error) : ""}</div><button class="bba-btn" type="submit">${esc(t("save"))}</button></form>
      ${lineOn() && !me.line ? `<p><a class="bba-btn bba-line" href="${esc(apiBase() + "auth/line/start")}">${esc(t("linkLine"))}</a></p>` : ""}
      ${noteBox(d.note)}
      <p><button type="button" class="bba-btn" data-act="signOut">${esc(t("signOut"))}</button></p></section>`;
  },
};

// ---------- wiring ----------
let resendTimer = 0;
const WIRE = {
  signup(d = {}) {
    const f = main().querySelector('[data-form="send"]');
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button[type=submit]");
      const body = { phone: f.phone.value, country: f.country.value, username: f.username ? f.username.value.trim() : undefined };
      btn.disabled = true; btn.textContent = t("sending");
      try {
        const r = await api("POST", "auth/otp/send", body);
        show("code", { ...body, signin: d.signin, sentTo: r.sentTo, resendIn: r.resendIn });
      } catch (err) {
        show("signup", { ...d, ...body, error: err.code });
      }
    });
  },
  code(d) {
    const f = main().querySelector('[data-form="verify"]');
    const input = f.code;
    input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 6); if (input.value.length === 6) f.requestSubmit(); });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (input.value.length !== 6) return;
      const btn = f.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = t("verifying");
      try {
        const r = await api("POST", "auth/otp/verify", { phone: d.phone, country: d.country, code: input.value, username: d.username });
        state.session = await api("GET", "session");
        if (r.status === "need_username") return show("taken");
        track("account_verified");
        show("lobby");
      } catch (err) {
        show("code", { ...d, error: err.code });
      }
    });
    const line = main().querySelector(".bba-resend");
    let left = d.resendIn || 45;
    clearInterval(resendTimer);
    const paint = () => {
      if (left > 0) { line.textContent = t("resendIn", { s: left }); }
      else { line.innerHTML = `<button type="button" class="bba-link" data-act="resend">${esc(t("resend"))}</button>`; clearInterval(resendTimer); }
    };
    paint();
    resendTimer = setInterval(() => { left--; paint(); }, 1000);
    actions.resend = async () => {
      try { const r = await api("POST", "auth/otp/send", { phone: d.phone, country: d.country, username: d.username }); show("code", { ...d, sentTo: r.sentTo, resendIn: r.resendIn, error: null }); }
      catch (err) { show("code", { ...d, error: err.code, resendIn: err.body && err.body.retryAfter }); }
    };
    actions.changeNumber = () => show("signup", { signin: d.signin, username: d.username });
  },
  taken() {
    const f = main().querySelector('[data-form="username"]');
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const r = await api("POST", "auth/username", { username: f.username.value.trim() });
        if (r.status === "need_username") return show("taken", { via: state.session.pendingVia, error: r.reason === "taken" ? "username_taken" : "username_format" });
        state.session = await api("GET", "session");
        track("account_verified");
        show("lobby");
      } catch (err) { show("taken", { via: state.session.pendingVia, error: err.code }); }
    });
  },
  async lobby(d = {}) {
    if (d.checked) return;
    try {
      const { run } = await api("GET", "runs/active");
      state.session = await api("GET", "session");
      if (state.view !== "lobby") return;
      if (run) { state.run = run; show("lobby", { active: true, checked: true }); }
      else if (state.session.me) show("lobby", { checked: true, error: d.error, note: d.note });
    } catch {}
  },
  game() { mountGame(); },
  choice(run) {
    const msg = main().querySelector(".bba-msg");
    const choose = async (choice, btn) => {
      main().querySelectorAll("[data-act^=choose]").forEach((b) => (b.disabled = true));
      try {
        const r = await api("POST", `runs/${run.id}/choice`, { choice });
        state.run = r.run;
        // The wheel is drawn with the segments the player was shown at the choice.
        if (r.committed === "spin") { track("reward_issued", { source: "spin" }); return show("wheel", { ...r.run, wheel: run.wheel }); }
        // Keep stacking: back to the same board.
        state.game.continueAfterChoice(r.run);
        show("game");
        setTimeout(() => state.game && state.game.start(), 250);
      } catch (err) {
        msg.innerHTML = errorBox(err.code);
        // Allowance or stock ran out between showing and choosing: Continue stays open.
        const fresh = await api("GET", `runs/${run.id}`).catch(() => null);
        if (fresh && fresh.run.state === "decision_ready") { state.run = fresh.run; show("choice", fresh.run); main().querySelector(".bba-msg").innerHTML = errorBox(err.code); }
      }
    };
    actions.chooseSpin = (b) => choose("spin", b);
    actions.chooseKeep = (b) => choose("continue", b);
  },
  wheel(run) { spinWheel(run); },
  board() { loadBoard(); },
  wallet() { loadWallet(); },
  account() {
    const f = main().querySelector('[data-form="rename"]');
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { const r = await api("POST", "me/username", { username: f.username.value.trim() }); state.session.me = r.me; show("account"); }
      catch (err) { show("account", { error: err.code }); }
    });
  },
};

const actions = {
  toSignin: () => show("signup", { signin: true }),
  toStart: () => show("start"),
  toSave: () => { state.lastView = "lobby"; show("signup", {}); },
  async playGuest() {
    try {
      await api("POST", "auth/guest");
      state.session = await api("GET", "session");
      await actions.play();
    } catch (err) { show("start", { error: err.code }); }
  },
  toSignup: () => show("signup", {}),
  toBoard: () => { state.lastView = state.view === "game" ? "game" : "lobby"; show("board"); },
  toWallet: () => { state.lastView = state.view === "game" ? "game" : "lobby"; show("wallet"); },
  toAccount: () => { state.lastView = "lobby"; show("account"); },
  toLobby: () => show("lobby"),
  back: () => (state.lastView === "game" && state.game ? show("game") : show("lobby")),
  lbWeek: () => { state.lb = "week"; show("board"); },
  lbAll: () => { state.lb = "alltime"; show("board"); },
  lbMine: () => { state.lb = "mine"; show("board"); },
  signOut: async () => { try { await api("POST", "auth/signout"); } catch {} state.session = await api("GET", "session"); show("start"); },
  async play() {
    if (state.game) { state.game.destroy(); state.game = null; }
    try {
      const r = await api("POST", "runs", { key: opKey() });
      state.run = r.run;
      show("game");
    } catch (err) {
      if (err.code === "active_run") { state.run = err.body.run; return actions.resume(); }
      show("lobby", { error: err.code, checked: true });
    }
  },
  async resume() {
    const { run } = await api("GET", "runs/active");
    if (!run) return actions.play();
    state.run = run;
    if (state.game) { state.game.destroy(); state.game = null; }
    if (run.state === "decision_ready") { show("game"); return show("choice", run); }
    if (run.reward && run.reward.coupon) state.celebrated.add(run.id);
    show("game");
  },
  pauseGame: () => state.game && state.game.setPaused(true),
  resumeGame: () => state.game && state.game.start(),
  async endRun() {
    if (!state.game) return;
    if (!window.confirm(t("endRunQ"))) return;
    await finishRun("quit");
  },
};

function howToText() {
  return reward() ? t("howToBodyScore", { n: fmt(reward().target), benefit: benefit() }) : t("howToBody");
}

// ---------- the game view ----------
function mountGame() {
  const m = main();
  const wrap = m.querySelector(".bba-wrap");
  if (state.game && state.game.run.id === state.run.id) {
    // Re-attach the existing game to the new elements.
    const g = state.game;
    g.els = gameEls(m);
    g.ro.disconnect(); g.ro = new ResizeObserver(g.layout); g.ro.observe(g.els.wrap);
    g.cell = 0; g.layout();
  } else {
    if (state.game) state.game.destroy();
    state.game = new Game({ run: state.run, els: gameEls(m), reduceMotion: reduceMotion(), hooks: gameHooks() });
  }
  attachKeys();
  wireTouch(m);
  wrap.setAttribute("tabindex", "-1");
  wrap.focus({ preventScroll: true });
  hud(state.game.hud());
  paintPause(state.game.paused);
  loadWeekMini();
  if (state.run.state === "decision_ready") return;
  // A run whose board had already topped out (its finish was interrupted): finish it now
  // instead of leaving a full board with nothing to press.
  if (state.game.st.phase === "over") { finishRun("over"); return; }
  if (state.game.st.phase === "play") setTimeout(() => state.game && state.view === "game" && state.game.start(), 300);
}

function gameEls(m) {
  return { board: m.querySelector(".bba-board"), wrap: m.querySelector(".bba-wrap"), next: [...m.querySelectorAll("[data-next]")], hold: m.querySelector("[data-hold]") };
}

let idleTimer = 0;
function gameHooks() {
  return {
    onHud: hud,
    onPauseChange: paintPause,
    onStatus(kind, code) {
      const s = main().querySelector(".bba-status");
      if (!s) return;
      if (kind === "offline") s.textContent = t("offline");
      else if (kind === "resynced") { s.textContent = t("resynced"); say(t("resynced")); }
      else if (kind === "ended") { s.textContent = errText(code); show("lobby", { error: code }); }
      else s.textContent = "";
    },
    onRun(run) {
      state.run = { ...state.run, ...run };
      const r = run.reward;
      if (!r) return;
      if (r.coupon && !state.celebrated.has(run.id)) {
        state.celebrated.add(run.id);
        track("reward_issued", { source: "score" });
        const b = pick(r.coupon, "benefit");
        state.game && state.game.callout(b.toUpperCase() + "!", t("popCoupon"), "big");
        sfx("clear", { n: 4, combo: 3 });
        say(t("couponWon", { benefit: b }));
      } else if (r.blocked && !state.celebrated.has("b:" + run.id)) {
        state.celebrated.add("b:" + run.id);
        const s = main().querySelector(".bba-status");
        if (s) s.textContent = t(r.blocked === "network" ? "couponNetwork" : "couponDaily");
      }
      hud(state.game ? state.game.hud() : {});
    },
    onMilestone(run) {
      state.run = run;
      track("level_one_clear");
      say(t("clear"));
      show("choice", run);
    },
    async onOver() { await finishRun("over"); },
  };
}

async function finishRun(reason) {
  const g = state.game;
  show("over", null);
  try {
    const run = await g.finish(reason);
    state.game = null;
    g.destroy();
    state.session = await api("GET", "session");
    show("over", run);
  } catch (err) {
    show("lobby", { error: err.code });
  }
}

function hud(h) {
  const m = main();
  if (!m || state.view !== "game") return;
  const set = (k, v) => m.querySelectorAll(`[data-hud="${k}"]`).forEach((e) => (e.textContent = v));
  if (h.score > (hud.last || 0)) m.querySelectorAll(".bba-score").forEach((e) => { e.classList.remove("is-bump"); void e.offsetWidth; e.classList.add("is-bump"); });
  hud.last = h.score;
  set("score", fmt(h.score)); set("score2", fmt(h.score));
  set("level", h.level); set("level2", h.level);
  set("lines", t("linesOf", { n: h.lines, m: h.target })); set("lines2", t("linesOf", { n: h.lines, m: h.target }));
  const p = m.querySelector('[data-hud="prog"]'); if (p) p.style.transform = `scaleX(${h.progress.toFixed(3)})`;
  set("runlab", reward() ? "" : state.run && state.run.choice === "continue" ? t("runKeep") : t("runLevel1"));
  const rw = state.run && state.run.reward;
  if (rw) {
    const done = !!rw.coupon;
    const txt = done ? t("goalDone", { benefit: pick(rw.coupon, "benefit") }) : t("goal", { n: fmt(rw.target), benefit: pick(rw, "benefit") });
    set("goal", txt); set("goal2", txt);
    m.querySelectorAll(".bba-goal").forEach((e) => e.classList.toggle("is-done", done || (h.score || 0) >= rw.target));
  }
}

function paintPause(paused) {
  const card = main().querySelector(".bba-pausecard");
  if (!card || state.view !== "game") return;
  const show_ = paused && state.game && state.game.st.phase === "play";
  card.hidden = !show_;
  clearTimeout(idleTimer);
  if (show_) {
    const mins = (state.run && state.run.idleLimitMinutes) || 10;
    idleTimer = setTimeout(() => { const i = card.querySelector(".bba-idle"); if (i) i.textContent = t("idleWarn", { m: mins }); }, Math.max(0, (mins - 2) * 60000));
    const b = card.querySelector('[data-act="resumeGame"]');
    if (b && root.contains(document.activeElement) === false) b.focus();
  }
}

// Keyboard: only while the game view is showing.
const KEYMAP = { ArrowLeft: INPUT.LEFT, ArrowRight: INPUT.RIGHT, ArrowDown: INPUT.SOFT_ON, ArrowUp: INPUT.CW, x: INPUT.CW, X: INPUT.CW, z: INPUT.CCW, Z: INPUT.CCW, " ": INPUT.HARD, c: INPUT.HOLD, C: INPUT.HOLD };
function onKeyDown(e) {
  if (state.view !== "game" || !state.game || !root || !root.open) return;
  if (e.target.closest && e.target.closest("input, select, textarea")) return;
  if (e.key === "p" || e.key === "P") { e.preventDefault(); state.game.paused ? state.game.start() : state.game.setPaused(true); return; }
  const code = KEYMAP[e.key];
  if (code == null) return;
  // Buttons keep Space/Enter for themselves when paused.
  if (state.game.paused) return;
  e.preventDefault();
  if (e.repeat) return;
  state.game.press(code);
}
function onKeyUp(e) {
  if (!state.game) return;
  const code = KEYMAP[e.key];
  if (code === INPUT.LEFT || code === INPUT.RIGHT || code === INPUT.SOFT_ON) state.game.release(code);
}
let keysOn = false;
// On the document, not the dialog: a view change can leave focus on <body>.
function attachKeys() { if (keysOn) return; keysOn = true; document.addEventListener("keydown", onKeyDown, true); document.addEventListener("keyup", onKeyUp, true); }
function detachKeys() { if (!keysOn) return; keysOn = false; document.removeEventListener("keydown", onKeyDown, true); document.removeEventListener("keyup", onKeyUp, true); }

// Touch: pointer events on the control pad only (the rest of the page scrolls normally).
function wireTouch(m) {
  m.querySelectorAll(".bba-pb[data-in]").forEach((b) => {
    const code = Number(b.dataset.in);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture && b.setPointerCapture(e.pointerId);
      b.classList.add("is-down");
      if (state.game && state.game.paused && state.game.st.phase === "play") state.game.start();
      state.game && state.game.press(code);
    });
    const up = () => { b.classList.remove("is-down"); state.game && state.game.release(code); };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("lostpointercapture", up);
    b.addEventListener("click", (e) => { if (e.detail === 0 && state.game) { state.game.press(code); state.game.release(code); } }); // keyboard on the pad
  });
}

async function loadWeekMini() {
  const box = main().querySelector("[data-week]");
  if (!box) return;
  try {
    const lb = await api("GET", "leaderboard");
    if (state.view !== "game") return;
    const rows = lb.top.slice(0, 4).map((r) => `<li class="${lb.me && lb.me.rank === r.rank ? "is-me" : ""}"><span>${String(r.rank).padStart(2, "0")}</span><span>${esc(r.username)}</span><b>${fmt(r.score)}</b></li>`).join("");
    box.innerHTML = `<h2 class="bba-wk-h"><span>${esc(t("thisWeek"))}</span><span class="bba-mono">${esc(remaining(lb.competition.endsAt))}</span></h2>
      <ol class="bba-wk">${rows || `<li class="bba-empty">${esc(t("noScores"))}</li>`}</ol>
      ${lb.thirdPlaceScore != null ? `<p class="bba-mono bba-target">${esc(t("nextTarget", { n: fmt(lb.thirdPlaceScore + 1) }))}</p>` : ""}
      <p class="bba-fine">${esc(lb.prizes.map((p) => pick(p, "benefit")).join(" · "))}</p>`;
  } catch {}
}

function remaining(endIso) {
  const ms = Math.max(0, Date.parse(endIso) - Date.now());
  return t("remaining", { d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000) });
}

// ---------- leaderboard ----------
async function loadBoard() {
  const box = main().querySelector("[data-lb]");
  try {
    if (state.lb === "mine") {
      const { runs } = await api("GET", "me/runs");
      box.innerHTML = `<ol class="bba-list">${runs.filter((r) => r.score != null).map((r) => `<li><span class="bba-mono">${esc(bkk(r.at, true))}</span><span>${esc(t("level"))} ${r.level}</span><span>${esc(r.weekly ? t("weeklyEntry") : r.choice === "spin" ? t("spinTitle") : "")}</span><b>${fmt(r.score)}</b></li>`).join("") || `<li class="bba-empty">—</li>`}</ol>`;
      return;
    }
    const lb = await api("GET", "leaderboard" + (state.lb === "alltime" ? "?scope=alltime" : ""));
    if (state.lb === "alltime") {
      box.innerHTML = list(lb.top, lb.me);
      return;
    }
    const [a, b, c] = lb.top;
    const prize = (r) => { const p = lb.prizes.find((x) => x.rank === r); return p ? pick(p, "benefit") : ""; };
    const pod = (r, cls) => r ? `<div class="bba-pod ${cls}"><span class="bba-rank">${r.rank}</span><p class="bba-mono">${esc(r.username)}</p><p class="bba-pscore">${fmt(r.score)}</p><p class="bba-mono bba-fine">${esc(prize(r.rank))}</p></div>` : `<div class="bba-pod ${cls} is-empty"><span class="bba-rank">${cls === "p1" ? 1 : cls === "p2" ? 2 : 3}</span><p class="bba-fine">—</p></div>`;
    const status = lb.competition.status === "final" ? t("final") : lb.competition.status === "open" ? remaining(lb.competition.endsAt) : t("pendingResults");
    box.innerHTML = `<p class="bba-mono bba-left">${esc(status)}</p>
      <div class="bba-podium">${pod(b, "p2")}${pod(a, "p1")}${pod(c, "p3")}</div>
      ${lb.me ? `<div class="bba-me"><span class="bba-you">${esc(t("you"))}</span><span class="bba-mono">${String(lb.me.rank).padStart(2, "0")}</span><span>${esc(lb.me.username)}</span><b>${fmt(lb.me.score)}</b><span class="bba-mono">${lb.me.toBeatThird ? esc(t("toBeat", { n: fmt(lb.me.toBeatThird) })) : ""}</span></div>` : ""}
      ${list(lb.top.slice(3), null, 4)}
      ${lb.top.length ? "" : `<p>${esc(t("noScores"))}</p>`}
      <p class="bba-fine">${esc(t("prizeNote"))} ${lb.prizes.some((p) => p.test) ? esc(t("testReward")) : ""}</p>`;
  } catch (err) { box.innerHTML = errorBox(err.code); }
}
function list(rows, me) {
  return `<ol class="bba-list">${rows.map((r) => `<li class="${me && me.rank === r.rank ? "is-me" : ""}"><span class="bba-mono">${String(r.rank).padStart(2, "0")}</span><span>${esc(r.username)}</span><span class="bba-mono">${esc(t("level"))} ${r.level}</span><b>${fmt(r.score)}</b></li>`).join("")}</ol>
    ${me && !rows.some((r) => r.rank === me.rank) ? `<div class="bba-me"><span class="bba-you">${esc(t("you"))}</span><span class="bba-mono">${String(me.rank).padStart(2, "0")}</span><span>${esc(me.username)}</span><b>${fmt(me.score)}</b></div>` : ""}`;
}

// ---------- wallet ----------
async function loadWallet() {
  const box = main().querySelector("[data-wallet]");
  try {
    const w = await api("GET", "me/rewards");
    const groups = ["available", "redeemed", "expired", "void"];
    const src = (c) => c.source === "weekly" && c.award ? t("weeklyRank", { r: c.award.rank }) : c.source === "score" ? t("fromScore") : c.source === "spin" ? t("fromSpin") : t("fromAdmin");
    const card = (c) => `<li class="bba-coupon is-${c.status}">
      <button type="button" class="bba-cbtn" data-coupon="${esc(c.id)}" ${c.status === "available" ? "" : 'aria-disabled="true"'}>
        <span class="bba-cben">${esc(pick(c, "benefit"))}</span><span class="bba-mono">${esc(src(c))}</span>
        <span class="bba-mono bba-fine">${esc(t(c.status))}${c.status === "available" ? " · " + esc(t("expires", { d: bkk(c.expiresAt) })) : ""}${c.test ? " · TEST" : ""}</span></button></li>`;
    const sections = groups.map((g) => {
      const list = w.coupons.filter((c) => c.status === g);
      return list.length ? `<h2 class="bba-lab">${esc(t(g))}</h2><ul class="bba-coupons">${list.map(card).join("")}</ul>` : "";
    }).join("");
    box.innerHTML = `<div class="bba-walletgrid"><div class="bba-card bba-mine">${sections || `<p>${esc(reward() ? t("noRewardsScore", { n: fmt(reward().target), benefit: benefit() }) : t("noRewards"))}</p>`}
        <hr><p class="bba-lab">${esc(t("points"))}</p>${w.points.entries.length ? `<p class="bba-mono">${esc(t("pointsBalance", { n: fmt(w.points.balance) }))}</p>` : `<p class="bba-fine">${esc(t("pointsNone"))}</p>`}</div>
      <div class="bba-receiptbox" data-receipt></div></div>`;
    const showReceipt = (c, focus = true) => {
      const r = box.querySelector("[data-receipt]");
      r.innerHTML = `<article class="bba-receipt" tabindex="-1">
        <p class="bba-rlogo">BURGERBRO!</p><p class="bba-mono bba-rsub">${esc(src(c))}</p><hr class="bba-dash">
        <p class="bba-rben">${esc(pick(c, "benefit"))}</p>
        ${c.test ? `<p class="bba-testmark">${esc(t("testReward"))}</p>` : ""}
        ${c.qrSvg ? `<div class="bba-qr">${c.qrSvg}</div><p class="bba-mono bba-code">${esc(c.backupCode)}</p><p class="bba-fine">${esc(t("backupCode"))}</p><p>${esc(t("showStaff"))}</p>` : `<p class="bba-mono">${esc(t(c.status))}</p>`}
        <hr class="bba-dash">
        <dl class="bba-dl bba-fine"><div><dt>${esc(t("expires", { d: "" }))}</dt><dd>${esc(bkk(c.expiresAt))}</dd></div>
          <div><dt>${esc(t("branches"))}</dt><dd>${esc(c.branches.map(branchName).join(", "))}</dd></div>
          <div><dt>${esc(t("conditions"))}</dt><dd>${esc(pick(c, "conditions"))}</dd></div></dl>
        <p class="bba-fine">${esc(t("channel"))}</p></article>`;
      if (focus) r.querySelector(".bba-receipt").focus();
    };
    box.querySelectorAll("[data-coupon]").forEach((b) => b.addEventListener("click", () => showReceipt(w.coupons.find((c) => c.id === b.dataset.coupon))));
    const first = w.coupons.find((c) => c.status === "available") || w.coupons[0];
    if (first) showReceipt(first, false);
  } catch (err) { box.innerHTML = errorBox(err.code); }
}

// ---------- the wheel: the server already chose; this only reveals it ----------
function wheelSvg(run) {
  const segs = (run.wheel && run.wheel.segments) || [];
  const odds = run.spin ? run.spin.odds : segs.map((s) => ({ id: s.id, weight: s.weight }));
  const total = odds.reduce((a, s) => a + s.weight, 0) || 1;
  const colors = ["#F1A62B", "#C42B1C", "#EDE2CC", "#6E150D", "#F5EEDF", "#E03A24", "#D8A35A"];
  let a0 = -90;
  const parts = [];
  const R = 100;
  odds.forEach((o, i) => {
    const sweep = (o.weight / total) * 360;
    const a1 = a0 + sweep;
    const rad = (d) => (d * Math.PI) / 180;
    const x0 = R + R * Math.cos(rad(a0)), y0 = R + R * Math.sin(rad(a0)), x1 = R + R * Math.cos(rad(a1)), y1 = R + R * Math.sin(rad(a1));
    const mid = a0 + sweep / 2;
    const lx = R + R * 0.66 * Math.cos(rad(mid)), ly = R + R * 0.66 * Math.sin(rad(mid));
    const seg = segs.find((s) => s.id === o.id) || { label_en: o.id, label_th: o.id };
    const fill = colors[i % colors.length];
    const dark = ["#C42B1C", "#6E150D", "#E03A24"].includes(fill);
    parts.push(`<path d="M${R},${R} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${fill}" stroke="#221511" stroke-width="1.5"/>`);
    if (sweep > 14) parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" transform="rotate(${(mid + 90).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" fill="${dark ? "#FFF9EE" : "#221511"}" font-size="${sweep > 40 ? 9 : 7}" font-family="Space Mono, monospace" font-weight="700">${esc(pick(seg, "label"))}</text>`);
    o._mid = mid;
    a0 = a1;
  });
  wheelSvg.odds = odds;
  return `<svg class="bba-wheel" viewBox="0 0 200 200" role="img" aria-label="${esc(t("odds"))}">${parts.join("")}<circle cx="100" cy="100" r="22" fill="#F5EEDF" stroke="#221511" stroke-width="4"/><text x="100" y="101" text-anchor="middle" dominant-baseline="middle" font-family="Anton, Impact, sans-serif" font-size="13" fill="#C42B1C">${esc(t("spin").toUpperCase())}</text></svg>`;
}

function spinWheel(run) {
  const svg = main().querySelector(".bba-wheel");
  const reveal = main().querySelector(".bba-reveal");
  const won = run.spin;
  const odds = wheelSvg.odds || [];
  const seg = odds.find((o) => o.id === won.promotionId);
  const mid = seg ? seg._mid + 90 : 0; // angle from the top pointer
  const turns = reduceMotion() ? 0 : 5;
  const final = turns * 360 + (360 - mid);
  const done = () => {
    reveal.hidden = false;
    reveal.innerHTML = `${won.coupon.test ? `<p class="bba-tag">${esc(t("testReward"))}</p>` : ""}<p class="bba-h2">${esc(t("niceOne"))}</p>
      <p class="bba-prize">${esc(pick(won.coupon, "benefit"))}</p><p>${esc(t("savedToRewards"))}</p>
      <div class="bba-actions"><button type="button" class="bba-btn bba-red" data-act="toWallet" data-autofocus>${esc(t("viewCoupon"))}</button><button type="button" class="bba-btn" data-act="play">${esc(t("playAgain"))}</button></div>`;
    reveal.querySelector("[data-autofocus]").focus();
    say(t("niceOne") + " " + pick(won.coupon, "benefit"));
    if (!reduceMotion()) confetti(reveal);
  };
  if (!turns) { svg.style.transform = `rotate(${final}deg)`; done(); return; }
  svg.style.transition = "transform 3.6s cubic-bezier(.12,.72,.18,1)";
  requestAnimationFrame(() => requestAnimationFrame(() => { svg.style.transform = `rotate(${final}deg)`; }));
  svg.addEventListener("transitionend", done, { once: true });
}

function confetti(el) {
  const box = document.createElement("div");
  box.className = "bba-confetti";
  box.setAttribute("aria-hidden", "true");
  const c = ["#C42B1C", "#F1A62B", "#58A33A", "#6A3A22", "#F5EEDF"];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement("i");
    s.style.setProperty("--x", (Math.random() * 2 - 1) * 140 + "px");
    s.style.setProperty("--y", -(60 + Math.random() * 110) + "px");
    s.style.setProperty("--r", Math.round(Math.random() * 540) + "deg");
    s.style.background = c[i % c.length];
    box.appendChild(s);
  }
  el.appendChild(box);
  setTimeout(() => box.remove(), 1300);
}

export default openArcade;
