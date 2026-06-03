# Airspace Live V2 — Deployment Guide
Build 12 · Aurora + Cyberpunk Aviation Display · Phone Controller

---

## Folder structure

```
Airspace-Live V2/
  index.html          ← main wall display (Build 12)
  controller.html     ← phone controller page (Build 12)
  airlines/           ← airline logo overrides (IATA uppercase .png)
  manufacturers/      ← manufacturer logo overrides (lowercase key .png)
  functions/
    api/
      state.js        ← Cloudflare Pages Function (GET + POST /api/state)
  DEPLOY.md           ← this file
```

---

## Build 12 — What's new

- Phone controller page (`controller.html`) — open on any phone browser
- Cloudflare KV stores screen state (`functions/api/state.js`)
- Wall display polls `/api/state` every 3 seconds for remote updates
- New modes: `weather`, `clock`, `message` (with typed custom message)
- `demo-flight` and `demo-idle` controllable remotely
- Remote status dot next to build marker (green = connected, red = offline)
- Screen ID shown in the gear settings modal

---

## Deploy to GitHub + Cloudflare Pages

### Step 1 — Push to GitHub

```bash
cd "Airspace-Live V2"
git add .
git commit -m "Build 12 — phone controller system"
git push
```

### Step 2 — Connect Cloudflare Pages (first time)

1. Cloudflare Dashboard → Workers & Pages → Create application → Pages
2. Connect your GitHub repo
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (or `Airspace-Live V2` if it's a sub-folder)
4. Click **Save and Deploy**

Cloudflare Pages automatically detects `functions/` and deploys the API endpoints.

---

## Step 3 — Create the KV namespace

1. Cloudflare Dashboard → **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it anything you like, e.g. `airspace-state`
4. Click **Add**

---

## Step 4 — Bind the KV namespace to your Pages project

1. Cloudflare Dashboard → Workers & Pages → your Pages project
2. **Settings** → **Functions** → **KV namespace bindings**
3. Click **Add binding**
   - **Variable name:** `AIRSPACE_STATE`  ← must be exactly this
   - **KV namespace:** select `airspace-state` (what you named it above)
4. Click **Save**

---

## Step 5 — Set the controller PIN (secret)

1. Same Pages project → **Settings** → **Environment variables**
2. Click **Add variable**
   - **Variable name:** `CONTROLLER_TOKEN`
   - **Value:** choose a PIN/password, e.g. `hunter2`  *(make it something only you know)*
   - **Encrypt:** ✅ tick the "Encrypt" checkbox — keeps it hidden from logs
3. Click **Save**
4. **Redeploy** the project so the new variable takes effect:
   Deployments → latest deployment → **Retry deployment**

> **Security note:** `GET /api/state` is public (no token required — the display only reads).
> `POST /api/state` requires the `CONTROLLER_TOKEN`. Anyone with your Cloudflare Pages URL
> can read the state (lat/lon, mode) but cannot change it without the PIN.

---

## Step 6 — Open on your devices

**Wall display (ONN stick):**
```
https://your-site.pages.dev/?lat=26.2026&lon=-80.0939&radius=5
```

**Phone controller:**
```
https://your-site.pages.dev/controller.html
```

On the controller page:
1. **Screen ID** — leave as `main-wall` (default) or match what's shown in the display's gear modal
2. **PIN** — enter the `CONTROLLER_TOKEN` value you set in Step 5
3. Tap **Connect**

The controller saves your screen ID and PIN in the phone's localStorage — you won't need to re-enter them.

---

## Confirm Build 12 is loaded

Look at the bottom-left of the wall display. You should see:

```
● build 12
```

The `●` dot is the remote controller indicator:
- **Dim gray** — polling started but no successful response yet (normal before deploy)
- **Green** — Cloudflare KV is reachable, controller is active
- **Red** — API temporarily unreachable (display keeps running on last settings)

---

## Test locally with Wrangler (optional)

Requires [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/):

```bash
npm install -g wrangler
cd "Airspace-Live V2"
wrangler pages dev . --kv AIRSPACE_STATE
```

Then open `http://localhost:8788` (display) and `http://localhost:8788/controller.html` (controller).

For local dev, set a local token by adding `--binding CONTROLLER_TOKEN=mypin` to the wrangler command.

**Without Wrangler:** open `index.html` directly in Chrome. The remote polling will silently fail (no `/api/state` endpoint locally) — the display runs entirely on local settings as normal.

---

## Test on the ONN stick

1. Push to Cloudflare Pages and confirm Build 12 is deployed
2. Open the browser app on the ONN stick
3. Navigate to your Pages URL with lat/lon baked in:
   `https://your-site.pages.dev/?lat=26.2026&lon=-80.0939&radius=5`
4. Watch the `●` dot in the bottom-left — it should turn green within a few seconds
5. On your phone, open `controller.html`, connect, and tap a mode button
6. The wall display should update within 3 seconds

---

## Test on your phone

1. Open `https://your-site.pages.dev/controller.html` in Safari or Chrome
2. Enter Screen ID `main-wall` and your PIN
3. Tap **Connect** — status should show "Connected"
4. Tap **Demo Flight** — wall display should show the demo within 3 s
5. Tap **Idle** — wall display should return to idle
6. Type a message, tap **Send Message to Screen** — display should show the message
7. Tap **Return to Flight** — live tracking resumes

---

## URL parameters (still work as before)

| Parameter | Example | Effect |
|-----------|---------|--------|
| `lat` | `?lat=26.2026` | Set latitude |
| `lon` | `?lon=-80.0939` | Set longitude |
| `radius` | `?radius=5` | Search radius in miles |
| `dist` | `?dist=km` | Distance units |
| `temp` | `?temp=c` | Temperature unit |
| `demo` | `?demo` | Start in demo flight mode |

---

## Changing the screen ID

The default screen ID is `main-wall`. To use a different one:

1. In the ONN stick browser, open the gear settings (⚙ icon, top-right)
2. The current Screen ID is shown at the bottom of the settings card
3. To change it, add `?screenId=my-screen` to the URL:
   `https://your-site.pages.dev/?lat=26.2026&lon=-80.0939&radius=5&screenId=my-screen`
   *(This requires a small code change to read from URL params — or just edit `remoteScreenId` in `index.html`)*
4. On the controller, enter the same screen ID before connecting

For now the default `main-wall` works for a single screen setup.

---

## Cache busting for Cloudflare Pages

After deploying an update:

- **Option 1:** Append a version query: `?v=12`
- **Option 2:** Cloudflare Dashboard → Caching → Purge Everything
- **Option 3:** Hard-refresh on the ONN stick browser (long-press reload or clear browser cache)

---

## Mode reference

| Mode | What the screen shows |
|------|----------------------|
| `flight` | Live aircraft tracking (default) |
| `idle` | Clock + weather, radar sweep |
| `weather` | Idle scene (weather + clock) |
| `clock` | Idle scene (clock + weather) |
| `message` | Custom message full-screen |
| `demo-flight` | Demo Delta flight with fake data |
| `demo-idle` | Demo idle with fake weather data |

> `weather` and `clock` both display the idle scene in Build 12.
> Dedicated layouts can be added in a future build.

---

## Adding airline logos

Drop a transparent PNG into `airlines/` named by UPPERCASE IATA code:
```
airlines/DL.png    ← Delta
airlines/AA.png    ← American
```

## Adding manufacturer logos

Drop a transparent PNG into `manufacturers/` named by lowercase key:
```
manufacturers/boeing.png
manufacturers/airbus.png
```

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
| Screen state | Cloudflare KV via Pages Function | Build 12 — controller system |

All aviation/weather sources are free, no API keys, CORS-compatible for static hosting.
