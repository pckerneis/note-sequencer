import {Component, ComponentMouseEvent} from './BaseComponent';
import {MIN_SEMI_H, PITCH_PATTERN, SequencerDisplayModel} from './note-sequencer';

export class VerticalRuler extends Component {
  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  public mousePressed(event: ComponentMouseEvent): void {
    console.log('vruler pressed');
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    let vMin = this.model.verticalRange.min;
    let vMax = this.model.verticalRange.max;
    let visibleRange = vMax - vMin;
    let semiHeight = Math.ceil(this.height / visibleRange); // height for a single semitone

    // piano roll
    if (semiHeight > MIN_SEMI_H) {
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
    for (var i = 0; i < 128; i += 12) {
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
}