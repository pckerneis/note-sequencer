import {MAX_PITCH, MAX_VELOCITY, MIN_SEMI_H, SequencerDisplayModel} from '../note-sequencer'
import {Component, ComponentBounds, ComponentMouseEvent, ComponentPosition} from './BaseComponent';
import {LassoSelector} from './LassoSelector';
import {SelectedItemSet} from './SelectedItemSet';

export interface Note {
  time: number,
  pitch: number,
  duration: number,
  velocity: number,

  tempDuration: number,
  hidden: boolean,
  selected: boolean,

  initialStart: number;
  initialVelocity: number;
}

interface NotePosition {
  time: number,
  pitch: number,
}

type DragAction = 'V_RIGHT' | 'MOVE_NOTE' | 'RIGHT' | 'LEFT' | 'NONE';

export class NoteGridComponent extends Component {

  // TODO: move into model or utility
  public readonly adaptiveLabels: string[] = ['XL', 'X', 'M', 'S', 'XS'];
  public readonly adaptiveRatios: number[] = [1, .5, .25, .1, .05];
  public adaptiveIndex: number = 3;
  public fixedIncrements: number[] = [128, 64, 32, 16, 8, 4, 2, 1, 0.5];
  public fixedIndex: number = 5;

  private _notes: Note[] = [];
  private readonly _selectedSet: SelectedItemSet<Note>;
  private readonly _lasso: LassoSelector<Note>;

  // Mouse interaction state
  private _dragAction: DragAction;
  private _mouseDownResult: boolean = false;
  private _currentVelocity: number = MAX_VELOCITY;
  private _draggedItem: Note;
  private _initialDuration: number = null;
  private _initialStart: number = null;
  private _initialVelocity: number = null;
  private _initialPosition: NotePosition = null;
  private _minStartOffset: number = null;
  private _maxDurationOffset: number = null;
  private _minDragOffset: NotePosition = null;
  private _maxDragOffset: NotePosition = null;

  constructor(private readonly model: SequencerDisplayModel) {
    super();

    this._selectedSet = new SelectedItemSet<Note>();

    this._lasso = new LassoSelector<Note>(this, this._selectedSet, this.model.colors);

    this._lasso.findAllElementsInLasso = (lassoBounds: ComponentBounds) => {
      return this._notes.filter((note) => {
        const noteBounds = {
          x: this.getPositionForTime (note.time),
          y: this.getPositionForPitch (note.pitch),
          width: Math.max (2, note.duration * this.getSixteenthWidth()),
          height: this.getSemitoneHeight(),
        };

        return Component.boundsIntersect(noteBounds, lassoBounds);
      });
    }
  }

  public get notes(): Note[] {
    return this._notes;
  }

  public get selectedSet(): SelectedItemSet<Note> {
    return this._selectedSet;
  }

  public render(g: CanvasRenderingContext2D): void {
    // Background
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    // Horizontal
    const hMin = this.model.visibleTimeRange.start;
    const hMax = this.model.visibleTimeRange.end;
    const sixteenth = this.getSixteenthWidth();

    this.drawHorizontalBackground(g, sixteenth, hMin, hMax);

    // Vertical
    const start = this.model.verticalRange.start;
    const end = this.model.verticalRange.end;
    const semiHeight = this.getSemitoneHeight();

    if (semiHeight > MIN_SEMI_H) {
      this.model.theme.drawSemiTonePattern(g, this.width, this.height, start, end, semiHeight, this.model.colors);
    } else {
      this.model.theme.drawOctaveLines(g, this.width, this.height, start, end, semiHeight, this.model.colors);
    }

    this._lasso.drawLasso(g);

    this.drawNotes(g, semiHeight, sixteenth);
  }

  public resized(): void {
    this.repaint();
  }

  //===============================================================================
  // Note management
  public removeNote(note: Note, repaint: boolean = true): void {
    this._selectedSet.removeFromSelection(note);
    this._notes = this._notes.filter(n => n !== note);

    if (repaint) {
      this.getParentComponent().repaint();
    }
  }

  public moveNoteToFront(note: Note): void {
    const idx = this._notes.indexOf(note);

    if (idx >= 0) {
      this._notes.splice(idx, 1);
      this._notes.push(note);
      this.getParentComponent().repaint();
    }
  }

  public deleteSelection(): void {
    const selected = this._selectedSet.getItems();

    for (let i = selected.length; --i >= 0;)
      this.removeNote(selected[i], false);

    this.getParentComponent().repaint();
  }

  //===============================================================================

  public getSixteenthWidth(): number {
    return this.width / (this.model.visibleTimeRange.end - this.model.visibleTimeRange.start);
  }

  public getTimeAt(pos: number): number {
    const start = this.model.visibleTimeRange.start;
    const sixteenth = this.getSixteenthWidth();
    const x = this.getPosition().x;

    pos -= x;                   // Local pos
    pos += start * sixteenth;    // visible area offset

    return (pos / sixteenth);
  }

  public getPitchAt(pos: number): number {
    const start = this.model.verticalRange.start;
    const semi = this.getSemitoneHeight();
    const y = this.getPosition().y;

    pos -= y;                             // Local position
    pos -= start * semi;                  // offset for visible area
    pos = this.height - pos;              // Inversion
    pos += semi * 0.5;                    // offset to have the 'note' centred
    return Math.round(pos / semi);     // Scaling
  }

  public getPositionForTime(time: number): number {
    const start = this.model.visibleTimeRange.start;
    const end = this.model.visibleTimeRange.end;
    const vRange = end - start;
    const sixteenth = this.width / vRange;

    return (time - start) * sixteenth;
  }

  public getPositionForPitch(pitch: number): number {
    const semiHeight = this.getSemitoneHeight();
    return this.height - (pitch - this.model.verticalRange.start) * semiHeight;
  }

  public getSemitoneHeight(): number {
    return this.height / (this.model.verticalRange.end - this.model.verticalRange.start);
  }
  
  //===============================================================================
  // Mouse event handlers

  public doublePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote != null) {
      this.removeNote (existingNote);
      return;
    }

    const t = this.snapToGrid (this.getTimeAt (event.position.x));
    const p = Math.round (this.getPitchAt(event.position.y));
    const d = this.getTimeIncrement();

    const newNote: Note = {
      time: t,
      pitch: p,
      duration: d,
      velocity: this._currentVelocity,
      hidden: false,
      selected: true,
      tempDuration: 0,
      initialStart: t,
      initialVelocity: this._currentVelocity,
    };

    this._notes.push(newNote);
    this._selectedSet.setUniqueSelection(newNote);

    this.removeOverlaps(true);

    // We start dragging the end point of this note and its velocity
    this._dragAction = 'V_RIGHT';
    this._draggedItem = newNote;

    // Trigger callback method
    // TODO
    // this.onNoteAdded(newNote);

    this.getParentComponent().repaint();

    this.mouseCursor = "w-resize";
  }

  public mouseMoved(event: ComponentMouseEvent): void {
    super.mouseMoved(event);

    if (event.isDragging)
      return;

    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote == null) {
      this.mouseCursor = "default";
      return;
    }

    const action = this.getDragActionForNoteAt(local, existingNote);

    if (action == 'MOVE_NOTE') {
      this.mouseCursor = "move";
    } else if (action == "LEFT") {
      this.mouseCursor = "w-resize";
    } else if (action == "RIGHT") {
      this.mouseCursor = "e-resize";
    } else {
      this.mouseCursor = "default";
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    const local = {
      x: event.position.x - pos.x,
      y: event.position.y - pos.y,
    };

    const existingNote = this.findNoteAt(local);

    if (existingNote == null) {
      if (! event.modifiers.shift) {
        this._selectedSet.deselectAll();
      }

      this._lasso.beginLasso(event);

      this._mouseDownResult = true;

      return;
    }

    this._mouseDownResult = this._selectedSet.addToSelectionMouseDown(existingNote, event.modifiers.shift);
    this._dragAction = this.getDragActionForNoteAt (local, existingNote);
    this.setMouseCursor(this._dragAction);

    this._draggedItem = existingNote;
    this.moveNoteToFront (existingNote);
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this._dragAction = 'NONE';
    this.setMouseCursor(this._dragAction);

    this._initialPosition = null;
    this._initialDuration = null;
    this._initialStart = null;
    this._initialVelocity = null;

    this._lasso.endLasso();

    // in case a drag would have caused negative durations
    for (const selected of this._selectedSet.getItems()) {
      selected.duration = Math.max (0, selected.duration);
    }

    this._selectedSet.addToSelectionMouseUp(event.wasDragged, event.modifiers.shift, this._mouseDownResult);

    this.removeOverlaps (true);

    this._notes.forEach((note) => {
      note.initialVelocity = note.velocity;
    });

    this._draggedItem = null;

  }

  public mouseDragged(event: ComponentMouseEvent): void {
    if (this._dragAction == "NONE") {
      this._lasso.dragLasso(event);
    }

    if (! event.wasDragged || this._dragAction == "NONE") {
      this.getParentComponent().repaint();
      return;
    }

    if (this._dragAction == "MOVE_NOTE") {
      this.moveSelection(event);
    } else if (this._dragAction == "RIGHT" || this._dragAction == "V_RIGHT") {
      this.dragEndPoints(event);
    } else if (this._dragAction == "LEFT") {
      this.dragStartPoints(event);
    }

    if (this._dragAction == "V_RIGHT") {
      this.dragVelocity(event);
    }

    this.removeOverlaps (false);

    this.getParentComponent().repaint();
  }

  //===============================================================================

  public getTimeAsMBS(t: number): number[] {
    const denominator = (16 / this.model.signature.lower);
    let b = Math.floor(t / denominator);

    const s = t - (b * denominator);
    const m = Math.floor(b / this.model.signature.upper);
    b -= (m * this.model.signature.upper);

    return [m, b, s];
  }

  public getStringForTime(time: number, withOriginOne: boolean): string {
    const mbs = this.getTimeAsMBS(time);
    let m = mbs[0];
    let b = mbs[1];
    let s = mbs[2];

    if (withOriginOne) {
      m++;
      b++;
      s++;
    }

    const useSixteenth = s != 1;
    const useBeats = useSixteenth || b != 1;

    return m + (useBeats ? '.' + b : '') + (useSixteenth ? '.' + Math.floor(s) : '');
  }

  public getTimeIncrement(): number {
    const sixteenth = this.getSixteenthWidth();
    let ratio: number;

    if (sixteenth < 0.00001) {
      return null;
    }

    if (this.model.adaptiveMode) {
      const desiredSpacing = this.adaptiveRatios[this.adaptiveIndex] * this.width;

      ratio = (16 * this.model.signature.upper) / this.model.signature.lower;

      if (ratio * sixteenth > desiredSpacing) {
        ratio /= this.model.signature.upper;

        while (sixteenth * ratio > desiredSpacing)
          ratio /= 2;
      } else {
        while (sixteenth * ratio * 2 < desiredSpacing)
          ratio *= 2;
      }
    } else {
      ratio = this.fixedIncrements[this.fixedIndex];
    }

    return ratio;
  }

  //===============================================================================

  public moveSelection(event: ComponentMouseEvent): void {
    if (this._draggedItem == null || this._selectedSet.getItems().length == 0)
      return;

    const currentPosition = {
      time: this._draggedItem.time,
      pitch: this._draggedItem.pitch,
    };

    if (this._initialPosition == null) {
      // We're starting a new drag
      this._initialPosition = currentPosition;

      // Find bounding box for selection
      let selectionLeft: number = Infinity;
      let selectionRight: number = -Infinity;
      let selectionTop: number = Infinity;
      let selectionBottom: number = -Infinity;

      this._selectedSet.getItems().forEach((note) => {
        if (selectionLeft == null || note.time < selectionLeft) {
          selectionLeft = note.time;
        }

        if (selectionRight == null || note.time + note.duration > selectionRight) {
          selectionRight = note.time + note.duration;
        }

        if (selectionTop == null || note.pitch - 1 < selectionTop) {
          selectionTop = note.pitch - 1;
        }

        if (selectionBottom == null || note.pitch > selectionBottom) {
          selectionBottom = note.pitch;
        }
      });

      // Deduce constraints for this box
      this._minDragOffset = {
        time: -selectionLeft,
        pitch: -selectionTop,
      };

      this._maxDragOffset = {
        time: this.model.maxTimeRange.end - selectionRight,
        pitch: MAX_PITCH - selectionBottom,
      };
    }

    const dragOffset = {
      x: event.position.x - event.positionAtMouseDown.x,
      y: event.position.y - event.positionAtMouseDown.y,
    };

    const scaledX = Math.max(this._minDragOffset.time,
      Math.min(dragOffset.x / this.getSixteenthWidth(),
        this._maxDragOffset.time));

    const scaledY = Math.max(this._minDragOffset.pitch,
      Math.min(- dragOffset.y / this.getSemitoneHeight(),
        this._maxDragOffset.pitch));

    // Apply translate to itemDragged
    this._draggedItem.pitch = Math.round(this._initialPosition.pitch + scaledY);
    this._draggedItem.time = this._initialPosition.time + scaledX;

    // Snap to grid
    if (! event.modifiers.option) {
      this._draggedItem.time = this.snapToGrid(this._draggedItem.time);
    }

    // Now we determine the actual offset for all elements
    const gridOffsetX = this._draggedItem.time - currentPosition.time;
    const gridOffsetY = this._draggedItem.pitch - currentPosition.pitch;

    for (const s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      s.pitch += gridOffsetY;
      s.time += gridOffsetX;
    }
  }

  private dragEndPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem === null)
      return;

    const currentDuration = this._draggedItem.duration;

    if (this._initialDuration == null) {
      this._initialDuration = currentDuration;

      let selectionRight: number = null;
      this._selectedSet.getItems().forEach((note) => {
        if (selectionRight == null || note.time + note.duration > selectionRight) {
          selectionRight = note.time + note.duration;
        }
      });

      this._maxDurationOffset = this.model.maxTimeRange.end - selectionRight;
    }

    const dragOffset = event.position.x - event.positionAtMouseDown.x;
    const scaledX = Math.min(this._maxDurationOffset, dragOffset / this.getSixteenthWidth());

    // Apply to itemDragged
    this._draggedItem.duration = this._initialDuration + scaledX;

    // snap to grid
    if (! event.modifiers.option) {
      const snappedEndPoint = this.snapToGrid(this._draggedItem.time + this._draggedItem.duration);
      this._draggedItem.duration = snappedEndPoint - this._draggedItem.time;
      this._draggedItem.duration = Math.max (0, this._draggedItem.duration);
    }

    // Now we determine the actual offset
    const gridOffsetX = this._draggedItem.duration - currentDuration;

    for (const s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      // We temporarily allow negative values... will be clipped in mouseReleased
      s.duration += gridOffsetX;
    }
  }

  private dragStartPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem == null)
      return;

    const currentStart = this._draggedItem.time;
    const currentDuration = this._draggedItem.duration;

    // On first call of a drag action
    if (this._initialStart === null) {
      this._initialStart = currentStart;
      this._initialDuration = currentDuration;

      for (const s of this._selectedSet.getItems()) {
        s.initialStart = s.time;
      }

      let selectionLeft: number = null;

      this._selectedSet.getItems().forEach((note) => {
        if (selectionLeft == null || note.time < selectionLeft) {
          selectionLeft = note.time;
        }
      });

      this._minStartOffset = -selectionLeft;
    }

    const dragOffset = event.position.x - event.positionAtMouseDown.x;
    const scaledX = Math.max(this._minStartOffset, dragOffset / this.getSixteenthWidth());
    const currentEndPoint = this._draggedItem.time + this._draggedItem.duration;

    // Apply to itemDragged
    this._draggedItem.time = Math.min (currentEndPoint, this._initialStart + scaledX);
    this._draggedItem.duration = Math.max (0, this._initialDuration - scaledX);

    // snap to grid
    if (!event.modifiers.option && this._draggedItem.duration > 0) {
      this._draggedItem.time = this.snapToGrid(this._draggedItem.time);
      this._draggedItem.duration = Math.max(0, this._initialDuration - (this._draggedItem.time - this._initialStart));
    }

    // Now we determine the actual offset since beginning of drag
    const startOffset = this._draggedItem.time - this._initialStart;

    for (const s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      const endPoint = s.time + s.duration;

      s.time = s.initialStart + startOffset;
      s.time = Math.min (s.time, endPoint);
      s.duration = Math.max (0, endPoint - s.time)
    }
  }

  private dragVelocity(event: ComponentMouseEvent): void {
    // Can only apply to itemDragged
    if (this._draggedItem == null) {
      return;
    }

    if (this._initialVelocity == null) {
      this._initialVelocity = this._draggedItem.velocity;
    }

    const dragOffset = event.position.y - event.positionAtMouseDown.y;

    this._draggedItem.velocity = this._initialVelocity - dragOffset;
    this._draggedItem.velocity = Math.max (0, Math.min (this._draggedItem.velocity, 127));

    this._currentVelocity = this._draggedItem.velocity;
  }

  //===============================================================================
  // Rendering
  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number, start: number, end: number): void {
    const incr = this.getTimeIncrement();

    if (incr <= 0)
      return;

    this.model.theme.drawTimeBackground(g, this.height, sixteenth, incr, start, end, this.model.signature,
      this.model.colors);
  }

  private drawNotes(g: CanvasRenderingContext2D, semiHeight: number, sixteenth: number): void {
    for (const n of this._notes) {
      if (n.hidden) {
        continue;
      }

      const x = this.getPositionForTime(n.time);
      const y = this.getPositionForPitch(n.pitch);
      const d = n.tempDuration != null ? n.tempDuration : n.duration;
      const w = Math.max(2, d * sixteenth);

      this.model.theme.drawNote(g, x, y, w, semiHeight, n.velocity, n.selected, this.model.colors);
    }
  }

  private removeOverlaps(apply: boolean): void {
    // These are temp attributes to show truncated/removed notes
    // without actually performing the action on notes
    // They are used here when apply is false and in drawNotes()
    for (const note of this._notes) {
      note.tempDuration = null;
      note.hidden = null;
    }

    for (const selected of this._selectedSet.getItems()) {
      for (const note of this._notes) {
        if (selected == note)
          continue;

        if (selected.pitch != note.pitch)
          continue;

        // If selected precedes note
        if (selected.time <= note.time) {
          // If selected overlaps over note
          if (note.time < selected.time + selected.duration) {
            // If note is also selected, we won't remove it
            if (! note.selected) {
              if (apply)
                this.removeNote (note);
              else
                note.hidden = true;
            }
          }
          // If note precedes selected
        } else {
          // If selected overlaps over note, shorten note
          if (selected.time < note.time + note.duration) {
            if (apply)  note.duration = selected.time - note.time;
            else        note.tempDuration = selected.time - note.time;
          }
        }
      }
    }

    this.getParentComponent().repaint();
  }

  private getDragActionForNoteAt(pos: ComponentPosition, n: Note): DragAction {
    const margin = 2;
    const noteX = this.getPositionForTime (n.time);
    const noteW = Math.max (2, n.duration * this.getSixteenthWidth());
    const localPos = pos.x - noteX;

    if (localPos > noteW) return "NONE";
    if (localPos >= noteW - margin) return "RIGHT";
    if (localPos >= margin) return "MOVE_NOTE";
    if (localPos >= 0) return "LEFT";
    return "NONE";
  }

  private findNoteAt(pos: ComponentPosition): Note {
    // We need to iterate from end to start to have front most notes first
    for (const note of this.notes) {
      const x = this.getPositionForTime (note.time);
      const y = this.getPositionForPitch (note.pitch);
      const w = Math.max (2, note.duration * this.getSixteenthWidth());
      const h = this.getSemitoneHeight();

      if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
        return note;
      }
    }

    return null;
  }

  private snapToGrid(time: number): number {
    const ratio = this.getTimeIncrement();

    if (ratio > 0) {
      return ratio * Math.floor(time / ratio);
    }

    return time * this.getSixteenthWidth();
  }

  private setMouseCursor(action: DragAction): void {
    switch (action) {
      case "MOVE_NOTE":
        this.mouseCursor = 'move';
        break;
      case "LEFT":
        this.mouseCursor = 'w-resize';
        break;
      case "RIGHT":
        this.mouseCursor = 'e-resize';
        break;
      default:
        this.mouseCursor = 'default';
    }
  }
}
