// The Great Rewrite — Phone with app grid (incl. widget) + dock, all morphing
// A 2×2 widget lives inside the app grid. Dock pinned to phone bottom.
// Every shape morphs rect→pill/circle→rect via a custom wave with 2s hold.
// Diagonal ripple stagger.
(function () {
    'use strict';

    function initTheGreatRewrite() {
        const canvas = document.getElementById('2026-03-14-the-great-rewrite-canvas');
        if (!canvas) { console.warn('The Great Rewrite: canvas not found'); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { console.error('The Great Rewrite: no 2D context'); return; }

        canvas.width  = 1200;
        canvas.height = 638;

        const base     = '#1e1e2e';
        const surface0 = '#313244';

        const palette = [
            '#b4befe', // lavender
            '#89b4fa', // blue
            '#74c7ec', // sapphire
            '#89dceb', // sky
            '#94e2d5', // teal
            '#a6e3a1', // green
            '#f9e2af', // yellow
            '#fab387', // peach
            '#cba6f7', // mauve
            '#f5c2e7', // pink
            '#f5e0dc', // rosewater
        ];

        function hexToRgb(hex) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [180,190,254];
        }

        function lerpColor(hexA, hexB, k) {
            const [ar,ag,ab] = hexToRgb(hexA);
            const [br,bg,bb] = hexToRgb(hexB);
            return `rgb(${Math.round(ar+(br-ar)*k)},${Math.round(ag+(bg-ag)*k)},${Math.round(ab+(bb-ab)*k)})`;
        }

        function smoothstep(u) { return u * u * (3 - 2 * u); }

        const CX = canvas.width  / 2;
        const CY = canvas.height / 2;

        // ── Phone ───────────────────────────────────────────────────────
        const phoneW      = 210;
        const phoneH      = 368;
        const phoneCorner = 46;
        const phoneX      = CX - phoneW / 2;
        const phoneY      = CY - phoneH / 2;

        // ── Shared sizing ───────────────────────────────────────────────
        const appSize = 44;
        const appGap  = 14;
        const cols    = 3;
        const gridContentW = cols * appSize + (cols - 1) * appGap;
        const innerX  = phoneX + (phoneW - gridContentW) / 2;

        // ── Layout zones ────────────────────────────────────────────────
        const gridX = innerX;
        const gridY = phoneY + 48;
        const rows  = 4;

        // ── 2×2 widget embedded in grid (top-left) ──────────────────────
        const widgetW = appSize * 2 + appGap;
        const widgetH = appSize * 2 + appGap;

        const widgets = [{
            x: gridX, y: gridY,
            w: widgetW, h: widgetH,
            color: palette[4],  // teal
            phase: 0.18,
        }];

        // ── App grid — fills the area, skipping widget cells ────────────
        const apps = [];
        let ci = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // skip cells occupied by the 2×2 widget (rows 0-1, cols 0-1)
                if (r < 2 && c < 2) continue;
                apps.push({
                    x:     gridX + c * (appSize + appGap),
                    y:     gridY + r * (appSize + appGap),
                    color: palette[ci % palette.length],
                    phase: (c + r) * 0.12 + 0.30,
                });
                ci++;
            }
        }

        // ── Dock — pinned to very bottom of phone ───────────────────────
        const dockY = phoneY + phoneH - 28 - appSize;
        const dockApps = [];
        for (let c = 0; c < cols; c++) {
            dockApps.push({
                x:     gridX + c * (appSize + appGap),
                y:     dockY,
                color: palette[ci % palette.length],
                phase: c * 0.12 + 1.14,
            });
            ci++;
        }

        const allApps = [...apps, ...dockApps];

        // ── Drawing helpers ─────────────────────────────────────────────
        function roundedRect(x, y, w, h, r) {
            r = Math.max(0, Math.min(r, w / 2, h / 2));
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y,     x + w, y + r,     r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x,     y + h, x,     y + h - r, r);
            ctx.lineTo(x,     y + r);
            ctx.arcTo(x,     y,     x + r, y,         r);
            ctx.closePath();
        }

        // ── Morph wave: 2s rise · 2s hold · 2s fall · 4s rest (10s total) ─
        const period   = 10;
        const riseFrac = 0.20;
        const holdFrac = 0.20;
        const fallFrac = 0.20;

        let t = 0;

        function cycleMorph(phase) {
            const x = ((t / period + phase / (Math.PI * 2)) % 1 + 1) % 1;
            if (x < riseFrac)
                return smoothstep(x / riseFrac);
            if (x < riseFrac + holdFrac)
                return 1;
            if (x < riseFrac + holdFrac + fallFrac)
                return 1 - smoothstep((x - riseFrac - holdFrac) / fallFrac);
            return 0;
        }

        // Unified color drifts slowly through palette (full lap ~66s)
        function unifiedColor() {
            const pos = (t / 66) * palette.length;
            const idx = Math.floor(pos) % palette.length;
            return lerpColor(palette[idx], palette[(idx + 1) % palette.length], pos - Math.floor(pos));
        }

        // ── Render ──────────────────────────────────────────────────────
        function draw() {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Phone body
            roundedRect(phoneX, phoneY, phoneW, phoneH, phoneCorner);
            ctx.fillStyle = surface0;
            ctx.fill();

            const uc = unifiedColor();

            // Widgets — morph from rounded rect to pill shape
            const baseWidgetR = 10;
            widgets.forEach(w => {
                const morphT = cycleMorph(w.phase);
                const r      = baseWidgetR + morphT * (w.h / 2 - baseWidgetR);
                const color  = lerpColor(w.color, uc, morphT);
                roundedRect(w.x, w.y, w.w, w.h, r);
                ctx.fillStyle = color;
                ctx.fill();
            });

            // App icons — morph from rounded rect to circle
            const baseAppR = 10;
            allApps.forEach(app => {
                const morphT = cycleMorph(app.phase);
                const r      = baseAppR + morphT * (appSize / 2 - baseAppR);
                const color  = lerpColor(app.color, uc, morphT);
                roundedRect(app.x, app.y, appSize, appSize, r);
                ctx.fillStyle = color;
                ctx.fill();
            });
        }

        // ── Loop ────────────────────────────────────────────────────────
        let lastTs = 0;
        function animate(ts) {
            const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0.016;
            lastTs = ts;
            t += dt;
            draw();
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheGreatRewrite);
    } else {
        initTheGreatRewrite();
    }
})();
