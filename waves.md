---
layout: default
title: Waves
---

# Waves

A space filled with nodes moving in wave ripple patterns. Multiple wave sources create overlapping ripples that propagate organically across the grid.

The waves create a meditative, flowing visualization where nodes respond to the ebb and flow of overlapping wave patterns. Each node's position and opacity are influenced by its distance from multiple wave sources, creating complex, ever-changing patterns.

<div class="waves-comparison">
  <div class="variant">
    <h3>Wave Ripples</h3>
    <p class="variant-description">Nodes move in organic wave patterns with multiple overlapping ripple sources.</p>
    <div class="interactive-header">
      <canvas id="waves-canvas"></canvas>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-waves.js' | relative_url }}"></script>
  </div>

  <div class="variant">
    <h3>Waves to Circles</h3>
    <p class="variant-description">Morphs between wave ripples and concentric circles. Nodes slowly form perfect circles and then transition back to waves in a continuous cycle.</p>
    <div class="interactive-header">
      <canvas id="waves-circles-canvas"></canvas>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-waves-circles.js' | relative_url }}"></script>
  </div>

  <div class="variant">
    <h3>Circle to Line</h3>
    <p class="variant-description">Nodes first form a perfect circle, then line up as a horizontal line. The animation cycles continuously between these states.</p>
    <div class="interactive-header">
      <canvas id="circle-line-canvas"></canvas>
    </div>
    <script src="{{ '/assets/images/2026/2026-01-10-circle-line.js' | relative_url }}"></script>
  </div>
</div>

<style>
.waves-comparison {
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
</style>
