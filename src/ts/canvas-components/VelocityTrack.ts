import {MAX_PITCH, SequencerDisplayModel} from '../note-sequencer';
import {Component, ComponentMouseEvent, ComponentPosition} from './BaseComponent';
import {LassoSelector} from './LassoSelector';
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
      const vScale = this.height / MAX_PITCH;

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

    this.grid.notes.forEach((note) => {
      note.initialVelocity = note.velocity;
    });

    this.getParentComponent().repaint();
  }

  protected render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    const start = this.model.visibleTimeRange.start;
    const end = this.model.visibleTimeRange.end;
    const sixteenth = this.grid.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, start, end);

    this.lasso.drawLasso(g);

    this.drawVelocityHandles(g);
  }

  protected resized(): void {
  }

  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number,
                                   start: number, end: number): void {
    const incr = this.grid.getTimeIncrement();

    if (incr <= 0) {
      return;
    }

    drawTimeBackground(g, this.height, sixteenth, incr, start, end, this.model.signature, this.model.colors);
  }

  private drawVelocityHandles(g: CanvasRenderingContext2D): void {
    const vScale = this.height / MAX_PITCH;

    for (const n of this.grid.notes) {
      if (n.hidden) {
        continue;
      }

      const x = this.grid.getPositionForTime(n.time);

      if (x < -5 || x > this.width + 5)
        continue;

      const h = n.velocity * vScale;
      const y = (this.height - h);

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
    const vScale = this.height / MAX_PITCH;
    const dragOffset = event.position.y - event.positionAtMouseDown.y;

    const scaled = dragOffset / vScale;

    for (const selected of this.grid.selectedSet.getItems()) {
      selected.velocity = selected.initialVelocity - scaled;
      selected.velocity = Math.min(MAX_PITCH, Math.max(1, selected.velocity));
    }
  }

  private findHandleAt(pos: ComponentPosition): Note {
    let vScale = this.height / MAX_PITCH;
    const squaredHitDistance = 64;

    // We need to iterate from end to start to have front most notes first
    for (const note of this.grid.notes) {
      const x = this.grid.getPositionForTime(note.time);
      const y = this.height - note.velocity * vScale;

      if (squaredDistance(pos.x, pos.y, x, y) < squaredHitDistance)
        return note;
    }

    return null;
  }
}