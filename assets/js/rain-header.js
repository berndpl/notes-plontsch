// Rain Header — posts rain down and pile on the floor.
// Physics: gravity, bounce, node–node collision, mouse/touch repulsion.
// Colors and palette follow the same CSS tokens as post-graph.js.

(function () {
  'use strict';

  /* ── Tuning ──────────────────────────────────────────────────── */
  const GRAVITY      = 0.30;
  const RESTITUTION  = 0.25;   // bounce factor 0→1 (reduced from 0.44 for easier piling)
  const FLOOR_FRIC   = 0.76;   // horizontal damping on floor hit
  const AIR_DRAG     = 0.994;  // per-frame velocity scale in air
  const NODE_R       = 4;
  const CANVAS_H     = 420;
  const FLOOR_PAD    = 32;
  const MOUSE_R      = 110;    // repulsion radius (px)
  const MOUSE_K      = 14;     // repulsion strength
  const SETTLE_SPD   = 0.15;   // speed threshold to start settle counter (reduced from 0.28 for faster settling)
  const SETTLE_TICKS = 6;      // ticks below threshold before truly settled (reduced from 10)

  /* ── Popcorn ─────────────────────────────────────────────────── */
  const HEAT_DURATION = 160;   // frames from wiggle-start to pop
  const MAX_WIGGLE    = 2;     // px displacement at peak heat (reduced from 7 for minimal jitter)
  const POP_VY_MIN    = 10;    // minimum upward pop speed
  const POP_VY_RANGE  = 7;     // extra random upward speed
  const POP_VX_RANGE  = 3.5;   // horizontal scatter on pop

  /* ── Helpers ─────────────────────────────────────────────────── */
  function css(v, fb) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;
  }

  /* ── Year → palette index ────────────────────────────────────── */
  const YEAR_BUCKETS = ['2017', '2023', '2024', '2025', '2026'];
  // Riso print palette — bold, saturated, limited colors
  const FALLBACK_COLS = ['#FF1493', '#FF6B35', '#39FF14', '#00D9FF', '#9D4EDD', '#FFDC00'];

  function getColors() {
    return FALLBACK_COLS.map((_, i) => css('--graph-color-' + i, FALLBACK_COLS[i]));
  }
  function yearIndex(date) {
    const y = date.getFullYear().toString();
    const i = YEAR_BUCKETS.indexOf(y);
    return i >= 0 ? i : YEAR_BUCKETS.length - 1;
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    const canvas = document.getElementById('post-graph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    let W, H, floor;
    let nodes; // Declare early to avoid "before initialization" error in resize()

    function resize() {
      W = container.clientWidth;
      H = CANVAS_H;
      canvas.width  = W;
      canvas.height = H;
      floor = H - FLOOR_PAD;
      // clamp nodes horizontally after resize
      if (nodes) {
        nodes.forEach(n => {
          n.x = Math.min(Math.max(n.x, NODE_R), W - NODE_R);
          // wake settled nodes near walls after resize
        });
      }
    }

    /* ── Parse posts from DOM ────────────────────────────────────── */
    const postEls = [...document.querySelectorAll('.posts li:not(.year-separator)')];
    if (!postEls.length) return;

    resize();

    let colors = getColors();
    nodes = postEls.map((li, i) => {
      const a   = li.querySelector('a');
      const t   = li.querySelector('time');
      const dt  = t ? new Date(t.getAttribute('datetime')) : new Date();
      const ti  = yearIndex(dt);
      const col = colors[ti] || FALLBACK_COLS[ti];
      return {
        url:   a ? a.href : '',
        title: a ? a.textContent.trim() : '',
        paletteIndex: ti,
        color: col,
        x:        NODE_R + Math.random() * (W - NODE_R * 2),
        // stagger: earlier posts fall later (deeper offset above viewport)
        y:        -NODE_R - i * 16 - Math.random() * 180,
        vx:       (Math.random() - 0.5) * 2.0,
        vy:       Math.random() * 2,
        settled:  false,
        quietFor: 0,
        // popcorn state
        heatTimer: 0,
        // First pop should happen sooner; keep later cycles unchanged.
        heatDelay: 45 + Math.random() * 210,  // frames after settling before wiggle
        phase:     Math.random() * Math.PI * 2,
      };
    });

    function refreshColors() {
      colors = getColors();
      nodes.forEach((node) => {
        node.color = colors[node.paletteIndex] || FALLBACK_COLS[node.paletteIndex];
      });
    }

    /* ── Chronological edges ─────────────────────────────────────── */
    const sorted = postEls
      .map((li, i) => {
        const t = li.querySelector('time');
        return { idx: i, date: t ? new Date(t.getAttribute('datetime')) : new Date() };
      })
      .sort((a, b) => a.date - b.date);

    const edges = sorted.slice(0, -1).map((n, i) => ({
      a: n.idx,
      b: sorted[i + 1].idx,
    }));

    /* ── Mouse / touch state ─────────────────────────────────────── */
    let mx = -9999, my = -9999;

    /* ── Physics step ────────────────────────────────────────────── */
    function step() {
      nodes.forEach(n => {
        // gravity + drag
        n.vy += GRAVITY;
        n.vx *= AIR_DRAG;
        n.vy *= AIR_DRAG;
        n.x  += n.vx;
        n.y  += n.vy;

        // wall bounce
        if (n.x - NODE_R < 0)   { n.x = NODE_R;   n.vx =  Math.abs(n.vx) * 0.55; }
        if (n.x + NODE_R > W)   { n.x = W - NODE_R; n.vx = -Math.abs(n.vx) * 0.55; }

        // floor bounce
        if (n.y + NODE_R >= floor) {
          n.y  = floor - NODE_R;
          n.vy = -Math.abs(n.vy) * RESTITUTION;
          n.vx *= FLOOR_FRIC;
        }

        // mouse / touch attraction
        const dx = n.x - mx;
        const dy = n.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_R * MOUSE_R && d2 > 0.01) {
          const d   = Math.sqrt(d2);
          const t   = 1 - d / MOUSE_R;
          const mag = t * t * MOUSE_K;
          n.vx -= (dx / d) * mag;  // negative = attraction toward cursor
          n.vy -= (dy / d) * mag;
          n.settled   = false;
          n.quietFor  = 0;
          n.heatTimer = 0; // reset heat when mouse disturbs
        }

        // settle tracking
        const spd = Math.abs(n.vx) + Math.abs(n.vy);
        const onFloor = n.y + NODE_R >= floor - 1;
        if (onFloor && spd < SETTLE_SPD) {
          n.quietFor++;
          if (n.quietFor >= SETTLE_TICKS) {
            n.settled = true;
            n.vx = 0; n.vy = 0;
          }
        } else if (!n.settled) {
          n.quietFor = 0;
        }

        // popcorn: heat up and pop
        if (n.settled) {
          n.heatTimer++;
          const heat = n.heatTimer - n.heatDelay;
          if (heat >= HEAT_DURATION) {
            // POP!
            n.settled   = false;
            n.quietFor  = 0;
            n.vy        = -(POP_VY_MIN + Math.random() * POP_VY_RANGE);
            n.vx        = (Math.random() - 0.5) * POP_VX_RANGE * 2;
            n.heatTimer = 0;
            n.heatDelay = 60 + Math.random() * 480; // new random delay for next cycle
          }
        }
      });

      /* ── Node–node collision (O(n²), ~50 nodes → fine) ───────── */
      const minDist = NODE_R * 2;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= minDist * minDist || d2 < 0.01) continue;

          const d  = Math.sqrt(d2);
          const ov = (minDist - d) * 0.5 + 0.5;
          const nx = dx / d, ny = dy / d;

          // separate
          a.x -= nx * ov; a.y -= ny * ov;
          b.x += nx * ov; b.y += ny * ov;

          // impulse along normal
          const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rv > 0) {
            const imp = rv * 0.55;
            a.vx -= imp * nx; a.vy -= imp * ny;
            b.vx += imp * nx; b.vy += imp * ny;
            a.settled = false; b.settled = false;
            a.quietFor = 0;    b.quietFor = 0;
          }

          // keep below floor
          if (a.y + NODE_R > floor) a.y = floor - NODE_R;
          if (b.y + NODE_R > floor) b.y = floor - NODE_R;
        }
      }
    }

    /* ── Draw ────────────────────────────────────────────────────── */
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // background
      ctx.fillStyle = css('--graph-base', '#1e1e2e');
      ctx.fillRect(0, 0, W, H);

      // edges — disabled for cleaner look
      // ctx.lineWidth = 1;
      // edges.forEach(e => {
      //   const a = nodes[e.a], b = nodes[e.b];
      //   if (a.y < 0 || b.y < 0) return;
      //   ctx.beginPath();
      //   ctx.moveTo(a.x, a.y);
      //   ctx.lineTo(b.x, b.y);
      //   ctx.strokeStyle = 'rgba(205, 214, 244, 0.045)';
      //   ctx.stroke();
      // });

      // nodes
      const now = performance.now();
      nodes.forEach(n => {
        if (n.y + NODE_R < 0) return; // still above viewport

        // compute wiggle offset for heating nodes
        let wx = 0, wy = 0;
        if (n.settled) {
          const heat = n.heatTimer - n.heatDelay;
          if (heat > 0) {
            const t    = Math.min(1, heat / HEAT_DURATION);
            const amp  = t * t * MAX_WIGGLE;
            const freq = 0.018 + t * 0.032; // frequency ramps up with heat
            wx = amp * Math.sin(now * freq + n.phase);
            wy = amp * 0.55 * Math.cos(now * freq * 1.3 + n.phase + 1.2);
          }
        }

        ctx.beginPath();
        ctx.arc(n.x + wx, n.y + wy, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      });
    }

    /* ── Loop ────────────────────────────────────────────────────── */
    function loop() {
      step();
      draw();
      requestAnimationFrame(loop);
    }

    /* ── Events ──────────────────────────────────────────────────── */
    window.addEventListener('resize', () => {
      resize();
      // wake all settled nodes slightly so they re-settle at new width
      nodes.forEach(n => {
        if (n.settled) {
          n.settled   = false;
          n.quietFor  = 0;
          n.heatTimer = 0;
          n.vy = -Math.random() * 2;
          n.vx = (Math.random() - 0.5) * 1.5;
        }
      });
    });
    window.addEventListener('family-theme-change', refreshColors);
    window.addEventListener('family-accent-change', refreshColors);

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) * (W / r.width);
      my = (e.clientY - r.top)  * (H / r.height);
    });
    canvas.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });

    canvas.addEventListener('touchmove', e => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      mx = (t.clientX - r.left) * (W / r.width);
      my = (t.clientY - r.top)  * (H / r.height);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { mx = -9999; my = -9999; });

    // click / tap → navigate to post
    canvas.addEventListener('click', e => {
      const r  = canvas.getBoundingClientRect();
      const cx = (e.clientX - r.left) * (W / r.width);
      const cy = (e.clientY - r.top)  * (H / r.height);
      for (const n of nodes) {
        if (Math.hypot(n.x - cx, n.y - cy) < NODE_R + 10) {
          window.location.href = n.url;
          return;
        }
      }
    });

    // cursor affordance
    canvas.addEventListener('mousemove', e => {
      const r  = canvas.getBoundingClientRect();
      const cx = (e.clientX - r.left) * (W / r.width);
      const cy = (e.clientY - r.top)  * (H / r.height);
      const hit = nodes.some(n => Math.hypot(n.x - cx, n.y - cy) < NODE_R + 10);
      canvas.style.cursor = hit ? 'pointer' : 'default';
    });

    loop();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
