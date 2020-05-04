import {Colors, TimeSignature} from './note-sequencer';

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

export function drawTimeBackground(g: CanvasRenderingContext2D, height: number, sixteenth: number,
     incr: number, vMin: number, vMax: number, signature: TimeSignature, colors: Colors): void {

  const alternateBackgroundWidth = getBackgroundAlternateWidth(sixteenth, signature);

  for (let i = 0; i < Math.ceil(vMax); i += incr) {
    let x = (i - vMin) * sixteenth;

    g.fillStyle = colors.backgroundAlternate;

    if (i % (alternateBackgroundWidth * 2) == 0) {
      g.fillRect(x, 0, alternateBackgroundWidth * sixteenth, height);
    }

    if (x < 0) {
      continue;
    }

    if (i % ((16 * signature.upper) / signature.lower) == 0) {
      // Larger lines for measures
      g.fillStyle = colors.strokeDark;
      g.fillRect(x, 0, 1, height);
    } else if (Math.round(i % incr) == 0) {
      // Regular lines
      g.fillStyle = colors.strokeLight;
      g.fillRect(x, 0, 1, height);
    }
  }
}

export function drawNote(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
                         velocity: number, selected: boolean, colors: Colors): void {

  g.fillStyle = colors.noteHigh;
  g.fillRect(x, y, width, height);

  g.globalAlpha = 1 - velocity / 127;
  g.fillStyle = colors.noteLowBlend;
  g.fillRect(x, y, width, height);

  g.globalAlpha = 1;
  g.lineWidth = selected ? 2 : 1;
  g.strokeStyle = selected ? colors.noteOutlineSelected : colors.noteOutline;
  g.strokeRect(x, y, width, height);
}