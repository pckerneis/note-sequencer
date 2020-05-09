import {RootComponentHolder} from './RootComponentHolder';

export interface ComponentPosition {
  x: number,
  y: number,
}

export interface IBounds {
  x: number,
  y: number,
  width: number,
  height: number,
}

export class ComponentBounds implements IBounds {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = Math.ceil(x);
    this.y = Math.ceil(y);
    this.width = Math.ceil(width);
    this.height = Math.ceil(height);
  }

  public removeFromLeft(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.width)));

    const removed = new ComponentBounds(this.x, this.y, amount, this.height);

    this.x += amount;
    this.width -= amount;

    return removed;
  }

  public removeFromTop(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new ComponentBounds(this.x, this.y, this.width, amount);

    this.y += amount;
    this.height -= amount;

    return removed;
  }

  public removeFromBottom(amount: number): ComponentBounds {
    amount = Math.floor(Math.max(0, Math.min(amount, this.height)));

    const removed = new ComponentBounds(this.x, this.height - amount, this.width, amount);

    this.height -= amount;

    return removed;
  }
}

export interface ComponentMouseEvent {
  isDragging: boolean;
  positionAtMouseDown: ComponentPosition,
  position: ComponentPosition,
  pressedComponent: Component,
  wasDragged: boolean,
  modifiers: {shift: boolean, option: boolean}
}

/**
 * A node in a canvas-based component tree.
 */
export abstract class Component {

  private _children: Component[] = [];
  private _parent: Component = null;
  private _visible: boolean = true;
  private _needRepaint: boolean = true;
  private _rootHolder: RootComponentHolder<this>;
  private _hovered: boolean;
  private _mouseCursor: string;
  private _beingDragged: boolean;

  protected constructor(private _bounds: ComponentBounds = new ComponentBounds()) {
  }

  public static boundsIntersect(box1: IBounds, box2: IBounds): boolean {
    return ! ((box2.x >= box1.x + box1.width) || (box2.x + box2.width <= box1.x)
      || (box2.y >= box1.y + box1.height) || (box2.y + box2.height <= box1.y));
  }

  private static createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  public get mouseCursor(): string {
    return this._mouseCursor;
  }

  public set mouseCursor(cursor: string) {
    this._mouseCursor = cursor;

    if (this.hovered || this._beingDragged) {
      document.body.style.cursor = this._mouseCursor;
    }
  }

  public get hovered(): boolean {
    return this._hovered;
  }

  public get width(): number {
    return Math.ceil(this._bounds.width);
  }

  public get height(): number {
    return Math.ceil(this._bounds.height);
  }

  public set rootHolder(holder: RootComponentHolder<this>) {
    this._rootHolder = holder;
  }

  public getParentComponent(): Component {
    return this._parent;
  }

  public addAndMakeVisible(childComp: Component): void {
    if (childComp._parent != null) {
      throw new Error('A component cannot be added to multiple parents. ' +
        'You first need to remove it from its previous parent');
    }

    childComp._visible = true;
    this._children.push(childComp);
    childComp._parent = this;
  }

  public removeChild(childComp: Component): void {
    const idx = this._children.indexOf(childComp);

    if (idx >= 0) {
      childComp._visible = false;
      childComp._parent = null;
      this._children.splice(idx, 1);
    }
  }

  public getPosition(): ComponentPosition {
    let x = this._bounds.x;
    let y = this._bounds.y;
    let parent = this._parent;

    while (parent != undefined) {
      x += parent._bounds.x;
      y += parent._bounds.y;
      parent = parent._parent;
    }

    return {x, y};
  }

  public getLocalBounds(): ComponentBounds {
    return new ComponentBounds(0, 0, this.width, this.height);
  }

  public setBounds(newBounds: ComponentBounds): void {
    this._bounds = newBounds;
    this.resized();
  }

  public toFront(): void {
    if (this._parent == null) {
      return;
    }

    const idx = this._parent._children.indexOf(this);

    if (idx < 0)
      return;

    this._parent._children.splice(idx, 1);
    this._parent._children.push(this);
  }

  public hitTest(mousePosition: ComponentPosition): boolean {
    if (!this._visible)
      return false;

    const pos = this.getPosition();

    if (mousePosition.x < pos.x || mousePosition.x > pos.x + this._bounds.width) {
      return false;
    }

    return !(mousePosition.y < pos.y || mousePosition.y > pos.y + this._bounds.height);
  }

  public findComponentAt(position: ComponentPosition): Component {
    for (let i = this._children.length; --i >= 0;) {
      const c = this._children[i];

      if (c.hitTest(position)) {
        return c.findComponentAt(position);
      }
    }

    return this;
  }

  public repaint(isOriginalRepaintTarget: boolean = true): void {
    this._needRepaint = true;

    // Mark all children so that they will repaint
    this._children.forEach(child => child.repaint(false));

    if (isOriginalRepaintTarget) {
      // Find root component
      let root: Component = this;

      while (root._parent != null) {
        root = root._parent;
      }

      // Render
      if (root._rootHolder != null) {
        root.paint(root._rootHolder.renderingContext);
      }
    }
  }

  // Mouse events

  public mouseMoved(event: ComponentMouseEvent): void {
    this._beingDragged = event.isDragging && event.pressedComponent === this;
  }

  public mouseEnter(event: ComponentMouseEvent): void {
    if (event.isDragging) {
      this._hovered = event.pressedComponent === this;
    } else {
      this._hovered = true;
    }

    if (this._hovered) {
      document.body.style.cursor = this.mouseCursor;
    }
  }

  public mouseExit(event: ComponentMouseEvent): void {
    if (event.isDragging) {
      this._hovered = event.pressedComponent === this;
    } else {
      this._hovered = false;
    }
  }

  public mousePressed(event: ComponentMouseEvent): void {
  }

  public mouseReleased(event: ComponentMouseEvent): void {
  }

  public mouseDragged(event: ComponentMouseEvent): void {
  }

  public clicked(event: ComponentMouseEvent): void {
  }

  public doublePressed(event: ComponentMouseEvent): void {
  }

  public doubleClicked(event: ComponentMouseEvent): void {
  }

  // Resizing and rendering

  protected abstract resized(): void;

  protected abstract render(g: CanvasRenderingContext2D): void;

  /**
   * Renders this component and its children on a canvas rendering context. This method shouldn't be used directly and
   * 'repaint' should be used instead when the component needs to be re-rendered.
   *
   * @param context the canvas context to use
   */
  private paint(context: CanvasRenderingContext2D): void {
    if (this._visible && this._needRepaint && Math.floor(this._bounds.width) > 0 && Math.floor(this._bounds.height) > 0) {
      const g = Component.createOffscreenCanvas(Math.ceil(this._bounds.width), Math.ceil(this._bounds.height));

      this.render(g.getContext('2d'));

      context.drawImage(g, Math.floor(this._bounds.x), Math.floor(this._bounds.y));
    }

    this._children.forEach(child => child.paint(context));

    this._needRepaint = false;
  }
}
