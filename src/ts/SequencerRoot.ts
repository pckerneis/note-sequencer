import { Component } from './BaseComponent';
import { NoteGridComponent } from './NoteGridComponent';
import { HorizontalRuler } from './HorizontalRuler';
import { VerticalRuler } from './VerticalRuler';
import { SequencerDisplayModel } from './note-sequencer';

export class SequencerRoot extends Component {
  private _grid: NoteGridComponent;
  private _verticalRuler: VerticalRuler;
  private _horizontalRuler: HorizontalRuler;

  constructor(model: SequencerDisplayModel) {
    super();

    this._grid = new NoteGridComponent(model);
    this.addAndMakeVisible(this._grid);

    this._verticalRuler = new VerticalRuler(model);
    this.addAndMakeVisible(this._verticalRuler);

    this._horizontalRuler = new HorizontalRuler(model);
    this.addAndMakeVisible(this._horizontalRuler);
  }

  resized(): void {
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

  render(g: CanvasRenderingContext2D): void {
    // g.fillStyle = '#00000005';
    // g.fillRect(0, 0, this.width, this.height);
  }
}