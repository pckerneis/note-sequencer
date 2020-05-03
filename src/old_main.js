"use strict";

var grid;
var controllerDiv;
var fileInput;
var tempoInput;
var synth;
var previewedPitch;

function getMBS (time) {
    let mbs = grid.getTimeAsMBS (time, false);
    return mbs[0] + ":" + mbs[1] + ":" + mbs[2];
}

function startPreview() {
    let sign = grid.getSignature();
    let lgth = grid.getLength();
    
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = tempoInput.value;
    Tone.Transport.timeSignature = (sign.upper / sign.lower) * 4;
        
    let toneNotes = [];
    
    for (let n of grid.notes) {
        let note = [];
        
        note.push (getMBS (n.t));
        
        let info = {
            p: n.p,
            d: getMBS (n.d),
            v: n.v / 127
        }
        
        note.push (info);
        toneNotes.push (note);
    }
    
    var part = new Tone.Part(function(time, info) {
        synth.triggerAttackRelease(Tone.Frequency (info.p, "midi"), info.d, time, info.v);
    }, toneNotes).start(); //[["0:0:1", 69], ["0:1:0", 50]]).start();
    
    Tone.Transport.start();
}

function previewNote (pitch) {
    if (previewedPitch != undefined || pitch < 0)
        synth.triggerRelease (Tone.Frequency (previewedPitch, "midi"));
    
    if (pitch >= 0) {
        previewedPitch = pitch;
        synth.triggerAttack (Tone.Frequency (pitch, "midi"));
    }
}

function previewNoteShort (note) {
    synth.triggerAttackRelease (Tone.Frequency (note.p, "midi"), 0.2);
}

// DOM Helpers
function createLabel(txt) {
    let label = document.createElement ("label");
    label.appendChild (document.createTextNode (txt));
    return label;
}

function appendController (name, element) {
    let div = document.createElement ("div");
    div.appendChild (createLabel (name));
    div.appendChild (element);
    
    div.style.width = "100%";
    
    controllerDiv.appendChild (div);
}

function loadJSONFile() {
    if (typeof window.FileReader !== 'function') {
        alert("The file API isn't supported on this browser yet.");
        return;
    }
    
    let file = fileInput.files[0];
    
    if (file == undefined)
        return;
    
    let reader = new FileReader();
    reader.onload = receivedText;
    reader.readAsText(file);

    function receivedText(e) {
        let lines = e.target.result;
        grid.restoreFromJSON (JSON.parse(lines));
        
        fileInput.files = undefined;
    }
}

function setup() {
    synth = new Tone.PolySynth(4, Tone.Synth).toMaster();
    Tone.Transport.start();
    
    grid = new MidiGrid (0, 0, 500, 300);
    grid.onPianoRollChange = previewNote;
    grid.onNoteAdded = previewNoteShort;
    
    controllerDiv = document.createElement ("div");
    controllerDiv.id = "controllers";
    document.body.appendChild (controllerDiv);
    
    let sepDiv = document.createElement ("div");
    sepDiv.id = "sep";
    document.body.appendChild (sepDiv);
    
    tempoInput = document.createElement ("input");
    tempoInput.type = "number";
    tempoInput.min = 20;
    tempoInput.max = 999;
    tempoInput.step = 1;
    tempoInput.value = 120;
    tempoInput.style.width = "60px";
    
    appendController ("Tempo", tempoInput);
    appendController ("Signature", grid.getSignatureController());
    appendController ("Length", grid.getLengthController());
    appendController ("Resolution", grid.getResolutionListbox());
    
    let saveButton = document.createElement ("button");
    saveButton.appendChild (document.createTextNode ("Save JSON"));
    
    saveButton.onclick = function() {
        let json = grid.getAsJSON();
        
        let aElem = document.createElement ("a");
        aElem.id = "downloadAnchor";
        aElem.style = "display:none";
        document.body.appendChild (aElem);
        
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(json);
        
        aElem.setAttribute("href", dataStr);
        aElem.setAttribute("download", "clip.json");
        aElem.click();
    }
    
    fileInput = document.createElement ("input");
    fileInput.type = "file";
    fileInput.style = "display: none";
    fileInput.onchange = loadJSONFile;
    
    let loadButton = document.createElement ("button");
    loadButton.appendChild (document.createTextNode ("Load JSON"));
    loadButton.onclick = function() { fileInput.click() } ;
    
    let div = document.createElement ("div");
    div.appendChild (saveButton);
    div.appendChild (loadButton);
    div.appendChild (fileInput);
    
    
    let playButton = document.createElement ("button");
    playButton.appendChild (document.createTextNode ("Preview"));
    playButton.onclick = startPreview;
    div.appendChild (playButton);
    
    controllerDiv.appendChild (div);
    
    createCanvas (500, 300);
    
    function contextMenuBlocker(e) {
        e.preventDefault();
    }
    
    let cnv = document.getElementById ("defaultCanvas0");
    cnv.oncontextmenu = contextMenuBlocker;
}

function draw() {
    if (grid.shouldRepaint()) {
        background (0);
        grid.paint();
    }
}

// Mouse/key interaction
var clickInterval = 150;
var doubleClickInterval = 300;

let currentMouseEvent;
let lastClickTime;
let lastPressTime;
let lastClickPosition;

function mousePressed() {
    currentMouseEvent = {
        positionAtMouseDown: { x: mouseX, y: mouseY, wasDragged: false }
    };
    
    if (grid.hitTest())
        grid.handleMousePress(currentMouseEvent);
    
    lastPressTime = performance.now();
    
    // We want to determine if this is a double press
    if (lastClickTime == undefined)
        return;
    
    if (dist (lastClickPosition.x, lastClickPosition.y, mouseX, mouseY) > 3)
        return;
    
    if (lastPressTime - lastClickTime < doubleClickInterval)
        if (grid.hitTest())
            grid.handleDoublePress(currentMouseEvent);
}

function mouseReleased() {
    grid.handleMouseRelease(currentMouseEvent);
    
    if (currentMouseEvent.wasDragged)
        return;
    
    // Is this a click ?
    let time = performance.now();
    if (time - lastPressTime < clickInterval) {
        lastClickTime = time;
        lastClickPosition = { x: mouseX, y: mouseY }
        
        if (grid.hitTest())
            grid.handleClick(currentMouseEvent);
    }
    
    // TODO : count number of consecutive clicks
}

function mouseDragged() {
    if (dist(currentMouseEvent.positionAtMouseDown.x, currentMouseEvent.positionAtMouseDown.y, 
             mouseX, mouseY) > 5)
        currentMouseEvent.wasDragged = true;
    
    grid.handleMouseDrag(currentMouseEvent);
}

function mouseMoved() {
    if (!mouseIsPressed && grid.hitTest())
        grid.handleMouseMove(currentMouseEvent);
}

function keyPressed() {
    if (keyCode === DELETE || keyCode === BACKSPACE) {
        grid.deleteSelection();
    }
}