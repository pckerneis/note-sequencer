import {Component} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';
import {NoteGridComponent} from './NoteGridComponent';

export class VelocityRuler extends Component {

  constructor(private readonly model: SequencerDisplayModel, private readonly grid: NoteGridComponent) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    const largeGradW = 10;
    const smallGradW = 10;

    // Ruler border
    g.fillStyle = '#00000050';
    g.fillRect (this.width - 1, 0, 1, this.height);

    // Top grad
    g.fillStyle = '#00000050';
    g.fillRect(this.width - largeGradW, 0, largeGradW, 1);
    g.fillStyle = 'black';
    g.fillText("127", this.width - 30, 12);

    // Mid grad
    g.fillStyle = '#00000050';
    g.fillRect(this.width - smallGradW, this.height / 2, smallGradW, 1);

    // Bottom grad
    g.fillRect(this.width - largeGradW, this.height - 1, largeGradW, 1);

    g.fillStyle = 'black';
    g.fillText("1", this.width - 20, this.height - 2);
  }

  protected resized(): void {
  }

}