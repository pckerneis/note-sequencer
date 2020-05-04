import {Component} from './BaseComponent';
import {DraggableBorder} from './DraggableBorder';
import {HorizontalRuler} from './HorizontalRuler';
import {SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';
import {VelocityRuler} from './VelocityRuler';
import {VelocityTrack} from './VelocityTrack';
import {VerticalRuler} from './VerticalRuler';

export class SequencerRoot extends Component {
  private readonly _grid: NoteGridComponent;
  private readonly _verticalRuler: VerticalRuler;
  private readonly _horizontalRuler: HorizontalRuler;
  private readonly _velocityRuler: VelocityRuler;
  private readonly _draggableBorder: DraggableBorder;
  private readonly _velocityTrack: VelocityTrack;

  constructor(model: SequencerDisplayModel) {
    super();

    this._grid = new NoteGridComponent(model);
    this.addAndMakeVisible(this._grid);

    this._verticalRuler = new VerticalRuler(model, this._grid);
    this.addAndMakeVisible(this._verticalRuler);

    this._horizontalRuler = new HorizontalRuler(model, this._grid);
    this.addAndMakeVisible(this._horizontalRuler);

    this._velocityRuler = new VelocityRuler(model);
    this.addAndMakeVisible(this._velocityRuler);

    this._draggableBorder = new DraggableBorder(model);
    this.addAndMakeVisible(this._draggableBorder);

    this._velocityTrack = new VelocityTrack(model, this._grid);
    this.addAndMakeVisible(this._velocityTrack);
  }

  public resized(): void {
    const rulerWidth = 40;
    const rulerHeight = 40;
    const velocityHeight = 80;
    const borderHeight = 4;

    const bounds = this.getLocalBounds();

    const velocityBounds = bounds.removeFromBottom(velocityHeight);
    this._velocityRuler.setBounds(velocityBounds.removeFromLeft(rulerWidth));
    this._velocityTrack.setBounds(velocityBounds);

    this._draggableBorder.setBounds(bounds.removeFromBottom(borderHeight));

    const hRulerBounds = bounds.removeFromTop(rulerHeight);
    hRulerBounds.removeFromLeft(rulerWidth);
    this._horizontalRuler.setBounds(hRulerBounds);

    this._verticalRuler.setBounds(bounds.removeFromLeft(rulerWidth));

    this._grid.setBounds(bounds);

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
    g.fillStyle = '#eee';
    g.fillRect(0, 0, this.width, this.height);
  }
}