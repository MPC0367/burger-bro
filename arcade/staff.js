// The staff page: look up a coupon, then confirm the redemption as a separate action.
import { api, opKey, available } from "./api.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const BR = { rama9: "Rama 9 · พระราม 9", pattanakarn: "Pattanakarn · พัฒนาการ" };
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) + " (Bangkok)" : "—");
const ERR = {
  staff_login_failed: "Username or password not recognised.", rate_limited: "Too many attempts. Wait a while and try again.",
  coupon_not_found: "No coupon with that code. Check the code, or ask the customer to open it again in the arcade.",
  already_redeemed: "Already used. Do not give the benefit again.", coupon_expired: "This coupon has expired.",
  coupon_void: "This coupon was withdrawn by Burger Bro.", wrong_branch: "This coupon isn't valid at this branch.",
  reason_required: "Please write a reason (at least 3 characters).", network: "No connection. Try again.",
};
const errText = (e) => ERR[e.code] || "Something went wrong (" + (e.code || "error") + ").";
let me = null;
let branches = [];

async function boot() {
  if (!(await available())) { document.querySelector("main").innerHTML = '<p class="card">The arcade server isn\'t running, so coupons can\'t be checked here.</p>'; return; }
  const s = await api("GET", "staff/session");
  me = s.staff; branches = s.branches || ["rama9", "pattanakarn"];
  paint();
}

function paint() {
  $("#signin").hidden = !!me;
  $("#redeem").hidden = !me;
  $("#admin").hidden = !(me && me.role === "admin");
  $("#who").innerHTML = me ? `${esc(me.username)} · ${esc(me.role)} · ${esc(BR[me.branch] || me.branch)}<br><button type="button" id="out">Sign out</button>` : "";
  if (me) {
    $("#out").onclick = async () => { await api("POST", "staff/logout"); location.reload(); };
    $("#branch").innerHTML = branches.map((b) => `<option value="${b}" ${b === me.branch ? "selected" : ""}>${esc(BR[b] || b)}</option>`).join("");
    $("#code").focus();
    if (me.role === "admin") loadAdmin();
  } else $("#u").focus();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginMsg").textContent = "";
  try { const r = await api("POST", "staff/login", { username: $("#u").value, password: $("#pw").value }); me = r.staff; branches = r.branches; $("#pw").value = ""; paint(); }
  catch (err) { $("#loginMsg").textContent = errText(err); }
});

// ---------- 01 look up ----------
function query(v) {
  const s = v.trim();
  return /^BBC1:/.test(s) ? { token: s } : { code: s };
}
async function lookUp(value) {
  $("#lookMsg").textContent = "";
  $("#result").hidden = true;
  try {
    const r = await api("POST", "staff/coupons/inspect", { ...query(value), branch: $("#branch").value });
    showCoupon(r.coupon);
  } catch (err) { $("#lookMsg").textContent = errText(err); }
}
$("#lookForm").addEventListener("submit", (e) => { e.preventDefault(); lookUp($("#code").value); });

// ---------- 02 inspect ----------
function showCoupon(c, done = null) {
  const branch = $("#branch").value;
  const ok = c.status === "available" && c.branchOk;
  const reason = c.status !== "available" ? ERR[{ redeemed: "already_redeemed", expired: "coupon_expired", void: "coupon_void" }[c.status]] : !c.branchOk ? ERR.wrong_branch : "";
  const box = $("#result");
  box.hidden = false;
  box.innerHTML = `
    <span class="status s-${c.status}">${esc(c.status)}</span> ${c.test ? '<span class="test">TEST — no redemption value</span>' : ""}
    <p class="benefit">${esc(c.benefit_en)}</p><p class="th">${esc(c.benefit_th)}</p>
    <dl><dt>Player</dt><dd>${esc(c.username)}</dd><dt>For</dt><dd>${esc(c.title_en)}</dd>
      <dt>Branches</dt><dd>${esc(c.branches.map((b) => BR[b] || b).join(", "))} ${c.branchOk ? '<span class="ok">✓ valid here</span>' : '<span class="bad">✗ not this branch</span>'}</dd>
      <dt>Expires</dt><dd>${esc(when(c.expiresAt))}</dd><dt>Conditions</dt><dd>${esc(c.conditions_en)} <span class="th">${esc(c.conditions_th)}</span></dd>
      <dt>Backup code</dt><dd class="code">${esc(c.backupCode)}</dd>
      ${c.redeemed ? `<dt>Used</dt><dd>${esc(when(c.redeemed.at))} · ${esc(BR[c.redeemed.branch] || c.redeemed.branch)} · ref ${esc(c.redeemed.reference)}</dd>` : ""}</dl>
    ${reason ? `<p class="msg">${esc(reason)}</p>` : ""}
    ${done ? `<p class="msg good">Redeemed · ใช้สิทธิ์แล้ว — reference ${esc(done)}. Time and staff are recorded.</p>` : ""}
    <div class="row">${ok && !done ? `<button class="mustard" type="button" id="confirm">Confirm redemption · ยืนยันใช้สิทธิ์</button>` : ""}<button type="button" id="again">${done ? "Done · next coupon" : "Look up another"}</button></div>
    <p class="msg" id="redeemMsg" role="alert"></p>`;
  const key = opKey(); // one key per inspected coupon: a double tap redeems once
  if ($("#confirm")) $("#confirm").onclick = async () => {
    $("#confirm").disabled = true;
    try {
      const r = await api("POST", "staff/coupons/redeem", { couponId: c.id, branch, key });
      showCoupon(r.coupon, r.reference);
    } catch (err) {
      if (err.body && err.body.coupon) showCoupon(err.body.coupon);
      $("#redeemMsg").textContent = errText(err);
    }
  };
  $("#again").onclick = () => { box.hidden = true; $("#code").value = ""; $("#code").focus(); };
  box.querySelector(".status").setAttribute("tabindex", "-1");
  box.querySelector(".status").focus();
}

// ---------- camera scanning where the browser can decode QR codes ----------
if ("BarcodeDetector" in window) {
  $("#scanBtn").hidden = false;
  let stream = null;
  $("#scanBtn").onclick = async () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; $("#video").hidden = true; return; }
    try {
      const det = new BarcodeDetector({ formats: ["qr_code"] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = $("#video"); v.srcObject = stream; v.hidden = false; await v.play();
      const loop = async () => {
        if (!stream) return;
        const codes = await det.detect(v).catch(() => []);
        const hit = codes.find((c) => /^BBC1:/.test(c.rawValue));
        if (hit) { stream.getTracks().forEach((t) => t.stop()); stream = null; v.hidden = true; $("#code").value = "(scanned)"; lookUp(hit.rawValue); return; }
        requestAnimationFrame(loop);
      };
      loop();
    } catch { $("#lookMsg").textContent = "The camera isn't available. Type the backup code instead."; }
  };
}

// ---------- administration ----------
function reason(label) { const r = window.prompt(label + "\nReason (recorded):"); return r && r.trim().length >= 3 ? r.trim() : null; }
async function loadAdmin() {
  const o = await api("GET", "admin/overview");
  $("#weeks").innerHTML = `<table><tr><th>Week (Mon, Bangkok)</th><th>Ends</th><th>Status</th></tr>${o.competitions.map((c) => `<tr><td>${esc(c.id)}</td><td>${esc(when(c.ends_at))}</td><td>${esc(c.status)}${c.pending_reason ? " · " + esc(c.pending_reason) : ""}</td></tr>`).join("")}</table>
    <h3>Awards</h3><table><tr><th>Week</th><th>Place</th><th>Player</th></tr>${o.awards.map((a) => `<tr><td>${esc(a.competition_id)}</td><td>${a.rank}</td><td>${esc(a.username)}</td></tr>`).join("") || "<tr><td colspan=3>None yet</td></tr>"}</table>`;
  $("#held").innerHTML = o.held.length ? `<table><tr><th>Player</th><th>Score</th><th>Why</th><th></th></tr>${o.held.map((h) => `<tr><td>${esc(h.username)}</td><td>${h.score}</td><td>${esc(h.review_reason)}</td><td><button data-review="${h.id}" data-d="clear">Clear</button> <button data-review="${h.id}" data-d="disqualify">Disqualify</button></td></tr>`).join("")}</table>` : "<p>None.</p>";
  $("#promos").innerHTML = `<table><tr><th>Prize</th><th>Weight</th><th>Chance</th><th>Stock left</th><th>On</th><th></th></tr>${o.promotions.map((p) => {
    const seg = o.wheel.segments.find((s) => s.id === p.id);
    return `<tr><td>${esc(p.label_en)} ${p.test ? '<span class="test">TEST</span>' : ""}<br><span class="note">${esc(p.benefit_en)} · ${esc(p.branches.join(", "))}</span></td><td>${p.weight}</td><td>${seg ? (seg.chance * 100).toFixed(1) + "%" : "—"}</td><td>${p.inventory == null ? "unlimited" : p.inventory - p.issued}</td><td>${p.active ? "yes" : "no"}</td><td><button data-promo="${esc(p.id)}">Change</button></td></tr>`;
  }).join("")}</table>`;
  $("#prizes").innerHTML = `<table><tr><th>Place</th><th>Benefit</th><th>Expiry</th></tr>${o.prizes.ranks.map((r) => `<tr><td>${r.rank}</td><td>${esc(r.benefit_en)} ${r.test ? '<span class="test">TEST</span>' : ""}</td><td>${r.expiry_days} days</td></tr>`).join("")}</table><p class="note">Change these in config/prizes.json or through the API (POST /api/admin/prizes) with a reason.</p>`;
  $("#sms").innerHTML = o.sms.length ? `<table><tr><th>Kind</th><th>Status</th><th>Tries</th><th>Error</th><th></th></tr>${o.sms.map((m) => `<tr><td>${esc(m.kind)}</td><td>${esc(m.status)}</td><td>${m.attempts}</td><td>${esc(m.last_error || "")}</td><td>${m.status === "failed" ? `<button data-sms="${m.id}">Retry</button>` : "checking"}</td></tr>`).join("")}</table>` : "<p>None.</p>";
  $("#ip").innerHTML = o.promotions.map((p) => `<option value="${esc(p.id)}">${esc(p.benefit_en)}</option>`).join("");
  $("#audit").innerHTML = `<table><tr><th>When</th><th>Who</th><th>What</th><th>Reason</th></tr>${o.audits.map((a) => `<tr><td>${esc(when(a.at))}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.reason || "")}</td></tr>`).join("")}</table>`;
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const msg = $("#adminMsg");
  try {
    if (b.dataset.review) { const r = reason(`${b.dataset.d} this run?`); if (!r) return; await api("POST", `admin/runs/${b.dataset.review}/review`, { decision: b.dataset.d, reason: r }); }
    else if (b.dataset.promo) {
      const w = window.prompt("Weight (0 takes it off the wheel):"); if (w == null) return;
      const inv = window.prompt("Stock (blank = unlimited):"); if (inv == null) return;
      const on = window.confirm("Keep this prize switched on?");
      const r = reason("Change " + b.dataset.promo); if (!r) return;
      await api("POST", `admin/promotions/${b.dataset.promo}`, { weight: Number(w), inventory: inv.trim() === "" ? null : Number(inv), active: on, reason: r });
    } else if (b.dataset.sms) { const r = reason("Retry this message?"); if (!r) return; await api("POST", `admin/sms/${b.dataset.sms}/retry`, { reason: r }); }
    else if (b.id === "finalizeBtn") { const r = await api("POST", "admin/finalize"); msg.className = "msg good"; msg.textContent = JSON.stringify(r.results); }
    else return;
    loadAdmin();
  } catch (err) { msg.className = "msg"; msg.textContent = errText(err); }
});
$("#issueForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#adminMsg");
  try { await api("POST", "admin/coupons/issue", { username: $("#iu").value, promotionId: $("#ip").value, reason: $("#ir").value, key: opKey() }); msg.className = "msg good"; msg.textContent = "Coupon issued."; e.target.reset(); loadAdmin(); }
  catch (err) { msg.className = "msg"; msg.textContent = errText(err); }
});
$("#pointsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#adminMsg");
  try { const r = await api("POST", "admin/points", { username: $("#pu").value, delta: Number($("#pd").value), sourceRef: $("#ps").value, reason: $("#pr").value }); msg.className = "msg good"; msg.textContent = r.duplicate ? "Already recorded under that source reference — nothing added." : "Points recorded."; e.target.reset(); }
  catch (err) { msg.className = "msg"; msg.textContent = errText(err); }
});

boot();
