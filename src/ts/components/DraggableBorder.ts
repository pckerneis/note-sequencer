import {SequencerDisplayModel} from '../note-sequencer';
import {Component, ComponentMouseEvent} from './BaseComponent';

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
    this.initialPosition = event.position.y;
  }

  public mouseDragged(event: ComponentMouseEvent): void {
    const newPosition = this.initialPosition + (event.position.y - event.positionAtMouseDown.y);
    this.owner.borderDragged(newPosition);
  }

  public mouseEnter(event: ComponentMouseEvent): void {
    super.mouseEnter(event);
    this.repaint();
  }

  public mouseExit(event: ComponentMouseEvent): void {
    super.mouseExit(event);
    this.repaint();
  }

  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = this.hovered ? this.model.colors.draggableBorderHover : this.model.colors.draggableBorder;
    g.fillRect (0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}