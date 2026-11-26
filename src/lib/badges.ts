/** Badge catalogue (shared by client and server). */
export const BADGES = [
  { id: 'hall-of-fame', icon: '🏆', name: 'Hall of Famer', how: 'Finish a week in the top 3 of any arcade game.' },
  { id: 'night-5', icon: '🌅', name: 'Rodeo Survivor', how: 'Clear Night 5 (Area 51 Rodeo) in Moo-ve It.' },
  { id: 'secrets-all', icon: '🥚', name: 'Truth Seeker', how: 'Find all 8 secrets on the landing page.' },
  { id: 'lineup', icon: '👽', name: 'Xenobiologist', how: 'Meet every visitor in the voxel lineup.' },
  { id: 'abductor', icon: '🐄', name: 'Friend Abductor', how: 'Beam up a friend in Moo-ve It.' },
  { id: 'crop-artist', icon: '🌾', name: 'Crop Artist', how: 'Publish a crop circle to the gallery.' },
  { id: 'daily-7', icon: '📅', name: 'Week Watcher', how: 'Keep a 7-day Daily Challenge streak.' },
  { id: 'ghost', icon: '📡', name: 'Radar Ghost', how: 'Reach sector 5 in Radar Ghost undetected.' },
] as const;

export type BadgeId = (typeof BADGES)[number]['id'];
