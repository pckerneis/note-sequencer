import {squaredDistance} from './RenderHelpers';

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

export abstract class Component {
  public mouseCursor: string;

  private _children: Component[] = [];
  private _parent: Component = null;
  private _visible: boolean = true;
  private _needRepaint: boolean = true;
  private _rootHolder: RootComponentHolder;
  private _hovered: boolean;

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

  public get hovered(): boolean {
    return this._hovered;
  }

  public get width(): number {
    return Math.ceil(this._bounds.width);
  }

  public get height(): number {
    return Math.ceil(this._bounds.height);
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
        root._rootHolder.render();
      }
    }
  }

  public paint(context: CanvasRenderingContext2D): void {
    if (this._visible && this._needRepaint && Math.floor(this._bounds.width) > 0 && Math.floor(this._bounds.height) > 0) {
      const g = Component.createOffscreenCanvas(Math.ceil(this._bounds.width), Math.ceil(this._bounds.height));

      this.render(g.getContext('2d'));

      context.drawImage(g, Math.floor(this._bounds.x), Math.floor(this._bounds.y));
    }

    this._children.forEach(child => child.paint(context));

    this._needRepaint = false;
  }

  // These functions should be overridden by sub comps
  public mouseMoved(event: ComponentMouseEvent): void {
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
    console.log('exit', this.hovered);
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

const CLICK_MAX_DISTANCE_SQUARED = 30;
const CLICK_INTERVAL = 200;
const DOUBLE_CLICK_INTERVAL = 500;
const DOUBLE_PRESS_INTERVAL = 400;

export class RootComponentHolder {
  public readonly canvas: HTMLCanvasElement;

  constructor(public readonly width: number, public readonly height: number, public readonly rootComponent: Component) {
    rootComponent.rootHolder = this;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    let pressedComponent: Component = null;
    let componentUnderMouse: Component = null;
    let mouseDownPos: ComponentPosition;
    let mouseUpPos: ComponentPosition;
    let mouseDownTime: number;
    let mouseUpTime: number;
    let consecutiveClickCount: number = 0;
    let consecutivePressCount: number = 0;
    let lastClickTime: number;
    let lastClickPos: ComponentPosition;
    let wasDragged: boolean = false;
    let isDragging: boolean = false;


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

    this.canvas.addEventListener('mousedown', (mouseEvent) => hit(mouseEvent, (component) => {
      pressedComponent = component;
      mouseDownPos = mousePositionRelativeToCanvas(mouseEvent);
      mouseDownTime = performance.now();
      wasDragged = false;
      isDragging = true;

      component.mousePressed({
        position: mouseDownPos,
        positionAtMouseDown: mouseDownPos,
        pressedComponent: component,
        wasDragged,
        modifiers: extractModifiers(mouseEvent),
        isDragging,
      });

      if (lastClickPos == null
        || lastClickTime == null
        || mouseDownTime > lastClickTime + DOUBLE_PRESS_INTERVAL
        || squaredDistance(lastClickPos.x, lastClickPos.y, mouseDownPos.x, mouseDownPos.y) > CLICK_MAX_DISTANCE_SQUARED) {
        consecutivePressCount = 1;
      } else {
        consecutivePressCount++;
      }

      if (consecutivePressCount == 2) {
        component.doublePressed({
          position: mouseDownPos,
          positionAtMouseDown: mouseDownPos,
          pressedComponent: component,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });

        consecutivePressCount = 0;
      }
    }));

    document.addEventListener('mouseup', (mouseEvent: MouseEvent) => {
      mouseUpPos = mousePositionRelativeToCanvas(mouseEvent);
      mouseUpTime = performance.now();

      if (pressedComponent != null) {
        pressedComponent.mouseReleased({
          position: mouseUpPos,
          positionAtMouseDown: mouseDownPos,
          pressedComponent,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });

        if (mouseUpTime < mouseDownTime + CLICK_INTERVAL
          && ! wasDragged) {
          lastClickPos = mouseUpPos;

          pressedComponent.clicked({
            position: mouseUpPos,
            positionAtMouseDown: mouseDownPos,
            pressedComponent,
            wasDragged,
            modifiers: extractModifiers(mouseEvent),
            isDragging,
          });

          if (lastClickTime == null || mouseUpTime > lastClickTime + DOUBLE_CLICK_INTERVAL) {
            consecutiveClickCount = 1;
          } else {
            consecutiveClickCount++;
          }

          if (consecutiveClickCount == 2
            && ! wasDragged) {
            pressedComponent.doubleClicked({
              position: mouseUpPos,
              positionAtMouseDown: mouseDownPos,
              pressedComponent,
              wasDragged,
              modifiers: extractModifiers(mouseEvent),
              isDragging,
            });

            consecutiveClickCount = 0;
          }
        }

        pressedComponent = null;
        lastClickTime = performance.now();
      }

      wasDragged = false;
      isDragging = false;
    });

    document.addEventListener('mousemove', (mouseEvent: MouseEvent) => {
      const {x, y} = mousePositionRelativeToCanvas(mouseEvent);

      if (! wasDragged
          && mouseDownPos != null
          && squaredDistance(mouseDownPos.x, mouseDownPos.y, x, y) > CLICK_MAX_DISTANCE_SQUARED) {
        wasDragged = true;
      }

      hit(mouseEvent, (component) => {
        if (componentUnderMouse != null && componentUnderMouse != component) {
          document.body.style.cursor = 'default';

          const event: ComponentMouseEvent = {
            position: {x, y},
            positionAtMouseDown: mouseDownPos,
            wasDragged,
            modifiers: extractModifiers(mouseEvent),
            pressedComponent,
            isDragging,
          };

          componentUnderMouse.mouseExit({...event});
          component.mouseEnter({...event});
        }

        componentUnderMouse = component;

        component.mouseMoved({
          position: { x, y },
          positionAtMouseDown: mouseDownPos,
          pressedComponent: component,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });
      });

      if (mouseEvent.buttons > 0 && pressedComponent != null) {
        document.body.style.cursor = pressedComponent.mouseCursor;

        pressedComponent.mouseDragged({
          position: { x, y },
          positionAtMouseDown: mouseDownPos,
          pressedComponent,
          wasDragged,
          modifiers: extractModifiers(mouseEvent),
          isDragging,
        });
      }
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
  }
}

function extractModifiers(mouseEvent: MouseEvent): {shift: boolean, option: boolean} {
  return {
    shift: mouseEvent.shiftKey,
    option: mouseEvent.ctrlKey,
  }
}