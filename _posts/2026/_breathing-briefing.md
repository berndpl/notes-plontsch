# Breathing Animation Style Guide & Implementation Brief

## Overview
This document provides a comprehensive guide for creating consistent breathing animation variants. It extracts the design system, technical patterns, and best practices from the existing breathing animation implementations.

## Visual Style

### Design Philosophy
- **Minimal & Clean**: Plain nodes, no glow effects, no shadows
- **Organic Motion**: Breathing-like expansion and collapse with organic easing
- **Subtle Interaction**: Hover states provide gentle feedback without distraction
- **Consistent with Site**: Matches Catppuccin Mocha color scheme
- **Transparent Background**: Canvas background is transparent in normal view, black in fullscreen

### Canvas Specifications
- **Dimensions**: 1200 × 638 pixels (standard aspect ratio: 1200/638)
- **Background (Normal)**: Transparent (matches page background)
- **Background (Fullscreen)**: `#000000` (full black)
- **Frame Rate**: ~60fps (time increment: 0.016 per frame)
- **Aspect Ratio**: Maintained via CSS `aspect-ratio: 1200/638`

## Color Palette

### Catppuccin Mocha Color Scheme
```javascript
const colors = {
    lavender: '#b4befe',    // Primary accent, center node
    blue: '#89b4fa',
    sapphire: '#74c7ec',
    sky: '#89dceb',
    teal: '#94e2d5',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    peach: '#fab387',
    maroon: '#eba0ac',
    red: '#f38ba8',
    mauve: '#cba6f7',
    pink: '#f5c2e7',
    rosewater: '#f5e0dc',
    overlay0: '#6c7086',    // For subtle UI elements
    surface0: '#313244'     // For surfaces
};
```

### Node Color Selection
- **Center Node**: `lavender` (#b4befe)
- **Exploration Nodes**: Rotate through palette: `blue`, `sapphire`, `sky`, `teal`, `green`, `lavender`, `mauve`, `pink`
- **Connecting Lines**: `rgba(180, 190, 254, 0.2)` (lavender at 20% opacity)

## Animation Structure

### Cycle Phases
The animation follows a breathing pattern with four distinct phases:

1. **Expansion (Inhale)**: Configurable duration
   - Nodes expand from center to maximum radius
   - Uses asymmetric easing with strong ease-out for slower settling

2. **Expand Rest**: Configurable duration
   - Nodes hold at maximum radius

3. **Collapse (Exhale)**: Configurable duration
   - Nodes collapse back to center
   - Uses symmetric breathing ease

4. **Collapse Rest**: Configurable duration
   - All nodes at center (pause before next cycle)

### Timing Configuration
```javascript
// Durations are in absolute seconds (not fractions)
expandDuration: 2.4,        // slow breath in
expandRestDuration: 1.2,   // brief hold
collapseDuration: 1.2,      // fast breath out
collapseRestDuration: 1.2, // brief pause

// cycleDuration is calculated automatically:
cycleDuration = expandDuration + expandRestDuration + collapseDuration + collapseRestDuration;

// Phase boundaries (calculated as fractions of cycle)
expandEnd = expandDuration / cycleDuration;
expandRestEnd = (expandDuration + expandRestDuration) / cycleDuration;
collapseEnd = (expandDuration + expandRestDuration + collapseDuration) / cycleDuration;
collapseRestEnd = 1.0; // Always 1.0 (end of cycle)
```

### Breathing Presets
Two presets are available for different breathing exercises:

**Calm** (slow in, fast out):
```javascript
{
    expandDuration: 2.4,      // slow breath in
    expandRestDuration: 1.2,  // brief hold
    collapseDuration: 1.2,   // fast breath out
    collapseRestDuration: 1.2  // brief pause
    // Total cycle: 6s
}
```

**Energy** (fast in, slow out):
```javascript
{
    expandDuration: 0.8,      // fast breath in
    expandRestDuration: 0.8,  // brief hold
    collapseDuration: 1.6,     // slow breath out
    collapseRestDuration: 0.8  // brief pause
    // Total cycle: 4s
}
```

## Easing Functions

### Expansion Ease (Asymmetric)
- **Ease-In Power**: 5 (strong acceleration at start)
- **Ease-Out Power**: 2 (slower settling at end)
- Creates organic, breathing-like expansion with slower settling

```javascript
function expansionEase(t) {
    if (t < 0.5) {
        return Math.pow(2 * t, expansionEaseInPower) / 2;  // Strong ease-in
    } else {
        return 1 - Math.pow(-2 * t + 2, expansionEaseOutPower) / 2;  // Slower ease-out
    }
}
```

### Collapse Ease (Symmetric)
- **Power**: 4 (quartic)
- Creates smooth, symmetric collapse

```javascript
function breathingEase(t) {
    return t < 0.5 
        ? 8 * t * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
```

## Node Configuration

### Physical Properties
- **Number of Nodes**: 24 exploration nodes + 1 center node (configurable)
- **Base Node Size**: 5px radius
- **Active/Hover Size**: 7px radius
- **Hover Detection Radius**: nodeSize + 5px
- **Max Exploration Radius**: 280px from center
- **Min Exploration Radius**: 0px (center)

### Motion Characteristics

#### Variant 01 - Random Speed Variation
- **Speed Variation**: 8% per-node variation during expansion
  - Creates organic, non-uniform expansion
  - Offsets are normalized per cycle to maintain consistent timing
  - Variation blends out smoothly at 80% of expansion phase
- **Synchronized Collapse**: All nodes collapse together (no speed variation)

#### Variant 08 - Synchronized
- All nodes expand at exactly the same speed
- No variation in timing

#### Variant 09 - Wave Movement
- Nodes expand sequentially in a wave pattern
- Each node starts at a different time based on its position around the circle
- Creates a ripple or wave propagation effect

#### Variant 10 - Smooth Wave
- Nodes expand with smooth sin-based speed variation
- Continuous wave pattern around the circle
- No discrete groups or fixed speeds

### Visual Properties
- **Opacity**: Full opacity (1.0) for all nodes
- **Line Opacity**: 20% of node opacity (0.2)
- **No Fading**: Nodes maintain full visibility throughout cycle

## Background Color Transition

### Implementation Pattern
The canvas background transitions smoothly between transparent (normal view) and black (fullscreen):

```javascript
// Background color transition variables
let bgAlpha = 0; // 0 = transparent, 1 = black
const colorTransitionSpeed = 0.05; // Speed of alpha interpolation

function draw() {
    // Update background alpha based on fullscreen state
    const isFullscreen = document.fullscreenElement !== null;
    const targetAlpha = isFullscreen ? 1 : 0;
    
    // Smoothly transition alpha
    if (Math.abs(bgAlpha - targetAlpha) > 0.01) {
        if (bgAlpha < targetAlpha) {
            bgAlpha = Math.min(1, bgAlpha + colorTransitionSpeed);
        } else {
            bgAlpha = Math.max(0, bgAlpha - colorTransitionSpeed);
        }
    } else {
        bgAlpha = targetAlpha;
    }
    
    // Clear canvas every frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill background if alpha > 0
    if (bgAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // ... rest of drawing code
}
```

## Dynamic Timing Updates

### Preset Change Event
All variants listen for preset changes via a custom event:

```javascript
// Update timing from preset
function updateTiming(timing) {
    expandDuration = timing.expandDuration;
    expandRestDuration = timing.expandRestDuration;
    collapseDuration = timing.collapseDuration;
    collapseRestDuration = timing.collapseRestDuration;
    
    cycleDuration = expandDuration + expandRestDuration + collapseDuration + collapseRestDuration;
    
    // Recalculate phase boundaries as fractions of the new cycleDuration
    expandEnd = expandDuration / cycleDuration;
    expandRestEnd = (expandDuration + expandRestDuration) / cycleDuration;
    collapseEnd = (expandDuration + expandRestDuration + collapseDuration) / cycleDuration;
    collapseRestEnd = 1.0;
    
    // Reset cycle to avoid jumps
    currentCycle = -1;
}

// Listen for preset changes
window.addEventListener('breathingPresetChange', function(event) {
    updateTiming(event.detail);
});

// Initialize with default timing
if (window.breathingPresets) {
    updateTiming(window.breathingPresets.calm);
}
```

## Interaction Design

### Hover Behavior
- **Detection**: Mouse position checked against node radius + 5px buffer
- **Visual Feedback**: Node size increases from 5px to 7px
- **Redraw Strategy**: Only redraws when hover state changes (performance optimization)
- **Coordinate Scaling**: Mouse coordinates scaled to match canvas resolution

### Mouse Events
- `mousemove`: Updates hover state, redraws if changed
- `mouseleave`: Clears hover state, redraws

## Fullscreen Functionality

### Implementation Requirements
1. **Fullscreen Button**: Positioned in top-right corner of canvas
2. **Auto-hide**: Button and cursor hide after 2 seconds of mouse inactivity in fullscreen
3. **Double-click**: Double-click/tap canvas to enter fullscreen
4. **ESC Key**: Press ESC to exit fullscreen
5. **Icon Update**: Button icon changes based on fullscreen state

### CSS Requirements
```css
.variant .interactive-header:fullscreen {
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}
```

## Technical Implementation

### Animation Loop
- Uses `requestAnimationFrame` for smooth 60fps animation
- Time increments by 0.016 per frame (~60fps)
- Phase calculated as `(time % cycleDuration) / cycleDuration`

### Cycle Management
- Tracks current cycle number to regenerate random speed offsets (if applicable)
- Speed offsets recalculated at start of each cycle
- Offsets normalized to average 0 (maintains cycle duration)

### Rendering Order
1. Clear canvas with `ctx.clearRect()`
2. Draw background (if alpha > 0)
3. Draw connecting lines (from center to nodes)
4. Draw all nodes (center first, then exploration nodes)

### Phase Calculation
```javascript
function getPhase(t) {
    const phase = (t % cycleDuration) / cycleDuration;
    const cycleNumber = Math.floor(t / cycleDuration);
    
    // Regenerate offsets at start of new cycle (if using random variation)
    if (cycleNumber !== currentCycle) {
        currentCycle = cycleNumber;
        // ... regenerate offsets
    }
    
    return phase;
}
```

### Radius Calculation
```javascript
function getExplorationRadius(phase) {
    if (phase < expandEnd) {
        // Expansion phase
        const p = phase / expandEnd;
        const eased = expansionEase(p);
        return maxExplorationRadius * eased;
    } else if (phase < expandRestEnd) {
        // Hold at max
        return maxExplorationRadius;
    } else if (phase < collapseEnd) {
        // Collapse phase
        const collapsePhaseDuration = collapseEnd - expandRestEnd;
        const p = (phase - expandRestEnd) / collapsePhaseDuration;
        const eased = breathingEase(p);
        return maxExplorationRadius * (1 - eased);
    } else {
        // At center
        return 0;
    }
}
```

## Code Structure Template

### IIFE Pattern
All variants use an IIFE (Immediately Invoked Function Expression) to avoid global scope pollution:

```javascript
(function() {
    'use strict';
    
    function initBreathing() {
        const canvas = document.getElementById('breathing-variant-XX-canvas');
        if (!canvas) {
            console.warn('Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context');
            return;
        }
        
        canvas.width = 1200;
        canvas.height = 638;
        
        // ... rest of implementation
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBreathing);
    } else {
        initBreathing();
    }
})();
```

## Design Principles for Future Animations

### Consistency Guidelines
1. **Color Scheme**: Always use Catppuccin Mocha palette
2. **Background**: Transparent in normal view, black in fullscreen
3. **Canvas Size**: 1200×638 for header images
4. **Minimal Style**: No glows, shadows, or heavy effects
5. **Organic Motion**: Use easing functions for natural movement
6. **Subtle Interaction**: Hover states should be gentle and non-distracting
7. **Dynamic Timing**: Support preset changes via `breathingPresetChange` event
8. **Fullscreen Support**: Implement fullscreen with auto-hide button

### Easing Guidelines
- Use asymmetric easing for expansion (stronger ease-out)
- Use symmetric easing for collapse
- Adjust power values to control acceleration/deceleration
- Test timing to ensure breathing-like, organic feel

### Node Design Guidelines
- Keep node sizes small (5-7px)
- Use full opacity unless specific fade effect needed
- Connect nodes to center with subtle lines (20% opacity)
- Vary node speeds for organic feel (or synchronize for uniform effect)
- Consider wave patterns for visual interest

### Performance Considerations
- Clear canvas every frame with `ctx.clearRect()`
- Only redraw on state changes (hover, not every frame if possible)
- Use requestAnimationFrame for smooth animation
- Scale mouse coordinates properly for responsive canvas
- Consider visibility API for pausing when page hidden

## File Organization

### Variant Files
- Location: `/assets/images/2026/breathing/`
- Naming: `variant-XX.js` (where XX is the variant number)
- Format: IIFE with canvas ID matching pattern: `breathing-variant-XX-canvas`

### Post File
- Location: `/_posts/2026/`
- Naming: `2026-01-10-breathing.md` (or appropriate date)
- Structure: Includes HTML, CSS, and JavaScript for the comparison page

## Common Patterns

### Node Position Calculation
```javascript
function getNodePositions(phase) {
    const positions = [];
    const angleStep = (Math.PI * 2) / numExplorationNodes;
    
    // Center node
    positions.push({
        x: centerX,
        y: centerY,
        angle: 0,
        radius: 0,
        color: colors.lavender,
        index: -1,
        isCenter: true
    });
    
    // Exploration nodes
    for (let i = 0; i < numExplorationNodes; i++) {
        const radius = getNodeRadius(phase, i);
        const angle = angleStep * i;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        positions.push({
            x,
            y,
            angle,
            radius,
            color: nodeColors[i % nodeColors.length],
            index: i,
            isCenter: false,
            opacity: 1
        });
    }
    
    return positions;
}
```

### Drawing Functions
```javascript
function drawNode(ctx, x, y, size, color, opacity = 1) {
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawLines(nodes) {
    const centerNode = nodes.find(n => n.isCenter);
    if (!centerNode) return;
    
    nodes.forEach(node => {
        if (node.isCenter) return;
        
        const lineOpacity = (node.opacity || 1) * 0.2;
        ctx.strokeStyle = `rgba(180, 190, 254, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerNode.x, centerNode.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
    });
}
```

## Testing Checklist

When creating a new variant, ensure:

- [ ] Canvas dimensions are 1200×638
- [ ] Background is transparent in normal view
- [ ] Background transitions to black in fullscreen
- [ ] Smooth background transition (no jumps)
- [ ] Preset changes update timing correctly
- [ ] Cycle completes without jumps or glitches
- [ ] Hover states work correctly
- [ ] Fullscreen button appears and functions
- [ ] Double-click enters fullscreen
- [ ] ESC exits fullscreen
- [ ] Button auto-hides in fullscreen
- [ ] Colors match Catppuccin Mocha palette
- [ ] Animation runs at smooth 60fps
- [ ] No console errors

## Configuration Parameters Summary

```javascript
// Timing (configurable via presets)
expandDuration: 2.4
expandRestDuration: 1.2
collapseDuration: 1.2
collapseRestDuration: 1.2
cycleDuration: calculated from sum

// Easing
expansionEaseInPower: 5
expansionEaseOutPower: 2

// Nodes
numExplorationNodes: 24
maxExplorationRadius: 280
minExplorationRadius: 0
nodeSize: 5
activeNodeSize: 7
nodeSpeedVariation: 0.08 (8%) // for random variation

// Canvas
width: 1200
height: 638
background: transparent (normal), #000000 (fullscreen)

// Background transition
colorTransitionSpeed: 0.05
```

## Usage Notes

- Animation initializes when DOM is ready
- Requires canvas element with id matching pattern: `breathing-variant-XX-canvas`
- Self-contained IIFE (Immediately Invoked Function Expression)
- No external dependencies beyond standard Canvas API
- Listens for `breathingPresetChange` event for dynamic timing updates
- Listens for `fullscreenchange` event for background transitions
