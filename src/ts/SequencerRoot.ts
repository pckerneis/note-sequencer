import {Component} from './BaseComponent';
import {HorizontalRuler} from './HorizontalRuler';
import {SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';
import {VerticalRuler} from './VerticalRuler';

export class SequencerRoot extends Component {
  private readonly _grid: NoteGridComponent;
  private readonly _verticalRuler: VerticalRuler;
  private readonly _horizontalRuler: HorizontalRuler;

  constructor(model: SequencerDisplayModel) {
    super();

    this._grid = new NoteGridComponent(model);
    this.addAndMakeVisible(this._grid);

    this._verticalRuler = new VerticalRuler(model);
    this.addAndMakeVisible(this._verticalRuler);

    this._horizontalRuler = new HorizontalRuler(model);
    this.addAndMakeVisible(this._horizontalRuler);
  }

  public resized(): void {
    const rulerWidth = 40;
    const rulerHeight = 40;

    const bounds = this.getLocalBounds();

    const hRulerBounds = bounds.removeFromTop(rulerHeight);
    hRulerBounds.removeFromLeft(rulerWidth);
    this._horizontalRuler.setBounds(hRulerBounds);

    this._verticalRuler.setBounds(bounds.removeFromLeft(rulerWidth));
    this._grid.setBounds(bounds);

    this.repaint();
  }

  public render(g: CanvasRenderingContext2D): void {
  }
}