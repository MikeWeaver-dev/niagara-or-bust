import { useEffect } from 'react';
import MenuBackground from './MenuBackground.jsx';
import { TopBar } from './common.jsx';
import { music } from '../audio/music.js';

export default function HowTo() {
  useEffect(() => {
    music.play('title');
  }, []);
  return (
    <>
      <MenuBackground />
      <div className="screen">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <TopBar title="HOW TO PLAY" />
          <div className="panel howto">
            <h3>1. PICK YOUR SPOT</h3>
            <p>You start on the bank above the Horseshoe Falls. Walk left/right and jump in wherever you like. The middle of the river is the <b>Green Channel</b>: fast, but deep water at the bottom (+12% odds). The edges are slower but end in <b>rocks</b> (-10%).</p>
            <h3>2. RIDE THE CURRENT</h3>
            <ul>
              <li><b>Steer:</b> ◀ ▶ (A/D) or drag on the left side of the screen.</li>
              <li><b>Faster / slower:</b> ▲ ▼ (W/S) or drag up/down. You can slow down, but you WILL go over.</li>
              <li><b>Ability:</b> SPACE or the big button. Every vessel has its own (TURBO, ROLL, BOUNCE, FLAP...).</li>
              <li>Grab glowing <b>lumens</b>. Dodge rocks, logs, whirlpools and floating junk. Damage lowers your odds, and a wrecked vessel means you're swimming.</li>
              <li>Your live <b>ODDS</b> are shown at the top. Going faster helps you clear the rocks at the bottom.</li>
            </ul>
            <h3>3. THE DROP</h3>
            <p>188 feet of pure physics, and every vessel has its own mini-game: pencil-dive ring timing, inflate the life jacket (don't pop it), mash pillows into the barrel, surf the face of the falls, tilt your kayak and BOOF, air-paddle in rhythm with Gary, roll the hamster ball into the deep water, deploy the parachute in the green zone, or glide the Golden Goose. The band's instruments have their own: surf the keyboard, SHRED the guitar, hold the trumpet's high note, lock in the bass groove, drum roll, and the MIC DROP. Then the dice roll on your odds. The bottom is full of rocks: some round, some pointy (impaling), some flat (pancaking).</p>
            <h3>HARD MODE</h3>
            <p>Turn it on in Settings or on the loadout screen: tourists on the banks shoot at you with slingshots and BB guns, and they can kill you before you even reach the edge (your corpse still goes over). Grab the floating slingshot to fire back (F or the SHOOT button).</p>
            <h3>RUMORS</h3>
            <p>They say there's a cave behind the falls that only the Golden Goose can reach. They also say lightning strikes about once in a hundred trips. And that there's always a bear.</p>
            <h3>4. LUMENS & UNLOCKS</h3>
            <p>Every attempt pays lumens (survive for a big bonus; die messily for a gore bonus). Spend them in the Gift Shop. Vessels unlock in order; each unlock boosts future earnings. The <b>Golden Goose</b> is last, and it always survives.</p>
            <h3>CHEATS</h3>
            <p>Everything is open for testing: Salmon Mode (swim upstream until a bear eats you), God Mode, Always Die, Big Heads, Moon Gravity, Disco Falls and more. There are secret codes too.</p>
            <h3>THE CREW</h3>
            <ul>
              <li><b>Annie Edson Taylor:</b> first to survive in a barrel, 1901, on her 63rd birthday.</li>
              <li><b>Bobby Leach:</b> steel barrel, 1911. Later died after slipping on an orange peel. Really.</li>
              <li><b>Jean Lussier:</b> 1928, in a giant rubber ball with 32 inner tubes.</li>
              <li><b>Lil' Timmy</b> and <b>Kacey the Rainbow Giraffe</b>: not historically accurate.</li>
              <li><b>Kids Table</b>: Ryan (trumpet), BT (keys), Mike (guitar), Amy (vocals), Max (bass) and Andy (drums). Anyone can ride the band's instruments, but a band member on their own instrument gets <b>+15% survival</b>, music notes, and a lot of cheering.</li>
            </ul>
            <p style={{ fontSize: 13, opacity: 0.8 }}>Going over Niagara Falls in real life is illegal and usually fatal. This is a cartoon. Please stay on the bank and buy a hot dog.</p>
          </div>
        </div>
      </div>
    </>
  );
}
