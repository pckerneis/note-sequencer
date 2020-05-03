import {Component, ComponentMouseEvent, IBounds} from './BaseComponent';
import {SelectableItem, SelectedItemSet} from './SelectedItemSet';

interface Lasso<T extends SelectableItem> {
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  commuteMode: boolean,
  commutableSelection: T[],
}

export class LassoSelector<T extends SelectableItem> {

  public findAllElementsInLasso: (lassoBounds: IBounds) => T[];

  private lasso: Lasso<T>;

  constructor(public readonly ownerComp: Component, public readonly selectedItemSet: SelectedItemSet<T>) {
  }

  public beginLasso(event: ComponentMouseEvent): void {
    const ownerPos = this.ownerComp.getPosition();

    this.lasso = {
      startX: event.x - ownerPos.x,
      startY: event.y - ownerPos.y,
      endX: event.x - ownerPos.x,
      endY: event.y - ownerPos.y,
      commuteMode: event.modifiers.shift,
      commutableSelection: [],
    };

    if (event.modifiers.shift) {
      this.lasso.commutableSelection = this.selectedItemSet.getItems();
    }
  }

  public endLasso(): void {
    this.lasso = null;
  }

  public dragLasso(event: ComponentMouseEvent): void {
    if (this.lasso == null) {
      return;
    }

    const ownerPos = this.ownerComp.getPosition();

    this.lasso.endX = event.x - ownerPos.x;
    this.lasso.endY = event.y - ownerPos.y;

    let lassoBounds: IBounds = {
      x: Math.min(this.lasso.startX, this.lasso.endX),
      y: Math.min(this.lasso.startY, this.lasso.endY),
      width: Math.abs(this.lasso.startX - this.lasso.endX),
      height: Math.abs(this.lasso.startY - this.lasso.endY),
    };


    let lassoSelection;

    if (typeof this.findAllElementsInLasso === 'function') {
      lassoSelection = this.findAllElementsInLasso(lassoBounds);
    }

    if (lassoSelection == null)
      return;

    if (this.lasso.commuteMode) {
      // Restore selection from mouse down
      this.selectedItemSet.deselectAll();

      for (let s of this.lasso.commutableSelection)
        this.selectedItemSet.addToSelection (s);

      // Browse current lasso selection
      for (let s of lassoSelection) {
        if (this.selectedItemSet.getItems().indexOf (s) >= 0) {
          // If the item is already selected, deselect it
          this.selectedItemSet.removeFromSelection (s);
        } else {
          // Else add it to the selection
          this.selectedItemSet.addToSelection (s);
        }
      }
    } else {
      this.selectedItemSet.deselectAll();

      for (let s of lassoSelection)
        this.selectedItemSet.addToSelection (s);
    }
  }

  public drawLasso(g: CanvasRenderingContext2D): void {
    if (this.lasso == null) {
      return;
    }

    g.fillStyle = '#ffffff50';
    g.strokeStyle = '#ffffff90';
    g.lineWidth = 2;

    const x = Math.min(this.lasso.startX, this.lasso.endX);
    const y = Math.min(this.lasso.startY, this.lasso.endY);
    const w = Math.max(this.lasso.startX, this.lasso.endX) - x;
    const h = Math.max(this.lasso.startY, this.lasso.endY) - y;

    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
  }
}
