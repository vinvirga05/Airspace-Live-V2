// Airspace Live — Build 12
// Cloudflare Pages Function: /api/state
// GET  ?screenId=main-wall  → read state from KV
// POST { screenId, token, ...fields } → write state to KV
//
// Required bindings (Cloudflare Pages > Settings > Functions):
//   KV namespace binding:        AIRSPACE_STATE
//   Environment variable (secret): CONTROLLER_TOKEN

const DEFAULT_STATE = {
  screenId:     "main-wall",
  mode:         "flight",
  radiusMi:     5,
  dist:         "mi",
  temp:         "f",
  lat:          null,
  lon:          null,
  theme:        "aurora-cyberpunk",
  demo:         false,
  message:      "",
  refreshToken: 0,
  updatedAt:    0
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control":                "no-store, no-cache, must-revalidate"
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

// Strip anything that isn't a safe key character; clamp to 64 chars
function sanitizeId(raw) {
  return ((raw || "main-wall") + "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || "main-wall";
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // ── CORS preflight ────────────────────────────────────────────────
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── GET — read current state (no auth required) ───────────────────
  if (method === "GET") {
    const url      = new URL(request.url);
    const screenId = sanitizeId(url.searchParams.get("screenId"));
    const kv       = env.AIRSPACE_STATE;

    if (!kv) {
      // KV not yet bound — return default so the screen still works
      return json({ ...DEFAULT_STATE, screenId,
        _warn: "KV namespace AIRSPACE_STATE is not bound yet. See DEPLOY.md." });
    }

    try {
      const raw   = await kv.get("screen:" + screenId);
      const state = raw ? JSON.parse(raw) : { ...DEFAULT_STATE, screenId };
      return json(state);
    } catch (e) {
      return json({ ...DEFAULT_STATE, screenId });
    }
  }

  // ── POST — update state (token required) ─────────────────────────
  if (method === "POST") {
    const requiredToken = env.CONTROLLER_TOKEN;
    if (!requiredToken) {
      return json({
        ok: false,
        error: "CONTROLLER_TOKEN is not configured. Add it in Cloudflare Pages → Settings → Environment variables (mark as Secret)."
      }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.token || body.token !== requiredToken) {
      return json({ ok: false, error: "Invalid token" }, 401);
    }

    const kv = env.AIRSPACE_STATE;
    if (!kv) {
      return json({
        ok: false,
        error: "KV namespace AIRSPACE_STATE is not bound. Bind it in Cloudflare Pages → Settings → Functions → KV namespace bindings."
      }, 500);
    }

    const screenId = sanitizeId(body.screenId);

    // Read existing state, merge update
    let existing = { ...DEFAULT_STATE, screenId };
    try {
      const raw = await kv.get("screen:" + screenId);
      if (raw) existing = { ...JSON.parse(raw), screenId };
    } catch (e) {}

    // Only allow safe fields — never let caller write arbitrary keys
    const ALLOWED = ["mode", "radiusMi", "dist", "temp", "lat", "lon",
                     "message", "refreshToken", "demo"];
    const updated = { ...existing };
    for (const key of ALLOWED) {
      if (body[key] !== undefined) updated[key] = body[key];
    }
    updated.updatedAt = Date.now();
    updated.screenId  = screenId;

    await kv.put("screen:" + screenId, JSON.stringify(updated));

    return json({ ok: true, state: updated });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS });
}
