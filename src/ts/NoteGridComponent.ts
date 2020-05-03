import {Component, ComponentMouseEvent, ComponentPosition} from './BaseComponent';
import {MIN_SEMI_H, PITCH_PATTERN, SequencerDisplayModel} from './note-sequencer'
import {SelectedItemSet} from './SelectedItemSet';

interface Note {
  initialStart: number;
  time: number,
  pitch: number,
  duration: number,
  velocity: number,

  tempDuration: number,
  hidden: boolean,
  selected: boolean,
}

interface NotePosition {
  time: number,
  pitch: number,
}

type DragAction = 'V_RIGHT' | 'MOVE_NOTE' | 'RIGHT' | 'LEFT' | 'NONE';

export class NoteGridComponent extends Component {

  // TODO: move into model or utility
  public readonly adaptiveLabels: string[] = ['XL', 'X', 'M', 'S', 'XS'];
  public readonly adaptiveValues: number[] = [1, .5, .25, .1, .05];
  public adaptiveIndex: number = 3;
  public fixedRatios: number[] = [128, 64, 32, 16, 8, 4, 2, 1, 0.5];
  public fixedIndex: number = 5;

  private _notes: Note[] = [];
  private _currentVelocity: number = 127;
  private _selectedSet: SelectedItemSet<Note>;
  private _dragMode: DragAction;
  private _draggedItem: Note;
  private _mouseDownResult: boolean = false;

  // These are used in drag methods and reset in mouseReleased
  private _initialPosition: NotePosition = null;
  private _initialDuration: number = null;
  private _initialStart: number = null;
  private _initialVelocity: number = null;

  constructor(private readonly model: SequencerDisplayModel) {
    super();

    this._selectedSet = new SelectedItemSet<Note>();
  }

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

    this.drawNotes(g, semiHeight, sixteenth);

    // TODO
    /*
    lasso.drawLasso(g);
    this.drawNotes(g, semiHeight, sixteenth);
    */
  }

  public resized(): void {
    this.repaint();
  }

  //===============================================================================
  // Note management
  public removeNote(note: Note): void {
    let idx = this._notes.indexOf(note);

    if (idx >= 0) {
      this._selectedSet.removeFromSelection(note);
      this._notes.splice(idx, 1);
      this.repaint();
    }
  }

  public moveNoteToFront(note: Note): void {
    let idx = this._notes.indexOf(note);

    if (idx >= 0) {
      this._notes.splice(idx, 1);
      this._notes.push(note);
      this.repaint();
    }
  }

  public deleteSelection(): void {
    let selected = this._selectedSet.getItems();

    for (let i = selected.length; --i >= 0;)
      this.removeNote(selected[i]);

    this.repaint();
  }

  //===============================================================================
  // Convenience methods

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

  public getPitchAt(pos: number): number {
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

  public getSemitoneHeight(): number {
    return this.height / (this.model.verticalRange.max - this.model.verticalRange.min);
  }
  
  //===============================================================================
  // Mouse event handlers

  public doublePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    let local = {
      x: event.x - pos.x,
      y: event.y - pos.y,
    };

    let existingNote = this.findNoteAt(local);

    if (existingNote != null) {
      this.removeNote (existingNote);
      return;
    }

    let t = this.snapToGrid (this.getTimeForScreenPos (event.x));
    let p = Math.round (this.getPitchAt(event.y));
    let d = this.getLockRatio();

    let newNote: Note = {
      time: t,
      pitch: p,
      duration: d,
      velocity: this._currentVelocity,
      hidden: false,
      selected: true,
      tempDuration: 0,
      initialStart: t,
    };

    this._notes.push(newNote);
    this._selectedSet.setUniqueSelection(newNote);

    console.log('note added');

    this.removeOverlaps(true);

    // We start dragging the end point of this note and its velocity
    this._dragMode = 'V_RIGHT';
    this._draggedItem = newNote;

    // Trigger callback method
    // TODO
    // this.onNoteAdded(newNote);

    this.getParentComponent().repaint();
  }

  public mouseMoved(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    let local = {
      x: event.x - pos.x,
      y: event.y - pos.y,
    };

    let existingNote = this.findNoteAt(local);

    if (existingNote == null)
      return;

    const action = this.getDragActionForNoteAt(local, existingNote);

    if (action == 'MOVE_NOTE') {
      document.body.style.cursor = "move";
    } else if (action == "LEFT") {
      document.body.style.cursor = "w-resize";
    } else if (action == "RIGHT") {
      document.body.style.cursor = "e-resize";
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    let local = {
      x: event.x - pos.x,
      y: event.y - pos.y,
    };

    let existingNote = this.findNoteAt(local);

    // TODO
    const isShiftKeyDown = false;

    if (existingNote == null) {
      if (! isShiftKeyDown)
        this._selectedSet.deselectAll();

      // TODO
      // lasso.beginLasso();

      this._mouseDownResult = true;

      return;
    }

    this._mouseDownResult = this._selectedSet.addToSelectionMouseDown(existingNote, isShiftKeyDown);
    this._dragMode = this.getDragActionForNoteAt (local, existingNote);

    this._draggedItem = existingNote;
    this.moveNoteToFront (existingNote);
  }

  public mouseReleased(event: ComponentMouseEvent): void {
    this._dragMode = 'NONE';
    this._initialPosition = null;
    this._initialDuration = null;
    this._initialStart = null;
    this._initialVelocity = null;

    // TODO
    // lasso.endLasso();

    // in case a drag would have caused negative durations
    for (let s of this._selectedSet.getItems()) {
      s.duration = Math.max (0, s.duration);
    }

    // TODO
    const isShiftKeyDown = false;

    this._selectedSet.addToSelectionMouseUp(event.wasDragged, isShiftKeyDown, this._mouseDownResult);

    this.removeOverlaps (true);

    this._draggedItem = null;
  }

  public moveSelection(event: ComponentMouseEvent): void {
    if (this._draggedItem == null)
      return;

    let currentPosition = {
      time: this._draggedItem.time,
      pitch: this._draggedItem.pitch,
    };

    if (this._initialPosition == null)
      this._initialPosition = currentPosition;

    let dragOffset = {
      x: event.x - event.positionAtMouseDown.x,
      y: event.y - event.positionAtMouseDown.y,
    };

    let scaledX = dragOffset.x / this.getSixteenthWidth();
    let scaledY = dragOffset.y / this.getSemitoneHeight();

    // Apply translate to itemDragged
    this._draggedItem.pitch = Math.round(this._initialPosition.pitch - scaledY);
    this._draggedItem.time = this._initialPosition.time + scaledX;

    // TODO
    const isOptionKeyDown = false;

    // snap to grid
    if (! isOptionKeyDown)
      this._draggedItem.time = this.snapToGrid (this._draggedItem.time);

    // Now we determine the actual offset
    let gridOffsetX = this._draggedItem.time - currentPosition.time;
    let gridOffsetY = this._draggedItem.pitch - currentPosition.pitch;

    for (let s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      s.pitch += gridOffsetY;
      s.time += gridOffsetX;
    }
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    // TODO
    if (this._dragMode == "NONE") {
      // lasso.dragLasso();
    }

    if (! event.wasDragged || this._dragMode == "NONE")
      return;

    if (this._dragMode == "MOVE_NOTE") {
      this.moveSelection(event);
    } else if (this._dragMode == "RIGHT" || this._dragMode == "V_RIGHT") {
      this.dragEndPoints(event);
    } else if (this._dragMode == "LEFT") {
      this.dragStartPoints(event);
    }

    // TODO
    /*
    if (this._dragMode == "V_RIGHT")
      this.dragVelocity(event);
     */

    this.removeOverlaps (false);
  }

  public getTimeAsMBS(t: number): number[] {
    let denominator = (16 / this.model.signature.lower);
    let b = Math.floor(t / denominator);

    let s = t - (b * denominator);
    let m = Math.floor(b / this.model.signature.upper);
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

    return m + (useBeats ? '.' + b : '') + (useSixteenth ? '.' + Math.floor(s) : '');
  }
  
  private dragEndPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem === null)
      return;

    let currentDuration = this._draggedItem.duration;

    if (this._initialDuration === null)
      this._initialDuration = currentDuration;

    let dragOffset = event.x - event.positionAtMouseDown.x;
    let scaledX = dragOffset / this.getSixteenthWidth();

    // Apply to itemDragged
    this._draggedItem.duration = this._initialDuration + scaledX;

    // snap to grid
    // TODO
    const isOptionKeyDown = false;
    
    if (! isOptionKeyDown) {
      let snappedEndPoint = this.snapToGrid(this._draggedItem.time + this._draggedItem.duration);
      this._draggedItem.duration = snappedEndPoint - this._draggedItem.time;
      this._draggedItem.duration = Math.max (0, this._draggedItem.duration);
    }

    // Now we determine the actual offset
    let gridOffsetX = this._draggedItem.duration - currentDuration;

    for (let s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      // We temporarily allow negative values... will be clipped in mouseReleased
      s.duration += gridOffsetX;
    }
  }

  private dragStartPoints(event: ComponentMouseEvent): void {
    if (this._draggedItem === null)
      return;

    let currentStart = this._draggedItem.time;
    let currentDuration = this._draggedItem.duration;

    // On first call of a drag action
    if (this._initialStart === null) {
      this._initialStart = currentStart;
      this._initialDuration = currentDuration;

      for (let s of this._selectedSet.getItems()) {
        s.initialStart = s.time;
      }
    }

    let dragOffset = event.x - event.positionAtMouseDown.x;
    let scaledX = dragOffset / this.getSixteenthWidth();
    let currentEndPoint = this._draggedItem.time + this._draggedItem.duration;

    // Apply to itemDragged
    this._draggedItem.time = Math.min (currentEndPoint, this._initialStart + scaledX);
    this._draggedItem.duration = Math.max (0, this._initialDuration - scaledX);

    // snap to grid
    // TODO
    const isOptionKeyDown = false;
    if (!isOptionKeyDown && this._draggedItem.duration > 0) {
      this._draggedItem.time = this.snapToGrid(this._draggedItem.time);
      this._draggedItem.duration = Math.max(0, this._initialDuration - (this._draggedItem.time - this._initialStart));
    }

    // Now we determine the actual offset since beginning of drag
    let startOffset = this._draggedItem.time - this._initialStart;

    for (let s of this._selectedSet.getItems()) {
      // Ignore itemDragged which has already been moved
      if (s === this._draggedItem)
        continue;

      let endPoint = s.time + s.duration;

      s.time = s.initialStart + startOffset;
      s.time = Math.min (s.time, endPoint);
      s.duration = Math.max (0, endPoint - s.time)
    }
  }

  private dragVelocity(event: ComponentMouseEvent): void {
    // Can only apply to itemDragged
    if (this._draggedItem == null)
      return;

    if (this._initialVelocity == undefined)
      this._initialVelocity = this._draggedItem.velocity;

    let dragOffset = event.y - event.positionAtMouseDown.y;

    this._draggedItem.velocity = this._initialVelocity - dragOffset;
    this._draggedItem.velocity = Math.max (1, Math.min (128, this._draggedItem.velocity));

    this._currentVelocity = this._draggedItem.velocity;
  }

  //===============================================================================
  // Rendering
  private drawHorizontalBackground(g: CanvasRenderingContext2D, sixteenth: number, vMin: number, vMax: number): void {
    let incr = this.getLockRatio();

    if (incr <= 0)
      return;

    let minAlternate = 100;
    let maxAlternate = 200;

    // Measure alternate
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

  private drawNotes(g: CanvasRenderingContext2D, semiHeight: number, sixteenth: number): void {
    for (let n of this._notes) {
      if (n.hidden) {
        continue;
      }

      g.strokeStyle = n.selected ? '#444' : '#666';
      g.lineWidth = n.selected ? 2 : 1;
      // TODO: hexa
      const colorCompound = (Math.min(99, n.velocity * (100 / 127))).toString().padEnd(2);
      g.fillStyle = `#${colorCompound}${colorCompound}${colorCompound}`;

      let x = this.getPositionForTime(n.time);
      let y = this.getPositionForPitch(n.pitch);
      let d = n.tempDuration != null ? n.tempDuration : n.duration;
      let w = Math.max(2, d * sixteenth);
      let h = semiHeight;
      g.fillRect(x, y, w, h);
      g.strokeRect(x, y, w, h);
    }
  }

  private drawOctaveLines(g: CanvasRenderingContext2D, vMin: number, vMax: number, semiHeight: number): void {
    g.fillStyle = '#888';

    for (let i = 0; i < 128; i += 12) {
      if (i >= vMin && i <= vMax) {
        let y = this.height - (i - vMin) * semiHeight;
        g.fillRect(0, y, this.width, 1);
      }
    }
  }

  private drawSemiTonePattern(g: CanvasRenderingContext2D, vMin: number, vMax: number, semiHeight: number): void {
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

  private removeOverlaps(apply: boolean): void {
    // These are temp attributes to show truncated/removed notes
    // without actually performing the action on notes
    // They are used here when apply is false and in drawNotes()
    for (let n of this._notes) {
      n.tempDuration = null;
      n.hidden = null;
    }

    for (let s of this._selectedSet.getItems()) {
      for (let n of this._notes) {
        if (s == n)
          continue;

        if (s.pitch != n.pitch)
          continue;

        // If s preceeds n
        if (s.time <= n.time) {
          // If s overlaps over n
          if (n.time < s.time + s.duration) {
            // If n is also selected, we won't remove it
            if (! n.selected) {
              if (apply)
                this.removeNote (n);
              else
                n.hidden = true;
            }
          }
          // If n preceeds s
        } else {
          // If s overlaps over n, shorten n
          if (s.time < n.time + n.duration) {
            if (apply)  n.duration = s.time - n.time;
            else        n.tempDuration = s.time - n.time;
          }
        }
      }
    }

    this.repaint();
  }

  private getDragActionForNoteAt(pos: ComponentPosition, n: Note): DragAction {
    let margin = 2;
    let noteX = this.getPositionForTime (n.time);
    let noteW = Math.max (2, n.duration * this.getSixteenthWidth());
    let localPos = pos.x - noteX;

    if (localPos > noteW) return "NONE";
    if (localPos >= noteW - margin) return "RIGHT";
    if (localPos >= margin) return "MOVE_NOTE";
    if (localPos >= 0) return "LEFT";
    return "NONE";
  }

  private findNoteAt(pos: ComponentPosition): Note {
    // We need to iterate from end to start to have front most notes first
    for (let i = this._notes.length; --i >= 0;) {
      let n = this._notes[i];
      let x = this.getPositionForTime (n.time);
      let y = this.getPositionForPitch (n.pitch);
      let w = Math.max (2, n.duration * this.getSixteenthWidth());
      let h = this.getSemitoneHeight();

      if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
        return n;
      }
    }

    return null;
  }

  private getLockRatio(): number {
    let sixteenth = this.getSixteenthWidth();
    let ratio: number;

    if (this.model.adaptiveMode) {
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
    } else {
      ratio = this.fixedRatios[this.fixedIndex];
    }

    return ratio;
  }

  private snapToGrid(time: number): number {
    let ratio = this.getLockRatio();

    if (ratio > 0)
      return ratio * (Math.floor (time / ratio));

    return time * this.getSixteenthWidth();
  }
}
