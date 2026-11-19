// The arcade's server. The address comes from <meta name="bb-arcade-api"> or
// window.BB_ARCADE_API; by default the same origin's /api/ (the local server serves the
// site and the API together). No arcade server answering = the arcade says so.
let csrf = "";
let base = null;

export function apiBase() {
  if (base) return base;
  const meta = document.querySelector('meta[name="bb-arcade-api"]');
  const v = window.BB_ARCADE_API || (meta && meta.content) || "/api/";
  base = new URL(v, location.href).href.replace(/\/?$/, "/");
  return base;
}

export class ApiError extends Error {
  constructor(status, code, body) { super(code); this.status = status; this.code = code; this.body = body || {}; }
}

export async function api(method, path, body, { timeout = 15000 } = {}) {
  const headers = {};
  if (method !== "GET") { headers["content-type"] = "application/json"; if (csrf) headers["x-csrf-token"] = csrf; }
  let res;
  try {
    res = await fetch(apiBase() + path.replace(/^\//, ""), {
      method, headers, credentials: "include", cache: "no-store",
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, "network");
  }
  let json = null;
  try { json = await res.json(); } catch {}
  if (json && json.csrf) csrf = json.csrf;
  if (!res.ok) throw new ApiError(res.status, (json && json.error) || "generic", json);
  return json;
}

export async function available() {
  try { const r = await api("GET", "health", null, { timeout: 5000 }); return !!(r && r.ok); } catch { return false; }
}

// A key for operations the server de-duplicates.
export function opKey() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 64);
}
