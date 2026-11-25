/**
 * src/components/landing/content.ts, copy + data for the landing page.
 * FIELD_GUIDE order must match SHOWCASE in LandingScene.tsx.
 */

export const FIELD_GUIDE: ReadonlyArray<{ name: string; since: string; blurb: string }> = [
  { name: 'Classic Saucer', since: '1947', blurb: 'The original. Spinning rim lights, glass dome, tractor beam, and a pilot who has never once used a turn signal.' },
  { name: 'Tic-Tac', since: '2004', blurb: 'Off Baja California, Navy radar tracked one dropping 80,000 ft in under a second. No wings, no exhaust, no apology.' },
  { name: 'Black Triangle', since: '1990', blurb: 'Belgium’s wave: silent, enormous, three corner lights and a red heart. Extremely relaxed about airspace rules.' },
  { name: 'Bell Saucer', since: '1952', blurb: 'Retro scout with portholes and three landing pods. Vintage. Probably has a cassette deck.' },
  { name: 'Cigar Carrier', since: '1896', blurb: 'Long, metallic, a strip of lit windows. The minivan of the cosmos, room for the whole crew.' },
  { name: 'Plasma Orb', since: '1944', blurb: 'Hovers. Pulses. Swirls. Refuses to elaborate.' },
  { name: 'Chevron', since: '1997', blurb: 'A mile-wide V of lights over Phoenix, seen by thousands. Flies in formation with itself.' },
  { name: 'Ring Craft', since: '1965', blurb: 'A spinning torus with a floating core. Runs on vibes and possibly donuts.' },
  { name: 'Cube in a Sphere', since: '2015', blurb: 'Navy aircrews described a dark cube inside a clear ball. Nobody has notes. Everybody has questions.' },
  { name: 'Space Jellyfish', since: '2017', blurb: 'Drifting bell, dangling tendrils. The universe’s least threatening threat. Do not boop.' },
  { name: 'Diamond', since: '1980', blurb: 'Faceted, spinning, catching the light. Terrible at hide-and-seek.' },
  { name: 'Glowing Egg', since: '1964', blurb: 'A luminous ovoid. Has it hatched? We are monitoring the situation closely.' },
  { name: 'Foo Fighters', since: '1944', blurb: 'Tiny balls of light that tailed WWII bombers. Travel in packs. Excellent band name.' },
];

export const CASE_REEL: ReadonlyArray<{ year: string; title: string; place: string; tag: string }> = [
  { year: '1947', title: 'Roswell Debris', place: 'New Mexico, USA', tag: 'FLYING DISC → WEATHER BALLOON?' },
  { year: '1952', title: 'Washington Flyover', place: 'Washington D.C.', tag: 'RADAR + VISUAL' },
  { year: '1976', title: 'Tehran F-4 Intercept', place: 'Tehran, Iran', tag: 'JETS SCRAMBLED' },
  { year: '1980', title: 'Rendlesham Forest', place: 'Suffolk, UK', tag: 'GROUND TRACES' },
  { year: '1990', title: 'Belgian Triangle Wave', place: 'Brussels, Belgium', tag: 'F-16 RADAR LOCK' },
  { year: '1997', title: 'Phoenix Lights', place: 'Arizona, USA', tag: 'THOUSANDS OF WITNESSES' },
  { year: '2004', title: 'Nimitz “Tic Tac”', place: 'Pacific, off Baja', tag: 'FLIR VIDEO' },
  { year: '2015', title: 'Gimbal & GoFast', place: 'Atlantic, off Florida', tag: 'DOD RELEASED' },
  { year: '2023', title: 'Lake Huron Octagon', place: 'Michigan, USA', tag: 'NORAD TRACKED' },
];

export const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
  { n: '01', title: 'Look up.', body: 'Spot something weird. Lights, shapes, a cow levitating. Note when and where, we geotag it to the meter.' },
  { n: '02', title: 'Drop the evidence.', body: 'Upload the photo or clip. Blurry is fine. Blurry is, frankly, the genre.' },
  { n: '03', title: 'We squint at it.', body: 'EXIF forensics, a deep-fake check and aircraft / satellite proximity combine into a 0–100 Credibility Index.' },
  { n: '04', title: 'The planet weighs in.', body: 'Your contact lands on the live globe. Others co-witness, upvote and argue in the thread. Science!' },
];
