// Death & survival messages. Headline + subline. Picked at random by cause.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const DEATH = {
  generic: [
    ['DROWNED', 'Tried breathing water. Water won.'],
    ['GOT REALLY MESSED UP', 'Like, REALLY messed up. Medically speaking.'],
    ['FORGOT HOW TO SWIM', 'Remembered about 188 feet too late.'],
    ['BECAME MIST', 'You are now part of the scenic view.'],
    ['DISCOVERED GRAVITY', 'Gravity: 1. You: 0.'],
    ['ACHIEVED SOUP', 'You have been reclassified as a broth.'],
    ['GOT NIAGARA\'D', 'It happens to the best of us. Mostly to you though.'],
    ['UNSCHEDULED DISASSEMBLY', 'Some assembly required. A LOT of assembly.'],
    ['RAGDOLLED INTO HISTORY', 'The history books will not mention you.'],
    ['SHOULD HAVE STAYED AT THE HOT DOG STAND', 'The hot dogs were really good too.'],
    ['PANICKED (CORRECTLY)', 'Honestly, a reasonable response.'],
    ['RECLASSIFIED AS DEBRIS', 'Niagara Parks will be sweeping you up for weeks.'],
    ['FOLDED LIKE A LAWN CHAIR', 'In directions lawn chairs do not fold.'],
    ['SPONSORED BY GRAVITY', 'Gravity: bringing you down since forever.'],
    ['YOUR INSURANCE HAS BEEN CANCELLED', 'Retroactively. With a strongly worded letter.'],
    ['BECAME A CAUTIONARY TALE', 'Parents will now point at your splash zone.'],
    ['TECHNICALLY IN TWO COUNTRIES', 'Parts of you are in Canada. Other parts: New York.'],
    ['DIED OF DYSENTERY', 'We are not sure how. But we are sure.'],
    ['EXPLODED INTO VIBES', 'The vibes were not good.'],
    ['WENT IN ONE PIECE', 'Came out in several. Collect them all!'],
    ['SKILL ISSUE', 'Have you tried not falling?'],
    ['ATE IT', 'Ate it so hard. Respectfully.'],
    ['CERTIFIED FISH FOOD', 'The fish leave five stars.'],
    ['ROOKIE MISTAKE', 'The mistake was going over Niagara Falls.'],
  ],
  rocks: [
    ['COLLIDED WITH ROCKS', 'The rocks said hi. Firmly.'],
    ['ROCK BOTTOM', 'Literally. You found it. Congratulations.'],
    ['TENDERIZED', 'Seasoned with mist. Served on a bed of granite.'],
    ['BECAME A ROCK DECAL', 'Your outline will be visible for years.'],
    ['GEOLOGY: 1, YOU: 0', 'Those rocks have been there 12,000 years. You lasted 3 seconds.'],
    ['SPLATTERED', 'Modern art critics are calling it "bold".'],
    ['KNOCKED INTO NEXT WEEK', 'And most of you is still on the rocks.'],
    ['PANCAKED', 'Short stack. Extra syrup. The syrup is you.'],
  ],
  water: [
    ['HIT THE WATER LIKE CONCRETE', 'From 188 feet, water is basically a parking lot.'],
    ['BELLY FLOP OF THE CENTURY', 'The judges gave it a 10. Then called an ambulance.'],
    ['SMACKED', 'Water: surprisingly hard. You: surprisingly soft.'],
    ['FLATTENED', 'You are now 40% wider.'],
    ['FOUND THE BOTTOM', 'The plunge pool is 170 feet deep. You checked.'],
  ],
  drown: [
    ['DROWNED', 'Glub glub. Glub.'],
    ['TRIED TO BREATHE WATER', 'Lungs: not rated for this.'],
    ['FORGOT HOW TO SWIM', 'Muscle memory: not found.'],
    ['HELD UNDER BY THE CHURN', 'The falls kept you for a little visit. A long one.'],
    ['NOW LIVES WITH THE FISH', 'The fish are not thrilled about it.'],
  ],
  unconscious: [
    ['KNOCKED OUT COLD', 'You missed your own death. Lucky.'],
    ['NAPPED THROUGH IT', 'You went over sleeping. You did not wake up.'],
    ['GOT BONKED', 'One bonk too many.'],
  ],
  chute: [
    ['PARACHUTE HAD A HOLE', 'It was a used parachute. You knew that.'],
    ['CHUTE EATEN BY THE FALLS', 'The falls took your parachute. Then you.'],
    ['DEPLOYED THE CHUTE... EVENTUALLY', 'Opening a parachute AFTER landing is not a strategy.'],
  ],
  explode: [
    ['EXPLODED', 'Nobody knows why. Least of all you.'],
    ['KABOOM', 'Water is not supposed to do that.'],
    ['DETONATED', 'Bits of you were seen from the Skylon Tower.'],
  ],
  vessel: {
    barrel: [['THE BARREL SURVIVED', 'You did not. The barrel is up for auction.']],
    kayak: [['KAYAK: 1 PIECE. YOU: 6 PIECES', 'The kayak is also in 2 pieces. Tie.']],
    canoe: [['GARY!!!', 'Gary is also gone. Nobody will miss Gary. Sorry, Gary.']],
    hamster: [['POPPED', 'The ball did not bounce. You did, though.']],
    jetski: [['FULL SEND', 'Sent fully. Received partially.']],
    surfboard: [['WIPEOUT', 'Total, catastrophic, biological wipeout.']],
    lifejacket: [['THE LIFE JACKET FLOATED', 'Just the life jacket.']],
    nothing: [['NOTHING HELPED', 'Mostly because you brought nothing.']],
  },
  timmy: [
    ['BONKED', 'Timmy saw stars. Then the angels. Then his mom (very mad).'],
    ['TIMMY IS A GHOST NOW', 'He is still holding the juice box.'],
    ['NAP TIME', 'Forever nap time. Oops.'],
    ['GROUNDED. FOREVER.', 'Mom is going to be SO mad.'],
  ],
  kacey: [
    ['TASTED THE RAINBOW', 'The rainbow tasted back.'],
    ['GLITTER EVERYWHERE', 'Cleanup crews will find sparkles until 2087.'],
    ['NECK WAS TOO LONG', 'Hit the rocks first. Then the rest arrived.'],
  ],
  bobby: [['NOT AGAIN, BOBBY', 'Somewhere, an orange peel is laughing.']],
  shot: [
    ['SHOT BY A TOURIST', 'Their vacation photos are going to be wild.'],
    ['SNIPED FROM THE GIFT SHOP', 'You were not even over the falls yet.'],
    ['BB\'D TO DEATH', 'Death by a thousand tiny copper balls.'],
    ['SLINGSHOTTED', 'David 1, Goliath 0. You were Goliath.'],
  ],
  lightning: [
    ['STRUCK BY LIGHTNING', 'Statistically unlikely. Personally devastating.'],
    ['ZAPPED', 'Water and electricity: a classic combo.'],
    ['SMITED', 'Somebody up there really did not like that.'],
  ],
  randombear: [
    ['A BEAR. FOR NO REASON.', 'It came out of nowhere. Bears do that.'],
    ['MAULED MID-RIVER', 'That bear was not even in the brochure.'],
    ['SURPRISE BEAR', 'There is always a bear. ALWAYS.'],
  ],
  impaled: [
    ['IMPALED', 'You found the pointy rock. With your entire body.'],
    ['SHISH KEBAB\'D', 'Served on a stick, Niagara style.'],
    ['SKEWERED', 'The rock is wearing you now.'],
  ],
  pancake: [
    ['PANCAKED', 'Short stack. Extra flat. Nobody wants this one.'],
    ['FLATTENED ON A ROCK', 'You are now two-dimensional.'],
    ['ROLLED OUT LIKE DOUGH', 'Bake at 350 for... no. Just no.'],
  ],
  banana: [
    ['SLIPPED ON A BANANA PEEL', 'You found the secret cave. Then the secret banana.'],
    ['SECRET CAVE, SECRET DEATH', '"Well done, young grasshopper." Then: banana.'],
  ],
  bear: [
    ['EATEN BY A BEAR', 'Swam upstream. Found a bear. Circle of life.'],
    ['DISEMBOWELED BY A GRIZZLY', 'Nature documentary narrators everywhere just went silent.'],
    ['NATURE IS METAL', 'The bear ate you in three bites and burped up your head.'],
    ['BECAME SUSHI', 'Bear-style. Very fresh.'],
    ['BEAR SNACK', 'The bear rated you 4/5 (a bit bony).'],
    ['THE BEAR ALWAYS WINS', 'You can fight the current. You cannot fight a bear.'],
  ],
};

export const LAST_WORDS = {
  generic: ['I regret everything!', 'Worth it!', 'Tell my mother I was right!', 'Oh no.', 'Ow. Ow. Ow. Ow.', 'That was a mistake!', 'Not like this!', 'I can\'t feel my everything!', 'Bye bye!', 'Oopsie daisy!', 'Mama!', 'Ouchie!', 'Totally fine!', 'Nailed it.'],
  annie: ['Nobody ought ever do that again!', 'Oh dear me!', 'Not my good hat!', 'In my day we had barrels!'],
  timmy: ['Mom\'s gonna be so mad!', 'That was awesome! Ow.', 'I want my juice box!', 'Again! Again!'],
  bobby: ['Not again!', 'My kneecaps!', 'Curse you, orange peel!', 'Strongman down!'],
  jean: ['Sacré bleu!', 'Mon dieu!', 'Oh la la!', 'Zut alors!'],
  kacey: ['Giraffes can\'t swim!', 'My beautiful neck!', 'Rainbow powers, fail!', 'Pet me later!'],
  gary: ['Why am I here?!', 'Gary out!', 'I just came for the boat tour!'],
  poop: ['Oh no. Oh no no no.', 'That is not blood!', 'Excuse me!', 'Too many hot dogs!'],
};
export const VOICE_PITCH = { annie: 1.35, timmy: 1.95, bobby: 0.55, jean: 0.95, kacey: 1.7, gary: 0.75 };
export function lastWords(character, poop = false) {
  const pool = poop ? LAST_WORDS.poop : Math.random() < 0.55 && LAST_WORDS[character] ? LAST_WORDS[character] : LAST_WORDS.generic;
  return pick(pool);
}

export const SURVIVE = [
  ['SURVIVED!', 'Your chiropractor just bought a boat.'],
  ['YOU LIVED!', 'Canada would like to fine you $10,000. Welcome back!'],
  ['ALIVE! MOSTLY!', 'All the important parts are still attached.'],
  ['SURVIVED!', 'You are now Niagara famous. Sign some ponchos.'],
  ['LEGEND!', 'The Maid of the Mist crowd went absolutely wild.'],
  ['NOT DEAD!', 'Your mom saw this on the news and is not happy.'],
  ['WOW. OK. WOW.', 'Nobody, including us, thought that would work.'],
  ['YOU DID IT!', 'Please do not do it again. (Do it again.)'],
];

export const SURVIVE_BY = {
  goose: [
    ['HONK HONK!', 'The Golden Goose carried you down like royalty.'],
    ['BLESSED BY THE GOOSE', 'Golden eggs for everyone!'],
  ],
  bobby: [['SURVIVED!', 'Now avoid all orange peels for the rest of your life.']],
  annie: [['QUEEN OF THE MIST!', '"Nobody ought ever do that again." - Annie, 1901. Anyway.']],
  timmy: [['TIMMY LIVED!', 'He wants to go again. Absolutely not, Timmy.']],
  kacey: [['RAINBOW RIDER!', 'Kacey survived and is now on 40 postcards.']],
  jean: [['MAGNIFIQUE!', 'Jean is already selling souvenir pieces of your raft.']],
  canoe: [['YOU AND GARY LIVED!', 'Gary would like to be dropped off now.']],
};

export const DIARRHEA = [
  ['EXPLOSIVE DIARRHEA', 'The falls scared it right out of you. All of it.'],
  ['EXPLOSIVE DIARRHEA', 'That was not blood. Niagara Parks is closing the beach.'],
  ['EXPLOSIVE DIARRHEA', 'You went over the falls. Then the falls went over you.'],
  ['EXPLOSIVE DIARRHEA', 'Should NOT have had that last hot dog.'],
];

export function deathMessage({ cause, character, craft, wrecked, poop }) {
  if (cause === 'banana') return pick(DEATH.banana);
  if (poop) return pick(DIARRHEA);
  if (cause === 'bear') return pick(DEATH.bear);
  if (['shot', 'lightning', 'randombear', 'impaled', 'pancake'].includes(cause) && character !== 'timmy') return pick(DEATH[cause]);
  if (character === 'timmy') return pick(DEATH.timmy);
  const roll = Math.random();
  if (character === 'kacey' && roll < 0.4) return pick(DEATH.kacey);
  if (character === 'bobby' && roll < 0.2) return pick(DEATH.bobby);
  if (!wrecked && DEATH.vessel[craft] && roll > 0.78) return pick(DEATH.vessel[craft]);
  if (DEATH[cause] && Math.random() < 0.7) return pick(DEATH[cause]);
  return pick(DEATH.generic);
}

export function surviveMessage({ character, craft }) {
  if (craft === 'goose') return pick(SURVIVE_BY.goose);
  if (craft === 'canoe' && Math.random() < 0.5) return pick(SURVIVE_BY.canoe);
  if (SURVIVE_BY[character] && Math.random() < 0.45) return pick(SURVIVE_BY[character]);
  return pick(SURVIVE);
}

// Funny little popups during the river ride
export const OUCH = ['OOF!', 'OUCH!', 'BONK!', 'YEOWCH!', 'MY SPLEEN!', 'NOT THE FACE!', 'WHY?!', 'CRUNCH!', 'OW OW OW'];
export const SCREAMS = ['AAAAAH!', 'NOOOO!', 'MOMMY!', 'WHYYYY!', 'YOLOOOO!', 'I REGRET THIS!', 'WHEEEE!'];
