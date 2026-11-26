# Xeno Cards — illustration brief

For commissioning real card artwork. Drop finished files as `public/cards/<card-id>.webp`
and add the id to `src/lib/cardArt.ts` → `ILLUSTRATED`; the card then uses the illustration
instead of the built-in vector art, with no other code change.

## Deliverable per card
- **Format:** WebP (or PNG), transparent background, **900 × 1200 px** (portrait 3:4), < 300 KB each.
- **Subject:** one alien/craft creature, centred, facing forward, filling ~70% of the frame height.
- **Lighting:** key light upper-left, cool rim light on the right edge in the card's ELEMENT colour.
- **Finish:** painterly/semi-realistic, clean edges, subtle material detail (skin sheen, metal
  panels). **No visible AI artefacts, no text, no watermark, no borders** (the frame is drawn in code).
- **Consistency:** shared palette and brush language across the set so 156 cards feel like one game.

## Elements (rim-light + accent colour)
- 🔥 **Blaze** `#ff5c5c` · ⚡ **Volt** `#ffd23f` · 🌀 **Void** `#a56bff` · 🌿 **Flora** `#5cff8f` · 💧 **Tide** `#4cb8ff`

## Rarity treatment
- Common/Rare: clean single subject.
- Epic: add energy FX (sparks, glow wisps) in the element colour.
- Legendary: dynamic pose, strong rim light, small particle aura.
- Ultra / Mythic: hero treatment — dramatic lighting, holographic accents; these may be **animated**
  (short seamless loop, e.g. APNG/WebP or a sprite sheet) for the full-screen card page.

## Priority order (commission these first)
1. The 1 **Mythic** (`mythic-first-contact`) and 5 **Ultra** cards — the showcase pieces.
2. The 15 **Legendary** cards.
3. Epics, then rares; commons can keep the vector art indefinitely.

## Reference
Each card's id, name, element, rarity and one-line lore are the source of truth — export them from
`src/lib/cards.ts` (the `CARDS` array) and hand that list to the illustrator. The current in-engine
vector art (seen on any card now) shows the intended silhouette, colour and personality to match.
