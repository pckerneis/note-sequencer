import {Component, ComponentMouseEvent, ComponentPosition} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';
import {Note, NoteGridComponent} from './NoteGridComponent';
import {getBackgroundAlternateWidth, squaredDistance} from './RenderHelpers';

export class VelocityTrack extends Component {

  private _draggingHandle: boolean;
  private _mouseDownResult: boolean;
  private _initialVelocity: number;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    const local = {
      x: event.x - pos.x,
      y: event.y - pos.y,
    };

    this._draggingHandle = false;

    const handle = this.findHandleAt(local);

    if (handle == null) {
      if (!event.modifiers.shift) {
        this.grid.selectedSet.deselectAll();
      }

      // lasso.beginLasso();
      this._mouseDownResult = true;

      return;
    }

    this._initialVelocity = handle.velocity;

    // handle is actually a reference to the note
    this.grid.moveNoteToFront(handle);
    this._draggingHandle = true;

    this._mouseDownResult = this.grid.selectedSet.addToSelectionMouseDown(handle, event.modifiers.shift);
  }


  public mouseDragged(event: ComponentMouseEvent): void {
    if (!event.wasDragged)
      return;


    if (this._draggingHandle)
      this.dragSelectedHandles(event);
    /*
    else
      lasso.dragLasso();
     */

    this.getParentComponent().repaint();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    // lasso.endLasso();

    this.grid.selectedSet.addToSelectionMouseUp(event.wasDragged, event.modifiers.shift, this._mouseDownResult);

    this.getParentComponent().repaint();
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
        g.fillRect(x, 0, 1, this.height);
      }
      // Regular lines
      else if (Math.round(i % incr) == 0) {
        g.fillStyle = '#00000020';
        g.fillRect(x, 0, 1, this.height);
      }
    }
  }

  private drawVelocityHandles(g: CanvasRenderingContext2D): void {
    let vScale = this.height / 127;

    for (let n of this.grid.notes) {
      const x = this.grid.getPositionForTime(n.time);

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

  private dragSelectedHandles(event: ComponentMouseEvent): void {
    let vScale = this.height / 128;
    let dragOffset = event.y - event.positionAtMouseDown.y;

    let scaled = dragOffset / vScale;

    for (let s of this.grid.selectedSet.getItems()) {
      s.velocity = this._initialVelocity - scaled;
      s.velocity = Math.min(127, Math.max(1, s.velocity));
    }
  }

  private findHandleAt(pos: ComponentPosition): Note {
    let vScale = this.height / 128;

    // We need to iterate from end to start to have front most notes first
    for (let i = this.grid.notes.length; --i >= 0;) {
      let n = this.grid.notes[i];
      let nx = this.grid.getPositionForTime(n.time);
      let nh = n.velocity * vScale;
      let ny = this.height - nh;
      let nr = 8;

      if (squaredDistance(pos.x, pos.y, nx, ny) < nr * nr)
        return n;
    }

    return null;
  }
}