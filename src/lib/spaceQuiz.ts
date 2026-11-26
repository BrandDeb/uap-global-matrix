/** Space-science quiz used to feed your Xeno Keeper family (learn → care). */
export interface Q {
  q: string;
  options: string[];
  answer: number;
  fact: string;
}
export const QUIZ: Q[] = [
  { q: 'Which planet has the most moons we know of?', options: ['Jupiter', 'Saturn', 'Neptune'], answer: 1, fact: 'Saturn has over 140 confirmed moons, more than any other planet.' },
  { q: 'How long does sunlight take to reach Earth?', options: ['8 seconds', 'About 8 minutes', 'About 8 hours'], answer: 1, fact: 'Sunlight takes about 8 minutes 20 seconds to cross 150 million km.' },
  { q: 'What is the nearest star system to the Sun?', options: ['Alpha Centauri', 'Sirius', 'Betelgeuse'], answer: 0, fact: 'Alpha Centauri is about 4.2 to 4.4 light-years away; Proxima Centauri is its closest star.' },
  { q: 'Which moon hides a liquid ocean under its ice?', options: ['Our Moon', 'Europa', 'Phobos'], answer: 1, fact: 'Jupiter’s moon Europa likely has more liquid water than all Earth’s oceans, a top spot to look for life.' },
  { q: 'What does SETI search for?', options: ['Asteroids', 'Signals from alien civilisations', 'Dark matter'], answer: 1, fact: 'SETI scans the sky for artificial radio and laser signals that nature does not make.' },
  { q: 'Roughly how many exoplanets have been confirmed?', options: ['About 60', 'About 600', 'Over 5,000'], answer: 2, fact: 'Over 5,000 planets around other stars have been confirmed since 1992.' },
  { q: 'The Drake equation estimates…', options: ['Rocket speed', 'How many talking civilisations might exist', 'The age of the universe'], answer: 1, fact: 'Frank Drake wrote it in 1961 to organise our guesses about communicating civilisations.' },
  { q: 'What is the “Fermi paradox”?', options: ['Why we have not met aliens if they are likely', 'A time-travel loop', 'A type of black hole'], answer: 0, fact: 'Enrico Fermi asked “Where is everybody?” if the galaxy should be full of life.' },
  { q: 'Which planet spins on its side?', options: ['Uranus', 'Mars', 'Venus'], answer: 0, fact: 'Uranus is tilted about 98°, probably from an ancient giant impact.' },
  { q: 'What is a light-year?', options: ['A unit of time', 'A unit of distance', 'A unit of brightness'], answer: 1, fact: 'It is the distance light travels in a year: about 9.46 trillion km.' },
  { q: 'Which is the hottest planet?', options: ['Mercury', 'Venus', 'Mars'], answer: 1, fact: 'Venus’s thick CO₂ atmosphere traps heat at about 465 °C, hotter than Mercury.' },
  { q: 'What are Starlink “trains” often mistaken for?', options: ['UFOs', 'Meteors only', 'Clouds'], answer: 0, fact: 'Freshly launched Starlink satellites fly in a line and cause thousands of UFO reports.' },
  { q: 'How old is the universe?', options: ['About 13.8 billion years', 'About 4.5 billion years', 'About 100 billion years'], answer: 0, fact: '13.8 billion years, measured from the cosmic microwave background.' },
  { q: 'What gives Mars its red colour?', options: ['Lava', 'Iron oxide (rust)', 'Red plants'], answer: 1, fact: 'Fine rusty dust covers Mars and even colours its sky.' },
  { q: 'Which telescope launched in 2021 to see the early universe?', options: ['Hubble', 'James Webb', 'Kepler'], answer: 1, fact: 'JWST sees in infrared, spotting galaxies from a few hundred million years after the Big Bang.' },
  { q: 'Saturn’s moon Enceladus shoots out…', options: ['Lava', 'Water-ice geysers', 'Radio waves'], answer: 1, fact: 'Cassini flew through its plumes and found salts and organic molecules.' },
  { q: 'A “habitable zone” is where…', options: ['Liquid water could exist on a planet', 'Aliens live', 'Stars are born'], answer: 0, fact: 'Not too hot, not too cold: often called the Goldilocks zone.' },
  { q: 'What famous signal did a SETI telescope catch in 1977?', options: ['The Wow! signal', 'The Hello pulse', 'The Ping'], answer: 0, fact: 'Astronomer Jerry Ehman circled it and wrote “Wow!”. It was never detected again.' },
  { q: 'What is at the centre of our galaxy?', options: ['A huge star', 'A supermassive black hole', 'Nothing'], answer: 1, fact: 'Sagittarius A* is about 4 million times the Sun’s mass; it was imaged in 2022.' },
  { q: 'Which planet has the Great Red Spot?', options: ['Mars', 'Jupiter', 'Neptune'], answer: 1, fact: 'It is a storm wider than Earth that has raged for at least 190 years.' },
];
