import {RootComponentHolder} from './BaseComponent';
import {SequencerRoot} from './SequencerRoot';

export const MIN_SEMI_H: number = 4;
export const MAX_SEMI_H: number = 30;
export const PITCH_PATTERN: number[] = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
export const MIN_PITCH: number = 0;
export const MAX_PITCH: number = 127;

declare class ResizeObserver {
  constructor(...args: any[]);

  public observe(...elements: HTMLElement[]): any;
}

interface Range {
  min: number,
  max: number,
}

interface TimeSignature {
  upper: number,
  lower: number,
}

export interface SequencerDisplayModel {
  zoomSensitivity: number;
  verticalRange: Range,
  visibleTimeRange: Range,
  maxTimeRange: Range,
  signature: TimeSignature,
}

/**
 * A canvas-based note sequencer.
 *
 * @noInheritDoc
 */
export class NoteSequencer extends HTMLElement {

  private _shadowRoot: ShadowRoot;
  private _rootComponent: RootComponentHolder;
  private readonly _model: SequencerDisplayModel;

  constructor() {
    super();

    this._model = {
      verticalRange: {min: 58, max: 58 + 24},
      visibleTimeRange: {min: 0, max: 16},
      maxTimeRange: {min: 0, max: 32},
      signature: {upper: 4, lower: 4},
      zoomSensitivity: 30,
    };

    this._shadowRoot = this.attachShadow({mode: 'closed'});

    this._rootComponent = new RootComponentHolder(100, 100, new SequencerRoot(this._model));

    this._shadowRoot.append(this._rootComponent.canvas);

    const styleElement = document.createElement('style');
    styleElement.innerText = CSS_STYLE;
    this._shadowRoot.append(styleElement);

    // Events handlers
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this);
  }

  /**
   * HTML tag name used for this element.
   */
  public static get tag(): string {
    return 'note-sequencer';
  }

  /**
   * Observed HTML attributes (custom element implementation).
   */
  public static get observedAttributes(): string[] {
    return [];
  }

  /**
   * Called when the HTML node is first connected to the DOM (custom element implementation).
   */
  public connectedCallback(): void {
    this.resize();
  }

  /**
   * Called whenever an observed HTML attribute changes (custom element implementation). Redraws the component.
   */
  public attributeChangedCallback(/* name, oldValue, newValue */): void {
    this.draw();
  }

  /**
   * Draws the note grid.
   */
  public draw(): void {
    this._rootComponent.render();
  }

  private resize(): void {
    const boundingClientRect = this.getBoundingClientRect();
    this._rootComponent.resize(boundingClientRect.width, boundingClientRect.height);
    this.draw();
  }

  private getStringAttribute(key: string): string {
    return this.hasAttribute(key) ? this.getAttribute(key) : null;
  }

  private getNumberAttribute(key: string): number {
    return this.hasAttribute(key) ? Number(this.getAttribute(key)) : null;
  }
}

const CSS_STYLE = `
:host {
  display: block;
}

note-sequencer {
  box-sizing: border-box;
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
}

note-sequencer canvas {
  box-sizing: border-box;
  margin: 0;
}
`;
