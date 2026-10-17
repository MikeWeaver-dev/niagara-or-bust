# 🌊 Niagara or Bust!

A cartoon ragdoll game in the spirit of Happy Wheels: try to survive going over the **Horseshoe Falls**. It runs in the browser on Chrome, both desktop and mobile.

Start on the bank, pick your spot, jump in, paddle and dodge while the current drags you to the brink. Then go 188 feet straight down. Survive and you earn lumens. Don't survive and you earn lumens *and* a gore bonus.

## How to play

| | Desktop | Mobile |
|---|---|---|
| Walk on the bank / steer | ◀ ▶ or A / D | drag on the left half of the screen |
| Paddle faster / slower | ▲ ▼ or W / S | drag up / down |
| Jump in / ability / mini-game | Space (or Enter / E / Shift) | big button on the right |
| Shoot back (Hard Mode, once you grab the slingshot) | F or X | SHOOT button |
| Pause | Esc / P | ❚❚ button |

* **Lanes matter.** The middle of the river is the **Green Channel**: fastest current, but deep water at the bottom (+12%). The edges are slower but end in **rocks** (-10%).
* **Your live survival odds** are always on screen. Damage lowers them, and so does a wrecked vessel (then you're swimming). Going faster helps you clear the rocks at the base.
* **The drop is physics.** Each vessel has its own mini-game, then the dice roll on your final odds. The bottom is full of rocks: round boulders, **pointy spikes** (impaled) and **flat slabs** (pancaked).
* **Flukes.** About 1 trip in 100 you get struck by lightning, and about 1 in 100 a bear jumps you from the bank. No reason. That's nature.

## Hard Mode

Turn it on in **Settings** or with the **😈 HARD** chip on the loadout screen. Tourists on the banks shoot at you with **slingshots and BB guns**, and they can kill you before you reach the edge. Your corpse still floats over (it never snags on rocks) and still hits the bottom in a mess. Grab the **floating slingshot** partway down the river to fire back (F / SHOOT); it auto-aims at the nearest shooter, and they splatter too.

## Secrets

* **The cave behind the falls.** Only the Golden Goose can reach it: after you go over, hold ◀ to hug the cliff and glide down into the cave mouth (flap to slow down). Inside is a message from Annie. Leaving is... less dignified. (Cheat: **Show Me The Cave** marks it.)
* Playing as **Kacey**? Someone from Canadian border services is waiting at the edge of the falls. They'd like to pet you.

## Vessels (unlock in order)

| Vessel | Base | River ability | Drop mini-game |
|---|---|---|---|
| Absolutely Nothing | 18% | PANIC! (swim faster) | Pencil-dive ring timing |
| Life Jacket | 22% | BOB (hop) | Hold to inflate the vest, let go in the green (don't pop it) |
| Surfboard | 22% | OLLIE (+ SHRED lumens in rapids) | **Surf down the face of the falls**, keep your balance |
| Oak Barrel | 34% | BRACE (-75% damage) | Mash to stuff it with pillows |
| Kayak | 30% | ROLL (invulnerable) | Tilt the nose into the green, then BOOF |
| Canoe (+ Gary) | 33% | POWER STROKE (dash) | Air-paddle left/right in rhythm with Gary |
| Hamster Ball | 42% | BOUNCE (jump) | Steer your landing into the deep-water zone |
| Jet Ski + Parachute | 34% | TURBO (smash logs) | **Deploy the chute** in the green altitude zone |
| The Golden Goose | **100%** | FLAP (fly) + lays golden eggs | Glide down like royalty (flap to float, steer anywhere) |

The Golden Goose unlocks last, after *everything* else, and you always survive with it.

## Characters

* **Annie Edson Taylor** (1901): the first person to survive in a barrel, on her 63rd birthday. Her cat tags along.
* **Lil' Timmy**, age 7: cartoon physics protect him. Bonks and a ghost instead of gore (the only character without it).
* **Kacey the Rainbow Giraffe**: four legs, a very long neck, and rainbow glitter gore.
* **Bobby Leach** (1911): steel barrel. Later died after slipping on an orange peel. Watch the beach.
* **Jean Lussier** (1928): rode a giant rubber ball with 32 inner tubes.

## Economy

* Every attempt pays **lumens**: river pickups, skill bonuses, a survival bonus, and a gore bonus for messy deaths.
* Each unlock gives **+15% lumen earnings** (ramping), so later unlocks come faster.
* **Settings → Prices → ECONOMY** (the default) makes everything cheap. **NORMAL** is 6x prices.

## Cheats (all available from the start)

The cheat menu has 22 toggles: **Salmon Mode** (swim upstream and never go over... until a bear eats you in the most disgusting nature documentary ever made), Try Everything, God Mode, Always Die, Gore Galore, Explosive Impact, Explosive Diarrhea, Big Head, Tiny Mode, Moon Gravity, Bullet Time, Noodle Limbs, Disco Falls, Super Paddle, Invincible Hull, Rock Party, Lazy River, Skip to the Edge, Lumen Rain, Lightning Magnet, Surprise Bear and Show Me The Cave. There are also quick buttons for +500 / +5000 lumens, Unlock Everything and Reset, plus a **GO!** button on the Shop and Cheats screens that jumps straight into a run.

Secret codes: `SALMON`, `IDDQD`, `GOD`, `BLOODBATH`, `KABOOM`, `POOP`, `ZAP`, `BEAR`, `GRASSHOPPER`, `BIGHEAD`, `DISCO`, `MOON`, `MONEY`, `LUMENS`, `GOOSE`, `UNLOCKALL`, `HONK`.

## Gore

The gore setting can be **OFF / ON / MAX** (MAX is the default). Adults get streaking blood, spurting arteries, torn stumps with bone and marrow, chunks of meat, organs and intestines, blood on the rocks, in the water and splattered across the screen. Kacey bleeds rainbow glitter. Every now and then a death is **explosive diarrhea** instead. Characters shout their (spoken) last words on the way down. OFF turns every death into cartoon bonks and ghosts, so it's kid friendly.

Knocked out in the river? You come to after 5 seconds.

## Tech

* Vite + React 18 + React Router 6 (basename `/game`).
* All game rendering is hand-drawn vector art on a 2D `<canvas>`, so there are no image assets.
* A custom Verlet physics engine runs the ragdolls, with breakable joints for the gore.
* The whole soundtrack and every sound effect are **synthesized live with the Web Audio API**. There are no audio files.
* Progress is saved in `localStorage`, per device.

```
src/
  audio/      audio.js (synth SFX engine), music.js (sequencer + 7 original songs)
  data/       characters, vessels, cheats, death/survival messages
  game/       Game.js loop, river.js (bank + river + salmon), drop.js (the falls),
              physics.js, ragdoll.js, fx.js particles, *Art.js renderers, hud.js, input.js
  components/ React screens: Title, Play (loadout/game/results), Shop, Cheats, Settings, HowTo
```

## Run it

```bash
npm install
npm run dev     # dev server (also on your LAN)
npm run play    # production build + LAN server at http://<your-ip>:5173/game/
```

See **[DEPLOY.md](DEPLOY.md)** for publishing it at `yourdomain.com/game` on Firebase Hosting.

*Going over Niagara Falls is illegal and extremely dangerous. This is a cartoon. Stay on the bank and buy a hot dog.*
