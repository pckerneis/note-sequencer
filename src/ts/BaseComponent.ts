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
  positionAtMouseDown: {x: number, y: number},
  x: number,
  y: number,
  originatingComp: Component,
  wasDragged: boolean,
  modifiers: {shift: boolean, option: boolean}
}

export abstract class Component {
  private _children: Component[] = [];
  private _parent: Component = null;
  private _visible: boolean = true;
  private _needRepaint: boolean = true;
  private _rootHolder: RootComponentHolder;

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
    if (this._parent == null) {
      return;
    }

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

  public findComponentAt(position: ComponentPosition): Component {
    for (let i = this._children.length; --i >= 0;) {
      let c = this._children[i];

      if (c.hitTest(position)) {
        return c.findComponentAt(position);
      }
    }

    return this;
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
  public mouseMoved(event: ComponentMouseEvent): void {
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

  protected abstract resized(): void;

  protected abstract render(g: CanvasRenderingContext2D): void;
}

const CLICK_MAX_DISTANCE = 5;
const CLICK_INTERVAL = 200;
const DOUBLE_CLICK_INTERVAL = 500;
const DOUBLE_PRESS_INTERVAL = 400;

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
    let consecutiveClickCount: number = 0;
    let consecutivePressCount: number = 0;
    let lastClickTime: number;
    let lastClickPos: ComponentPosition;
    let wasDragged: boolean = false;

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
      wasDragged = false;

      component.mousePressed({
        positionAtMouseDown: mouseDownPos,
        x: mouseDownPos.x,
        y: mouseDownPos.y,
        originatingComp: component,
        wasDragged,
        modifiers: {shift: event.shiftKey, option: event.ctrlKey},
      });

      if (lastClickTime == null || mouseDownTime > lastClickTime + DOUBLE_PRESS_INTERVAL) {
        consecutivePressCount = 1;
      } else {
        consecutivePressCount++;
      }

      if (consecutivePressCount == 2
          && squaredDistance(lastClickPos.x, lastClickPos.y, mouseDownPos.x, mouseDownPos.y)
              < CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE) {
        component.doublePressed({
          positionAtMouseDown: mouseDownPos,
          x: mouseDownPos.x,
          y: mouseDownPos.y,
          originatingComp: component,
          wasDragged,
          modifiers: {shift: event.shiftKey, option: event.ctrlKey},
        });

        consecutivePressCount = 0;
      }
    }));

    document.addEventListener('mouseup', (event: MouseEvent) => {
      mouseUpPos = mousePositionRelativeToCanvas(event);
      mouseUpTime = performance.now();

      if (mouseDownPos != null) {
        wasDragged = squaredDistance(mouseDownPos.x, mouseDownPos.y, mouseUpPos.x, mouseUpPos.y)
          > CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE;
      }

      if (pressedComponent != null) {
        pressedComponent.mouseReleased({
          positionAtMouseDown: mouseDownPos,
          x: mouseUpPos.x,
          y: mouseUpPos.y,
          originatingComp: pressedComponent,
          wasDragged,
          modifiers: {shift: event.shiftKey, option: event.ctrlKey},
        });

        if (mouseUpTime < mouseDownTime + CLICK_INTERVAL
          && ! wasDragged) {
          lastClickPos = mouseUpPos;

          pressedComponent.clicked({
            positionAtMouseDown: mouseDownPos,
            x: mouseUpPos.x,
            y: mouseUpPos.y,
            originatingComp: pressedComponent,
            wasDragged,
            modifiers: {shift: event.shiftKey, option: event.ctrlKey},
          });

          if (lastClickTime == null || mouseUpTime > lastClickTime + DOUBLE_CLICK_INTERVAL) {
            consecutiveClickCount = 1;
          } else {
            consecutiveClickCount++;
          }

          if (consecutiveClickCount == 2
            && squaredDistance(lastClickPos.x, lastClickPos.y, mouseDownPos.x, mouseDownPos.y)
                < CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE) {
            pressedComponent.doubleClicked({
              positionAtMouseDown: mouseDownPos,
              x: mouseUpPos.x,
              y: mouseUpPos.y,
              originatingComp: pressedComponent,
              wasDragged,
              modifiers: {shift: event.shiftKey, option: event.ctrlKey},
            });

            consecutiveClickCount = 0;
          }
        }

        pressedComponent = null;
        lastClickTime = performance.now();
      }

      wasDragged = false;
    });

    document.addEventListener('mousemove', (event: MouseEvent) => {
      document.body.style.cursor = 'default';

      const {x, y} = mousePositionRelativeToCanvas(event);

      if (mouseDownPos != null) {
        wasDragged = squaredDistance(mouseDownPos.x, mouseDownPos.y, x, y)
          > CLICK_MAX_DISTANCE * CLICK_MAX_DISTANCE;
      }

      hit(event, (component) => {
        component.mouseMoved({
          positionAtMouseDown: mouseDownPos,
          x, y,
          originatingComp: component,
          wasDragged,
          modifiers: {shift: event.shiftKey, option: event.ctrlKey},
        });
      });

      if (event.buttons > 0 && pressedComponent != null) {
        pressedComponent.mouseDragged({
          positionAtMouseDown: mouseDownPos,
          x, y,
          originatingComp: pressedComponent,
          wasDragged,
          modifiers: {shift: event.shiftKey, option: event.ctrlKey},
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