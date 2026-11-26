/** Comms channels (text only; every message is AI-moderated). */
export const ROOMS = [
  { id: 'live', name: 'Seeing it now', icon: '👁', blurb: 'Something in the sky right now? Describe it here.' },
  { id: 'sightings', name: 'Sighting stories', icon: '📝', blurb: 'Tell the full story of what you saw.' },
  { id: 'space', name: 'Space talk', icon: '🪐', blurb: 'Planets, stars, SETI and the big questions.' },
  { id: 'debunk', name: 'Debunk desk', icon: '🔍', blurb: 'Plane? Satellite? Balloon? Help solve it.' },
  { id: 'games', name: 'Arcade & cards', icon: '🃏', blurb: 'Scores, teams and card pulls.' },
] as const;

export const RULES = [
  'Text only. Be kind, stay on topic.',
  'Sexual content, hate or threats = instant permanent ban.',
  'Swearing, spam or trolling = a strike. 3 strikes = ban.',
  'Every message is checked by AI before anyone sees it.',
];
