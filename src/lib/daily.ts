/**
 * src/lib/daily.ts
 * ---------------------------------------------------------------------------
 * Daily Challenge: one mystery sighting per UTC day. Players guess what it
 * turned out to be. Answers follow the best-supported public explanation
 * (official findings where they exist); "unexplained" means no accepted
 * explanation has been published.
 * ---------------------------------------------------------------------------
 */
export const ANSWERS = [
  { id: 'plane', label: '✈️ Plane', short: 'Aircraft' },
  { id: 'satellite', label: '🛰 Satellite / rocket', short: 'Satellite or rocket' },
  { id: 'balloon', label: '🎈 Balloon / lantern', short: 'Balloon or lantern' },
  { id: 'unexplained', label: '👽 Unexplained', short: 'Still unexplained' },
] as const;
export type AnswerId = (typeof ANSWERS)[number]['id'];

export interface DailyCase {
  title: string;
  year: number;
  place: string;
  clue: string;
  answer: AnswerId;
  reveal: string;
}

export const DAILY_CASES: DailyCase[] = [
  { title: 'The Roswell debris', year: 1947, place: 'New Mexico, USA', clue: 'A rancher finds a field of foil, rubber, tape and balsa sticks. The base press office announces a captured “flying disc”, then retracts it the next day.', answer: 'balloon', reveal: 'Project Mogul: a classified string of high-altitude balloons built to listen for Soviet nuclear tests. The Air Force confirmed it in 1994.' },
  { title: 'The string of pearls', year: 2019, place: 'Worldwide', clue: 'Dozens of evenly spaced lights cross the night sky in a perfectly straight, silent line, a few hours after sunset.', answer: 'satellite', reveal: 'A freshly launched Starlink “train”: satellites still bunched together before they spread into their orbits.' },
  { title: 'The giant white orb', year: 2023, place: 'Montana, USA', clue: 'A huge white sphere with a hanging payload drifts over nuclear missile fields for days. Fighter jets eventually shoot it down off the Carolina coast.', answer: 'balloon', reveal: 'A Chinese high-altitude surveillance balloon, confirmed by the Pentagon after recovery.' },
  { title: 'The Tic Tac', year: 2004, place: 'Pacific, off Baja California', clue: 'Navy pilots chase a smooth white 40-foot object with no wings or exhaust. Radar logs it dropping tens of thousands of feet in seconds.', answer: 'unexplained', reveal: 'Still unexplained. The Navy released the FLIR video and the Pentagon lists it as an unidentified aerial phenomenon.' },
  { title: 'The Phoenix 10pm lights', year: 1997, place: 'Arizona, USA', clue: 'A row of bright orange lights hangs motionless over the mountains, then winks out one by one.', answer: 'plane', reveal: 'Illumination flares dropped by A-10 aircraft on a training exercise (the earlier V-shaped sighting that night is still debated).' },
  { title: 'The Norway spiral', year: 2009, place: 'Northern Norway', clue: 'A glowing blue spiral blooms in the dawn sky, with a beam shooting from its centre, then dissolves into a black hole of light.', answer: 'satellite', reveal: 'A failed Russian Bulava missile test: the rocket spun out of control and vented fuel in a spiral.' },
  { title: 'The Mantell chase', year: 1948, place: 'Kentucky, USA', clue: 'An Air National Guard pilot climbs after a huge metallic object, radios that it is “tremendous in size”, then crashes after blacking out.', answer: 'balloon', reveal: 'Most likely a classified Navy Skyhook balloon; Captain Mantell climbed too high without oxygen.' },
  { title: 'The flashing star', year: 2008, place: 'Worldwide', clue: 'A point of light suddenly flares far brighter than any star for a few seconds, then fades back to nothing. It happens at predictable times.', answer: 'satellite', reveal: 'An Iridium flare: sunlight glinting off the flat antenna of an Iridium communications satellite.' },
  { title: 'The Chilean Navy video', year: 2014, place: 'Santiago, Chile', clue: 'A Navy helicopter films a hot object releasing a long dark plume. Chile’s official UFO office spends two years studying it.', answer: 'plane', reveal: 'An airliner leaving Santiago, its contrail captured in infrared. Flight tracking matched it.' },
  { title: 'The Stephenville lights', year: 2008, place: 'Texas, USA', clue: 'Dozens of residents report a silent, mile-wide object with strobing lights chased by fighter jets.', answer: 'plane', reveal: 'The Air Force later confirmed ten F-16s training in the area that evening.' },
  { title: 'The O’Hare disc', year: 2006, place: 'Chicago, USA', clue: 'Airline staff watch a dark metallic disc hover over gate C17, then shoot straight up through the clouds, leaving a clean hole.', answer: 'unexplained', reveal: 'Still unexplained. The FAA called it a weather phenomenon; witnesses disagree.' },
  { title: 'The Hudson Valley boomerang', year: 1984, place: 'New York, USA', clue: 'Thousands report a huge silent V of lights drifting low over the highways, night after night.', answer: 'plane', reveal: 'A group of pilots flying small planes in tight formation with lights, as a prank. Some were caught on video.' },
  { title: 'Kenneth Arnold’s saucers', year: 1947, place: 'Mount Rainier, USA', clue: 'A pilot sees nine bright objects skipping across the sky “like a saucer skipped across water”. The phrase “flying saucer” is born.', answer: 'unexplained', reveal: 'Still unexplained. Theories range from pelicans to mirages; nothing conclusive.' },
  { title: 'JAL Flight 1628', year: 1986, place: 'Alaska, USA', clue: 'A cargo 747 crew reports two small craft and one walnut-shaped giant pacing them for 50 minutes. Ground radar may have painted it.', answer: 'unexplained', reveal: 'Still unexplained. The FAA could not confirm the radar returns; some suggest Jupiter and Mars.' },
  { title: 'The Westall school sighting', year: 1966, place: 'Melbourne, Australia', clue: 'Over 200 students and teachers watch a silvery disc descend behind trees into a paddock, then rise and leave.', answer: 'balloon', reveal: 'Researchers matched it to a HIBAL atmospheric-sampling balloon launched that week (still disputed by witnesses).' },
  { title: 'The orange swarm', year: 2009, place: 'Across the UK', clue: 'Clusters of slowly rising orange lights drift silently over towns on Bonfire Night and New Year’s Eve.', answer: 'balloon', reveal: 'Chinese sky lanterns, hugely popular that year.' },
  { title: 'Shag Harbour', year: 1967, place: 'Nova Scotia, Canada', clue: 'A row of lights dives into the sea. Police reach the scene to find yellow foam; Navy divers search for days.', answer: 'unexplained', reveal: 'Still unexplained. It is one of the few UFO cases the Canadian government officially classes as unidentified.' },
  { title: 'The Tehran dogfight', year: 1976, place: 'Tehran, Iran', clue: 'Two Iranian F-4s scramble after a brilliant light. Each loses instruments and weapons as it gets close.', answer: 'unexplained', reveal: 'Still unexplained. A US DIA memo called it a classic case meeting all criteria for a valid UFO report.' },
  { title: 'The Falcon jellyfish', year: 2022, place: 'California, USA', clue: 'Just after sunset, a glowing jellyfish-shaped cloud with a bright core rises and expands over the coast.', answer: 'satellite', reveal: 'A SpaceX Falcon 9 launch: exhaust lit by the sun high above the darkened ground (the “twilight phenomenon”).' },
  { title: 'The Lake Huron octagon', year: 2023, place: 'Michigan, USA', clue: 'An F-16 shoots down a small octagonal object over the lake after days of unidentified radar contacts.', answer: 'unexplained', reveal: 'Debris was never recovered. Officials believe it was probably a hobby balloon, but it remains officially unidentified.' },
  { title: 'The Mexico City wobble', year: 2010, place: 'Mexico', clue: 'A cluster of glinting objects hangs over a city in daylight, drifting very slowly with the wind.', answer: 'balloon', reveal: 'Party balloons released together: a very common daytime UFO report.' },
  { title: 'The silent triangle of lights', year: 2018, place: 'Worldwide', clue: 'Three lights in a perfect triangle cross the sky together, steady and silent, minutes after dusk.', answer: 'satellite', reveal: 'Most often a Naval Ocean Surveillance System (NOSS) satellite trio flying in formation.' },
];

/** Days since 2025-01-01 UTC for a date (or now). */
export function dayNumber(d = new Date()): number {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2025, 0, 1)) / 86_400_000);
}

export function caseForDay(day: number): DailyCase {
  // Shuffle the order deterministically so consecutive days feel random.
  const i = (day * 7 + 3) % DAILY_CASES.length;
  return DAILY_CASES[i];
}
