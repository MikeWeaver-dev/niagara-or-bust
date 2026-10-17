# Deploying to yourdomain.com/game

The game is a standalone Vite + React app built with `base: '/game/'`, and the router basename is `/game`. It ships inside the Kids Table website's Firebase Hosting site, so it lives at `https://yourdomain.com/game/`.

## One-time setup in `KTWebsite`

1. **Add the `/game` rewrites to `KTWebsite/firebase.json`.** Put them *before* the existing `"**"` catch-all, otherwise the band site's React app swallows `/game/...` URLs:

```json
"rewrites": [
  { "source": "/game", "destination": "/game/index.html" },
  { "source": "/game/**", "destination": "/game/index.html" },
  { "source": "**", "destination": "/index.html" }
]
```

   Optionally, stop browsers from caching the game's HTML, so new versions show up right away. Add this next to the existing `/index.html` header rule:

```json
{
  "source": "/game/index.html",
  "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
}
```

2. **Link to the game with a plain `<a>`** from the band site, not a React Router `<Link>`. The game is a separate app, so it needs a full page load:

```jsx
<a href="/game/">Play Niagara or Bust!</a>
```

## Every time you update the game

```bash
# in NiagaraGame/
npm run build      # builds to dist/ with /game/ asset paths
npm run copy:kt    # copies dist/ into ../KTWebsite/public/game/

# in KTWebsite/
npm run deploy     # vite build && firebase deploy --only hosting
```

`copy:kt` looks for the band site at `../KTWebsite`. Point it somewhere else with `KT_DIR=/path/to/site npm run copy:kt`.

Vite copies `public/` into `dist/` as-is, so the game ends up at `KTWebsite/dist/game/`, which Firebase serves at `/game/`.

## Local playtesting with friends (same Wi-Fi)

```bash
npm install
npm run play       # builds, then serves on port 5173 on your local network
```

Vite prints a **Network** address like `http://192.168.x.x:5173/game/` (include the trailing slash; Firebase handles `/game` without it via the rewrite above). Friends on the same Wi-Fi (or the same phone hotspot) open that on their phones in Chrome. If Windows asks whether to allow Node.js through the firewall, click **Allow** for private networks.

Note: the Kids Table site's own dev server also defaults to port 5173, so don't run both at once (or change one port).
