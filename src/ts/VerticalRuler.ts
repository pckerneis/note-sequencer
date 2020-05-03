import { Component, ComponentMouseEvent } from './BaseComponent';
import { SequencerDisplayModel, MIN_SEMI_H, PITCH_PATTERN } from './note-sequencer';

export class VerticalRuler extends Component {
  constructor(private readonly model: SequencerDisplayModel) {
    super();
  }

  protected resized(): void {
  }

  protected render(g: CanvasRenderingContext2D): void {
    const bounds = this.getLocalBounds();

    let vMin = this.model.verticalRange.min;
    let vMax = this.model.verticalRange.max;
    let visibleRange = vMax - vMin;
    let semiHeight = Math.ceil(this.height / visibleRange); // height for a single semitone
  
    // piano roll
    if (semiHeight > MIN_SEMI_H) {  
      for (let i = Math.floor(vMin); i <= Math.ceil(vMax); ++i) {
        let y = bounds.height - (i - vMin) * semiHeight;
        let pitchClass = i % 12;
        let isBlack = PITCH_PATTERN[pitchClass];
  
        g.fillStyle = isBlack ? '#00000080' : '#ffffff';
  
        g.fillRect(bounds.width / 2, y - semiHeight,
          bounds.width / 2, semiHeight);

        // stroke
        g.fillStyle = '#00000020';
        g.fillRect(bounds.width / 2, y - semiHeight,
          bounds.width / 2, 1);
      }
  
      // left corner
      g.fillStyle = '#00000020';
      g.fillRect(bounds.width / 2, 0, 1, bounds.height);
    }
  
    // Octave labels  
    for (var i = 0; i < 128; i += 12) {
      if (i >= vMin && i <= vMax) {
        let y = bounds.height - (i - vMin) * semiHeight;
        let txt = 'C' + ((i / 12) - 2);

        g.fillStyle = '#000';
        g.fillText(txt, 2, y - 3, bounds.width / 2);
        
        g.fillStyle = '#00000080';
        g.fillRect(0, y, bounds.width, 1);
      }
    }
  
    // right corner
      g.fillStyle = '#00000020';
      g.rect(bounds.width / 2, 0, 1, bounds.height);
    g.rect(bounds.width - 1, 0, 1, bounds.height);
  }

  
mousePressed(event: ComponentMouseEvent): void {
  console.log('vruler pressed');
  /*
  let semiHeight = grid.getSemitoneHeight();

  // If we're not on the piano roll (bc it's hidden or clicking on its left)
  if (semiHeight < minSemiHeight || mouseX < this.x + this.w / 2)
    beingDragged = true;
  // If we're on the piano roll
  else if (semiHeight > minSemiHeight && mouseX > this.x + this.w / 2) {
    let p = Math.round(grid.getPitchForScreenPos(mouseY));

    if (p == lastPreviewedPitch)
      return;

    pianoRollIsOn = true;
    lastPreviewedPitch = p;
    owner.onPianoRollChange(p);
  }


  lastMouseX = mouseX;
  lastMouseY = mouseY;
  */
  }
}

  /*
      
      let beingDragged = false;
let lastMouseX = 0;
let lastMouseY = 0;
let zoomSensitivity = 12;

// true if the piano roll is currently being dragged
let pianoRollIsOn = false;
let lastPreviewedPitch = -1;

this.mousePressed = function () {
  let semiHeight = grid.getSemitoneHeight();

  // If we're not on the piano roll (bc it's hidden or clicking on its left)
  if (semiHeight < minSemiHeight || mouseX < this.x + this.w / 2)
    beingDragged = true;
  // If we're on the piano roll
  else if (semiHeight > minSemiHeight && mouseX > this.x + this.w / 2) {
    let p = Math.round(grid.getPitchForScreenPos(mouseY));

    if (p == lastPreviewedPitch)
      return;

    pianoRollIsOn = true;
    lastPreviewedPitch = p;
    owner.onPianoRollChange(p);
  }


  lastMouseX = mouseX;
  lastMouseY = mouseY;
};

this.doubleClicked = function () {
  owner.verticalRange.min = lowerPitch;
  owner.verticalRange.max = higherPitch;

  owner.repaint();
};

this.zoomIn = function () {
  let vMin = owner.verticalRange.min;
  let vMax = owner.verticalRange.max;
  let range = vMax - vMin;
  let semiHeight = this.h / range;

  if (semiHeight < 25) {
    let zoomAmount = range / zoomSensitivity;

    owner.verticalRange.min += zoomAmount;
    owner.verticalRange.max -= zoomAmount;
  }
};

this.zoomOut = function () {
  let vMin = owner.verticalRange.min;
  let vMax = owner.verticalRange.max;
  let range = vMax - vMin;
  let zoomAmount = range / zoomSensitivity;

  owner.verticalRange.min -= zoomAmount;
  owner.verticalRange.max += zoomAmount;

  owner.verticalRange.max = Math.min(owner.verticalRange.max,
    higherPitch);

  owner.verticalRange.min = Math.max(owner.verticalRange.min,
    lowerPitch);
};

this.translate = function (amount) {
  let vMin = owner.verticalRange.min;
  let vMax = owner.verticalRange.max;
  let range = vMax - vMin;
  let semiHeight = this.h / range;

  if (amount < 0) {
    let desiredMin = vMin + amount / semiHeight;
    let clipped = Math.max(desiredMin, lowerPitch);
    let correctAmount = (clipped - desiredMin) + (amount / semiHeight);

    owner.verticalRange.min = clipped;
    owner.verticalRange.max += correctAmount;

  } else if (amount > 0) {
    let desiredMax = vMax + amount / semiHeight;
    let clipped = Math.min(desiredMax, higherPitch);
    let correctAmount = (clipped - desiredMax) + (amount / semiHeight);

    owner.verticalRange.max = clipped;
    owner.verticalRange.min += correctAmount;

  }
};

this.mouseDragged = function () {
  if (beingDragged) {
    let yOffset = mouseY - lastMouseY;
    lastMouseY = mouseY;
    this.translate(yOffset);

    let xOffset = mouseX - lastMouseX;
    lastMouseX = mouseX;

    if (Math.abs(xOffset) >= 3) {
      if (xOffset > 0)
        this.zoomIn();
      else if (xOffset < 0)
        this.zoomOut();
    }

    owner.repaint();
  } else {
    let semiHeight = grid.getSemitoneHeight();

    if (semiHeight > minSemiHeight && mouseX > this.x + this.w / 2) {
      let p = Math.round(grid.getPitchForScreenPos(mouseY));

      if (p == lastPreviewedPitch)
        return;

      pianoRollIsOn = true;
      lastPreviewedPitch = p;
      owner.onPianoRollChange(p);
    }
  }
};

this.mouseReleased = function () {
  beingDragged = false;

  if (pianoRollIsOn) {
    owner.onPianoRollChange(-1);
    pianoRollIsOn = false;
  }
}
*/