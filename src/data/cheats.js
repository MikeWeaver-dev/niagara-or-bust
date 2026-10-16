// Toggleable cheats. All are available from the start for testing.
export const CHEATS = [
  { id: 'salmon', icon: '🐟', name: 'Salmon Mode', desc: 'Become a salmon. Swim UP the current and never go over. A bear will eat you.' },
  { id: 'tryAll', icon: '🔓', name: 'Try Everything', desc: 'Use any character or vessel without unlocking it.' },
  { id: 'god', icon: '😇', name: 'God Mode', desc: 'Always survive the drop.' },
  { id: 'alwaysDie', icon: '💀', name: 'Always Die', desc: 'Guaranteed death. For science (and gore testing).' },
  { id: 'goreGalore', icon: '🩸', name: 'Gore Galore', desc: 'Every death is a full-body disassembly. Blood rain included.' },
  { id: 'explosive', icon: '💣', name: 'Explosive Impact', desc: 'Everything explodes when it hits the bottom.' },
  { id: 'bigHead', icon: '🎈', name: 'Big Head Mode', desc: 'Huge heads. Classic.' },
  { id: 'tiny', icon: '🐜', name: 'Tiny Mode', desc: 'Everyone is shrunk to action-figure size.' },
  { id: 'moon', icon: '🌙', name: 'Moon Gravity', desc: 'Floaty low-gravity drop.' },
  { id: 'slowmo', icon: '🐌', name: 'Bullet Time', desc: 'The whole drop happens in slow motion.' },
  { id: 'noodle', icon: '🍜', name: 'Noodle Limbs', desc: 'Ragdolls are extra floppy and flail like crazy.' },
  { id: 'disco', icon: '🪩', name: 'Disco Falls', desc: 'Rainbow water. Party lights. Dance music.' },
  { id: 'superPaddle', icon: '💪', name: 'Super Paddle', desc: 'Paddle and steer at 2x power.' },
  { id: 'invincible', icon: '🛡️', name: 'Invincible Hull', desc: 'Take no damage in the river.' },
  { id: 'rockParty', icon: '🪨', name: 'Rock Party', desc: 'Triple the rocks. Triple the fun.' },
  { id: 'lazy', icon: '🛟', name: 'Lazy River', desc: 'The current is half as strong (you still go over).' },
  { id: 'skipToEdge', icon: '⏩', name: 'Skip to the Edge', desc: 'Start right before the falls.' },
  { id: 'lumenRain', icon: '💡', name: 'Lumen Rain', desc: 'The river is FULL of lumens.' },
];

// Typed cheat codes (enter on the Cheats screen)
export const CODES = {
  SALMON: { toggle: 'salmon', msg: 'You smell fishy.' },
  IDDQD: { toggle: 'god', msg: 'Degreelessness mode.' },
  GOD: { toggle: 'god', msg: 'Angels are watching.' },
  BLOODBATH: { toggle: 'goreGalore', msg: 'Oh no.' },
  KABOOM: { toggle: 'explosive', msg: 'Boom boom.' },
  BIGHEAD: { toggle: 'bigHead', msg: 'Big brain time.' },
  DISCO: { toggle: 'disco', msg: 'Let\'s boogie.' },
  MOON: { toggle: 'moon', msg: 'One small step...' },
  MONEY: { lumens: 1000, msg: '+1000 lumens!' },
  LUMENS: { lumens: 500, msg: '+500 lumens!' },
  GOOSE: { unlockAll: true, msg: 'The Goose has blessed you. Everything unlocked.' },
  UNLOCKALL: { unlockAll: true, msg: 'Everything unlocked.' },
  HONK: { unlockAll: true, msg: 'HONK. Everything unlocked.' },
};
