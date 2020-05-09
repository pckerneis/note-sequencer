import {MAX_PITCH, MAX_SEMI_H, MIN_PITCH, SequencerDisplayModel} from '../note-sequencer';
import {Component, ComponentMouseEvent} from './BaseComponent';
import {NoteGridComponent} from './NoteGridComponent';

export class PitchRuler extends Component {
  private lastMouseX: number;
  private lastMouseY: number;

  private dragStarted: boolean = false;
  private currentlyTranslating: boolean = false;
  private currentlyZooming: boolean = false;
  private consecutiveHorizontalDrag: number = 0;
  private consecutiveVerticalDrag: number = 0;

  private isPreviewingNote: boolean = false;
  private lastPreviewedPitch: number = null;
  private hoveredPitch: number = null;

  constructor(private readonly model: SequencerDisplayModel, private grid: NoteGridComponent) {
    super();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const semitoneHeight = this.grid.getSemitoneHeight();
    const pos = this.getPosition();

    if (this.model.theme.isOnPianoRoll(event.position.x - pos.x, event.position.y - pos.y,
        this.width, this.height, semitoneHeight)) {
      this.previewNoteAt(event.position.y);
    } else {
      this.dragStarted = true;
    }

    this.lastMouseX = event.position.x;
    this.lastMouseY = event.position.y;
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    const pos = this.getPosition();
    const semitoneHeight = this.grid.getSemitoneHeight();

    if (this.dragStarted) {
      const yOffset = event.position.y - this.lastMouseY;
      const xOffset = event.position.x - this.lastMouseX;

      this.lastMouseY = event.position.y;
      this.lastMouseX = event.position.x;

      if (this.shouldTranslate(xOffset, yOffset)) {
        this.translate(yOffset);
      } else {
        if (xOffset > 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    } else if (this.model.theme.isOnPianoRoll(event.position.x - pos.x, event.position.y - pos.y,
        this.width, this.height,semitoneHeight)) {
      this.previewNoteAt(event.position.y);
    }
  }

  public mouseReleased(/* event: ComponentMouseEvent */): void {
    this.currentlyTranslating = false;
    this.currentlyZooming = false;
    this.dragStarted = false;
    this.consecutiveHorizontalDrag = 0;
    this.consecutiveVerticalDrag = 0;

    if (this.isPreviewingNote) {
      // TODO
      // this.model.onPianoRollChange (-1);
      this.isPreviewingNote = false;
    }
  }

  public doubleClicked(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    if (! this.model.theme.isOnPianoRoll(event.position.x - pos.x, event.position.y - pos.y, this.width, this.height,
        this.grid.getSemitoneHeight())) {
      this.model.verticalRange.start = MIN_PITCH;
      this.model.verticalRange.end = MAX_PITCH;
      this.getParentComponent().repaint();
    }
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);

    const start = this.model.verticalRange.start;
    const end = this.model.verticalRange.end;
    const semiHeight = this.grid.getSemitoneHeight();

    this.model.theme.drawPitchRuler(g, this.width, this.height, start, end, semiHeight, this.hoveredPitch,
      this.model.colors);

    // right border
    g.fillStyle = this.model.colors.strokeDark;
    g.fillRect(bounds.width - 1, 0, 1, bounds.height);
  }

  private previewNoteAt(y: number): void {
    const p = this.grid.getPitchAt(y);

    if (p == this.lastPreviewedPitch)
      return;

    this.isPreviewingNote = true;
    this.lastPreviewedPitch = p;

    // TODO
    // owner.onPianoRollChange(p);
  }

  private zoomIn(): void {
    const range = this.model.verticalRange.end - this.model.verticalRange.start;
    const semiHeight = this.grid.getSemitoneHeight();

    if (semiHeight < MAX_SEMI_H) {
      const zoomAmount = range / this.model.zoomSensitivity;

      this.model.verticalRange.start += zoomAmount;
      this.model.verticalRange.end -= zoomAmount;

      this.getParentComponent().repaint();
    }
  }

  private zoomOut(): void {
    const start = this.model.verticalRange.start;
    const end = this.model.verticalRange.end;
    const range = end - start;
    const zoomAmount = range / this.model.zoomSensitivity;

    this.model.verticalRange.start -= zoomAmount;
    this.model.verticalRange.end += zoomAmount;

    this.model.verticalRange.end = Math.min(this.model.verticalRange.end, MAX_PITCH);
    this.model.verticalRange.start = Math.max(this.model.verticalRange.start, MIN_PITCH);

    this.getParentComponent().repaint();
  }

  private translate(amount: number): void {
    const start = this.model.verticalRange.start;
    const end = this.model.verticalRange.end;
    const semiHeight = this.grid.getSemitoneHeight();

    if (amount < 0) {
      const desiredMin = start + amount / semiHeight;
      const clipped = Math.max(desiredMin, MIN_PITCH);
      const correctAmount = (clipped - desiredMin) + (amount / semiHeight);

      this.model.verticalRange.start = clipped;
      this.model.verticalRange.end += correctAmount;

      this.getParentComponent().repaint();
    } else if (amount > 0) {
      const desiredMax = end + amount / semiHeight;
      const clipped = Math.min(desiredMax, MAX_PITCH);
      const correctAmount = (clipped - desiredMax) + (amount / semiHeight);

      this.model.verticalRange.end = clipped;
      this.model.verticalRange.start += correctAmount;

      this.getParentComponent().repaint();
    }
  }

  private shouldTranslate(xOffset: number, yOffset: number): boolean {
    const changeThreshold = 8;
    const consecutiveThreshold = 5;

    if (Math.abs(xOffset) > Math.abs(yOffset)) {
      this.consecutiveHorizontalDrag++;
      this.consecutiveVerticalDrag = 0;
    } else if (Math.abs(yOffset) > Math.abs(xOffset)) {
      this.consecutiveVerticalDrag++;
      this.consecutiveHorizontalDrag = 0;
    }

    if (this.currentlyTranslating) {
      const shouldZoom = Math.abs(xOffset) > Math.abs(changeThreshold + yOffset)
        || this.consecutiveHorizontalDrag > consecutiveThreshold;
      this.currentlyTranslating = !shouldZoom;
      this.currentlyZooming = shouldZoom;
      return !shouldZoom
    } else if (this.currentlyZooming) {
      const shouldTranslate = Math.abs(yOffset) > Math.abs(changeThreshold + xOffset)
        || this.consecutiveVerticalDrag > consecutiveThreshold;
      this.currentlyTranslating = shouldTranslate;
      this.currentlyZooming = !shouldTranslate;
      return shouldTranslate;
    } else {
      const shouldTranslate = Math.abs(yOffset) > Math.abs(xOffset);
      this.currentlyTranslating = shouldTranslate;
      this.currentlyZooming = !shouldTranslate;
      return shouldTranslate;
    }
  }
}
