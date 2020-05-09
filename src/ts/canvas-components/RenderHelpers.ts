import {TimeSignature} from '../note-sequencer';

export function squaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

export function getBackgroundAlternateWidth(sixteenth: number, signature: TimeSignature): number {
  const minAlternate = 100;
  const maxAlternate = 200;

  let alternate = (16 * signature.upper) / signature.lower;

  // If a measure is too big, try alternating with each beat
  if (alternate * sixteenth > maxAlternate) {
    alternate /= signature.upper;

    // If it's still to big, subdivide beat
    while (alternate * sixteenth > maxAlternate)
      alternate /= 2;
  } else {
    // If it's too small, multiply measure by 2
    while (alternate * sixteenth < minAlternate)
      alternate *= 2;
  }

  return alternate
}
