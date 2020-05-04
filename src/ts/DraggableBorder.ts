import {Component} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';

export class DraggableBorder extends Component {

  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.model.colors.draggableBorder;
    g.fillRect (0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}