import {Note} from '../canvas-components/NoteGridComponent';
import {getBackgroundAlternateWidth} from '../canvas-components/RenderHelpers';
import {Colors, MAX_PITCH, PITCH_PATTERN, TimeSignature} from '../note-sequencer';

export interface LookAndFeel {
  name: string;

  minSemitoneHeight: number;

  drawTimeBackground(g: CanvasRenderingContext2D, height: number, sixteenth: number,
                     incr: number, start: number, end: number, signature: TimeSignature, colors: Colors): void;

  drawNote(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
           velocity: number, selected: boolean, colors: Colors): void;

  drawVelocityHandle(g: CanvasRenderingContext2D, x: number, note: Note, width: number, height: number,
                     vScale: number, hScale: number, handleRadius: number, colors: Colors): void;

  drawOctaveLines(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                  semiHeight: number, colors: Colors): void;

  drawSemiTonePattern(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                      semiHeight: number, colors: Colors): void;

  drawPianoRoll(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                semiHeight: number, colors: Colors): void;

  drawPitchLabels(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number, semiHeight: number,
                  hoveredPitch: number, colors: Colors): void;

  drawPitchRuler(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number, semiHeight: number,
                 hoveredPitch: number, colors: Colors): void;

  isOnPianoRoll(x: number, y: number, width: number, height: number, semitoneHeight: number): boolean;

  drawVelocityRuler(g: CanvasRenderingContext2D, width: number, height: number, colors: Colors): void;
}

export class LookAndFeel_Default implements LookAndFeel {

  public readonly name: string = 'default';

  public readonly minSemitoneHeight: number = 5;

  public drawTimeBackground(g: CanvasRenderingContext2D, height: number, sixteenth: number,
                            incr: number, start: number, end: number, signature: TimeSignature, colors: Colors): void {

    const alternateBackgroundWidth = getBackgroundAlternateWidth(sixteenth, signature);

    for (let i = 0; i < Math.ceil(end); i += incr) {
      const x = (i - start) * sixteenth;

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

  public drawNote(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
                  velocity: number, selected: boolean, colors: Colors): void {

    const cornerRadius = Math.max(0, Math.min(4, height * 0.4, width));

    // angles
    const halfRad = Math.PI;
    const quarterRad = Math.PI / 2;

    g.beginPath();
    g.arc(cornerRadius + x, cornerRadius + y, cornerRadius, -quarterRad, halfRad, true);
    g.lineTo(x, y + height - cornerRadius);
    g.arc(cornerRadius + x, height - cornerRadius + y, cornerRadius, halfRad, quarterRad, true);
    g.lineTo(x + width - cornerRadius, y + height);
    g.arc(x + width - cornerRadius, y + height - cornerRadius, cornerRadius, quarterRad, 0, true);
    g.lineTo(x + width, y + cornerRadius);
    g.arc(x + width - cornerRadius, y + cornerRadius, cornerRadius, 0, -quarterRad, true);
    g.lineTo(x + cornerRadius, y);

    // Fill
    g.fillStyle = colors.noteHigh;
    g.fill();
    g.globalAlpha = 1 - velocity / 127;
    g.fillStyle = colors.noteLowBlend;
    g.fill();
    g.globalAlpha = 1;

    // Stroke
    if (height < 4 && ! selected) {

    } else {
      g.lineWidth = selected ? 2 : 1;
      g.strokeStyle = selected ? colors.noteOutlineSelected : colors.noteOutline;
      g.stroke();
    }
  }

  public drawVelocityHandle(g: CanvasRenderingContext2D, x: number, note: Note, width: number, height: number,
                     vScale: number, hScale: number, handleRadius: number, colors: Colors): void {
    if (note.hidden) {
      return;
    }

    const w = Math.max(0, hScale * (note.tempDuration ? note.tempDuration : note.duration));
    const y = (height - note.velocity * vScale);
    const endingH = 6;

    const color = note.selected ? colors.velocityHandleSelected : colors.velocityHandle;

    g.fillStyle = color;
    g.fillRect(x, y - 1, w, 2);
    g.fillRect(x + w - 1, y - endingH * 0.5, 2, endingH);

    g.fillStyle = colors.background;
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, handleRadius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  public drawOctaveLines(g: CanvasRenderingContext2D, width: number, height: number,
                          start: number, end: number, semiHeight: number, colors: Colors): void {
    g.fillStyle = colors.strokeLight;

    for (let i = 0; i < MAX_PITCH; i += 12) {
      if (i >= start && i <= end) {
        const y = height - (i - start) * semiHeight;
        g.fillRect(0, y, width, 1);
      }
    }
  }

  public drawSemiTonePattern(g: CanvasRenderingContext2D, width: number, height: number,
                              start: number, end: number, semiHeight: number, colors: Colors): void {

    const yOffset = (start - Math.floor(start)) * semiHeight;

    for (let i = Math.floor(start); i < Math.ceil(end); ++i) {
      const y = height - (i - Math.floor(start)) * semiHeight;
      const pitchClass = i % 12;

      const viewportY = yOffset + y - semiHeight;

      // Black key
      g.fillStyle = colors.backgroundBlackKey;

      if (PITCH_PATTERN[pitchClass]) {
        g.fillRect(0, viewportY, width, semiHeight);
      }

      // Line separation
      g.fillStyle = colors.strokeLight;
      g.fillRect(0, viewportY, width, 1);
    }
  }

  public drawPitchRuler(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                        semiHeight: number, hoveredPitch: number, colors: Colors): void {
    // piano roll
    if (this.isPianoRollVisible(semiHeight)) {
      this.drawPianoRoll(g, width, height, start, end, semiHeight, colors);

      // left border
      g.fillStyle = colors.strokeLight;
      g.fillRect(width / 2, 0, 1, height);
    }

    // Octave labels
    this.drawPitchLabels(g, width, height, start, end, semiHeight, hoveredPitch, colors);
  }

  public drawPitchLabels(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                         semiHeight: number, hoveredPitch: number, colors: Colors): void {

    const isPianoRollVisible = this.isPianoRollVisible(semiHeight);
    const x = isPianoRollVisible ? width * 0.25 : width * 0.5;

    for (let i = 0; i < 128; i += 12) {
      if (i + 6 >= start && i <= end) {
        const y = height - (i - start) * semiHeight;
        const txt = '' + this.getOctaveNumber(i);

        g.fillStyle = colors.text;
        g.font = '11px Arial';
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        g.fillText(txt, x, y - 6 * semiHeight, width / 2);

        g.fillStyle = colors.strokeDark;
        g.fillRect(0, y, width, 1);
      }
    }
  }

  public drawPianoRoll(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                       semiHeight: number, colors: Colors): void {
    for (let i = Math.floor(start); i <= Math.ceil(end); ++i) {
      const y = height - (i - start) * semiHeight;
      const pitchClass = i % 12;
      const isBlack = PITCH_PATTERN[pitchClass];

      g.fillStyle = isBlack ?
        g.fillStyle = colors.blackKey :
        g.fillStyle = colors.whiteKey;

      g.fillRect(width / 2, y - semiHeight,
        width / 2, semiHeight);

      // stroke
      g.fillStyle = colors.strokeLight;
      g.fillRect(width / 2, y - semiHeight,
        width / 2, 1);
    }
  }

  public isOnPianoRoll(x: number, y: number, width: number, height: number, semitoneHeight: number): boolean {
    return this.isPianoRollVisible(semitoneHeight) && x > width / 2;
  }

  public isPianoRollVisible(semiHeight: number): boolean {
    return semiHeight > this.minSemitoneHeight;
  }

  public drawVelocityRuler(g: CanvasRenderingContext2D, width: number, height: number, colors: Colors): void {
    const largeGradW = 10;
    const smallGradW = 5;

    g.fillStyle = colors.strokeDark;

    // Ruler border
    g.fillRect (width - 1, 0, 1, height);

    // Top grad
    g.fillRect(width - largeGradW, 0, largeGradW, 1);

    // Mid grad
    g.fillRect(width - largeGradW, Math.round(height * 0.5), largeGradW, 1);

    // Bottom grad
    g.fillRect(width - largeGradW, height - 1, largeGradW, 1);

    // Intermediary grads
    if (height > 60) {
      g.fillRect(width - smallGradW, Math.round(height * 0.25), smallGradW, 1);
      g.fillRect(width - smallGradW, Math.round(height * 0.75), smallGradW, 1);
    }

    g.fillStyle = colors.text;
    g.fillText("0", width - 20, height - 2);
    g.fillText("100%", width - 30, 12);
  }

  protected getOctaveNumber(pitchValue: number): number {
    return Math.floor(pitchValue / 12) - 2;
  }
}

export class LookAndFeel_Live extends LookAndFeel_Default {

  public readonly name: string = 'live';

  public drawNote(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
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


  public drawVelocityHandle(g: CanvasRenderingContext2D, x: number, note: Note, width: number, height: number,
                            vScale: number, hScale: number, handleRadius: number, colors: Colors): void {
    if (note.hidden) {
      return;
    }

    const h = note.velocity * vScale;
    const y = (height - h);

    const color = note.selected ? colors.velocityHandleSelected : colors.velocityHandle;
    g.fillStyle = color;
    g.fillRect(x - 1, y, 2, h);

    g.strokeStyle = color;
    g.fillStyle = colors.background;
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(x, y, handleRadius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  public drawPitchLabels(g: CanvasRenderingContext2D, width: number, height: number, start: number, end: number,
                         semiHeight: number, hoveredPitch: number, colors: Colors): void {

    for (let i = 0; i < 128; i += 12) {
      if (i >= start && i <= end) {
        const y = height - (i - start) * semiHeight;
        const txt = 'C' + ((i / 12) - 2);

        g.fillStyle = colors.text;
        g.fillText(txt, 2, y - 3, width / 2);

        g.fillStyle = colors.strokeDark;
        g.fillRect(0, y, width, 1);
      }
    }
  }

  public drawVelocityRuler(g: CanvasRenderingContext2D, width: number, height: number, colors: Colors): void {
    const largeGradW = 10;
    const smallGradW = 5;
    const labelRightMargin = 14;

    g.fillStyle = colors.strokeDark;
    g.textAlign = 'right';

    // Ruler border
    g.fillRect (width - 1, 0, 1, height);

    // Top grad
    g.fillRect(width - largeGradW, 0, largeGradW, 1);
    g.fillStyle = colors.text;
    g.fillText("127", width - labelRightMargin, 12);

    g.fillStyle = colors.strokeDark;

    // Mid grad
    g.fillRect(width - smallGradW, Math.round(height * 0.5), smallGradW, 1);

    // Bottom grad
    g.fillRect(width - largeGradW, height - 1, largeGradW, 1);

    g.fillStyle = colors.text;
    g.fillText("0", width - labelRightMargin, height - 2);
  }
}
