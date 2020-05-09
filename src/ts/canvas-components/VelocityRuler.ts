import {SequencerDisplayModel} from '../note-sequencer';
import {Component} from './BaseComponent';

export class VelocityRuler extends Component {

  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.model.colors.background;
    g.fillRect (0, 0, this.width, this.height);

    const largeGradW = 10;
    const smallGradW = 5;

    g.fillStyle = this.model.colors.strokeLight;

    // Ruler border
    g.fillRect (this.width - 1, 0, 1, this.height);

    // Top grad
    g.fillRect(this.width - largeGradW, 0, largeGradW, 1);
    g.fillStyle = this.model.colors.text;
    g.fillText("100%", this.width - 30, 12);

    // Mid grad
    g.fillRect(this.width - largeGradW, Math.round(this.height * 0.5), largeGradW, 1);

    // Bottom grad
    g.fillRect(this.width - largeGradW, this.height - 1, largeGradW, 1);

    // Intermediary grads
    if (this.height > 60) {
      g.fillRect(this.width - smallGradW, Math.round(this.height * 0.25), smallGradW, 1);
      g.fillRect(this.width - smallGradW, Math.round(this.height * 0.75), smallGradW, 1);
    }

    g.fillStyle = this.model.colors.text;
    g.fillText("0", this.width - 20, this.height - 2);
  }

  protected resized(): void {
  }

}