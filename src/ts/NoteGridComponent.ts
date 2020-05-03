import {Component} from './BaseComponent';
import {MIN_SEMI_H, PITCH_PATTERN, SequencerDisplayModel} from './note-sequencer'

export class NoteGridComponent extends Component {

  // TODO: move into model or utility
  public readonly adaptiveLabels: string[] = ['XL', 'X', 'M', 'S', 'XS'];
  public readonly adaptiveValues: number[] = [1, .5, .25, .1, .05];
  public adaptiveIndex: number = 3;
  public adaptiveMode: boolean = true;

  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  public getSixteenthWidth(): number {
    return this.width / (this.model.visibleTimeRange.max - this.model.visibleTimeRange.min);
  }

  public getTimeForScreenPos(pos: number): number {
    let vMin = this.model.visibleTimeRange.min;
    let sixteenth = this.getSixteenthWidth();
    const x = this.getPosition().x;

    pos -= x;                   // Local pos
    pos += vMin * sixteenth;    // visible area offset

    return (pos / sixteenth);
  }

  public getPitchAt(pos: number): number  {
    let vMin = this.model.verticalRange.min;
    let semi = this.getSemitoneHeight();
    const y = this.getPosition().y;

    pos -= y;          // Local position
    pos -= vMin * semi;     // offset for visible area
    pos = this.height - pos;     // Inversion
    pos += semi * 0.5;      // offset to have the 'note' centred
    return Math.round(pos / semi);    // Scaling
  }

  public getPositionForTime(time: number): number {
    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let vRange = vMax - vMin;
    let sixteenth = this.width / vRange;

    return (time - vMin) * sixteenth;
  }

  public getPositionForPitch(pitch: number): number {
    let semiHeight = this.getSemitoneHeight();
    return this.height - (pitch - this.model.verticalRange.min) * semiHeight;
  }

  //===============================================================================

  public drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number, vMin: number, vMax: number): void {
    let incr = this.getLockRatio();

    if (incr <= 0)
      return;

    let minAlternate = 100;
    let maxAlternate = 200;

    // Measure altern
    let alternate = (16 * this.model.signature.upper) / this.model.signature.lower;

    // If a measure is too big, try alternating with each beat
    if (alternate * sixteenth > maxAlternate) {
      alternate /= this.model.signature.upper;

      // If it's still to big, subdivide beat
      while (alternate * sixteenth > maxAlternate)
        alternate /= 2;
    } else {
      // If it's too small, multiply measure by 2
      while (alternate * sixteenth < minAlternate)
        alternate *= 2;
    }

    for (let i = 0; i < Math.ceil(vMax); i += incr) {
      let x = (i - vMin) * sixteenth;

      // Alterning background
      if (i % (alternate * 2) == 0) {
        g.fillStyle = '#ccc';
        g.fillRect(x, 0, alternate * sixteenth, this.height);
      }

      if (x < 0)
        continue;

      // Larger lines for measures
      if (i % ((16 * this.model.signature.upper) / this.model.signature.lower) == 0) {
        g.fillStyle = '#999';
        g.fillRect(x, 0, 1, this.height);
      }
      // Regular lines
      else if (Math.round(i % incr) == 0) {
        g.fillStyle = '#00000040';
        g.fillRect(x, 0, 1, this.height);
      }
    }
  }

  /*
  drawNotes = function(g, semiHeight, sixteenth) {
      for (let n of owner.notes) {
          if (n.hidden)
              continue;
          
          g.strokeWeight (n.selected ? 3 : 1);
          let stroke = color (255, n.selected ? 255 : 100);
          let c = color (255 - (n.v * (255 / 127)));
          
          let x = this.getPositionForTime (n.t);
          let y = this.getPositionForPitch (n.p);
          let d = n.dTemp != undefined ? n.dTemp : n.d;
          let w = Math.max (2, d * sixteenth);
          let h = semiHeight;
          g.fill (c);
          g.stroke(stroke);
          
          g.rect (x,y,w,h);
      }
  }
  */

  public render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = '#ddd';
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    let hMin = this.model.visibleTimeRange.min;
    let hMax = this.model.visibleTimeRange.max;
    let hRange = hMax - hMin;
    let sixteenth = this.width / hRange;

    this.drawHorizontalBackground(g, sixteenth, hMin, hMax);

    // Vertical
    let vMin = this.model.verticalRange.min;
    let vMax = this.model.verticalRange.max;
    let semiHeight = this.getSemitoneHeight();

    if (semiHeight > MIN_SEMI_H) {
      this.drawSemiTonePattern(g, vMin, vMax, semiHeight);
    } else {
      this.drawOctaveLines(g, vMin, vMax, semiHeight);
    }

    // TODO
    /*
    lasso.drawLasso(g);
    this.drawNotes(g, semiHeight, sixteenth);
    */
  }

  public drawOctaveLines(g: CanvasRenderingContext2D, vMin: number, vMax: number, semiHeight: number): void {
    g.fillStyle = '#888';

    for (let i = 0; i < 128; i += 12) {
      if (i >= vMin && i <= vMax) {
        let y = this.height - (i - vMin) * semiHeight;
        g.fillRect(0, y, this.width, 1);
      }
    }
  }

  public getSemitoneHeight(): number {
    return this.height / (this.model.verticalRange.max - this.model.verticalRange.min);
  }

  public drawSemiTonePattern(g: CanvasRenderingContext2D, vMin: number, vMax: number, semiHeight: number): void {
    const yOffset = (vMin - Math.floor(vMin)) * semiHeight;

    for (let i = Math.floor(vMin); i < Math.ceil(vMax); ++i) {
      let y = this.height - (i - Math.floor(vMin)) * semiHeight;
      let pitchClass = i % 12;
      let isBlack = PITCH_PATTERN[pitchClass];

      const viewportY = yOffset + y - semiHeight;

      g.fillStyle = isBlack ? '#00000030' : '#00000000';
      g.fillRect(0, viewportY, this.width, semiHeight);

      g.fillStyle = '#00000020';
      g.fillRect(0, viewportY, this.width, 1);
    }
  }

  public resized(): void {
    this.repaint();
  }

  public getTimeAsMBS(t: number): number[] {
    let denominator = (16 / this.model.signature.lower);
    let b = Math.floor(t / denominator);

    let s = t - (b * denominator);
    let m = Math.floor (b / this.model.signature.upper);
    b -= (m * this.model.signature.upper);

    return [m, b, s];
  }

  public getStringForTime(time: number, withOriginOne: boolean): string {
    let mbs = this.getTimeAsMBS(time);
    let m = mbs[0];
    let b = mbs[1];
    let s = mbs[2];

    if (withOriginOne) {
      m++;
      b++;
      s++;
    }

    let useSixteenth = s != 1;
    let useBeats = useSixteenth || b != 1;

    return m + (useBeats ? "." + b : "") + (useSixteenth ? "." + Math.floor(s) : "");
  }

  private getLockRatio(): number {
    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let visibleRange = vMax - vMin;
    let sixteenth = this.width / visibleRange;

    let ratio = 0;

    if (/* adaptiveMode */ true) {
      let desiredSpacing = this.adaptiveValues[this.adaptiveIndex] * this.height;

      ratio = (16 * this.model.signature.upper) / this.model.signature.lower;

      if (ratio * sixteenth > desiredSpacing) {
        ratio /= this.model.signature.upper;

        while (sixteenth * ratio > desiredSpacing)
          ratio /= 2;
      } else {
        while (sixteenth * ratio * 2 < desiredSpacing)
          ratio *= 2;
      }
    }


    // TODO
    /*
    else if (fixedMode) {
      ratio = fixedRatios[fixedIndex];
    }
    */

    return ratio;
  }
}
