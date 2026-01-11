---
layout: default
title: Breathing Variants Comparison
---

# Breathing Animation Variants

Comparison of different configurations for the breathing animation. Each variant explores a different aspect of the breathing pattern while maintaining consistency with the design system.

<div class="breathing-controls">
  <div class="segmented-control">
    <button class="control-segment active" data-preset="calm">Calm</button>
    <button class="control-segment" data-preset="energy">Energy</button>
  </div>
</div>

<script>
// Breathing exercise presets (make globally available)
// Durations are in seconds - cycleDuration is calculated automatically
window.breathingPresets = {
  calm: {
    expandDuration: 2.4,      // slow breath in (2.4s)
    expandRestDuration: 1.2,  // brief hold (1.2s)
    collapseDuration: 1.2,    // fast breath out (1.2s)
    collapseRestDuration: 1.2  // brief pause (1.2s)
    // Total cycle: 6s
  },
  energy: {
    expandDuration: 0.8,      // fast breath in (0.8s)
    expandRestDuration: 0.8,  // brief hold (0.8s)
    collapseDuration: 1.6,     // slow breath out (1.6s)
    collapseRestDuration: 0.8  // brief pause (0.8s)
    // Total cycle: 4s
  }
};

// Current preset
let currentPreset = 'calm';

// Update all animations with new timing
function updateAllAnimations(preset) {
  currentPreset = preset;
  const timing = breathingPresets[preset];
  
  // Dispatch custom event that all animations can listen to
  // cycleDuration is calculated by each variant from the sum of durations
  window.dispatchEvent(new CustomEvent('breathingPresetChange', {
    detail: timing
  }));
}

// Initialize segmented control
document.addEventListener('DOMContentLoaded', function() {
  const segments = document.querySelectorAll('.control-segment');
  segments.forEach(segment => {
    segment.addEventListener('click', function() {
      // Update active state
      segments.forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      
      // Update animations
      const preset = this.dataset.preset;
      updateAllAnimations(preset);
    });
  });
  
  // Initialize with calm preset
  updateAllAnimations('calm');
  
  // Fullscreen functionality
  const fullscreenButtons = document.querySelectorAll('.fullscreen-btn');
  const enterFullscreenIcon = '<path d="M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z" fill="currentColor"/>';
  const exitFullscreenIcon = '<path d="M5 3h6v1H6v5H5V3zm8 8V9h1v6H8v-1h5V11z" fill="currentColor"/>';
  
  function toggleFullscreen(container) {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      container.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }
  
  function updateFullscreenIcons() {
    const isFullscreen = !!document.fullscreenElement;
    const activeContainer = document.fullscreenElement;
    
    fullscreenButtons.forEach(btn => {
      const container = btn.closest('.interactive-header');
      const svg = btn.querySelector('svg');
      const path = svg.querySelector('path');
      
      if (!path) return;
      
      // Only update icon for the active fullscreen container
      if (isFullscreen && container === activeContainer) {
        path.setAttribute('d', 'M5 3h6v1H6v5H5V3zm8 8V9h1v6H8v-1h5V11z');
      } else {
        path.setAttribute('d', 'M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z');
      }
    });
  }
  
  // Button click handler
  fullscreenButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const canvasId = this.dataset.canvas;
      const canvas = document.getElementById(canvasId);
      const container = canvas.closest('.interactive-header');
      toggleFullscreen(container);
    });
  });
  
  // Double-click/tap to enter fullscreen on canvas
  document.querySelectorAll('.variant .interactive-header canvas').forEach(canvas => {
    let lastClickTime = 0;
    canvas.addEventListener('click', function(e) {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTime;
      
      if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
        // Double click detected
        e.preventDefault();
        const container = canvas.closest('.interactive-header');
        if (!document.fullscreenElement) {
          toggleFullscreen(container);
        }
      }
      lastClickTime = currentTime;
    });
  });
  
  // ESC key to exit fullscreen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  });
  
  // Update button icon based on fullscreen state
  document.addEventListener('fullscreenchange', function() {
    updateFullscreenIcons();
    setupFullscreenAutoHide();
  });
  
  // Auto-hide button in fullscreen after mouse inactivity
  let hideTimeout = null;
  const HIDE_DELAY = 2000; // 2 seconds of inactivity
  
  function setupFullscreenAutoHide() {
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    const isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) {
      // Not in fullscreen, show all buttons
      fullscreenButtons.forEach(btn => {
        btn.style.opacity = '';
      });
      return;
    }
    
    const activeContainer = document.fullscreenElement;
    const activeButton = Array.from(fullscreenButtons).find(btn => 
      btn.closest('.interactive-header') === activeContainer
    );
    
    if (!activeButton) return;
    
    // Show button initially
    activeButton.style.opacity = '1';
    activeButton.style.pointerEvents = 'auto';
    activeContainer.style.cursor = 'default';
    
    function showButton() {
      activeButton.style.opacity = '1';
      activeButton.style.pointerEvents = 'auto';
      activeContainer.style.cursor = 'default';
      
      // Clear existing timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      
      // Hide after delay
      hideTimeout = setTimeout(() => {
        if (document.fullscreenElement === activeContainer) {
          activeButton.style.opacity = '0';
          activeButton.style.pointerEvents = 'none';
          activeContainer.style.cursor = 'none';
        }
      }, HIDE_DELAY);
    }
    
    function handleMouseMove() {
      if (document.fullscreenElement === activeContainer) {
        showButton();
      }
    }
    
    // Listen for mouse movement in fullscreen container
    activeContainer.addEventListener('mousemove', handleMouseMove);
    activeContainer.addEventListener('mouseenter', showButton);
    
    // Initial hide timeout
    hideTimeout = setTimeout(() => {
      if (document.fullscreenElement === activeContainer) {
        activeButton.style.opacity = '0';
        activeButton.style.pointerEvents = 'none';
        activeContainer.style.cursor = 'none';
      }
    }, HIDE_DELAY);
    
    // Clean up on exit fullscreen
    const cleanup = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      activeContainer.removeEventListener('mousemove', handleMouseMove);
      activeContainer.removeEventListener('mouseenter', showButton);
      activeContainer.style.cursor = '';
      document.removeEventListener('fullscreenchange', cleanup);
    };
    
    document.addEventListener('fullscreenchange', cleanup, { once: true });
  }
  
  // Initialize icons
  updateFullscreenIcons();
});
</script>

<div class="breathing-comparison">
  <div class="variant">
    <h3>Variant 01 - Original Baseline</h3>
    <p class="variant-description">Standard configuration: 6s cycle, 24 nodes, standard easing (ease-out power: 2). Nodes expand with random speed variation for organic feel.</p>
    <div class="interactive-header">
      <canvas id="breathing-variant-01-canvas"></canvas>
      <button class="fullscreen-btn" data-canvas="breathing-variant-01-canvas" aria-label="Toggle fullscreen">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-breathing-visual-01.js' | relative_url }}"></script>
  </div>

  <div class="variant">
    <h3>Variant 08 - Synchronized Expansion</h3>
    <p class="variant-description">All nodes expand at exactly the same speed with no variation. Creates a perfectly synchronized, uniform expansion effect.</p>
    <div class="interactive-header">
      <canvas id="breathing-variant-08-canvas"></canvas>
      <button class="fullscreen-btn" data-canvas="breathing-variant-08-canvas" aria-label="Toggle fullscreen">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-breathing-visual-08.js' | relative_url }}"></script>
  </div>

  <div class="variant">
    <h3>Variant 09 - Wave Movement</h3>
    <p class="variant-description">Nodes expand sequentially in a wave pattern around the circle. Each node starts expanding at a slightly different time, creating a ripple or wave propagation effect.</p>
    <div class="interactive-header">
      <canvas id="breathing-variant-09-canvas"></canvas>
      <button class="fullscreen-btn" data-canvas="breathing-variant-09-canvas" aria-label="Toggle fullscreen">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-breathing-visual-09.js' | relative_url }}"></script>
  </div>

  <div class="variant">
    <h3>Variant 10 - Smooth Wave</h3>
    <p class="variant-description">Nodes expand with smooth sin-based speed variation creating a continuous wave pattern around the circle. No discrete groups or fixed speeds - just a smooth, organic wave that flows around like flower petals opening and closing.</p>
    <div class="interactive-header">
      <canvas id="breathing-variant-10-canvas"></canvas>
      <button class="fullscreen-btn" data-canvas="breathing-variant-10-canvas" aria-label="Toggle fullscreen">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2h4v1H3v3H2V2zm8 0V1h4v4h-1V3h-3V2zM2 14v-4h1v3h3v1H2zm12 0h-4v-1h3v-3h1v4z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-breathing-visual-10.js' | relative_url }}"></script>
  </div>
</div>

<style>
.breathing-controls {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.segmented-control {
  display: inline-flex;
  background: #313244;
  border-radius: 6px;
  padding: 4px;
  gap: 4px;
}

.control-segment {
  padding: 8px 24px;
  border: none;
  background: transparent;
  color: #6c7086;
  font-size: 0.875rem;
  font-weight: 400;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.control-segment:hover {
  color: #bac2de;
}

.control-segment.active {
  background: #45475a;
  color: #bac2de;
}

.breathing-comparison {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-top: 2rem;
}

.variant {
  margin-bottom: 2rem;
}

.variant h3 {
  font-size: 1rem;
  font-weight: 400;
  color: #bac2de;
  margin-bottom: 0.5rem;
}

.variant-description {
  font-size: 0.875rem;
  color: #6c7086;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.variant .interactive-header {
  position: relative;
}

.variant .interactive-header canvas {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
  aspect-ratio: 1200/638;
}

.fullscreen-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(49, 50, 68, 0.8);
  border: 1px solid rgba(108, 112, 134, 0.3);
  border-radius: 4px;
  padding: 8px;
  color: #bac2de;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
  z-index: 10;
  pointer-events: none;
}

.variant .interactive-header:hover .fullscreen-btn,
.fullscreen-btn:hover {
  opacity: 1;
  pointer-events: auto;
}

.fullscreen-btn:hover {
  background: rgba(49, 50, 68, 0.95);
  color: #cdd6f4;
  border-color: rgba(108, 112, 134, 0.5);
}

.fullscreen-btn:active {
  transform: scale(0.95);
}

/* Fullscreen styles */
.variant .interactive-header:fullscreen {
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.variant .interactive-header:fullscreen canvas {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.variant .interactive-header:fullscreen .fullscreen-btn {
  opacity: 1;
  pointer-events: auto;
}

@media (min-width: 1200px) {
  .breathing-comparison {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
