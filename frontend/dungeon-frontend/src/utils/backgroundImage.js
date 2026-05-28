// Edit: add thresholds here to map session time to background images.
// Images must be in /public/. Order must be highest minSeconds first.
const THRESHOLDS = [
  { minSeconds: 1500, image: '/Dungeon.jpg' }, // 25 min
  { minSeconds: 600,  image: '/Night.png' },   // 10 min
  { minSeconds: 0,    image: '/Day.png' },      // 0 min (default)
]

export function getBackgroundImage(elapsedSeconds) {
  return THRESHOLDS.find(t => elapsedSeconds >= t.minSeconds).image
}