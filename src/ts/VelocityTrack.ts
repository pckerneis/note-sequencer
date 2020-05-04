import {Component} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';
import {getBackgroundAlternateWidth} from './RenderHelpers';

export class VelocityTrack extends Component {
  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = '#00000010';
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    let hMin = this.model.visibleTimeRange.min;
    let hMax = this.model.visibleTimeRange.max;
    let sixteenth = this.grid.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, hMin, hMax);

    // lasso.drawLasso(g);

    this.drawVelocityHandles(g);
  }

  protected resized(): void {
  }

  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number,
                                   vMin: number, vMax: number): void {
    let incr = this.grid.getLockRatio();

    if (incr <= 0) {
      return;
    }

    const alternate = getBackgroundAlternateWidth(sixteenth, this.model.signature);

    for (let i = 0; i < Math.ceil(vMax); i += incr) {
      let x = (i - vMin) * sixteenth;

      // Alternating background
      if (i % (alternate * 2) == 0) {
        g.fillStyle = '#00000010';
        g.fillRect(x, 0, alternate * sixteenth, this.height);
      }

      if (x < 0)
        continue;

      // Larger lines for measures
      if (i % ((16 * this.model.signature.upper) / this.model.signature.lower) == 0) {
        g.fillStyle = '#00000050';
        g.fillRect (x, 0, 1, this.height);
      }
      // Regular lines
      else if (Math.round(i % incr) == 0) {
        g.fillStyle = '#00000020';
        g.fillRect (x, 0, 1, this.height);
      }
    }
  }

  private drawVelocityHandles(g: CanvasRenderingContext2D): void {
    let vScale = this.height / 127;

    for (let n of this.grid.notes) {
      const x = this.grid.getPositionForTime (n.time);

      if (x < -5 || x > this.width + 5)
        continue;

      let h = n.velocity * vScale;
      let y = (this.height - h);

      const color = n.selected ? '#000000' : '#888888';
      g.fillStyle = color;
      g.fillRect(x - 1, y, 2, h);

      g.strokeStyle = color;
      g.fillStyle = '#ffffff';
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }
}