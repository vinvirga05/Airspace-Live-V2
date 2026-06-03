# Airspace Live V2 — Deployment Guide
Build 7 · Aurora + Cyberpunk Aviation Display

---

## Folder structure

```
Airspace-Live V2/
  index.html          ← main app (Build 7)
  airlines/           ← airline logo overrides (IATA uppercase .png)
  manufacturers/      ← manufacturer logo overrides (lowercase key .png)
  DEPLOY.md           ← this file
```

All paths in index.html are relative. The folder is self-contained and ready to deploy as-is.

---

## Deploy to GitHub + Cloudflare Pages

### Step 1 — Push to GitHub

Option A: this folder is your entire repo root
```
cd "Airspace-Live V2"
git init
git add .
git commit -m "Build 7 — Airspace Live V2"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Option B: this folder lives inside a larger repo
- Cloudflare Pages supports deploying a sub-folder as the root.
- Set the **Root directory** in Cloudflare Pages settings to `Airspace-Live V2`.

### Step 2 — Connect Cloudflare Pages

1. Go to Cloudflare Dashboard → Workers & Pages → Create application → Pages
2. Connect your GitHub repo
3. Build settings:
   - **Framework preset:** None
   - **Build command:** (leave blank)
   - **Build output directory:** `/` (or `Airspace-Live V2` if it's a sub-folder)
4. Click **Save and Deploy**

Cloudflare Pages will serve `index.html` automatically at the root URL.

### Step 3 — Bake your location into the URL (recommended for ONN stick)

Append your coordinates so the app starts tracking immediately without needing the settings modal:

```
https://your-site.pages.dev/?lat=26.2026&lon=-80.0939&radius=5
```

Add `&demo` to test without live data:
```
https://your-site.pages.dev/?lat=26.2026&lon=-80.0939&radius=5&demo
```

---

## Test locally (Mac)

```bash
cd "Airspace-Live V2"
python3 -m http.server 8080
# open http://localhost:8080 in browser
```

Or open `index.html` directly in Chrome/Safari (most features work, CORS may block API calls).

---

## Test on ONN stick

1. Push to Cloudflare Pages (or any static host).
2. Open the browser app on the ONN stick.
3. Navigate to your Cloudflare Pages URL with lat/lon baked in.
4. Use the gear icon (⚙) to confirm settings if needed.
5. Tap **Demo flight** to verify the UI looks correct before going live.

---

## Confirm Build 7 is loaded

Look at the bottom-left corner of the screen. You should see:

```
build 7
```

If it shows an older build number, hard-refresh the page or append `?v=7` to bust the cache.

---

## Cache busting for Cloudflare Pages

Cloudflare Pages CDN caches aggressively. After deploying an update:

- **Option 1:** Append a version query: `?v=7` → `?v=8`
- **Option 2:** In Cloudflare Dashboard → Caching → Purge Everything
- **Option 3:** Hard-refresh in the ONN stick browser (usually long-press reload or clear browser cache in settings)

---

## Adding airline logos

Drop a transparent PNG into `airlines/` named by UPPERCASE IATA code:
```
airlines/DL.png    ← Delta
airlines/AA.png    ← American
airlines/UA.png    ← United
```

Logos should be white/light artwork on a transparent background for the dark theme.

## Adding manufacturer logos

Drop a transparent PNG into `manufacturers/` named by lowercase key:
```
manufacturers/boeing.png
manufacturers/airbus.png
```

---

## Future: phone controller hookup

The app exposes a `setMode(mode)` function on the global IIFE. To control it remotely:

```js
// In a controller page on the same origin:
// Use localStorage polling (simplest, no server needed)
localStorage.setItem("airspace.remote.cmd", JSON.stringify({ mode: "demo", ts: Date.now() }));

// In index.html (add this to the boot section):
setInterval(function() {
  var cmd = localStorage.getItem("airspace.remote.cmd");
  if (!cmd) return;
  var o = JSON.parse(cmd);
  if (Date.now() - o.ts < 5000) { setMode(o.mode); localStorage.removeItem("airspace.remote.cmd"); }
}, 1000);
```

Supported modes: `"idle"`, `"demo"`. Mode `"flight"` is set automatically by the main loop when an aircraft is detected.

---

## Data sources

| Data | Source | Notes |
|------|--------|-------|
| Live positions | adsb.lol → airplanes.live → adsb.fi | Three-source fallover |
| Route + airline | adsbdb /v0/callsign/ | Cached 12hr in sessionStorage |
| Aircraft details | adsbdb /v0/aircraft/ → hexdb.io | Two-source fallover |
| Weather | Open-Meteo | Free, no key, backs off 5min after failure |
| Airline logos | local airlines/ → avs.io CDN | Four-step fallback chain |
| Map tiles | CARTO dark (via Leaflet) | No API key required |

All sources are free, no API keys, and CORS-compatible for static hosting.
