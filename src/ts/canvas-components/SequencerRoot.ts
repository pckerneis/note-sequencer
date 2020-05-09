import {SequencerDisplayModel} from '../note-sequencer';
import {Component} from './BaseComponent';
import {DraggableBorder, DraggableBorderOwner} from './DraggableBorder';
import {NoteGridComponent} from './NoteGridComponent';
import {PitchRuler} from './PitchRuler';
import {TimeRuler} from './TimeRuler';
import {VelocityRuler} from './VelocityRuler';
import {VelocityTrack} from './VelocityTrack';

export class SequencerRoot extends Component implements DraggableBorderOwner {
  private readonly _grid: NoteGridComponent;
  private readonly _pitchRuler: PitchRuler;
  private readonly _timeRuler: TimeRuler;
  private readonly _velocityRuler: VelocityRuler;
  private readonly _draggableBorder: DraggableBorder;
  private readonly _velocityTrack: VelocityTrack;

  private draggableBorderPosition: number;

  constructor(public readonly model: SequencerDisplayModel) {
    super();

    this._grid = new NoteGridComponent(model);
    this.addAndMakeVisible(this._grid);

    this._pitchRuler = new PitchRuler(model, this._grid);
    this.addAndMakeVisible(this._pitchRuler);

    this._timeRuler = new TimeRuler(model, this._grid);
    this.addAndMakeVisible(this._timeRuler);

    this._velocityRuler = new VelocityRuler(model);
    this.addAndMakeVisible(this._velocityRuler);

    this._draggableBorder = new DraggableBorder(model, this);
    this.addAndMakeVisible(this._draggableBorder);

    this._velocityTrack = new VelocityTrack(model, this._grid);
    this.addAndMakeVisible(this._velocityTrack);
  }

  public resized(): void {
    if (this.model.velocityTrackHeight == null) {
      this.draggableBorderPosition = this.height - 80;
    } else if (this.model.velocityTrackHeight < 0) {
      this.draggableBorderPosition = this.height * (1 + this.model.velocityTrackHeight);
    }

    const rulerWidth = 40;
    const rulerHeight = 40;
    const velocityHeight = this.height - this.draggableBorderPosition;
    const borderHeight = 4;

    const bounds = this.getLocalBounds();

    const velocityBounds = bounds.removeFromBottom(velocityHeight);
    this._velocityRuler.setBounds(velocityBounds.removeFromLeft(rulerWidth));
    this._velocityTrack.setBounds(velocityBounds);

    this._draggableBorder.setBounds(bounds.removeFromBottom(borderHeight));

    const hRulerBounds = bounds.removeFromTop(rulerHeight);
    hRulerBounds.removeFromLeft(rulerWidth);
    this._timeRuler.setBounds(hRulerBounds);

    this._pitchRuler.setBounds(bounds.removeFromLeft(rulerWidth));

    this._grid.setBounds(bounds);

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.model.colors.background;
    g.fillRect(0, 0, this.width, this.height);
  }

  public borderDragged(newPosition: number): void {
    this.draggableBorderPosition = Math.max(80, Math.min(newPosition - this.getPosition().y, this.height));

    const snapThreshold = 50;

    if (this.draggableBorderPosition > this.height - snapThreshold) {
      this.draggableBorderPosition = this.draggableBorderPosition > this.height - snapThreshold / 2 ?
        this.height : this.height - snapThreshold;
    }

    this.model.velocityTrackHeight = this.height - this.draggableBorderPosition;

    this.resized();
  }

  public setTimeStart(numberValue: number): number {
    const newValue = Math.max(0, numberValue);

    const offset = newValue - this.model.maxTimeRange.start;

    if (offset === 0) {
      return 0;
    }

    this.model.maxTimeRange.start += offset;
    this.model.maxTimeRange.end += offset;

    // Adapt visible range by translating to the left or to the right if needed

    const leftExcess = this.model.maxTimeRange.start - this.model.visibleTimeRange.start;

    if (leftExcess > 0) {
      this.model.visibleTimeRange.start += leftExcess;
      this.model.visibleTimeRange.end += leftExcess;
    }

    const rightExcess = this.model.maxTimeRange.end - this.model.visibleTimeRange.end;

    if (rightExcess < 0) {
      this.model.visibleTimeRange.start += rightExcess;
      this.model.visibleTimeRange.end += rightExcess;
    }

    this.repaint();

    return newValue;
  }

  public setDuration(numberValue: number): number {
    numberValue = Math.max(0, numberValue);

    this.model.maxTimeRange.end = this.model.maxTimeRange.start + numberValue;
    this.model.visibleTimeRange.end = Math.min(this.model.visibleTimeRange.end, this.model.maxTimeRange.end);
    this.repaint();

    return numberValue;
  }
}