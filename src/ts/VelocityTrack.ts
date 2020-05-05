import {Component, ComponentMouseEvent, ComponentPosition} from './BaseComponent';
import {LassoSelector} from './LassoSelector';
import {SequencerDisplayModel} from './note-sequencer';
import {Note, NoteGridComponent} from './NoteGridComponent';
import {drawTimeBackground, squaredDistance} from './RenderHelpers';

export class VelocityTrack extends Component {

  private readonly handleRadius: number = 3;

  private _draggingHandle: boolean;
  private _mouseDownResult: boolean;
  private _initialVelocity: number;

  private readonly lasso: LassoSelector<Note>;

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();

    this.lasso = new LassoSelector<Note>(this, this.grid.selectedSet, this.model.colors);

    this.lasso.findAllElementsInLasso = (lassoBounds) => {
      const vScale = this.height / 128;

      return this.grid.notes.filter((note) => {

        const noteBounds = {
          x: this.grid.getPositionForTime(note.time) - this.handleRadius,
          y: this.height - (note.velocity * vScale) - this.handleRadius,
          width: this.handleRadius * 2,
          height: this.handleRadius * 2,
        };

        return Component.boundsIntersect(noteBounds, lassoBounds);
      })
    };
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    this._draggingHandle = false;

    const handle = this.findHandleAt(local);

    if (handle == null) {
      if (!event.modifiers.shift) {
        this.grid.selectedSet.deselectAll();
      }

      this.lasso.beginLasso(event);
      this._mouseDownResult = true;

      return;
    }

    this._initialVelocity = handle.velocity;

    this.grid.selectedSet.getItems().forEach((note) => {
      note.initialVelocity = note.velocity;
    });

    // handle is actually a reference to the note
    this.grid.moveNoteToFront(handle);
    this._draggingHandle = true;

    this._mouseDownResult = this.grid.selectedSet.addToSelectionMouseDown(handle, event.modifiers.shift);
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    if (!event.wasDragged)
      return;

    if (this._draggingHandle) {
      this.dragSelectedHandles(event);
    } else {
      this.lasso.dragLasso(event);
    }

    this.getParentComponent().repaint();
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this.lasso.endLasso();

    this.grid.selectedSet.addToSelectionMouseUp(event.wasDragged, event.modifiers.shift, this._mouseDownResult);

    this.getParentComponent().repaint();
  }

  protected render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    let start = this.model.visibleTimeRange.start;
    let end = this.model.visibleTimeRange.end;
    let sixteenth = this.grid.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, start, end);

    this.lasso.drawLasso(g);

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

    drawTimeBackground(g, this.height, sixteenth, incr, vMin, vMax, this.model.signature, this.model.colors);
  }

  private drawVelocityHandles(g: CanvasRenderingContext2D): void {
    let vScale = this.height / 127;

    for (let n of this.grid.notes) {
      const x = this.grid.getPositionForTime(n.time);

      if (x < -5 || x > this.width + 5)
        continue;

      let h = n.velocity * vScale;
      let y = (this.height - h);

      const color = n.selected ? this.model.colors.velocityHandleSelected : this.model.colors.velocityHandle;
      g.fillStyle = color;
      g.fillRect(x - 1, y, 2, h);

      g.strokeStyle = color;
      g.fillStyle = this.model.colors.background;
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(x, y, this.handleRadius, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }

  private dragSelectedHandles(event: ComponentMouseEvent): void {
    let vScale = this.height / 128;
    let dragOffset = event.position.y - event.positionAtMouseDown.y;

    let scaled = dragOffset / vScale;

    for (let s of this.grid.selectedSet.getItems()) {
      s.velocity = s.initialVelocity - scaled;
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