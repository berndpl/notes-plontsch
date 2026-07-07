// Post Graph — "Shifting Views"
//
// Nodes represent posts, colored by year-theme. The graph morphs between
// several named views, each a different spatial arrangement of the same
// dots — so a post keeps its identity (color) while the shape reorganises:
//
//   • Timeline — a simple line of dots along a gentle wave, oldest → newest
//   • Groups   — spatial clusters grouped by year
//   • Topics   — spatial clusters grouped by inferred topic
//   • Circle   — the classic chronological ring
//
// Tap an individual dot to open its post. Tap empty space to advance to the
// next view. Views auto-cycle; the view name toasts in on every switch.
//
// Nodes are connected by a light thread (chronological chain + nearby
// cross-theme links) that reshapes fluidly across every view.
//
// 2.5px dots, no glow, Catppuccin Mocha palette on #1e1e2e base.
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
    window.addEventListener('resize', () => { resize(); computeLayouts(); });

    /* ── Palette — follows CSS theme tokens ────────────────────── */
    const fallbackColors = ['#cba6f7', '#a6e3a1', '#fab387', '#89b4fa', '#f38ba8', '#94e2d5'];

    function themeValue(name, fallback) {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || fallback;
    }

    function graphTheme() {
      return {
        base: themeValue('--graph-base', '#1e1e2e'),
        overlay: themeValue('--theme-overlay0', '#6c7086'),
        chord: parseColor(themeValue('--graph-chord', 'rgba(205, 214, 244, 0.07)')),
        colors: fallbackColors.map((color, index) => themeValue('--graph-color-' + index, color)),
      };
    }

    let currentGraphTheme = graphTheme();

    function hexToRgb(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m
        ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
        : { r: 180, g: 190, b: 254 };
    }

    function parseColor(color) {
      const rgba = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(color);
      if (rgba) {
        return {
          r: Number(rgba[1]),
          g: Number(rgba[2]),
          b: Number(rgba[3]),
          a: rgba[4] === undefined ? 1 : Number(rgba[4]),
        };
      }
      return { ...hexToRgb(color), a: 1 };
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

    /* ── Topic inference (from title keywords) ──────────────────
       Deterministic, keyword-driven so new posts auto-classify.
       First matching bucket wins; unmatched fall into "Ideas". ── */
    const TOPICS = [
      { name: 'Making',  keys: ['app', 'apps', 'coding', 'code', 'software', 'rewrite', 'skill', 'edit', 'build', 'building', 'data', 'vibe', 'blog', 'words', 'recall', 'funtography', 'feeds', 'form', 'factor', 'replacement', 'replace', 'coexist', 'writing', 'durable'] },
      { name: 'Work',    keys: ['work', 'meeting', 'meetings', 'group', 'groups', 'contribution', 'team', 'role', 'roles', 'user', 'users', 'lonely', 'attention', 'time', 'hard', 'things', 'frontier', 'meaningless'] },
      { name: 'Mind',    keys: ['grief', 'hope', 'breathing', 'breath', 'diet', 'human', 'journal', 'journaling', 'joy', 'losing', 'love', 'grounding', 'breakable', 'nothing', 'something', 'point', 'view', 'feel'] },
      { name: 'Futures', keys: ['system', 'systems', 'learning', 'self', 'exploration', 'deep', 'compounding', 'zelda', 'predicting', 'future', 'ideal', 'music'] },
    ];
    const FALLBACK_TOPIC = 'Ideas';

    function topicOf(title) {
      const words = title.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      for (const topic of TOPICS) {
        if (words.some((w) => topic.keys.includes(w))) return topic.name;
      }
      return FALLBACK_TOPIC;
    }

    /* ── Build nodes ───────────────────────────────────────────── */
    const NODE_R = 2.5;
    const HIT_R = 13;
    const nodes = posts.map((p, i) => {
      const ti = themeIndex(p.date);
      const color = currentGraphTheme.colors[ti] || fallbackColors[ti];
      return {
        ...p,
        theme: ti,
        topic: topicOf(p.title),
        color,
        rgb: hexToRgb(color),
        pos: {},            // per-view target positions {x,y}
        baseX: 0, baseY: 0, // interpolated (pre-breathing) position
        fx: 0, fy: 0,       // snapshot "from" position at start of a morph
        x: 0, y: 0,         // rendered position (incl. breathing)
        phase: (i / posts.length) * Math.PI * 2,
        breatheFreq: 0.3,
        breatheAmp: 1.6,
        opacity: 1,
        hover: false,
      };
    });

    function applyGraphTheme() {
      currentGraphTheme = graphTheme();
      nodes.forEach((node) => {
        node.color = currentGraphTheme.colors[node.theme] || fallbackColors[node.theme];
        node.rgb = hexToRgb(node.color);
      });
      toastEl.style.color = currentGraphTheme.overlay;
    }

    /* ── Build edges — a light connective thread ─────────────────
       Chronological chain (consecutive posts) + each node's nearest
       cross-theme neighbour within 100 days. Reshapes across views. */
    const edges = [];
    const byDate = nodes.slice().sort((a, b) => a.date - b.date);
    const indexOfNode = new Map(nodes.map((n, i) => [n, i]));

    for (let i = 0; i < byDate.length - 1; i++) {
      edges.push({
        i: indexOfNode.get(byDate[i]),
        j: indexOfNode.get(byDate[i + 1]),
        cross: byDate[i].theme !== byDate[i + 1].theme,
        strength: 1,
      });
    }

    const crossSeen = new Set();
    nodes.forEach((node, i) => {
      let best = null, bestDays = Infinity;
      nodes.forEach((other, j) => {
        if (i === j || other.theme === node.theme) return;
        const days = Math.abs((node.date - other.date) / 864e5);
        if (days < bestDays) { bestDays = days; best = j; }
      });
      if (best !== null && bestDays <= 100) {
        const key = i < best ? i + '-' + best : best + '-' + i;
        if (!crossSeen.has(key)) {
          crossSeen.add(key);
          edges.push({ i, j: best, cross: true, strength: 1 - bestDays / 100 });
        }
      }
    });

    /* ── Layout computation ─────────────────────────────────────
       Each node gets a target {x,y} for every view. Positions are
       interpolated between views so morphs are seamless. ──────── */
    const PAD = 44;

    function computeLayouts() {
      const W = canvas.width;
      const H = canvas.height;
      const n = nodes.length;
      const order = nodes.slice().sort((a, b) => a.date - b.date);

      /* Timeline — line of dots along a gentle wave, oldest → newest */
      order.forEach((node, i) => {
        const t = n > 1 ? i / (n - 1) : 0.5;
        node.pos.timeline = {
          x: PAD + t * (W - 2 * PAD),
          y: H / 2 + Math.sin(t * Math.PI * 3) * (H * 0.16),
        };
      });

      /* Circle — chronological ring */
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W * 0.36, H * 0.42);
      order.forEach((node, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        node.pos.circle = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
      });

      /* Grouped clusters */
      clusterLayout('groups', groupBy((node) => node.theme));
      clusterLayout('topics', groupBy((node) => node.topic));

      function groupBy(keyFn) {
        const map = new Map();
        order.forEach((node) => {
          const k = keyFn(node);
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(node);
        });
        return map;
      }

      function clusterLayout(viewKey, groups) {
        const keys = Array.from(groups.keys());
        const g = keys.length;
        let maxCount = 1;
        groups.forEach((members) => { maxCount = Math.max(maxCount, members.length); });

        const maxR = Math.min((W - 2 * PAD) / g * 0.44, H * 0.34);
        const golden = Math.PI * (3 - Math.sqrt(5));

        keys.forEach((k, gi) => {
          const members = groups.get(k);
          const ccx = PAD + (gi + 0.5) / g * (W - 2 * PAD);
          const ccy = H / 2 + Math.sin(gi * 2.2 + 0.6) * (H * 0.16);
          const clusterR = maxR * (0.42 + 0.58 * Math.sqrt(members.length / maxCount));

          members.forEach((node, mi) => {
            const rr = members.length > 1 ? clusterR * Math.sqrt((mi + 0.5) / members.length) : 0;
            const aa = mi * golden;
            node.pos[viewKey] = { x: ccx + Math.cos(aa) * rr, y: ccy + Math.sin(aa) * rr };
          });
        });
      }
    }

    computeLayouts();

    /* ── Views + view state ────────────────────────────────────── */
    const views = ['timeline', 'groups', 'topics', 'circle'];
    const viewLabels = {
      timeline: 'Timeline',
      groups:   'Groups',
      topics:   'Topics',
      circle:   'Circle',
    };

    const TRANSITION_SEC = 2.4;
    const HOLD_SEC = 6;

    let toIdx = 0;             // index of the view we're settling into
    let progress = 1;         // 0 = at "from", 1 = arrived
    let holding = true;
    let holdTimer = 3.5;      // first hold is shorter

    // Start fully settled on the first view
    nodes.forEach((node) => {
      const p = node.pos[views[toIdx]];
      node.baseX = node.fx = node.x = p.x;
      node.baseY = node.fy = node.y = p.y;
    });

    /* ── Toast overlay ─────────────────────────────────────────── */
    let toastTimeout = null;
    const toastEl = document.createElement('div');
    toastEl.setAttribute('aria-live', 'polite');
    Object.assign(toastEl.style, {
      position: 'absolute',
      top: '0.75rem',
      left: '0.75rem',
      fontFamily: "'Inconsolata', monospace",
      fontSize: '1rem',
      color: currentGraphTheme.overlay,
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
      toastTimeout = setTimeout(() => { toastEl.style.opacity = '0'; }, duration || 1400);
    }

    /* ── Advancing between views ───────────────────────────────── */
    function advanceTo(nextIdx) {
      // Snapshot current (pre-breathing) positions as the morph origin
      nodes.forEach((node) => { node.fx = node.baseX; node.fy = node.baseY; });
      toIdx = ((nextIdx % views.length) + views.length) % views.length;
      progress = 0;
      holding = false;
      showToast(viewLabels[views[toIdx]]);
    }

    function advanceNext() { advanceTo(toIdx + 1); }

    /* ── Pointer interaction — tap dot to open, tap space to cycle */
    function pointerPos(evt) {
      const rect = canvas.getBoundingClientRect();
      const src = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
      return {
        x: (src.clientX - rect.left) * (canvas.width / rect.width),
        y: (src.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    function nodeAt(px, py) {
      let hit = null, bestDist = HIT_R * HIT_R;
      nodes.forEach((node) => {
        const dx = node.x - px, dy = node.y - py;
        const d = dx * dx + dy * dy;
        if (d <= bestDist) { bestDist = d; hit = node; }
      });
      return hit;
    }

    function handleTap(px, py) {
      const node = nodeAt(px, py);
      if (node && node.url) {
        window.location.href = node.url;
      } else {
        advanceNext();
      }
    }

    canvas.addEventListener('click', (e) => {
      const p = pointerPos(e);
      handleTap(p.x, p.y);
    });
    canvas.addEventListener('touchstart', (e) => {
      const p = pointerPos(e);
      handleTap(p.x, p.y);
      e.preventDefault();
    }, { passive: false });

    // Hover: highlight the dot under the cursor + show its title (only on change)
    let hovered = null;
    canvas.addEventListener('mousemove', (e) => {
      const p = pointerPos(e);
      const node = nodeAt(p.x, p.y);
      canvas.style.cursor = 'pointer';
      if (node === hovered) return;
      if (hovered) hovered.hover = false;
      hovered = node;
      if (node) {
        node.hover = true;
        showToast(node.title, 2000);
      }
    });
    canvas.addEventListener('mouseleave', () => {
      if (hovered) hovered.hover = false;
      hovered = null;
    });

    /* ── Easing helpers ────────────────────────────────────────── */
    function smoothstep(t) {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    }

    /* ── Update ────────────────────────────────────────────────── */
    let time = 0;

    function update(dt) {
      time += dt;

      if (holding) {
        holdTimer -= dt;
        if (holdTimer <= 0) advanceNext();
      } else {
        progress += dt / TRANSITION_SEC;
        if (progress >= 1) {
          progress = 1;
          holding = true;
          holdTimer = HOLD_SEC;
        }
      }

      const morphT = smoothstep(progress);
      const viewKey = views[toIdx];

      nodes.forEach((node) => {
        const target = node.pos[viewKey];
        node.baseX = node.fx + (target.x - node.fx) * morphT;
        node.baseY = node.fy + (target.y - node.fy) * morphT;

        const bx = Math.sin(time * node.breatheFreq + node.phase) * node.breatheAmp;
        const by = Math.cos(time * node.breatheFreq * 0.85 + node.phase) * node.breatheAmp;
        node.x = node.baseX + bx;
        node.y = node.baseY + by;
      });
    }

    /* ── Drawing ───────────────────────────────────────────────── */
    function draw() {
      applyGraphTheme();
      ctx.fillStyle = currentGraphTheme.base;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const chord = currentGraphTheme.chord;

      edges.forEach((edge) => {
        const a = nodes[edge.i];
        const b = nodes[edge.j];
        const minOp = Math.min(a.opacity, b.opacity);
        if (minOp < 0.01) return;

        const op = chord.a * (edge.cross ? 0.7 : 1) * edge.strength * minOp;
        if (op < 0.004) return;

        ctx.strokeStyle = 'rgba(' + chord.r + ',' + chord.g + ',' + chord.b + ',' + op + ')';
        ctx.lineWidth = edge.cross ? 0.5 : 0.7;

        // Gentle perpendicular bow so lines read as soft arcs, not wires
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const bow = Math.min(14, len * 0.12);
        const cpx = mx + (-dy / len) * bow;
        const cpy = my + (dx / len) * bow;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
        ctx.stroke();
      });

      nodes.forEach((node) => {
        if (node.opacity <= 0) return;
        ctx.globalAlpha = node.opacity;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.hover ? NODE_R + 1.5 : NODE_R, 0, Math.PI * 2);
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

    window.addEventListener('notes-theme-change', applyGraphTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
