import {Component, ComponentMouseEvent} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';

export class HorizontalRuler extends Component {
  private beingDragged: boolean = true;
  private lastMouseX: number;
  private lastMouseY: number;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
  }


  public mousePressed(event: ComponentMouseEvent): void {
    this.beingDragged = true;
    this.lastMouseX = event.x;
    this.lastMouseY = event.y;
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    this.model.visibleTimeRange.min = 0;
    this.model.visibleTimeRange.max = this.model.maxTimeRange.max;
    this.getParentComponent().repaint();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this.beingDragged = false;
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    if (this.beingDragged) {
      let xOffset = event.x - this.lastMouseX;
      this.lastMouseX = event.x;
      this.translate(-xOffset);

      let yOffset = event.y - this.lastMouseY;
      this.lastMouseY = event.y;

      if (Math.abs(yOffset) >= 3) {
        if (yOffset > 0)
          this.zoomIn();
        else if (yOffset < 0)
          this.zoomOut();
      }

      this.getParentComponent().repaint();
    }
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    g.fillStyle = '#eee';
    g.fillRect(0, 0, this.width, this.height);

    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let visibleRange = vMax - vMin;
    let sixteenth = bounds.width / visibleRange;

    let minLabelSpacing = 50;
    let minGraduationSpacing = 5;

    let ratio = 1;

    while (sixteenth * ratio < minLabelSpacing)
      ratio *= 2;

    let incr = 1;

    if (sixteenth * incr < minGraduationSpacing) {
      while (sixteenth * incr < minGraduationSpacing)
        incr *= 2;
    } else {
      while (sixteenth * incr * 0.5 > minGraduationSpacing)
        incr *= .5;
    }

    for (let i = 0; i < Math.ceil(vMax); i += incr) {
      let x = (i - vMin) * sixteenth;

      if (x < 0)
        continue;

      let gradH = i % (incr * 4) == 0 ? 0.4 : 0.12;

      g.fillStyle = '#00000030';
      g.fillRect(x, bounds.height * (1 - gradH), 1, bounds.height * gradH);

      if (i % ratio == 0) {
        g.rect(x + 1, bounds.height * (1 - gradH), 1, 1);

        g.fillStyle = '#000';

        const text = this.grid.getStringForTime(i, true);
        g.fillText(text, x + 4, bounds.height - 5, minLabelSpacing);
      }
    }

    // Bottom corner
    g.fillStyle = '#00000030';
    g.fillRect(0, bounds.height - 1, bounds.width, 1);
  }

  private zoomIn(): void {
    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let visibleRange = vMax - vMin;
    let sixteenth = this.width/ visibleRange;

    if (sixteenth < 500) {
      let zoomAmount = visibleRange / this.model.zoomSensitivity;

      this.model.visibleTimeRange.min += zoomAmount;
      this.model.visibleTimeRange.max -= zoomAmount;
    }
  }

  private zoomOut(): void {
    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let visibleRange = vMax - vMin;
    let zoomAmount = visibleRange / this.model.zoomSensitivity;

    this.model.visibleTimeRange.min -= zoomAmount;
    this.model.visibleTimeRange.max += zoomAmount;

    this.model.visibleTimeRange.max = Math.min (this.model.visibleTimeRange.max, this.model.maxTimeRange.max);
    this.model.visibleTimeRange.min = Math.max (this.model.visibleTimeRange.min, this.model.maxTimeRange.min);
  }

  private translate(amount: number): void {
    let vMin = this.model.visibleTimeRange.min;
    let vMax = this.model.visibleTimeRange.max;
    let visibleRange = vMax - vMin;
    let sixteenth = this.width / visibleRange;

    if (amount < 0) {
      let desiredMin = vMin + amount / sixteenth;
      let clipped = Math.max (desiredMin, 0);
      let correctAmount = (clipped - desiredMin) + (amount / sixteenth);

      this.model.visibleTimeRange.min = clipped;
      this.model.visibleTimeRange.max += correctAmount;

    } else if (amount > 0) {
      let desiredMax = vMax + amount / sixteenth;
      let clipped = Math.min (desiredMax, this.model.maxTimeRange.max);
      let correctAmount = (clipped - desiredMax) + (amount / sixteenth);

      this.model.visibleTimeRange.max = clipped;
      this.model.visibleTimeRange.min += correctAmount;
    }
  }
}