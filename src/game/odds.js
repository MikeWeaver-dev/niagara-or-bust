// Survival odds: base by vessel, plus where you go over (lane), damage, speed and skill.
import { clamp } from './util.js';

export const RW = 9; // river half-width (metres-ish)
export const RIVER_LEN = 280; // distance from the launch beach to the brink at the centre
// Horseshoe: the centre of the crest is furthest upstream, the sides curve away downstream.
export const brinkAt = (x) => RIVER_LEN + 10 * Math.pow(clamp(x / RW, -1.2, 1.2), 2);

export function laneOf(x) {
  const n = Math.abs(x) / RW;
  return n < 0.3 ? 'center' : n < 0.66 ? 'mid' : 'edge';
}
export const LANE_BONUS = { center: 0.12, mid: 0.02, edge: -0.1 };
export const LANE_NAME = { center: 'GREEN CHANNEL', mid: 'MAIN CURRENT', edge: 'ROCKY EDGE' };
export const LANE_TIP = {
  center: 'Deep water at the bottom',
  mid: 'Some rocks at the bottom',
  edge: 'Rocks. So many rocks.',
};

export const speedBonus = (speed) => clamp((speed - 8) * 0.012, -0.05, 0.05);

export function computeOdds({ craft, hpRatio = 1, wrecked = false, ko = false, lane = 'mid', speed = 8, bonus = 0, cheats = {} }) {
  if (cheats.god) return 1;
  if (cheats.alwaysDie) return 0;
  if (craft.alwaysSurvive && !wrecked) return 1;
  let p = (wrecked ? 0.11 : craft.base) + LANE_BONUS[lane] - (1 - clamp(hpRatio, 0, 1)) * 0.18 + speedBonus(speed) + bonus;
  if (ko) p = Math.min(p, 0.07);
  return clamp(p, 0.07, 0.92);
}

export const oddsColor = (p) => (p >= 0.55 ? '#5dff8a' : p >= 0.3 ? '#ffd23b' : '#ff5a5a');
