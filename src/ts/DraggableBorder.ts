import {Component} from './BaseComponent';

export class DraggableBorder extends Component {
  protected render(g: CanvasRenderingContext2D): void {
    g.fillStyle = '#999';
    g.fillRect (0, 0, this.width, this.height);
  }

  protected resized(): void {
  }

}