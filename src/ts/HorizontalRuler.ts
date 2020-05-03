import {Component} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';

export class HorizontalRuler extends Component {
  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    let vMin = this.model.horizontalRange.min;
    let vMax = this.model.horizontalRange.max;
    let visibleRange = vMax - vMin;
    let sixteenth = bounds.width / visibleRange;

    let minLabelSpacing = 50;
    let minGraduationSpacing = 5;

    let ratio = 1;

    while (sixteenth * ratio < minLabelSpacing)
      ratio *= 2;

    let incr = 1;

    if (sixteenth * incr < minGraduationSpacing) {
      while (sixteenth * incr < minGraduationSpacing)
        incr *= 2;
    } else {
      while (sixteenth * incr * 0.5 > minGraduationSpacing)
        incr *= .5;
    }

    for (let i = 0; i < Math.ceil(vMax); i += incr) {
      let x = (i - vMin) * sixteenth;

      if (x < 0)
        continue;

      let gradH = i % (incr * 4) == 0 ? 0.4 : 0.12;

      g.fillStyle = '#00000030';
      g.fillRect(x, bounds.height * (1 - gradH), 1, bounds.height * gradH);

      if (i % ratio == 0) {
        g.rect(x + 1, bounds.height * (1 - gradH), 1, 1);

        g.fillStyle = '#000';

        const text = 'hey'; // owner.getStringForTime(i, true);
        g.fillText(text, x + 4, bounds.height - 5, minLabelSpacing);
      }
    }

    // Bottom corner
    g.fillStyle = '#00000030';
    g.fillRect(0, bounds.height - 1, bounds.width, 1);
  }
}