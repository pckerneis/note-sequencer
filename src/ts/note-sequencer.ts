import {RootComponentHolder} from './components/RootComponentHolder';
import {SequencerRoot} from './components/SequencerRoot';

export const MIN_SEMI_H: number = 4;
export const MAX_SEMI_H: number = 30;
export const PITCH_PATTERN: number[] = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
export const MIN_PITCH: number = 0;
export const MAX_PITCH: number = 127;
export const MAX_VELOCITY: number = 127;

declare class ResizeObserver {
  constructor(...args: any[]);

  public observe(...elements: HTMLElement[]): any;
}

export interface Range {
  start: number,
  end: number,
}

export interface TimeSignature {
  upper: number,
  lower: number,
}

export interface SequencerDisplayModel {
  zoomSensitivity: number;
  verticalRange: Range,
  visibleTimeRange: Range,
  maxTimeRange: Range,
  signature: TimeSignature,
  adaptiveMode: boolean,
  colors: Colors,
}

export interface Colors {
  background: string,
  backgroundAlternate: string,
  backgroundBlackKey: string,
  strokeLight: string,
  strokeDark: string,
  text: string,
  velocityHandle: string,
  velocityHandleSelected: string,
  whiteKey: string,
  blackKey: string,
  noteHigh: string,
  noteLowBlend: string,
  noteOutline: string,
  noteOutlineSelected: string,
  draggableBorder: string,
  draggableBorderHover: string,
  lassoBackground: string,
  lassoOutline: string,
}

const defaultColors: Colors = {
  background: '#eeeeee',
  backgroundAlternate: '#00000010',
  backgroundBlackKey: '#00000025',
  strokeLight: '#00000020',
  strokeDark: '#00000050',
  text: '#000000',
  velocityHandle: '#ff9200',
  velocityHandleSelected: '#00a8ff',
  whiteKey: '#ffffff',
  blackKey: '#5e5e5e',
  noteHigh: '#ff3a36',
  noteLowBlend: '#959eb7',
  noteOutline: '#606060',
  noteOutlineSelected: '#00a8ff',
  draggableBorder: '#8f8f8f',
  draggableBorderHover: '#676767',
  lassoBackground: '#00a8ff20',
  lassoOutline: '#00a8ff80',
};

/**
 * A canvas-based note sequencer.
 *
 * @noInheritDoc
 */
export class NoteSequencer extends HTMLElement {

  public static readonly TIME_START: string = 'time-start';
  public static readonly DURATION: string = 'duration';

  private _shadowRoot: ShadowRoot;
  private _rootHolder: RootComponentHolder<SequencerRoot>;
  private readonly _model: SequencerDisplayModel;
  private readonly _sequencerRoot: SequencerRoot;

  constructor() {
    super();

    this._model = {
      verticalRange: {start: 58, end: 58 + 24},
      visibleTimeRange: {start: 0, end: 16},
      maxTimeRange: {start: 0, end: 16},
      signature: {upper: 4, lower: 4},
      zoomSensitivity: 30,
      adaptiveMode: true,
      colors: defaultColors,
    };

    this._shadowRoot = this.attachShadow({mode: 'closed'});

    this._sequencerRoot = new SequencerRoot(this._model);
    this._rootHolder = new RootComponentHolder<SequencerRoot>(100, 100, this._sequencerRoot);

    this._shadowRoot.append(this._rootHolder.canvas);

    const styleElement = document.createElement('style');
    styleElement.innerText = CSS_STYLE;
    this._shadowRoot.append(styleElement);

    // Events handlers
    const resizeObserver = new ResizeObserver(() => this.resizeAndDraw());
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
    return [
      NoteSequencer.TIME_START,
      'duration',
      'pitch-start',
      'pitch-end',
    ];
  }

  // Attributes/properties reflection

  /**
   * First time value to show.
   */
  public get timeStart(): string {
    return this.getAttribute(NoteSequencer.TIME_START);
  }

  public set timeStart(value: string) {
    const newValue = Math.max(0, parseInt(value));
    const offset = newValue - this._model.maxTimeRange.start;

    if (offset === 0) {
      return;
    }

    this._model.maxTimeRange.start += offset;
    this._model.maxTimeRange.end += offset;

    // Adapt visible range by translating to the left or to the right if needed

    const leftExcess = this._model.maxTimeRange.start - this._model.visibleTimeRange.start;

    if (leftExcess > 0) {
      this._model.visibleTimeRange.start += leftExcess;
      this._model.visibleTimeRange.end += leftExcess;
    }

    const rightExcess = this._model.maxTimeRange.end - this._model.visibleTimeRange.end;

    if (rightExcess < 0) {
      this._model.visibleTimeRange.start += rightExcess;
      this._model.visibleTimeRange.end += rightExcess;
    }

    this._sequencerRoot.repaint();
    this.setAttribute(NoteSequencer.TIME_START, '' + newValue);
  }

  /**
   * Maximum visible time range from timeStart.
   */
  public get duration(): string {
    return this.getAttribute(NoteSequencer.DURATION);
  }

  public set duration(newValue: string) {
    this._model.maxTimeRange.end = this._model.maxTimeRange.start + parseInt(newValue);
    this._model.visibleTimeRange.end = Math.min(this._model.visibleTimeRange.end, this._model.maxTimeRange.end);
    this._sequencerRoot.repaint();
    this.setAttribute(NoteSequencer.DURATION, '' + newValue);
  }

  // _________________

  /**
   * Called when the HTML node is first connected to the DOM (custom element implementation).
   */
  public connectedCallback(): void {
    this._rootHolder.attachMouseEventListeners();

    this.timeStart = this.timeStart         || "0";
    this.duration = this.duration           || "16";

    this.resizeAndDraw();
  }

  public disconnectedCallback(): void {
    this._rootHolder.removeMouseEventListeners();
  }

  /**
   * Called whenever an observed HTML attribute changes (custom element implementation). Redraws the component.
   */
  public attributeChangedCallback(/* name, oldValue, newValue */): void {
    this.draw();
  }

  public draw(): void {
    this._rootHolder.render();
  }

  private resizeAndDraw(): void {
    const boundingClientRect = this.getBoundingClientRect();
    this._rootHolder.resize(Math.ceil(boundingClientRect.width), Math.ceil(boundingClientRect.height));
    this.draw();
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
