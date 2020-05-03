"use strict";

function Component (x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.needsRepaint = true;
    this.wasPressed = false;
    this.pointer = "default";
    
    this.children = [];
    this.parent;
    this.visible = true;
        
    // These functions should be overriden by sub comps
    this.mouseMoved = function(e) {}
    this.mousePressed = function(e) {}
    this.mouseReleased = function(e) {}
    this.mouseDragged = function(e) {}
    this.clicked = function(e) {}
    this.doublePressed = function(e) {}
    this.doubleClicked = function(e) {}
    
    this.display = function(g) {}
    
    // Usual functions on comps
    this.addAndMakeVisible = function(childComp) {
        childComp.visible = true;
        this.children.push (childComp);
        childComp.parent = this;
    }
    
    this.removeChild = function(childComp) {
        let idx = this.children.indexOf (childComp);
        
        if (idx >= 0) {
            childComp.visible = false;
            childComp.parent = undefined;
            this.children.splice (idx, 1);
        }
    }
    
    this.getWindowPosition = function() {
        let x = this.x;
        let y = this.y;
        let parent = this.parent;
        
        while (parent != undefined) {
            x += parent.x;
            y += parent.y;
            parent = parent.parent;
        }
        
        return { x: x, y: y };
    }
    
    this.toFront = function() {
        if (this.parent == undefined)
            return;
        
        let idx = this.parent.children.indexOf (this);
        
        if (idx < 0)
            return;
        
        this.parent.children.splice (idx, 1);
        this.parent.children.push (this);
    }
    
    // These are internal functions
    this.hitTest = function() {
        if (! this.visible)
            return false;
        
        let pos = this.getWindowPosition();
        
        if (mouseX < pos.x || mouseX > pos.x + this.w) return false;
        if (mouseY < pos.y || mouseY > pos.y + this.h) return false;
        return true;
    }

    this.handleMouseMove = function(e) {
        for (let i = this.children.length; --i >= 0;) {
            let c = this.children[i];
            
            if (c.hitTest()) {
                c.handleMouseMove(e);
                return;
            }
        }
        
        document.body.style.cursor = this.pointer;
        this.mouseMoved(e);        
    }
    
    this.handleMousePress = function(e) {
        for (let i = this.children.length; --i >= 0;) {
            let c = this.children[i];
            
            if (c.hitTest()) {
                c.handleMousePress(e);
                return;
            }
        }
        
        e.originatingComp = this;
        this.mousePressed(e);
        this.wasPressed = true;
    }
    
    this.handleDoublePress = function(e) {
        if (! e.wasDragged && e.originatingComp != undefined)
            e.originatingComp.doublePressed();
    }
    
    this.handleClick = function(e) {
        if (! e.wasDragged && e.originatingComp != undefined)
            e.originatingComp.clicked();
    }
    
    this.handleMouseDrag = function(e) {
        for (let i = this.children.length; --i >= 0;)
            this.children[i].handleMouseDrag(e);
                        
        if (this.wasPressed)
            this.mouseDragged(e);
    }
    
    this.handleMouseRelease = function(e) {
        for (let i = this.children.length; --i >= 0;)
            this.children[i].handleMouseRelease(e);
        
        if (this.wasPressed)
            this.mouseReleased(e);
        
        this.wasPressed = false;
    }
    
    // Should be triggered on 2nd mouse press instead of release...
    this.handleDoubleClick = function(e) {
        if (e.wasDragged)
            return;
        
        for (let i = this.children.length; --i >= 0;) {
            let c = this.children[i];
            
            if (c.hitTest()) {
                c.handleDoubleClick(e);
                return;
            }
        }
        
        this.doubleClicked(e);
    }
    
    this.repaint = function() {
        this.needsRepaint = true;
    }
    
    this.shouldRepaint = function() {
        if (this.needsRepaint)
            return true;
        
        for (let c of this.children)
            if (c.shouldRepaint())
                return true;
        
        return false;
    }
    
    this.paint = function() {
        if (this.visible && this.shouldRepaint()) {
            // Mark all children so that they will repaint
            for (let c of this.children)
                c.repaint();
            
            let g = createGraphics (this.w, this.h);
            
            this.display(g);
            
            image (g, this.x, this.y);
            
            for (let c of this.children)
                c.paint();
        }
        
        this.needsRepaint = false;
    }
}

function SelectedItemSet() {
    let selected = [];
    let itemAboutToBeSelected = undefined;
    
    this.onchange = function() {}
    
    this.getItems = function() { return selected; }
    
    this.addToSelection = function(item, deselectAll = false) {
        if (deselectAll)
            this.deselectAll();
        
        selected.push (item);
        item.selected = true;
    }
        
    this.addToSelectionMouseDown = function(item) {
        itemAboutToBeSelected = item;

        let itemIsSelected = false;
        
        for (let s of selected) {
             if (s == itemAboutToBeSelected) {
                 itemIsSelected = true;
                 break;
             }
        }
        
        if (! itemIsSelected) {
            if (! keyIsDown (SHIFT))
                this.deselectAll();
            
            selected.push (itemAboutToBeSelected);
            itemAboutToBeSelected.selected = true;
            this.onchange();
            
            return true;
        } 
        
        // The item is already selected
        if (keyIsDown (SHIFT)) {
            this.removeFromSelection (itemAboutToBeSelected);
            
            return true;          
        }
        
        return false;
    }
    
    this.addToSelectionMouseUp = function(e, isBlocked) {
        if (itemAboutToBeSelected == undefined)
            return;
        
        let itemIsSelected = false;
        
        for (let s of selected) {
             if (s === itemAboutToBeSelected) {
                 itemIsSelected = true;
                 break;
             }
        }
        
        if (e.wasDragged || isBlocked)
            return;
        
        if (! keyIsDown (SHIFT))
            this.deselectAll();
        
        selected.push (itemAboutToBeSelected);
        itemAboutToBeSelected.selected = true;
        this.onchange();
        
        itemAboutToBeSelected = undefined;
    }
    
    this.setUniqueSelection = function(item) {
        this.deselectAll();
        selected.push (item);
        item.selected = true;
    }
    
    this.removeFromSelection = function(item) {
        for (let i = selected.length; --i >= 0;) {
            if (selected[i] === item) {
                item.selected = false;
                selected.splice (i, 1);
                this.onchange();
                break;                
            }
        }
    }
    
    this.deselectAll = function() {
        for (let s of selected)
            s.selected = false;
        
        selected = [];
        this.onchange();
    }
}

function LassoSelector(ownerComp, selectedItemSet) {
    let lasso = undefined;
    
    this.findAllElementsInLasso = function(lassoBounds) { return undefined; }
    
    this.beginLasso = function() {
        lasso = {
            startX: mouseX - ownerComp.x,
            startY: mouseY - ownerComp.y,
            endX: mouseX - ownerComp.x,
            endY: mouseY - ownerComp.y,
            commuteMode: keyIsDown (SHIFT)
        }

        if (keyIsDown (SHIFT)) {
            lasso.commutableSelection = [];

            for (let s of selectedItemSet.getItems())
                lasso.commutableSelection.push (s);
        }
    }

    this.endLasso = function() {
        lasso = undefined;
    }

    this.dragLasso = function() {
        if (lasso == undefined)
            return;

        lasso.endX = mouseX - ownerComp.x;
        lasso.endY = mouseY - ownerComp.y;

        let lassoBounds = {
            x: Math.min (lasso.startX, lasso.endX),
            y: Math.min (lasso.startY, lasso.endY),
            w: Math.abs (lasso.startX - lasso.endX),
            h: Math.abs (lasso.startY - lasso.endY)
        }

        let lassoSelection = this.findAllElementsInLasso (lassoBounds);
        
        if (lassoSelection == undefined)
            return;
        
        if (lasso.commuteMode) {
            // Restore selection from mouse down
            selectedItemSet.deselectAll();

            for (let s of lasso.commutableSelection)
                selectedItemSet.addToSelection (s);

            // Browse current lasso selection
            for (let s of lassoSelection) {
                if (selectedItemSet.getItems().indexOf (s) >= 0) {
                    // If the item is already selected, deselect it
                    selectedItemSet.removeFromSelection (s);
                } else {
                    // Else add it to the selection
                    selectedItemSet.addToSelection (s);
                }
            }
        } else {
            selectedItemSet.deselectAll();

            for (let s of lassoSelection)
                selectedItemSet.addToSelection (s);
        }
    }

    this.drawLasso = function(g) {
        if (lasso == undefined)
            return;

        g.rectMode (CORNERS);
        g.fill (255, 90);
        g.rect (lasso.startX, lasso.startY, lasso.endX, lasso.endY);
        g.rectMode (CORNER);
    }
}

function FoldButton() {
    Component.call (this);
    
    let state = true;
    
    // Override me!
    this.onchange = function(state) {}
    
    this.display = function(g) {
        let ellipseX = this.w / 2;
        let ellipseY = this.h / 2;
        let ellipseR = this.w * 0.9;
        
        g.stroke(0);
        g.fill (200);
        g.ellipse (ellipseX, ellipseY, ellipseR, ellipseR);
        
        g.fill (0);
        
        let margin = 3.5;
        
        if (state)
            g.triangle(margin, margin, margin, this.h - margin, this.w - margin, this.h / 2);
        else
            g.triangle(margin, margin, this.w - margin, margin, this.w / 2, this.h - margin);
    }
    
    this.clicked = function() {
        state = ! state;
        
        this.onchange(state);
        
        this.repaint();
    }
}

function MidiGrid (x, y, w, h) {
    Component.call (this, x, y, w, h);
  
    var pitchPattern = [0,1,0,1,0,0,1,0,1,0,1,0];

    // To override
    this.onPianoRollChange = function (pitch) {}
    this.onNoteAdded = function (note) {}
        
    // Look
    this.bg = color (200);

    let hRulerHeight = 20;
    let vRulerWidth = 42;
        
    let vTrackHeight = 80;
    let topBorderHeight = 4;
    
    let minSemiHeight = 3;      // If less than 3, only octave separation will be shown
    let maxSemiHeight = 20;     // Determines the max zoom
    
    // Grid resolution
    let adaptativeLabels = ["XL", "X", "M", "S", "XS"];
    let adaptativeValues = [1, .5, .25, .1, .05];
    let adaptativeIndex = 2;
    let adaptativeMode = true;
    
    let fixedLabels = ["8 Bars", "4 Bars", "2 Bars", "1 Bar", "1/2",
                      "1/4", "1/8", "1/16", "1/32"];
    let fixedRatios = [128, 64, 32, 16, 8, 4, 2, 1, 0.5];
    let fixedIndex = 5;
    let fixedMode = false;
    
    this.getLength = function() {
        return lgth;
    }
    
    this.getSignature = function() {
        return sign;
    }
    
    this.setUpperSignature = function(upper) {
        sign.upper = upper;
        let ratio = 16 * (sign.upper / sign.lower);
        fixedRatios = [ratio * 8, ratio * 4, ratio * 2, ratio, 8, 4, 2, 1, 0.5];
        
        this.refreshLengthController();
    }
    
    this.setLowerSignature = function(lower) {
        sign.lower = lower;
        let ratio = 16 * (sign.upper / sign.lower);
        fixedRatios = [ratio * 8, ratio * 4, ratio * 2, ratio, 8, 4, 2, 1, 0.5];
        
        this.refreshLengthController();
    }
    
    // Range settings
    var sign = new TimeSignature();
    var lgth = 16;

    var lowerPitch = 0;
    var higherPitch = 127;

    this.verticalRange = {
        min: 60,
        max: 73
    };
    
    this.horizontalRange = {
        min: 0,
        max: lgth
    };
    
    // Notes
    function Note (t, p, d, v = 127) {
        this.t = t;
        this.p = p;
        this.d = d;
        this.v = v;
        
        this.hidden = false;
        this.selected = false;
    }
    
    this.notes = [];
    
    // This is used when adding a new note with a double press. 
    // It is changed when dragVelocity is called.
    let velocityToUse = 120;
    
    this.removeNote = function(note) {
        let idx = this.notes.indexOf (note);
        
        if (idx >= 0) {
            this.selected.removeFromSelection (note);
            this.notes.splice (idx, 1);
            this.repaint();
        }
    }
    
    this.moveNoteToFront = function (note) {
        let idx = this.notes.indexOf (note);
        
        if (idx >= 0) {
            this.notes.splice (idx, 1);
            this.notes.push (note);
            this.repaint();
        }
    }
    
    // Note selection    
    this.selected = new SelectedItemSet();
    let that = this;
    this.selected.onchange = function() { that.repaint(); }
        
    this.deleteSelection = function() {
        let selected = this.selected.getItems();
        
        for (let i = selected.length; --i >= 0;)
            this.removeNote (selected[i]);  
        
        this.repaint();     
    }
    
    // Time operations
    function TimeSignature (upper = 4, lower = 4) {
        this.upper = upper;
        this.lower = lower;
    }
    
    this.getTimeAsMBS = function (t) {
        let denominator = (16 / sign.lower);
        let b = Math.floor(t / denominator);
        
        let s = t - (b * denominator);
        let m = Math.floor (b / sign.upper);
        b -= (m * sign.upper);
        
        return [m, b, s];
    }
    
    this.getStringForTime = function(t, withOriginOne) {        
        let mbs = this.getTimeAsMBS (t);
        let m = mbs[0];
        let b = mbs[1];
        let s = mbs[2];
        
        
        if (withOriginOne) {
            m++;
            b++;
            s++;           
        }
        
        let useSixteenth = s != 1;
        let useBeats = useSixteenth || b != 1;
        
        return m + (useBeats ? "." + b : "") + (useSixteenth ? "." + Math.floor(s) : "");
    }
  
    // Children comps
    function GridArea(owner) {
        Component.call(this);
        
        // dragging is a string that can be either empty, 'LEFT', 'RIGHT' or 'MOVE'
        // it describes the current drag action (none, stretch left, stretch right or move)
        let dragging = "";
        // Item under the mouse when dragging a bunch of notes (this is the one that'll get
        // snapped to the current grid)
        let itemDragged = undefined;
        
        /* === Drawing === */

        this.drawSemiTonePattern = function(g, vMin, vMax, semiHeight) {
            g.stroke(0, 10);            
            let yOffset = (vMin - Math.floor(vMin)) * semiHeight;
            
            for (let i = Math.floor(vMin); i < Math.ceil(vMax); ++i) {
                let y = this.h - (i - Math.floor(vMin)) * semiHeight;
                let pitchClass = i % 12;
                let isBlack = pitchPattern[pitchClass];

                if (isBlack)     g.fill (0, 15);
                else             g.fill (255, 25);

                g.rect (0, yOffset + y - semiHeight, this.w, semiHeight);
            }
        }

        this.drawOctaveLines = function(g, vMin, vMax, semiHeight) {
            g.fill (0, 25);
            g.noStroke();
            
            for (var i = 0; i < 128; i += 12) {
                if (i >= vMin && i <= vMax) {
                    let y = this.h - (i - vMin) * semiHeight;
                    g.rect (0, y, this.w, 1);
                }
            }
        }

        this.drawHorizontalBackground = function(g, sixteenth, vMin, vMax) {
            let incr = this.getLockRatio();
            
            if (incr <= 0)
                return;
                
            let minAlternate = 100;
            let maxAlternate = 200;

            // Measure altern
            let alternate = (16 * sign.upper) / sign.lower;

            // If a measure is too big, try alternating with each beat
            if (alternate * sixteenth > maxAlternate) {
                alternate /= sign.upper;

                // If it's still to big, subdivide beat
                while (alternate * sixteenth > maxAlternate)
                    alternate /= 2;
            } else {
                // If it's too small, multiply measure by 2
                while (alternate * sixteenth < minAlternate)
                    alternate *= 2;
            }                

            g.noStroke();

            for (let i = 0; i < Math.ceil(vMax); i += incr) {
                let x = (i - vMin) * sixteenth;
                
                // Alterning background
                if (i % (alternate * 2) == 0) {
                    g.fill (0, 10);
                    g.rect (x, 0, alternate * sixteenth, this.h);
                }
                
                if (x < 0)
                    continue;

                // Larger lines for measures
                if (i % ((16 * sign.upper) / sign.lower) == 0) {
                    g.fill (0, 120);
                    g.rect (x, 0, 1, this.h);
                }
                // Regular lines
                else if (Math.round(i % incr) == 0) {
                    g.fill (0, 50);
                    g.rect (x, 0, 1, this.h);
                }
            }
        }
        
        this.drawNotes = function(g, semiHeight, sixteenth) {
            for (let n of owner.notes) {
                if (n.hidden)
                    continue;
                
                g.strokeWeight (n.selected ? 3 : 1);
                let stroke = color (255, n.selected ? 255 : 100);
                let c = color (255 - (n.v * (255 / 127)));
                
                let x = this.getPositionForTime (n.t);
                let y = this.getPositionForPitch (n.p);
                let d = n.dTemp != undefined ? n.dTemp : n.d;
                let w = Math.max (2, d * sixteenth);
                let h = semiHeight;
                g.fill (c);
                g.stroke(stroke);
                
                g.rect (x,y,w,h);
            }
        }
        
        this.display = function(g) {
            // Background
            g.fill (color(255, 100));
            g.noStroke();
            g.rect (0, 0, this.w, this.h);
            
            // Horizontal
            let hMin = owner.horizontalRange.min;
            let hMax = owner.horizontalRange.max;
            let hRange = hMax - hMin;
            let sixteenth = this.w / hRange;
            
            this.drawHorizontalBackground(g, sixteenth, hMin, hMax);

            // Vertical
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let vRange = vMax - vMin;
            let semiHeight = this.h / vRange; // height for a single semitone

            if (semiHeight > minSemiHeight) 
                this.drawSemiTonePattern(g, vMin, vMax, semiHeight);
            else                            
                this.drawOctaveLines(g, vMin, vMax, semiHeight);
            
            lasso.drawLasso(g);
            this.drawNotes(g, semiHeight, sixteenth);
        }
        
        /* === Mouse operations === */
        
        this.doublePressed = function(e) {
            let local = {
                x: mouseX - this.x,
                y: mouseY - this.y
            };
            
            let existingNote = this.findNoteAt (local);
            
            if (existingNote != undefined) {
                owner.removeNote (existingNote);
                return;
            }
            
            let t = this.snapToGrid (this.getTimeForScreenPos (mouseX));
            let p = Math.round (this.getPitchForScreenPos (mouseY));
            let d = this.getLockRatio();
            
            let newNote = new Note(t, p, d, velocityToUse);
            
            owner.notes.push (newNote);
            owner.selected.setUniqueSelection (newNote);
            
            this.removeOverlaps (true);
            
            // We start dragging the end point of this note and its velocity
            dragging = "VRIGHT";
            itemDragged = newNote;
            
            // Trigger callback method
            owner.onNoteAdded (newNote);
        }
        
        let mouseDownResult = false;
        
        this.mouseMoved = function(e) {            
            let local = {
                x: mouseX - this.x,
                y: mouseY - this.y
            };
            
            let existingNote = this.findNoteAt (local);
            
            if (existingNote == undefined)
                return;
            
            let dragType = this.getDragActionForNoteAt (local, existingNote);
            
            if (dragType == "LEFT")
                document.body.style.cursor = "w-resize";
            else if (dragType == "RIGHT")
                document.body.style.cursor = "e-resize";              
        }
        
        this.mousePressed = function(e) {            
            let local = {
                x: mouseX - this.x,
                y: mouseY - this.y
            };
                
            let existingNote = this.findNoteAt (local);
                        
            if (existingNote == undefined) {
                if (! keyIsDown (SHIFT))
                    owner.selected.deselectAll();
                
                lasso.beginLasso();
                
                mouseDownResult = true;
                
                return;
            }
            
            mouseDownResult = owner.selected.addToSelectionMouseDown (existingNote);
            dragging = this.getDragActionForNoteAt (local, existingNote);
            
            itemDragged = existingNote;
            owner.moveNoteToFront (existingNote);
        }
        
        // These are used in drag methods and reset in mouseReleased
        let initialPosition = undefined;
        let initialDuration = undefined;
        let initialStart = undefined;
        let initialVelocity = undefined;
        
        this.mouseReleased = function(e) {
            dragging = "";
            initialPosition = undefined;
            initialDuration = undefined;
            initialStart = undefined;
            initialVelocity = undefined;
            
            lasso.endLasso();
            
            // in case a drag would have caused negative durations
            for (let s of owner.selected.getItems()) {
                s.d = Math.max (0, s.d);
            }
            
            owner.selected.addToSelectionMouseUp(e, mouseDownResult);
            
            this.removeOverlaps (true);
            
            itemDragged = undefined;
        }
        
        this.moveSelection = function(e) {
            if (itemDragged === undefined)
                return;

            let currentPosition = {
                t: itemDragged.t,
                p: itemDragged.p
            };

            if (initialPosition === undefined)
                initialPosition = currentPosition;

            let dragOffset = {
                x: mouseX - e.positionAtMouseDown.x,
                y: mouseY - e.positionAtMouseDown.y
            }

            let scaledX = dragOffset.x / this.getSixteenthWidth();
            let scaledY = dragOffset.y / this.getSemitoneHeight();

            // Apply translate to itemDragged
            itemDragged.p = Math.round(initialPosition.p - scaledY);
            itemDragged.t = initialPosition.t + scaledX;

            // snap to grid                
            if (!keyIsDown (OPTION))
                itemDragged.t = this.snapToGrid (itemDragged.t);

            // Now we determine the actual offset
            let gridOffsetX = itemDragged.t - currentPosition.t;
            let gridOffsetY = itemDragged.p - currentPosition.p;

            for (let s of owner.selected.getItems()) {
                // Ignore itemDragged which has already been moved
                if (s === itemDragged)
                    continue;

                s.p += gridOffsetY;
                s.t += gridOffsetX;
            }
        }
        
        this.dragEndPoints = function(e) {
            if (itemDragged === undefined)
                return;

            let currentDuration = itemDragged.d;

            if (initialDuration === undefined)
                initialDuration = currentDuration;

            let dragOffset = mouseX - e.positionAtMouseDown.x;
            let scaledX = dragOffset / this.getSixteenthWidth();

            // Apply to itemDragged
            itemDragged.d = initialDuration + scaledX;

            // snap to grid
            if (!keyIsDown (OPTION)) {
                let snappedEndPoint = this.snapToGrid (itemDragged.t + itemDragged.d);
                itemDragged.d = snappedEndPoint - itemDragged.t;
                itemDragged.d = Math.max (0, itemDragged.d);
            }

            // Now we determine the actual offset
            let gridOffsetX = itemDragged.d - currentDuration;

            for (let s of owner.selected.getItems()) {
                // Ignore itemDragged which has already been moved
                if (s === itemDragged)
                    continue;
                
                // We temporarily allow negative values... will be clipped in mouseReleased
                s.d += gridOffsetX;
            }
        }
        
        this.dragStartPoints = function(e) {
            if (itemDragged === undefined)
                return;

            let currentStart = itemDragged.t;
            let currentDuration = itemDragged.d;

            // On first call of a drag action
            if (initialStart === undefined) {
                initialStart = currentStart;
                initialDuration = currentDuration;
                
                for (let s of owner.selected.getItems()) {
                    s.initialStart = s.t;
                }
            }

            let dragOffset = mouseX - e.positionAtMouseDown.x;
            let scaledX = dragOffset / this.getSixteenthWidth();
            let currentEndPoint = itemDragged.t + itemDragged.d;

            // Apply to itemDragged
            itemDragged.t = Math.min (currentEndPoint, initialStart + scaledX);
            itemDragged.d = Math.max (0, initialDuration - scaledX);

            // snap to grid
            if (!keyIsDown (OPTION) && itemDragged.d > 0) {
                itemDragged.t = this.snapToGrid (itemDragged.t);
                itemDragged.d = Math.max (0, initialDuration - (itemDragged.t - initialStart));
            }

            // Now we determine the actual offset since beginning of drag
            let startOffset = itemDragged.t - initialStart;

            for (let s of owner.selected.getItems()) {
                // Ignore itemDragged which has already been moved
                if (s === itemDragged)
                    continue;
                
                let endPoint = s.t + s.d;
                
                s.t = s.initialStart + startOffset;
                s.t = Math.min (s.t, endPoint)
                s.d = Math.max (0, endPoint - s.t)
            }
        }
        
        this.dragVelocity = function(e) {
            // Can only apply to itemDragged
            if (itemDragged == undefined)
                return;
            
            if (initialVelocity == undefined)
                initialVelocity = itemDragged.v;
            
            let dragOffset = mouseY - e.positionAtMouseDown.y;
            
            itemDragged.v = initialVelocity - dragOffset;
            itemDragged.v = Math.max (1, Math.min (128, itemDragged.v));
            
            velocityToUse = itemDragged.v;
        }
        
        this.mouseDragged = function(e) {
            if (dragging == "")
                lasso.dragLasso();
            
            if (! e.wasDragged || dragging == "")
                return;
            
            if (dragging == "MOVE") {
                this.moveSelection(e);
            } else if (dragging == "RIGHT" || dragging == "VRIGHT") {
                this.dragEndPoints(e);
            } else if (dragging == "LEFT") {
                this.dragStartPoints(e);
            }
            
            if (dragging == "VRIGHT")
                this.dragVelocity(e);
            
            this.removeOverlaps (false);
        }
        
        /* === Lasso selection === */
        
        let lasso = new LassoSelector(this, owner.selected);
                
        function boxCollision (box1, box2) {
            if ((box2.x >= box1.x + box1.w) || (box2.x + box2.w <= box1.x)
                || (box2.y >= box1.y + box1.h) || (box2.y + box2.h <= box1.y))
                return false;
            else
                return true;
        }
        
        let that = this;        
        
        lasso.findAllElementsInLasso = function(lassoBounds) {
            let r = [];
            
            for (let n of owner.notes) {
                let noteBounds = {
                    x: that.getPositionForTime (n.t),
                    y: that.getPositionForPitch (n.p),
                    w: Math.max (2, n.d * that.getSixteenthWidth()),
                    h: that.getSemitoneHeight()
                }

                if (boxCollision (noteBounds, lassoBounds))
                    r.push (n);
            }
            
            return r;
        }
        
        // Internal methods
        
        this.removeOverlaps = function (apply) {
            // These are temp attributes to show truncated/removed notes
            // without actually performing the action on notes
            // They are used here when apply is false and in drawNotes()
            for (let n of owner.notes) {
                n.dTemp = undefined;
                n.hidden = undefined;
            }
            
            for (let s of owner.selected.getItems()) {                
                for (let n of owner.notes) {                    
                    if (s == n)
                        continue;
                    
                    if (s.p != n.p)
                        continue;
                                        
                    // If s preceeds n
                    if (s.t <= n.t) {
                        // If s overlaps over n
                        if (n.t < s.t + s.d) {
                            // If n is also selected, we won't remove it
                            if (! n.selected) {
                                if (apply)
                                    owner.removeNote (n);
                                else
                                    n.hidden = true;
                            }
                        }
                    // If n preceeds s
                    } else {
                        // If s overlaps over n, shorten n
                        if (s.t < n.t + n.d) {
                            if (apply)  n.d = s.t - n.t;
                            else        n.dTemp = s.t - n.t;
                        }
                    }
                }
            }
            
            this.repaint();
        }
        
        this.getDragActionForNoteAt = function (pos, n) {
            let margin = 2;
            let noteX = this.getPositionForTime (n.t);
            let noteW = Math.max (2, n.d * this.getSixteenthWidth());
            let localPos = pos.x - noteX;
            
            if (localPos > noteW) return "";
            if (localPos >= noteW - margin) return "RIGHT";
            if (localPos >= margin) return "MOVE";
            if (localPos >= 0) return "LEFT";
            return "";
        }
        
        this.findNoteAt = function(pos) {
            // We need to iterate from end to start to have front most notes first
            for (let i = owner.notes.length; --i >= 0;) {
                let n = owner.notes[i];
                let x = this.getPositionForTime (n.t);
                let y = this.getPositionForPitch (n.p);
                let w = Math.max (2, n.d * this.getSixteenthWidth());
                let h = this.getSemitoneHeight();
                
                if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h)
                    return n;
            }
            
            return undefined;
        }
        
        this.getLockRatio = function() {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let visibleRange = vMax - vMin;
            let sixteenth = this.w / visibleRange;
            
            let ratio = 0;
            
            if (adaptativeMode)  {
                let desiredSpacing = adaptativeValues[adaptativeIndex] * this.h;
                
                ratio = (16 * sign.upper) / sign.lower;

                if (ratio * sixteenth > desiredSpacing) {
                    ratio /= sign.upper;
                    
                    while (sixteenth * ratio > desiredSpacing)
                        ratio /= 2;
                } else {
                    while (sixteenth * ratio * 2 < desiredSpacing)
                        ratio *= 2;
                }
            }
            else if (fixedMode)
                ratio = fixedRatios[fixedIndex];
                        
            return ratio;
        }
        
        this.snapToGrid = function(time) {
            let ratio = this.getLockRatio();
            
            if (ratio > 0)                
                return ratio * (Math.floor (time / ratio));
            
            return time * sixteenth;
        }
        
        // Helpers
        
        this.getSixteenthWidth = function() {
            return this.w / (owner.horizontalRange.max - owner.horizontalRange.min);
        }
        
        this.getSemitoneHeight = function() {
            return this.h / (owner.verticalRange.max - owner.verticalRange.min);
        }
        
        this.getTimeForScreenPos = function(pos) {
            let vMin = owner.horizontalRange.min;
            let sixteenth = this.getSixteenthWidth();
            
            pos -= this.x;              // Local pos
            pos += vMin * sixteenth;    // visible area offset

            return (pos / sixteenth);
        }

        this.getPitchForScreenPos = function(pos) {
            let vMin = owner.verticalRange.min;
            let semi = this.getSemitoneHeight();
            
            pos -= this.y;          // Local position
            pos -= vMin * semi;     // offset for visible area
            pos = this.h - pos;     // Inversion
            pos += semi * 0.5;      // offset to have the 'note' centred
            return (pos / semi);    // Scaling
        }
        
        this.getPositionForTime = function(time) {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let vRange = vMax - vMin;
            let sixteenth = this.w / vRange;
            
            return (time - vMin) * sixteenth;
        }
        
        this.getPositionForPitch = function(pitch) {
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let vRange = vMax - vMin;
            let semiHeight = this.h / vRange;
            
            return this.h - (pitch - vMin) * semiHeight;
        }
    }

    function VerticalRuler(owner) {
        Component.call(this);
        
        let beingDragged = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let zoomSensitivity = 12;
        
        // true if the piano roll is currently being dragged
        let pianoRollIsOn = false;
        let lastPreviewedPitch = -1;
        
        this.display = function(g) {    
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let visibleRange = vMax - vMin;
            let semiHeight = this.h / visibleRange; // height for a single semitone

            // piano roll
            if (semiHeight > minSemiHeight) {      
                g.stroke(0, 10);
                
                for (let i = Math.floor(vMin); i <= Math.ceil(vMax); ++i) {
                    let y = this.h - (i - vMin) * semiHeight;
                    let pitchClass = i % 12;
                    let isBlack = pitchPattern[pitchClass];

                    if (isBlack)   g.fill(0);
                    else           g.fill(255);

                    g.rect (this.w / 2, y - semiHeight, 
                            this.w / 2, semiHeight);
                }

                // left corner
                g.fill(0, 80);
                g.noStroke();
                g.rect(this.w / 2, 0, 1, this.h);
            }

            // Octave labels
            g.noStroke();
            
            for (var i = 0; i < 128; i += 12) {
                if (i >= vMin && i <= vMax) {
                    let y = this.h - (i - vMin) * semiHeight;
                    let txt = "C" + parseInt((i / 12) - 2);
                    g.textSize (10);
                    g.fill(0);
                    g.text (txt, 2, y - 3);
                    g.fill (0, 150);
                    g.rect (0, y, this.w, 1);
                }
            }

            // right corner
            g.fill (0, 150);
            g.noStroke();
            g.rect(this.w - 1, 0, 1, this.h);
        };

        this.mousePressed = function() {
            let semiHeight = grid.getSemitoneHeight();
            
            // If we're not on the piano roll (bc it's hidden or clicking on its left)
            if (semiHeight < minSemiHeight || mouseX < this.x + this.w / 2)
                beingDragged = true;
            // If we're on the piano roll
            else if (semiHeight > minSemiHeight && mouseX > this.x + this.w / 2) {
                let p = Math.round (grid.getPitchForScreenPos (mouseY));

                if (p == lastPreviewedPitch)
                    return;

                pianoRollIsOn = true;
                lastPreviewedPitch = p;
                owner.onPianoRollChange(p);
            }
            
            
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        }
        
        this.doubleClicked = function() {
            owner.verticalRange.min = lowerPitch;
            owner.verticalRange.max = higherPitch;
            
            owner.repaint();
        }
        
        this.zoomIn = function() {
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let range = vMax - vMin;
            let semiHeight = this.h / range;
            
            if (semiHeight < 25) {
                let zoomAmount = range / zoomSensitivity;
                
                owner.verticalRange.min += zoomAmount;
                owner.verticalRange.max -= zoomAmount;
            }
        }
        
        this.zoomOut = function() {
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let range = vMax - vMin;
            let zoomAmount = range / zoomSensitivity;
                
            owner.verticalRange.min -= zoomAmount;
            owner.verticalRange.max += zoomAmount;

            owner.verticalRange.max = Math.min (owner.verticalRange.max,
                                                higherPitch);

            owner.verticalRange.min = Math.max (owner.verticalRange.min,
                                                lowerPitch);
        }
        
        this.translate = function(amount) {
            let vMin = owner.verticalRange.min;
            let vMax = owner.verticalRange.max;
            let range = vMax - vMin;
            let semiHeight = this.h / range;
            
            if (amount < 0) {
                let desiredMin = vMin + amount / semiHeight;
                let clipped = Math.max (desiredMin, lowerPitch);
                let correctAmount = (clipped - desiredMin) + (amount / semiHeight);
                
                owner.verticalRange.min = clipped;
                owner.verticalRange.max += correctAmount;
                
            } else if (amount > 0) {
                let desiredMax = vMax + amount / semiHeight;
                let clipped = Math.min (desiredMax, higherPitch);
                let correctAmount = (clipped - desiredMax) + (amount / semiHeight);
                
                owner.verticalRange.max = clipped;
                owner.verticalRange.min += correctAmount;
                
            }
        }
        
        this.mouseDragged = function() {            
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
                    let p = Math.round (grid.getPitchForScreenPos (mouseY));
                    
                    if (p == lastPreviewedPitch)
                        return;
                    
                    pianoRollIsOn = true;
                    lastPreviewedPitch = p;
                    owner.onPianoRollChange(p);
                }
            }
        }
        
        this.mouseReleased = function() {
            beingDragged = false;
            
            if (pianoRollIsOn) {
                owner.onPianoRollChange (-1);
                pianoRollIsOn = false;                
            }
        }
    }

    function HorizontalRuler(owner) {
        Component.call(this);
        
        let beingDragged = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let zoomSensitivity = 12;
        
        this.display = function(g) {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let visibleRange = vMax - vMin;
            let sixteenth = this.w / visibleRange;
            
            let minLabelSpacing = 50;
            let minGraduationSpacing = 5;
            
            let ratio = 1;
            
            while (sixteenth * ratio < minLabelSpacing)
                ratio *= 2;
            
            let incr = 1;
            
            if (sixteenth * incr < minGraduationSpacing) {
                while (sixteenth * incr < minGraduationSpacing)
                    incr *= 2;
            } else {
                while (sixteenth * incr * 0.5 > minGraduationSpacing)
                    incr *= .5;
            }
                        
            for (let i = 0; i < Math.ceil(vMax); i += incr) {
                let x = (i - vMin) * sixteenth;
                
                if (x < 0)
                    continue;
                
                let gradH = i % (incr * 4) == 0 ? 0.4 : 0.12;
                
                g.noStroke();
                g.fill (0, 100);
                g.rect (x, this.h * (1 - gradH), 1, this.h * gradH);
                
                if (i % ratio == 0) {
                    g.rect (x + 1, this.h * (1 - gradH), 1, 1);
                    g.textSize (10);
                    g.fill(0);
                    g.text (owner.getStringForTime (i, true), x + 4, this.h - 5);
                }                
            }
            
            // Bottom corner
            g.fill (0);
            g.noStroke();
            g.rect(0, this.h - 1, this.w, 1);
        };

        this.mousePressed = function() {
            beingDragged = true;
            
            lastMouseX = mouseX;
            lastMouseY = mouseY;
        }
        
        this.doubleClicked = function() {
            owner.horizontalRange.min = 0;
            owner.horizontalRange.max = lgth;
            
            owner.repaint();
        }
        
        this.zoomIn = function() {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let visibleRange = vMax - vMin;
            let sixteenth = this.w / visibleRange;
            
            if (sixteenth < 500) {
                let zoomAmount = visibleRange / zoomSensitivity;
                
                owner.horizontalRange.min += zoomAmount;
                owner.horizontalRange.max -= zoomAmount;
            }
        }
        
        this.zoomOut = function() {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let visibleRange = vMax - vMin;
            let zoomAmount = visibleRange / zoomSensitivity;
                
            owner.horizontalRange.min -= zoomAmount;
            owner.horizontalRange.max += zoomAmount;

            owner.horizontalRange.max = Math.min (owner.horizontalRange.max,
                                                  lgth);

            owner.horizontalRange.min = Math.max (owner.horizontalRange.min,
                                                  0);
        }
        
        this.translate = function(amount) {
            let vMin = owner.horizontalRange.min;
            let vMax = owner.horizontalRange.max;
            let visibleRange = vMax - vMin;
            let sixteenth = this.w / visibleRange;
            
            if (amount < 0) {
                let desiredMin = vMin + amount / sixteenth;
                let clipped = Math.max (desiredMin, 0);
                let correctAmount = (clipped - desiredMin) + (amount / sixteenth);
                
                owner.horizontalRange.min = clipped;
                owner.horizontalRange.max += correctAmount;
                
            } else if (amount > 0) {
                let desiredMax = vMax + amount / sixteenth;
                let clipped = Math.min (desiredMax, lgth);
                let correctAmount = (clipped - desiredMax) + (amount / sixteenth);
                
                owner.horizontalRange.max = clipped;
                owner.horizontalRange.min += correctAmount;
            }
        }
        
        this.mouseDragged = function() {            
            if (beingDragged) {                
                let xOffset = mouseX - lastMouseX;
                lastMouseX = mouseX;
                this.translate(-xOffset);
                
                let yOffset = mouseY - lastMouseY;
                lastMouseY = mouseY;
                
                if (Math.abs(yOffset) >= 3) {
                    if (yOffset > 0)
                        this.zoomIn();
                    else if (yOffset < 0)
                        this.zoomOut();
                }
                         
                owner.repaint();
            }
        }
        
        this.mouseReleased = function() {
            beingDragged = false;
        }
    }
    
    function VelocityRuler(owner) {
        Component.call (this);
        
        this.display = function(g) {
            // Top border
            g.noStroke();
            g.fill (160);
            g.rect (0, 0, this.w, topBorderHeight);
            
            // Ruler border
            g.fill (0, 100);
            g.rect (this.w - 1, 4, 1, this.h - 4);
            
            // Graduations
            g.fill (0);//, 150);
            g.textSize (10);
            
            // Top grad
            g.rect(this.w - 10, topBorderHeight, 10, 1);
            g.textAlign(RIGHT, TOP);
            g.text("127", this.w - 12, 3);
            
            // Mid grad
            g.rect(this.w - 5, topBorderHeight + (this.h - topBorderHeight) / 2, 5, 1);
            
            // Bottom grad
            g.textAlign(RIGHT, BOTTOM);
            g.text("1", this.w - 12, this.h - 2);
            g.rect(this.w - 10, this.h - 1, 10, 1);
        }
    }
        
    function VelocityTrack(owner) {
        Component.call (this);
        
        this.drawHorizontalBackground = function(g, sixteenth, vMin, vMax) {
            let incr = grid.getLockRatio();
            
            if (incr <= 0)
                return;
                
            let minAlternate = 100;
            let maxAlternate = 200;

            // Measure altern
            let alternate = (16 * sign.upper) / sign.lower;

            // If a measure is too big, try alternating with each beat
            if (alternate * sixteenth > maxAlternate) {
                alternate /= sign.upper;

                // If it's still to big, subdivide beat
                while (alternate * sixteenth > maxAlternate)
                    alternate /= 2;
            } else {
                // If it's too small, multiply measure by 2
                while (alternate * sixteenth < minAlternate)
                    alternate *= 2;
            }                

            g.noStroke();

            for (let i = 0; i < Math.ceil(vMax); i += incr) {
                let x = (i - vMin) * sixteenth;
                
                // Alterning background
                if (i % (alternate * 2) == 0) {
                    g.fill (0, 10);
                    g.rect (x, 0, alternate * sixteenth, this.h);
                }
                
                if (x < 0)
                    continue;

                // Larger lines for measures
                if (i % ((16 * sign.upper) / sign.lower) == 0) {
                    g.fill (0, 120);
                    g.rect (x, 0, 1, this.h);
                }
                // Regular lines
                else if (Math.round(i % incr) == 0) {
                    g.fill (0, 50);
                    g.rect (x, 0, 1, this.h);
                }
            }
        }
        
        this.drawVelocityHandles = function(g, sixteenth, hMin, hMax) {
            let vScale = (this.h - topBorderHeight) / 127;
            
            for (let n of owner.notes) {
                let c = n.selected ? 0 : 120;
                let x = grid.getPositionForTime (n.t);

                if (x < -5 || x > this.w + 5)
                    continue;

                let h = n.v * vScale;
                let y = (this.h - h);

                g.noStroke();
                g.fill (c);
                g.rect(x - 1, y, 2, h);

                g.stroke(c);
                g.strokeWeight(1.8);
                g.fill(255);
                g.ellipse(x, y, 5, 5);
            }
        }
        
        this.display = function(g) {
            // Background
            g.fill (color(255, 100));
            g.noStroke();
            g.rect (0, topBorderHeight, this.w, this.h - topBorderHeight);
            
            // Horizontal
            let hMin = owner.horizontalRange.min;
            let hMax = owner.horizontalRange.max;
            let hRange = hMax - hMin;
            let sixteenth = this.w / hRange;
            
            this.drawHorizontalBackground(g, sixteenth, hMin, hMax);
            
            lasso.drawLasso(g);
            
            this.drawVelocityHandles(g, sixteenth, hMin, hMax);
            
            // Top border
            g.noStroke();
            g.fill (160);
            g.rect (0, 0, this.w, topBorderHeight);
        }
        
        let mouseDownResult = false;
        let previousMouseY = undefined;
        // true if dragging a handle, false if dragging lasso
        let draggingHandle;
                
        this.mousePressed = function(e) {            
            let local = {
                x: mouseX - this.x,
                y: mouseY - this.y
            };
            
            draggingHandle = false;
            previousMouseY = mouseY;
            
            let handle = this.findHandleAt (local);
                        
            if (handle == undefined) {
                if (! keyIsDown (SHIFT))
                    owner.selected.deselectAll();
                
                lasso.beginLasso();
                mouseDownResult = true;
                
                return;
            }
            
            // handle is actually a reference to the note
            owner.moveNoteToFront (handle);
            draggingHandle = true;
                 
            mouseDownResult = owner.selected.addToSelectionMouseDown (handle);
        }
        
        this.mouseReleased = function(e) {
            lasso.endLasso();
            
            owner.selected.addToSelectionMouseUp(e, mouseDownResult);
            
            this.repaint();
        }
        
        this.dragSelectedHandles = function(e) {            
            let vScale = (this.h - topBorderHeight) / 128;
            let dragOffset = mouseY - previousMouseY;
            
            let scaled = dragOffset / vScale;
            
            for (let s of owner.selected.getItems()) {
                s.v -= scaled;
                s.v = Math.min (127, Math.max (1, s.v));
            }
            
            previousMouseY = mouseY;
        }
        
        this.mouseDragged = function(e) {
            if (! e.wasDragged)
                return;
            
        
            if (draggingHandle)
                this.dragSelectedHandles(e);
            else
                lasso.dragLasso();
            
            this.repaint();
        }
        
        this.findHandleAt = function (pos) {
            let vScale = (this.h - topBorderHeight) / 128;
            
            // We need to iterate from end to start to have front most notes first
            for (let i = owner.notes.length; --i >= 0;) {
                let n = owner.notes[i];
                let nx = grid.getPositionForTime (n.t);
                let nh = n.v * vScale;
                let ny = topBorderHeight + that.h - nh;
                let nr = 8;

                if (dist (pos.x, pos.y, nx, ny) < nr)
                    return n;
            }
            
            return undefined;
        }
        
        /* === Lasso selection === */
        
        let lasso = new LassoSelector(this, owner.selected);
                
        function boxCollision (box1, box2) {
            if ((box2.x >= box1.x + box1.w) || (box2.x + box2.w <= box1.x)
                || (box2.y >= box1.y + box1.h) || (box2.y + box2.h <= box1.y))
                return false;
            else
                return true;
        }
        
        let that = this;        
        
        lasso.findAllElementsInLasso = function(lassoBounds) {
            let r = [];
            let vScale = (that.h - topBorderHeight) / 128;
            
            for (let n of owner.notes) {
                let nx = grid.getPositionForTime (n.t);
                let nh = n.v * vScale;
                let ny = topBorderHeight + that.h - nh;
                let nr = 3;

                let noteBounds = {
                    x: nx - nr,
                    y: ny - nr,
                    w: nr * 2,
                    h: nr * 2
                }

                if (boxCollision (noteBounds, lassoBounds))
                    r.push (n);
            }
            
            return r;
        }
    }

    // Children init  
    var grid = new GridArea(this);
    var vRuler = new VerticalRuler(this);
    var hRuler = new HorizontalRuler(this);
    
    var velRuler = new VelocityRuler(this);
    var velTrack = new VelocityTrack(this);
    var velButton = new FoldButton();
        
    velButton.onchange = function(state) {
        vTrackHeight = state ? 80 : 0;
        that.resized();
        that.repaint();
    }
    
    this.addAndMakeVisible (grid);
    this.addAndMakeVisible (vRuler);
    this.addAndMakeVisible (hRuler);
    this.addAndMakeVisible (velTrack);
    this.addAndMakeVisible (velRuler);
    this.addAndMakeVisible (velButton);

    this.resized = function() {
        //vTrackHeight = 0;
        
        let gridHeight = (this.h - hRulerHeight) - vTrackHeight;
        
        hRuler.x = this.x + vRulerWidth;
        hRuler.y = this.y;
        hRuler.w = this.w - vRulerWidth;
        hRuler.h = hRulerHeight;

        vRuler.x = this.x;
        vRuler.y = this.y + hRulerHeight;
        vRuler.w = vRulerWidth;
        vRuler.h = gridHeight;

        grid.x = this.x + vRulerWidth;
        grid.y = this.y + hRulerHeight;
        grid.w = this.w - vRulerWidth;
        grid.h = gridHeight;
        
        if (vTrackHeight > 0) {
            velRuler.visible = true;
            velTrack.visible = true;
            
            let velY = (this.y + this.h) - vTrackHeight;
            
            velRuler.x = this.x;
            velRuler.y = velY;
            velRuler.w = vRulerWidth;
            velRuler.h = vTrackHeight;
            
            
            velTrack.x = this.x + vRulerWidth;
            velTrack.y = velY;
            velTrack.w = this.w - vRulerWidth;
            velTrack.h = vTrackHeight;
        } else {
            velRuler.visible = false;
            velTrack.visible = false;
        }
        
        velButton.x = 4;
        velButton.y = this.h - 14;
        velButton.w = 12;
        velButton.h = 12;
    };

    this.resized();

    this.display = function(g) {
        g.fill (this.bg);
        g.noStroke();
        g.rect (0, 0, this.w, this.h);
    };
    
    // Grid resolution controller
    let listBox;
    
    this.getResolutionListbox = function() {
        listBox = document.createElement ("select");
        
        let sep = document.createElement ("option");
        sep.appendChild (document.createTextNode("Adaptative grid"));
        sep.setAttribute("disabled", true);
        listBox.appendChild (sep);
        
        for (let l of adaptativeLabels) {
            let o = document.createElement ("option");
            o.appendChild (document.createTextNode(l));
            listBox.appendChild (o);
        }
        
        sep = document.createElement ("option");
        sep.appendChild (document.createTextNode("Fixed grid"));
        sep.setAttribute("disabled", true);
        listBox.appendChild (sep);
        
        for (let l of fixedLabels) {
            let o = document.createElement ("option");
            o.appendChild (document.createTextNode(l));
            listBox.appendChild (o);
        }
        
        sep = document.createElement ("option");
        sep.appendChild (document.createTextNode("â”€â”€â”€â”€â”€â”€â”€"));
        sep.setAttribute("disabled", true);
        listBox.appendChild (sep);
        
        let o = document.createElement ("option");
        o.appendChild (document.createTextNode("Off"));
        listBox.appendChild (o);
        
        listBox.addEventListener ("change", this.handleResolutionSelection.bind (this));
        
        listBox.selectedIndex = 3;
        
        return listBox;
    }
    
    this.handleResolutionSelection = function() {        
        let r = listBox.selectedIndex;
        
        if (r <= 0) return;
        
        let firstAdaptIndex = 1;
        let firstFixedIndex = adaptativeLabels.length + 2;
        let offIndex = firstFixedIndex + fixedLabels.length + 1;
        
        if (r == offIndex) {
            adaptativeMode = false;
            fixedMode = false;
        } else if (r <= adaptativeLabels.length) {
            adaptativeIndex = r - firstAdaptIndex;
            adaptativeMode = true;
            fixedMode = false;
        } else {
            fixedIndex = r - firstFixedIndex;
            adaptativeMode = false;
            fixedMode = true;
        }
        
        this.repaint();
    }
    
    // Signature controler
    let signatureDiv;
    let upperInput;
    let lowerInput;
    
    this.getSignatureController = function() {
        signatureDiv = document.createElement ("div");
        
        upperInput = document.createElement ("input");
        upperInput.type = "number";
        upperInput.value = 4;
        upperInput.min = 1;
        upperInput.max = 99;
        upperInput.addEventListener ("change", this.handleUpperSignatureChange.bind (this));
        
        lowerInput = document.createElement ("input");
        lowerInput.type = "number";
        lowerInput.value = 4;
        lowerInput.min = 1;
        lowerInput.max = 16;
        lowerInput.addEventListener ("change", this.handleLowerSignatureChange.bind (this));
        
        signatureDiv.appendChild (upperInput);
        signatureDiv.appendChild (document.createTextNode ("/"));
        signatureDiv.appendChild (lowerInput);
        
        return signatureDiv;
    }
    
    this.handleUpperSignatureChange = function() {
        let v = upperInput.value;
        v = Math.min (Math.max (v, 1), 99);
        upperInput.value = v;
        
        this.setUpperSignature (v);
        
        this.repaint();
    }
    
    this.handleLowerSignatureChange = function() {
        let currentLower = sign.lower;
        let v = lowerInput.value;
        v = Math.min (Math.max (v, 1), 16);
        
        function isAuthorizedValue (v) {
            return v == 1 || v == 2 || v == 4 || v == 8 || v == 16;
        }
        
        if (isAuthorizedValue (v)) {
            this.setLowerSignature(v);
            return;
        }
        
        if (v > currentLower) {
            while (! isAuthorizedValue (v))
                ++v;
        } else {
            while (! isAuthorizedValue (v))
                --v;
        }
        
        this.setLowerSignature(v);
        lowerInput.value = v;
        
        this.repaint();
    }
    
    this.refreshSignatureController = function() {
        upperInput.value = sign.upper;
        lowerInput.value = sign.lower;
    }
    
    // Clip length controller
    let lengthDiv;
    let sixteenthInput;
    let beatInput;
    let measureInput;
    
    this.getLengthController = function() {
        lengthDiv = document.createElement ("div");
        
        sixteenthInput = document.createElement ("input");
        sixteenthInput.type = "number";
        sixteenthInput.value = 0;
        sixteenthInput.min = 0;
        sixteenthInput.max = (16 / sign.lower) - 1;
        sixteenthInput.addEventListener ("change", this.handleLengthChange.bind (this));
        
        beatInput = document.createElement ("input");
        beatInput.type = "number";
        beatInput.value = 0;
        beatInput.min = 0;
        beatInput.max = sign.upper - 1;
        beatInput.addEventListener ("change", this.handleLengthChange.bind (this));
        
        measureInput = document.createElement ("input");
        measureInput.type = "number";
        measureInput.value = 1;
        measureInput.min = 0;
        measureInput.addEventListener ("change", this.handleLengthChange.bind (this));
        
        lengthDiv.appendChild (measureInput);
        lengthDiv.appendChild (beatInput);
        lengthDiv.appendChild (sixteenthInput);
        
        return lengthDiv;
    }
    
    this.refreshLengthController = function() {
        sixteenthInput.max = (16 / sign.lower) - 1;
        beatInput.max = sign.upper - 1;
        
        let mbs = this.getTimeAsMBS (lgth);
        
        measureInput.value = mbs[0];
        beatInput.value = mbs[1];
        sixteenthInput.value = mbs[2];
    }
    
    this.handleLengthChange = function() {
        let m = parseInt(measureInput.value);
        let b = parseInt(beatInput.value);
        let s = parseInt(sixteenthInput.value);
                
        let newLength = ((m * sign.upper + b) * (16 / sign.lower)) + s;
                
        lgth = newLength;       
        
        if (this.horizontalRange.max > newLength)
            this.horizontalRange.max = newLength;
        
        this.repaint();
    }
    
    this.getAsJSON = function() {
        // notes
        let notes = [];
        
        for (let n of this.notes) {
            notes.push ({
                t: n.t,
                p: n.p,
                d: n.d,
                v: n.v                
            });
        }
    
        // current selection
        let selection = [];
        
        for (let s of this.selected.getItems())
            selection.push (this.notes.indexOf (s));
        
        let info = {
            signature: sign,
            length: lgth,
            adaptativeMode: adaptativeMode,
            adaptativeIndex: adaptativeIndex,
            fixedMode: fixedMode,
            fixedIndex: fixedIndex,
            horizontalRange: this.horizontalRange,
            verticalRange: this.verticalRange,
            notes: notes,
            selection: selection
        }
        
        return JSON.stringify (info);
    }
    
    this.restoreFromJSON = function(json) {
        if (json == undefined)
            return;
        
        this.horizontalRange.min = json.horizontalRange.min;
        this.horizontalRange.max = json.horizontalRange.max;
        
        this.verticalRange.min = json.verticalRange.min;
        this.verticalRange.max = json.verticalRange.max;
        
        this.selected.deselectAll();
        this.notes = [];
        
        for (let n of json.notes)
            this.notes.push (new Note (n.t, n.p, n.d, n.v));
                
        for (let s of json.selection)
            this.selected.addToSelection (this.notes[s]);
        
        adaptativeMode = json.adaptativeMode;
        adaptativeIndex = json.adaptativeIndex;
        
        fixedMode = json.fixedMode;
        fixedIndex = json.fixedIndex;
        
        lgth = json.length;
        this.setUpperSignature (json.signature.upper);
        this.setLowerSignature (json.signature.lower);
        
        this.refreshSignatureController();
    }
};