export interface ComponentPosition {
  x: number,
  y: number,
}

export class ComponentBounds {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0) {
  }

  public removeFromLeft(amount: number): ComponentBounds {
    amount = Math.max(0, Math.min(amount, this.width));

    const removed = new ComponentBounds(this.x, this.y, amount, this.height);

    this.x += amount;
    this.width -= amount;

    return removed;
  }

  public removeFromTop(amount: number): ComponentBounds {
    amount = Math.max(0, Math.min(amount, this.height));

    const removed = new ComponentBounds(this.x, this.y, this.width, amount);

    this.y += amount;
    this.height -= amount;

    return removed;
  }
}

export interface ComponentMouseEvent {
  x: number,
  y: number,
  originatingComp: Component,
  wasDragged: boolean,
}

export abstract class Component {
  public mousePointer: 'default' = 'default';

  private _children: Component[] = [];
  private _parent: Component = null;
  private _visible: boolean = true;
  private _needRepaint: boolean = true;
  private _wasPressed: boolean = false;
  private _rootHolder: RootComponentHolder;

  constructor(private _bounds: ComponentBounds = new ComponentBounds()) {
  }

  public get width(): number {
    return this._bounds.width;
  }

  public get height(): number {
    return this._bounds.height;
  }

  public set rootHolder(holder: RootComponentHolder) {
    this._rootHolder = holder;
  }

  // Usual functions on comps
  public addAndMakeVisible(childComp: Component): void {
    childComp._visible = true;
    this._children.push(childComp);
    childComp._parent = this;
  }

  public removeChild(childComp: Component): void {
    let idx = this._children.indexOf(childComp);

    if (idx >= 0) {
      childComp._visible = false;
      childComp._parent = undefined;
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
    console.log('bounds set');
    this._bounds = newBounds;
    this.resized();
  }

  public toFront(): void {
    if (this._parent == undefined)
      return;

    let idx = this._parent._children.indexOf(this);

    if (idx < 0)
      return;

    this._parent._children.splice(idx, 1);
    this._parent._children.push(this);
  }

  // These are internal functions
  public hitTest(mousePosition: ComponentPosition): boolean {
    if (!this._visible)
      return false;

    let pos = this.getPosition();

    if (mousePosition.x < pos.x || mousePosition.x > pos.x + this._bounds.width) {
      return false;
    }

    if (mousePosition.y < pos.y || mousePosition.y > pos.y + this._bounds.height) {
      return false;
    }

    return true;
  }

  public handleMouseMove(e: ComponentMouseEvent): void {
    for (let i = this._children.length; --i >= 0;) {
      let c = this._children[i];

      if (c.hitTest({x: e.x, y: e.y})) {
        c.handleMouseMove(e);
        return;
      }
    }

    document.body.style.cursor = this.mousePointer;
    this.mouseMoved(e);
  }

  public handleMousePress(e: ComponentMouseEvent): void {
    for (let i = this._children.length; --i >= 0;) {
      let c = this._children[i];

      if (c.hitTest(e)) {
        c.handleMousePress(e);
        return;
      }
    }

    e.originatingComp = this;
    this.mousePressed(e);
    this._wasPressed = true;
  };

  public handleDoublePress(e: ComponentMouseEvent): void {
    if (!e.wasDragged && e.originatingComp != undefined)
      e.originatingComp.doublePressed(e);
  }

  public handleClick(e: ComponentMouseEvent): void {
    if (!e.wasDragged && e.originatingComp != undefined)
      e.originatingComp.clicked(e);
  }

  public handleMouseDrag(e: ComponentMouseEvent): void {
    for (let i = this._children.length; --i >= 0;)
      this._children[i].handleMouseDrag(e);

    if (this._wasPressed)
      this.mouseDragged(e);
  }

  public handleMouseRelease(e: ComponentMouseEvent): void {
    for (let i = this._children.length; --i >= 0;)
      this._children[i].handleMouseRelease(e);

    if (this._wasPressed)
      this.mouseReleased(e);

    this._wasPressed = false;
  }

  // Should be triggered on 2nd mouse press instead of release...
  public handleDoubleClick(e: ComponentMouseEvent): void {
    if (e.wasDragged)
      return;

    for (let i = this._children.length; --i >= 0;) {
      let c = this._children[i];

      if (c.hitTest(e)) {
        c.handleDoubleClick(e);
        return;
      }
    }

    this.doubleClicked(e);
  }

  public repaint(): void {
    this._needRepaint = true;

    // Mark all children so that they will repaint
    for (let c of this._children)
      c.repaint();

    // Find root coponent
    let root: Component = this;

    while (root._parent != null) {
      root = root._parent;
    }

    // Render
    if (root._rootHolder != null) {
      root._rootHolder.render();
    }
  }

  public shouldRepaint(): boolean {
    if (this._needRepaint)
      return true;

    for (let c of this._children)
      if (c.shouldRepaint())
        return true;

    return false;
  }

  public paint(context: CanvasRenderingContext2D): void {
    if (this._visible && this.shouldRepaint() && this._bounds.width > 0 && this._bounds.height > 0) {
      let g = this.createOffscreenCanvas(this._bounds.width, this._bounds.height);

      this.render(g.getContext('2d'));

      console.log('paint, render at y: ' + this._bounds.y);

      context.drawImage(g, this._bounds.x, this._bounds.y);
    }

    for (let c of this._children) {
      c.paint(context);
    }

    this._needRepaint = false;
  }

  // These functions should be overriden by sub comps
  protected mouseMoved(event: ComponentMouseEvent): void {
  }

  protected mousePressed(event: ComponentMouseEvent): void {
  }

  protected mouseReleased(event: ComponentMouseEvent): void {
  }

  protected mouseDragged(event: ComponentMouseEvent): void {
  }

  protected clicked(event: ComponentMouseEvent): void {
  }

  protected doublePressed(event: ComponentMouseEvent): void {
  }

  protected doubleClicked(event: ComponentMouseEvent): void {
  }

  protected abstract resized(): void;

  protected abstract render(g: CanvasRenderingContext2D): void;

  private createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}

export class RootComponentHolder {
  public readonly canvas: HTMLCanvasElement;

  constructor(public readonly width: number, public readonly height: number, public readonly rootComponent: Component) {
    rootComponent.rootHolder = this;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    this.render();
  }

  public render(): void {
    // Recursively paint components that need to be refreshed
    this.rootComponent.paint(this.canvas.getContext('2d'));
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.rootComponent.setBounds(new ComponentBounds(0, 0, width, height));

    this.render();
  }
}