import {Component, ComponentMouseEvent} from './BaseComponent';
import {MAX_PITCH, MAX_SEMI_H, MIN_PITCH, MIN_SEMI_H, PITCH_PATTERN, SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';

export class VerticalRuler extends Component {
  private lastMouseX: number;
  private lastMouseY: number;

  private dragStarted: boolean = false;
  private currentlyTranslating: boolean = false;
  private currentlyZooming: boolean = false;
  private consecutiveHorizontalDrag: number = 0;
  private consecutiveVerticalDrag: number = 0;

  private isPreviewingNote: boolean = false;
  private lastPreviewedPitch: number = null;

  constructor(private readonly model: SequencerDisplayModel, private grid: NoteGridComponent) {
    super();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    if ((! this.isPianoRollVisible()) || event.x < pos.x + this.width / 2) {
      // If we're not on the piano roll (bc it's hidden or clicking on its left)
      this.dragStarted = true;
    } else if (this.isPianoRollVisible() && event.x > pos.x + this.width / 2) {
      // If we're on the piano roll
      this.previewNoteAt(event.y);
    }

    this.lastMouseX = event.x;
    this.lastMouseY = event.y;
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    const pos = this.getPosition();

    if (this.dragStarted) {
      let yOffset = event.y - this.lastMouseY;
      let xOffset = event.x - this.lastMouseX;

      this.lastMouseY = event.y;
      this.lastMouseX = event.x;

      if (this.shouldTranslate(xOffset, yOffset)) {
        this.translate(yOffset);
      } else {
        if (xOffset > 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    } else if (this.isPianoRollVisible() && event.x > pos.x + this.width / 2) {
      this.previewNoteAt(event.y);
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

  protected doubleClicked(event: ComponentMouseEvent): void {
    this.model.verticalRange.min = MIN_PITCH;
    this.model.verticalRange.max = MAX_PITCH;

    this.getParentComponent().repaint();
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    g.fillStyle = '#eee';
    g.fillRect(0, 0, this.width, this.height);

    let vMin = this.model.verticalRange.min;
    let vMax = this.model.verticalRange.max;
    let semiHeight = this.grid.getSemitoneHeight();

    // piano roll
    if (this.isPianoRollVisible()) {
      for (let i = Math.floor(vMin); i <= Math.ceil(vMax); ++i) {
        let y = bounds.height - (i - vMin) * semiHeight;
        let pitchClass = i % 12;
        let isBlack = PITCH_PATTERN[pitchClass];

        g.fillStyle = isBlack ? '#00000080' : '#ffffff';

        g.fillRect(bounds.width / 2, y - semiHeight,
          bounds.width / 2, semiHeight);

        // stroke
        g.fillStyle = '#00000020';
        g.fillRect(bounds.width / 2, y - semiHeight,
          bounds.width / 2, 1);
      }

      // left corner
      g.fillStyle = '#00000020';
      g.fillRect(bounds.width / 2, 0, 1, bounds.height);
    }

    // Octave labels
    for (let i = 0; i < 128; i += 12) {
      if (i >= vMin && i <= vMax) {
        let y = bounds.height - (i - vMin) * semiHeight;
        let txt = 'C' + ((i / 12) - 2);

        g.fillStyle = '#000';
        g.fillText(txt, 2, y - 3, bounds.width / 2);

        g.fillStyle = '#00000080';
        g.fillRect(0, y, bounds.width, 1);
      }
    }

    // right corner
    g.fillStyle = '#00000020';
    g.rect(bounds.width / 2, 0, 1, bounds.height);
    g.rect(bounds.width - 1, 0, 1, bounds.height);
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
    const range = this.model.verticalRange.max - this.model.verticalRange.min;
    const semiHeight = this.grid.getSemitoneHeight();

    if (semiHeight < MAX_SEMI_H) {
      const zoomAmount = range / this.model.zoomSensitivity;

      this.model.verticalRange.min += zoomAmount;
      this.model.verticalRange.max -= zoomAmount;

      this.getParentComponent().repaint();
    }
  }

  private zoomOut(): void {
    const vMin = this.model.verticalRange.min;
    const vMax = this.model.verticalRange.max;
    const range = vMax - vMin;
    const zoomAmount = range / this.model.zoomSensitivity;

    this.model.verticalRange.min -= zoomAmount;
    this.model.verticalRange.max += zoomAmount;

    this.model.verticalRange.max = Math.min(this.model.verticalRange.max, MAX_PITCH);
    this.model.verticalRange.min = Math.max(this.model.verticalRange.min, MIN_PITCH);

    this.getParentComponent().repaint();
  }

  private translate(amount: number): void {
    const vMin = this.model.verticalRange.min;
    const vMax = this.model.verticalRange.max;
    const semiHeight = this.grid.getSemitoneHeight();

    if (amount < 0) {
      const desiredMin = vMin + amount / semiHeight;
      const clipped = Math.max(desiredMin, MIN_PITCH);
      const correctAmount = (clipped - desiredMin) + (amount / semiHeight);

      this.model.verticalRange.min = clipped;
      this.model.verticalRange.max += correctAmount;

      this.getParentComponent().repaint();
    } else if (amount > 0) {
      const desiredMax = vMax + amount / semiHeight;
      const clipped = Math.min(desiredMax, MAX_PITCH);
      const correctAmount = (clipped - desiredMax) + (amount / semiHeight);

      this.model.verticalRange.max = clipped;
      this.model.verticalRange.min += correctAmount;

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

  private isPianoRollVisible(): boolean {
    return this.grid.getSemitoneHeight() > MIN_SEMI_H;
  }
}