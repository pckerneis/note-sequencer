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

  protected constructor(private _bounds: ComponentBounds = new ComponentBounds()) {
  }

  private static createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
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
    let idx = this._children.indexOf(childComp);

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
    if (this._parent == undefined)
      return;

    let idx = this._parent._children.indexOf(this);

    if (idx < 0)
      return;

    this._parent._children.splice(idx, 1);
    this._parent._children.push(this);
  }

  public hitTest(mousePosition: ComponentPosition): boolean {
    if (!this._visible)
      return false;

    let pos = this.getPosition();

    if (mousePosition.x < pos.x || mousePosition.x > pos.x + this._bounds.width) {
      return false;
    }

    return !(mousePosition.y < pos.y || mousePosition.y > pos.y + this._bounds.height);
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

  public findComponentAt(position: ComponentPosition): Component {
    for (let i = this._children.length; --i >= 0;) {
      let c = this._children[i];

      if (c.hitTest(position)) {
        return c.findComponentAt(position);
      }
    }

    return this;
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
  }

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

  public repaint(isOriginalRepaintTarget: boolean = true): void {
    this._needRepaint = true;

    // Mark all children so that they will repaint
    for (let c of this._children) {
      c.repaint(false);
    }

    if (isOriginalRepaintTarget) {
      // Find root component
      let root: Component = this;

      while (root._parent != null) {
        root = root._parent;
      }

      // Render
      if (root._rootHolder != null) {
        root._rootHolder.render();
      }
    }
  }

  public paint(context: CanvasRenderingContext2D): void {
    if (this._visible && this._needRepaint && this._bounds.width > 0 && this._bounds.height > 0) {
      let g = Component.createOffscreenCanvas(this._bounds.width, this._bounds.height);

      this.render(g.getContext('2d'));

      context.drawImage(g, this._bounds.x, this._bounds.y);
    }

    for (let c of this._children) {
      c.paint(context);
    }

    this._needRepaint = false;
  }

  // These functions should be overridden by sub comps
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
}

const CLICK_MAX_DISTANCE = 5;
const CLICK_INTERVAL = 200;
const DOUBLE_CLICK_INTERVAL = 500;

function squaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

export class RootComponentHolder {
  public readonly canvas: HTMLCanvasElement;

  constructor(public readonly width: number, public readonly height: number, public readonly rootComponent: Component) {
    rootComponent.rootHolder = this;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    let pressedComponent: Component = null;
    let mouseDownPos: ComponentPosition;
    let mouseUpPos: ComponentPosition;
    let mouseDownTime: number;
    let mouseUpTime: number;
    let mouseWasDragged: boolean = false;
    let consecutiveClickCount: number = 0;
    let lastClickTime: number;

    const mousePositionRelativeToCanvas = (event: MouseEvent) => {
      const canvasBounds = this.canvas.getBoundingClientRect();
      const x = event.clientX - canvasBounds.x;
      const y = event.clientY - canvasBounds.y;
      return {x, y};
    };

    const hit = (event: MouseEvent, action: (hit: Component) => void) => {
      const mousePos = mousePositionRelativeToCanvas(event);
      const hitComponent = this.rootComponent.findComponentAt(mousePos);

      if (hitComponent != null) {
        action(hitComponent);
      }
    };

    this.canvas.addEventListener('mousedown', (event) => hit(event, (component) => {
      pressedComponent = component;
      mouseDownPos = mousePositionRelativeToCanvas(event);
      mouseDownTime = performance.now();

      component.handleMousePress({
        x: mouseDownPos.x,
        y: mouseDownPos.y,
        wasDragged: false,
        originatingComp: component,
      });
    }));

    this.canvas.addEventListener('mouseup', (event: MouseEvent) => {
      mouseUpPos = mousePositionRelativeToCanvas(event);
      mouseUpTime = performance.now();

      if (mouseDownPos != null) {
        mouseWasDragged = squaredDistance(mouseDownPos.x, mouseDownPos.y, mouseUpPos.x, mouseUpPos.y)
          > CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE;
      }

      if (pressedComponent != null) {
        pressedComponent.handleMouseRelease({
          x: mouseUpPos.x,
          y: mouseUpPos.y,
          wasDragged: mouseWasDragged,
          originatingComp: pressedComponent,
        });

        if (mouseUpTime < mouseDownTime + CLICK_INTERVAL
          && ! mouseWasDragged) {
          pressedComponent.handleClick({
            x: mouseUpPos.x,
            y: mouseUpPos.y,
            wasDragged: mouseWasDragged,
            originatingComp: pressedComponent,
          });

          if (lastClickTime == null || mouseUpTime > lastClickTime + DOUBLE_CLICK_INTERVAL) {
            consecutiveClickCount = 1;
          } else {
            consecutiveClickCount++;
          }

          if (consecutiveClickCount == 2) {
            pressedComponent.handleDoubleClick({
              x: mouseUpPos.x,
              y: mouseUpPos.y,
              wasDragged: mouseWasDragged,
              originatingComp: pressedComponent,
            });

            consecutiveClickCount = 0;
          }
        }

        pressedComponent = null;
        lastClickTime = performance.now();
      }

      mouseWasDragged = false;
    });

    document.addEventListener('mousemove', (event: MouseEvent) => {
      const {x, y} = mousePositionRelativeToCanvas(event);

      if (mouseDownPos != null) {
        mouseWasDragged = squaredDistance(mouseDownPos.x, mouseDownPos.y, x, y)
          > CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE;
      }

      hit(event, (component) => {
        component.handleMouseMove({
          x, y,
          wasDragged: mouseWasDragged,
          originatingComp: component,
        });
      });

      if (event.buttons > 0 && pressedComponent != null) {
        pressedComponent.handleMouseDrag({
          x, y,
          wasDragged: mouseWasDragged,
          originatingComp: pressedComponent,
        });
      }

      this.render();
    });
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