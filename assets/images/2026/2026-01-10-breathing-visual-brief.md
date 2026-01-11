# Deep Exploration Animation - Design Brief

## Overview
This document extracts the design system, configuration, and style guidelines from the Deep Exploration animation to enable consistent creation of future animation sequences.

## Visual Style

### Design Philosophy
- **Minimal & Clean**: Plain nodes, no glow effects, no shadows
- **Organic Motion**: Breathing-like expansion and collapse with organic easing
- **Subtle Interaction**: Hover states provide gentle feedback without distraction
- **Consistent with Site**: Matches Catppuccin Mocha color scheme and page background

### Canvas Specifications
- **Dimensions**: 1200 × 638 pixels (matches header image size)
- **Background**: `#1e1e2e` (Catppuccin Mocha base - matches page background)
- **Frame Rate**: ~60fps (time increment: 0.016 per frame)

## Color Palette

### Catppuccin Mocha Color Scheme
```javascript
{
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
}
```

### Node Color Selection
- **Center Node**: `lavender` (#b4befe)
- **Exploration Nodes**: Rotate through palette: `blue`, `sapphire`, `sky`, `teal`, `green`, `lavender`, `mauve`, `pink`
- **Connecting Lines**: `rgba(180, 190, 254, 0.2)` (lavender at 20% opacity)

## Animation Structure

### Cycle Phases
The animation follows a breathing pattern with four distinct phases:

1. **Expansion (Inhale)**: 30% of cycle duration
   - Nodes expand from center to maximum radius
   - Uses asymmetric easing with strong ease-out for slower settling

2. **Expand Rest**: 30% of cycle duration
   - Nodes hold at maximum radius

3. **Collapse (Exhale)**: 20% of cycle duration
   - Nodes collapse back to center
   - Uses symmetric breathing ease

4. **Collapse Rest**: 0% of cycle duration (immediate restart)
   - All nodes at center (instant transition to next cycle)

### Timing Configuration
```javascript
cycleDuration = 6 seconds

expandDuration = 0.3        // 30% of cycle
expandRestDuration = 0.3    // 30% of cycle
collapseDuration = 0.2       // 20% of cycle
collapseRestDuration = 0.0   // 0% of cycle (immediate restart)
// Total = 1.0 (100% of cycle)
```

## Easing Functions

### Expansion Ease (Asymmetric)
- **Ease-In Power**: 5 (strong acceleration at start)
- **Ease-Out Power**: 2 (slower settling at end)
- Creates organic, breathing-like expansion with slower settling

```javascript
function expansionEase(t) {
    if (t < 0.5) {
        return Math.pow(2 * t, 5) / 2;  // Strong ease-in
    } else {
        return 1 - Math.pow(-2 * t + 2, 2) / 2;  // Slower ease-out
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
- **Number of Nodes**: 24 exploration nodes + 1 center node
- **Base Node Size**: 5px radius
- **Active/Hover Size**: 7px radius
- **Hover Detection Radius**: nodeSize + 5px
- **Max Exploration Radius**: 280px from center
- **Min Exploration Radius**: 0px (center)

### Motion Characteristics
- **Speed Variation**: 8% per-node variation during expansion
  - Creates organic, non-uniform expansion
  - Offsets are normalized per cycle to maintain consistent timing
  - Variation blends out smoothly at 80% of expansion phase
- **Synchronized Collapse**: All nodes collapse together (no speed variation)

### Visual Properties
- **Opacity**: Full opacity (1.0) for all nodes
- **Line Opacity**: 20% of node opacity (0.2)
- **No Fading**: Nodes maintain full visibility throughout cycle

## Interaction Design

### Hover Behavior
- **Detection**: Mouse position checked against node radius + 5px buffer
- **Visual Feedback**: Node size increases from 5px to 7px
- **Redraw Strategy**: Only redraws when hover state changes (performance optimization)
- **Coordinate Scaling**: Mouse coordinates scaled to match canvas resolution

### Mouse Events
- `mousemove`: Updates hover state, redraws if changed
- `mouseleave`: Clears hover state, redraws

## Technical Implementation

### Animation Loop
- Uses `requestAnimationFrame` for smooth 60fps animation
- Time increments by 0.016 per frame (~60fps)
- Phase calculated as `(time % cycleDuration) / cycleDuration`

### Cycle Management
- Tracks current cycle number to regenerate random speed offsets
- Speed offsets recalculated at start of each cycle
- Offsets normalized to average 0 (maintains cycle duration)

### Rendering Order
1. Clear canvas with background color
2. Draw connecting lines (from center to nodes)
3. Draw all nodes (center first, then exploration nodes)

## Design Principles for Future Animations

### Consistency Guidelines
1. **Color Scheme**: Always use Catppuccin Mocha palette
2. **Background**: Match page background (#1e1e2e)
3. **Canvas Size**: 1200×638 for header images
4. **Minimal Style**: No glows, shadows, or heavy effects
5. **Organic Motion**: Use easing functions for natural movement
6. **Subtle Interaction**: Hover states should be gentle and non-distracting

### Easing Guidelines
- Use asymmetric easing for expansion (stronger ease-out)
- Use symmetric easing for collapse
- Adjust power values to control acceleration/deceleration
- Test timing to ensure breathing-like, organic feel

### Node Design Guidelines
- Keep node sizes small (5-7px)
- Use full opacity unless specific fade effect needed
- Connect nodes to center with subtle lines (20% opacity)
- Vary node speeds slightly for organic feel
- Synchronize collapse for visual cohesion

### Performance Considerations
- Only redraw on state changes (hover, not every frame if possible)
- Use requestAnimationFrame for smooth animation
- Scale mouse coordinates properly for responsive canvas
- Consider visibility API for pausing when page hidden

## Configuration Parameters Summary

```javascript
// Timing
cycleDuration: 6 seconds
expandDuration: 0.3
expandRestDuration: 0.3
collapseDuration: 0.2
collapseRestDuration: 0.0

// Easing
expansionEaseInPower: 5
expansionEaseOutPower: 2

// Nodes
numExplorationNodes: 24
maxExplorationRadius: 280
minExplorationRadius: 0
nodeSize: 5
activeNodeSize: 7
nodeSpeedVariation: 0.08 (8%)

// Canvas
width: 1200
height: 638
background: '#1e1e2e'
```

## Usage Notes

- Animation initializes when DOM is ready
- Requires canvas element with id: `deep-exploration-canvas`
- Self-contained IIFE (Immediately Invoked Function Expression)
- No external dependencies beyond standard Canvas API
