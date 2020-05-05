import {Component, ComponentMouseEvent} from './BaseComponent';
import {SequencerDisplayModel} from './note-sequencer';

export interface DraggableBorderOwner {
  borderDragged(position: number): void;
}

export class DraggableBorder extends Component {

  private initialPosition: number;

  constructor(private readonly model: SequencerDisplayModel, private readonly owner: DraggableBorderOwner) {
    super();
    this.mouseCursor = 'ns-resize';
  }

  public mousePressed(event: ComponentMouseEvent): void {
    this.initialPosition = event.y;
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    const newPosition = this.initialPosition + (event.y - event.positionAtMouseDown.y);
    this.owner.borderDragged(newPosition);
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.model.colors.draggableBorder;
    g.fillRect (0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}