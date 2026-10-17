# Deploying

The game is live at **https://kidstabletheband.com/games/niagaraorbust/**. It's served by the Kids Table website's Firebase Hosting site, but none of the game lives in that repo.

## How it works

The band site's deploy workflow (`kids-table-website/.github/workflows/firebase-hosting-merge.yml`) runs `node scripts/add-games.mjs` after building the band site. That script:

1. clones this repo (`main`, shallow),
2. runs `npm ci` and `npm run build -- --base=/games/niagaraorbust/`,
3. copies `dist/` into the band site's `dist/games/niagaraorbust/`.

Then the band site deploys as usual. In the band site's `firebase.json`:

* `/games/niagaraorbust` and `/games/niagaraorbust/**` rewrite to the game's `index.html` (before the band site's `**` catch-all), so deep links like `/games/niagaraorbust/shop` work.
* `/games/niagraorbust/...` (the common misspelling) redirects to the real URL.
* The game's HTML is sent with `no-cache`, so new versions show up right away. Its JS/CSS file names are content-hashed and cached for a year, like the band site's.

The band site's pages and bundle are untouched: the game only loads when someone visits `/games/niagaraorbust/`.

The router basename comes from Vite's `base`, so the same code works at `/games/niagaraorbust/` (production) and `/game/` (local playtesting).

If you link to the game from the band site, use a plain `<a href="/games/niagaraorbust/">`, not a React Router `<Link>`. The game is a separate app, so it needs a full page load.

## Shipping a game update

Push to this repo's `main`, then redeploy the band site. Either:

* push any commit to `kids-table-website`, or
* open **kids-table-website → Actions → Deploy to Firebase Hosting on merge → Run workflow**, or
* run `gh workflow run firebase-hosting-merge.yml -R MikeWeaver-dev/kids-table-website`.

If this repo fails to build, the band site's deploy fails too, and the previous version of the whole site stays live. Nothing half-deploys.

## Local playtesting with friends (same Wi-Fi)

```bash
npm install
npm run play       # builds, then serves on port 5173 on your local network
```

Vite prints a **Network** address like `http://192.168.x.x:5173/game/` (include the trailing slash). Friends on the same Wi-Fi (or the same phone hotspot) open that on their phones in Chrome. If Windows asks whether to allow Node.js through the firewall, click **Allow** for private networks.

Note: the Kids Table site's own dev server also defaults to port 5173, so don't run both at once (or change one port).
