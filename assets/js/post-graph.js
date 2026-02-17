// Post Graph — "Emerging Themes"
//
// Circular layout where nodes represent posts, colored by year-theme.
// Nodes start in chronological order around the circle, then slowly
// drift into theme-grouped sectors over ~20 seconds — themes emerge
// organically from the timeline.
//
// Cross-connections: curved lines linking temporally close posts across
// different theme groups. Within-theme connections arc along the rim.
// Slow global rotation, individual breathing. No click interactivity.
//
// 4px dots, no glow, Catppuccin Mocha palette on #1e1e2e base.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  function initGraph() {
    const canvas = document.getElementById('post-graph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    /* ── Canvas sizing ─────────────────────────────────────────── */
    function resize() {
      canvas.width = container.clientWidth;
      canvas.height = 300;
    }
    resize();
    window.addEventListener('resize', () => { resize(); computePositions(); });

    /* ── Palette — Catppuccin Mocha ─────────────────────────────── */
    const base = '#1e1e2e';
    // One colour per year-theme (order: 2017, 2023, 2024, 2025, 2026+)
    const themeColors = [
      '#cba6f7',   // 2017 — mauve
      '#f9e2af',   // 2023 — yellow
      '#89b4fa',   // 2024 — blue
      '#a6e3a1',   // 2025 — green
      '#fab387',   // 2026 — peach
    ];

    function hexToRgb(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m
        ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
        : { r: 180, g: 190, b: 254 };
    }

    /* ── Parse posts from DOM ──────────────────────────────────── */
    const posts = Array.from(
      document.querySelectorAll('.posts li:not(.year-separator)')
    ).map((li) => {
      const link = li.querySelector('a');
      const time = li.querySelector('time');
      return {
        title: link ? link.textContent.trim() : '',
        url: link ? link.href : '',
        date: time ? new Date(time.getAttribute('datetime')) : new Date(),
      };
    });

    if (posts.length === 0) return;

    /* ── Theme assignment (by year) ────────────────────────────── */
    const yearBuckets = ['2017', '2023', '2024', '2025', '2026'];

    function themeIndex(date) {
      const y = date.getFullYear().toString();
      const idx = yearBuckets.indexOf(y);
      return idx >= 0 ? idx : yearBuckets.length - 1;
    }

    /* ── Build nodes ───────────────────────────────────────────── */
    const NODE_R = 2.5;
    const nodes = posts.map((p, i) => {
      const ti = themeIndex(p.date);
      return {
        ...p,
        theme: ti,
        color: themeColors[ti],
        rgb: hexToRgb(themeColors[ti]),
        chronoAngle: 0,
        themeAngle: 0,
        currentAngle: 0,
        x: 0, y: 0,
        // Deterministic sine phase spread evenly across nodes
        phase: (i / posts.length) * Math.PI * 2,
        breatheFreq: 0.3,
        breatheRadial: 1.5,
        breatheAngular: 0.002,
        opacity: 1,
      };
    });

    /* ── Build edges ─────────────────────────────────────────────
       Cross-theme: posts < 90 days apart, different themes.
       Within-theme: all pairs in same theme. ─────────────────── */
    const edges = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const daysDiff = Math.abs((a.date - b.date) / 864e5);
        const sameTheme = a.theme === b.theme;

        if (sameTheme) {
          edges.push({
            i, j, cross: false,
            strength: Math.max(0.15, 1 - daysDiff / 365),
          });
        } else if (daysDiff <= 90) {
          edges.push({
            i, j, cross: true,
            strength: 1 - daysDiff / 90,
          });
        }
      }
    }

    /* ── Layout computation ────────────────────────────────────── */
    let cx, cy, circleR;

    function computePositions() {
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      circleR = Math.min(canvas.width * 0.38, canvas.height * 0.4);

      const n = nodes.length;

      // 1) Chronological angles — evenly spaced, starting at top
      const chronoOrder = nodes.slice().sort((a, b) => a.date - b.date);
      chronoOrder.forEach((node, ci) => {
        node.chronoAngle = (ci / n) * Math.PI * 2 - Math.PI / 2;
      });

      // 2) Theme-grouped angles — each theme gets a proportional arc
      //    sector with small gaps between groups.
      const themeGroups = {};
      nodes.forEach((node) => {
        if (!themeGroups[node.theme]) themeGroups[node.theme] = [];
        themeGroups[node.theme].push(node);
      });

      const themeKeys = Object.keys(themeGroups).sort((a, b) => a - b);
      const gapAngle = 0.12;
      const totalGap = gapAngle * themeKeys.length;
      const availableAngle = Math.PI * 2 - totalGap;

      let cursor = -Math.PI / 2;

      themeKeys.forEach((tk) => {
        const group = themeGroups[tk];
        group.sort((a, b) => a.date - b.date);
        const sectorAngle = (group.length / n) * availableAngle;

        group.forEach((node, gi) => {
          const t = group.length > 1 ? gi / (group.length - 1) : 0.5;
          node.themeAngle = cursor + t * sectorAngle;
        });

        cursor += sectorAngle + gapAngle;
      });

      // 3) Title-alphabetical angles
      const alphaOrder = nodes.slice().sort((a, b) => a.title.localeCompare(b.title));
      alphaOrder.forEach((node, ai) => {
        node.alphaAngle = (ai / n) * Math.PI * 2 - Math.PI / 2;
      });

      // 4) Seasonal — by month+day (ignoring year), Jan→Dec
      const seasonalOrder = nodes.slice().sort((a, b) => {
        const ma = a.date.getMonth() * 31 + a.date.getDate();
        const mb = b.date.getMonth() * 31 + b.date.getDate();
        return ma - mb;
      });
      seasonalOrder.forEach((node, si) => {
        node.seasonalAngle = (si / n) * Math.PI * 2 - Math.PI / 2;
      });

      // 5) Length — by title character count (short→long)
      const lengthOrder = nodes.slice().sort((a, b) => a.title.length - b.title.length);
      lengthOrder.forEach((node, li) => {
        node.lengthAngle = (li / n) * Math.PI * 2 - Math.PI / 2;
      });

      // 6) Shuffle — random positions, re-randomised each computation
      const shuffled = nodes.slice();
      for (let si = shuffled.length - 1; si > 0; si--) {
        const sj = Math.floor(Math.random() * (si + 1));
        [shuffled[si], shuffled[sj]] = [shuffled[sj], shuffled[si]];
      }
      shuffled.forEach((node, ri) => {
        node.shuffleAngle = (ri / n) * Math.PI * 2 - Math.PI / 2;
      });

      // 7) Density — posts with more temporal neighbours first
      const densityScores = nodes.map((node) => {
        let score = 0;
        nodes.forEach((other) => {
          if (other === node) return;
          const days = Math.abs((node.date - other.date) / 864e5);
          if (days < 60) score += 1 - days / 60;
        });
        return { node, score };
      });
      densityScores.sort((a, b) => b.score - a.score);
      densityScores.forEach(({ node }, di) => {
        node.densityAngle = (di / n) * Math.PI * 2 - Math.PI / 2;
      });
    }

    computePositions();

    /* ── Animation — cycling between randomised orderings ──────
       Tap/click canvas to manually trigger next transition.
       Order of states is shuffled. First transition after 3s. ── */
    let time = 0;
    const ROTATION_SPEED = 0.006;
    const TRANSITION_SEC = 12;
    const HOLD_SEC = 6;

    // Shuffle ordering sequence so it's not always the same
    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // All available ordering keys + single-word display labels
    const orderingKeys = ['chrono', 'theme', 'alpha', 'seasonal', 'length', 'scatter', 'density'];
    const orderingLabels = {
      chrono:   'Timeline',
      theme:    'Themes',
      alpha:    'Alphabetical',
      seasonal: 'Seasonal',
      length:   'Length',
      scatter:  'Scatter',
      density:  'Density',
    };
    // Always start with Timeline, then shuffle the rest
    let orderSequence = ['chrono'].concat(shuffleArray([...orderingKeys.filter(k => k !== 'chrono')]));

    // Toast overlay — matches self-learning-systems style:
    // top-centered, Inconsolata 1rem, overlay0 (#6c7086), aria-live.
    let toastTimeout = null;
    const toastEl = document.createElement('div');
    toastEl.setAttribute('aria-live', 'polite');
    Object.assign(toastEl.style, {
      position: 'absolute',
      top: '0.75rem',
      left: '0.75rem',
      fontFamily: "'Inconsolata', monospace",
      fontSize: '1rem',
      color: '#6c7086',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      zIndex: '1',
      whiteSpace: 'nowrap',
    });
    container.style.position = 'relative';
    container.appendChild(toastEl);

    function showToast(text, duration) {
      toastEl.textContent = text;
      toastEl.style.opacity = '1';
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toastEl.style.opacity = '0';
      }, duration || 1200);
    }

    function getAngleForKey(node, key) {
      switch (key) {
        case '_snap':    return node.snappedAngle || node.chronoAngle;
        case 'chrono':   return node.chronoAngle;
        case 'theme':    return node.themeAngle;
        case 'alpha':    return node.alphaAngle;
        case 'seasonal': return node.seasonalAngle;
        case 'length':   return node.lengthAngle;
        case 'scatter':  return node.shuffleAngle;
        case 'density':  return node.densityAngle;
        default:         return node.chronoAngle;
      }
    }

    // State machine: tracks current ordering index + transition progress
    let currentIdx = 0;           // index into orderSequence
    let transitionProgress = 0;   // 0 = at "from", 1 = arrived at "to"
    let holding = true;           // true = holding, false = transitioning
    let holdTimer = 3;            // first hold is only 3s

    // Ensure sequence is long enough — append reshuffled copies as needed
    function ensureSequence(needIdx) {
      while (needIdx >= orderSequence.length) {
        // Avoid repeating the last state at the seam
        let next = shuffleArray([...orderingKeys]);
        while (next[0] === orderSequence[orderSequence.length - 1]) {
          next = shuffleArray([...orderingKeys]);
        }
        orderSequence = orderSequence.concat(next);
      }
    }

    // Tap to advance
    canvas.addEventListener('click', triggerNext);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); triggerNext(); });

    function triggerNext() {
      if (holding) {
        // Skip remaining hold, start transition
        holding = false;
        transitionProgress = 0;
        ensureSequence(currentIdx + 1);
        showToast(orderingLabels[orderSequence[currentIdx + 1]]);
      } else {
        // Mid-transition: snapshot current positions as new "from",
        // advance to next state so movement continues smoothly.
        nodes.forEach((node) => {
          node.snappedAngle = node.currentAngle;
        });
        currentIdx++;
        ensureSequence(currentIdx + 1);
        transitionProgress = 0;
        // Override getAngleForKey to use snappedAngle as "from"
        // by setting the current ordering to a special marker
        orderSequence[currentIdx] = '_snap';
        showToast(orderingLabels[orderSequence[currentIdx + 1]]);
      }
    }

    function finishTransition() {
      currentIdx++;
      ensureSequence(currentIdx + 1);
      transitionProgress = 0;
      holding = true;
      holdTimer = HOLD_SEC;
    }

    function smoothstep(t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    }

    function lerpAngle(a, b, t) {
      let diff = b - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return a + diff * t;
    }

    ensureSequence(1);

    function update(dt) {
      time += dt;

      // State machine: hold → transition → hold → …
      if (holding) {
        holdTimer -= dt;
        if (holdTimer <= 0) {
          holding = false;
          transitionProgress = 0;
        }
      } else {
        transitionProgress += dt / TRANSITION_SEC;
        if (transitionProgress >= 1) {
          transitionProgress = 1;
          finishTransition();
        }
      }

      const morphT = smoothstep(transitionProgress);
      const fromKey = orderSequence[currentIdx];
      const toKey = orderSequence[currentIdx + 1] || fromKey;

      const globalAngle = time * ROTATION_SPEED;

      nodes.forEach((node, i) => {
        // Interpolate between current and next ordering
        const fromAngle = getAngleForKey(node, fromKey);
        const toAngle = getAngleForKey(node, toKey);
        node.currentAngle = lerpAngle(fromAngle, toAngle, morphT);

        // Sine-based breathing — deterministic, keeps circular shape
        const breatheR = Math.sin(time * node.breatheFreq + node.phase) * node.breatheRadial;
        const breatheA = Math.sin(time * node.breatheFreq * 0.8 + node.phase + Math.PI * 0.5) * node.breatheAngular;

        const angle = node.currentAngle + globalAngle + breatheA;
        const r = circleR + breatheR;

        node.x = cx + Math.cos(angle) * r;
        node.y = cy + Math.sin(angle) * r;
      });
    }

    /* ── Drawing ───────────────────────────────────────────────── */
    function draw() {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Edges
      edges.forEach((edge) => {
        const a = nodes[edge.i];
        const b = nodes[edge.j];
        const minOp = Math.min(a.opacity, b.opacity);
        if (minOp < 0.01) return;

        const baseOp = edge.cross ? 0.04 : 0.06;
        const op = baseOp * edge.strength * minOp;
        if (op < 0.003) return;

        const rgb = {
          r: (a.rgb.r + b.rgb.r) >> 1,
          g: (a.rgb.g + b.rgb.g) >> 1,
          b: (a.rgb.b + b.rgb.b) >> 1,
        };

        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + op + ')';
        ctx.lineWidth = edge.cross ? 0.5 : 0.7;

        if (edge.cross) {
          // Cross-connections curve inward toward centre
          const pull = 0.35;
          const cpx = cx + (a.x + b.x - 2 * cx) * (1 - pull) * 0.5;
          const cpy = cy + (a.y + b.y - 2 * cy) * (1 - pull) * 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
          ctx.stroke();
        } else {
          // Within-theme connections arc outward along the rim
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const dx = mx - cx;
          const dy = my - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const push = 15;
          const cpx = mx + (dx / dist) * push;
          const cpy = my + (dy / dist) * push;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
          ctx.stroke();
        }
      });

      // Nodes
      nodes.forEach((node) => {
        if (node.opacity <= 0) return;
        ctx.globalAlpha = node.opacity;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    }

    /* ── Loop ──────────────────────────────────────────────────── */
    let lastTime = 0;
    let animId;

    function loop(ts) {
      const dt = lastTime ? (ts - lastTime) / 1000 : 0.016;
      lastTime = ts;
      update(Math.min(dt, 0.1));
      draw();
      animId = requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
        lastTime = 0;
      } else {
        requestAnimationFrame(loop);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
