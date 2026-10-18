import { useSyncExternalStore } from 'react';
import { CHARACTERS } from './data/characters.js';
import { CRAFTS } from './data/crafts.js';
import { CHEATS } from './data/cheats.js';

const KEY = 'niagara-or-bust-save-v1';

const defaultCheats = () => Object.fromEntries(CHEATS.map((c) => [c.id, false]));

export const defaultSave = () => ({
  lumens: 0,
  lifetimeLumens: 0,
  owned: { characters: ['annie'], crafts: ['nothing'] },
  selected: { character: 'annie', craft: 'nothing' },
  cheats: defaultCheats(),
  settings: {
    music: 0.55,
    sfx: 0.85,
    gore: 'max', // off | on | max
    economy: 'test', // test (cheap) | normal
    shake: true,
    touch: 'auto', // auto | on | off
    hard: false, // hard mode: bank snipers can kill you before the falls
  },
  stats: { runs: 0, survived: 0, died: 0, streak: 0, bestStreak: 0, limbs: 0, bears: 0, bestOdds: 0 },
});

function load() {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    return {
      ...base,
      ...s,
      owned: { ...base.owned, ...(s.owned || {}) },
      selected: { ...base.selected, ...(s.selected || {}) },
      cheats: { ...base.cheats, ...(s.cheats || {}) },
      settings: { ...base.settings, ...(s.settings || {}) },
      stats: { ...base.stats, ...(s.stats || {}) },
    };
  } catch {
    return base;
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage full: game still works, just won't remember */
  }
}

export const store = {
  get: () => state,
  set(updater) {
    const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    state = next;
    persist();
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSave(selector = (s) => s) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

// ---------- Economy ----------

export const PRICE_SCALE = { test: 1, normal: 6 };

export function priceOf(item, save = state) {
  return Math.round(item.price * (PRICE_SCALE[save.settings.economy] || 1));
}

// Every unlock beyond the starters makes lumens flow faster ("ramping").
export function lumenMultiplier(save = state) {
  const n = save.owned.characters.length - 1 + (save.owned.crafts.length - 1);
  return 1 + n * 0.15;
}

export const isOwned = (kind, id, save = state) =>
  (kind === 'character' ? save.owned.characters : save.owned.crafts).includes(id);

// Classic vessels unlock in order (band instruments can be bought any time); the Golden Goose needs literally everything else.
export function lockReason(kind, id, save = state) {
  if (isOwned(kind, id, save)) return null;
  if (kind === 'craft') {
    const chain = CRAFTS.filter((c) => !c.band);
    const idx = chain.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    if (id === 'goose') {
      const missing =
        CRAFTS.filter((c) => c.id !== 'goose' && !save.owned.crafts.includes(c.id)).length +
        CHARACTERS.filter((c) => !save.owned.characters.includes(c.id)).length;
      if (missing > 0) return `Unlock everything else first (${missing} left)`;
    } else if (idx > 0 && !save.owned.crafts.includes(chain[idx - 1].id)) {
      return `Unlock ${chain[idx - 1].short} first`;
    }
  }
  return null;
}

export function buy(kind, id) {
  const s = store.get();
  const list = kind === 'character' ? CHARACTERS : CRAFTS;
  const item = list.find((x) => x.id === id);
  if (!item || isOwned(kind, id, s) || lockReason(kind, id, s)) return false;
  const cost = priceOf(item, s);
  if (s.lumens < cost) return false;
  const key = kind === 'character' ? 'characters' : 'crafts';
  store.set({
    ...s,
    lumens: s.lumens - cost,
    owned: { ...s.owned, [key]: [...s.owned[key], id] },
    selected: { ...s.selected, [kind]: id },
  });
  return true;
}

export function select(kind, id) {
  const s = store.get();
  if (!isOwned(kind, id, s) && !s.cheats.tryAll) return false;
  store.set({ ...s, selected: { ...s.selected, [kind]: id } });
  return true;
}

export function unlockAll() {
  const s = store.get();
  store.set({
    ...s,
    owned: { characters: CHARACTERS.map((c) => c.id), crafts: CRAFTS.map((c) => c.id) },
  });
}

export function addLumens(n) {
  const s = store.get();
  store.set({ ...s, lumens: s.lumens + n, lifetimeLumens: s.lifetimeLumens + Math.max(0, n) });
}

export function setCheat(id, on) {
  const s = store.get();
  store.set({ ...s, cheats: { ...s.cheats, [id]: on } });
}

export function setSetting(key, value) {
  const s = store.get();
  store.set({ ...s, settings: { ...s.settings, [key]: value } });
}

export function resetProgress() {
  const s = store.get();
  // keep settings, wipe progress
  store.set({ ...defaultSave(), settings: s.settings });
}

export function recordRun(result) {
  const s = store.get();
  const stats = { ...s.stats };
  stats.runs += 1;
  if (result.survived) {
    stats.survived += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.died += 1;
    stats.streak = 0;
  }
  stats.limbs += result.limbs || 0;
  if (result.cause === 'bear') stats.bears += 1;
  stats.bestOdds = Math.max(stats.bestOdds, Math.round((result.odds || 0) * 100));
  store.set({
    ...s,
    stats,
    lumens: s.lumens + result.lumens,
    lifetimeLumens: s.lifetimeLumens + result.lumens,
  });
}
