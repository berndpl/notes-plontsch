// Self-Learning Systems v3 - Roots & Growth Flip Visualization
// A node spawns upward growth, the structure flips to become roots,
// new growth emerges from the top, flips again. Cycle repeats.
// Represents: growth becomes foundation, foundation enables new growth.
(function() {
    'use strict';
    
    function initSelfLearningSystems() {
        const canvas = document.getElementById('2026-02-16-self-learning-systems-v3-canvas');
        if (!canvas) {
            console.warn('Self-Learning Systems: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Self-Learning Systems: Could not get 2D context');
            return;
        }
        
        // Set canvas size to match header images (1200x638)
        canvas.width = 1200;
        canvas.height = 638;
        
        // Color scheme matching the site (Catppuccin Mocha)
        const colors = {
            lavender: '#b4befe',
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
            overlay0: '#6c7086',
            surface0: '#313244',
            base: '#1e1e2e'
        };
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Growth palette
        const palette = [
            colors.lavender, colors.blue, colors.sapphire,
            colors.teal, colors.green, colors.mauve,
            colors.sky, colors.pink, colors.peach, colors.rosewater
        ];
        
        // Parse hex to RGB
        function hexToRgb(hex) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
                     : { r: 180, g: 190, b: 254 };
        }
        
        // Easing
        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }
        
        // ===== CONFIGURATION =====
        const config = {
            nodeSize: 4,
            
            // Growth tree shape
            branchCount: 3,           // Branches from the origin node
            subBranchCount: 2,        // Sub-branches per branch
            branchLength: 80,         // Length of main branches
            subBranchLength: 50,      // Length of sub-branches
            branchSpread: Math.PI * 0.6,  // Angular spread of main branches
            subBranchSpread: Math.PI * 0.4,
            
            // Timing (seconds)
            originFadeDuration: 1.0,      // Origin node fades in
            growDuration: 2.0,            // Branches grow out
            subGrowDuration: 1.5,         // Sub-branches grow
            pauseAfterGrow: 1.0,          // Pause before flip
            flipDuration: 2.5,            // The upside-down flip
            pauseAfterFlip: 0.8,          // Pause after flip, before new growth
            rootFadeAmount: 0.4,          // How much roots fade (1 = fully visible)
            
            // Number of grow-flip cycles
            numCycles: 3,
            
            // Final
            fadeOutDuration: 2.0,
            restDuration: 1.5,
            
            // Stem lines
            stemOpacity: 0.18,
            stemWidth: 1.2,
            
            // Glow
            glowRadius: 16,
            glowOpacity: 0.08
        };
        // ===== END CONFIGURATION =====
        
        // ===== STATE =====
        let animationTime = 0;
        let globalOpacity = 1;
        let sequencer = null;
        
        // All drawn elements: { x, y, color, rgb, opacity, size, isRoot }
        let allNodes = [];
        // All stems: { x1, y1, x2, y2, color, rgb, progress, opacity, isRoot }
        let allStems = [];
        
        // For the flip: we store "logical" positions relative to an anchor point,
        // then apply a flip transform to render them.
        // Each growth layer has nodes/stems with positions relative to the anchor.
        
        // A "layer" represents one growth cycle's geometry
        // { anchorY, direction: 1 (up) or -1 (down), nodes: [...], stems: [...] }
        let layers = [];
        
        // The flip is achieved by animating all existing layers' direction
        // from up (-1 in Y) to down (+1 in Y) around the anchor point.
        
        // Current anchor — where the origin node sits
        let anchorX = centerX;
        let anchorY = centerY + 40; // Slightly below center to start
        
        // Flip state: rotationAngle in radians, 0 = upright, PI = flipped
        let flipAngle = 0;
        let targetFlipAngle = 0;
        
        // ===== LAYER NODE =====
        // Positions stored relative to anchor, in "upward" orientation
        // relX, relY: relative position (relY negative = above anchor)
        class LayerNode {
            constructor(relX, relY, colorIndex) {
                this.relX = relX;
                this.relY = relY;
                this.color = palette[colorIndex % palette.length];
                this.rgb = hexToRgb(this.color);
                this.opacity = 0;
                this.size = config.nodeSize;
            }
        }
        
        class LayerStem {
            constructor(relX1, relY1, relX2, relY2, color) {
                this.relX1 = relX1; this.relY1 = relY1;
                this.relX2 = relX2; this.relY2 = relY2;
                this.color = color;
                this.rgb = hexToRgb(color);
                this.progress = 0;
                this.opacity = 1;
            }
        }
        
        class Layer {
            constructor(anchorX, anchorY) {
                this.anchorX = anchorX;
                this.anchorY = anchorY;
                this.nodes = [];
                this.stems = [];
                this.opacity = 1; // Layer-level opacity (for fading roots)
                this.isRoot = false;
            }
        }
        
        // ===== TRANSFORM =====
        // Apply the current flip rotation to a relative position
        function transformPoint(layer, relX, relY) {
            // Rotate around the anchor by flipAngle
            const cos = Math.cos(flipAngle);
            const sin = Math.sin(flipAngle);
            const rx = relX * cos - relY * sin;
            const ry = relX * sin + relY * cos;
            return {
                x: layer.anchorX + rx,
                y: layer.anchorY + ry
            };
        }
        
        // ===== DRAW FUNCTIONS =====
        function drawNode(layer, node) {
            const op = node.opacity * layer.opacity * globalOpacity;
            if (op <= 0) return;
            
            const pos = transformPoint(layer, node.relX, node.relY);
            
            // Glow
            if (op > 0.2) {
                const gradient = ctx.createRadialGradient(
                    pos.x, pos.y, 0, pos.x, pos.y, config.glowRadius
                );
                gradient.addColorStop(0, `rgba(${node.rgb.r}, ${node.rgb.g}, ${node.rgb.b}, ${config.glowOpacity * op})`);
                gradient.addColorStop(1, `rgba(${node.rgb.r}, ${node.rgb.g}, ${node.rgb.b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, config.glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = node.color;
            ctx.globalAlpha = op;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, node.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        function drawStem(layer, stem) {
            const op = config.stemOpacity * stem.opacity * layer.opacity * globalOpacity;
            if (op <= 0 || stem.progress <= 0) return;
            
            const p1 = transformPoint(layer, stem.relX1, stem.relY1);
            const endRelX = stem.relX1 + (stem.relX2 - stem.relX1) * stem.progress;
            const endRelY = stem.relY1 + (stem.relY2 - stem.relY1) * stem.progress;
            const p2 = transformPoint(layer, endRelX, endRelY);
            
            ctx.strokeStyle = `rgba(${stem.rgb.r}, ${stem.rgb.g}, ${stem.rgb.b}, ${op})`;
            ctx.lineWidth = config.stemWidth;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        // ===== SEQUENCER =====
        function createSequencer() {
            let steps = [];
            let stepIndex = 0;
            let stepElapsed = 0;
            
            return {
                add(duration, onUpdate, onComplete) {
                    steps.push({ duration, onUpdate, onComplete });
                },
                update(dt) {
                    if (stepIndex >= steps.length) return true;
                    stepElapsed += dt;
                    const step = steps[stepIndex];
                    const progress = Math.min(1, stepElapsed / step.duration);
                    if (step.onUpdate) step.onUpdate(progress, dt);
                    if (progress >= 1) {
                        if (step.onComplete) step.onComplete();
                        stepIndex++;
                        stepElapsed = 0;
                    }
                    return stepIndex >= steps.length;
                }
            };
        }
        
        // ===== BUILD GROWTH TREE =====
        // Returns { nodes: [...], stems: [...] } with positions relative to (0, 0)
        // direction: -1 = grow upward, +1 = grow downward (before flip transform)
        function buildGrowthTree(colorStart) {
            const treeNodes = [];
            const treeStems = [];
            
            // Origin node at (0, 0)
            const origin = new LayerNode(0, 0, colorStart);
            treeNodes.push(origin);
            
            // Main branches spreading upward (negative Y)
            const angleStart = -Math.PI / 2 - config.branchSpread / 2;
            const angleStep = config.branchSpread / (config.branchCount - 1 || 1);
            
            for (let i = 0; i < config.branchCount; i++) {
                const angle = config.branchCount === 1 
                    ? -Math.PI / 2 
                    : angleStart + angleStep * i;
                
                // Add slight randomness
                const jitterAngle = angle + (Math.random() - 0.5) * 0.2;
                const jitterLen = config.branchLength * (0.85 + Math.random() * 0.3);
                
                const bx = Math.cos(jitterAngle) * jitterLen;
                const by = Math.sin(jitterAngle) * jitterLen;
                
                const branchNode = new LayerNode(bx, by, colorStart + i + 1);
                treeNodes.push(branchNode);
                
                const stem = new LayerStem(0, 0, bx, by, origin.color);
                treeStems.push(stem);
                
                // Sub-branches from this branch
                const subAngleStart = jitterAngle - config.subBranchSpread / 2;
                const subAngleStep = config.subBranchSpread / (config.subBranchCount - 1 || 1);
                
                for (let j = 0; j < config.subBranchCount; j++) {
                    const subAngle = config.subBranchCount === 1
                        ? jitterAngle
                        : subAngleStart + subAngleStep * j;
                    
                    const sjAngle = subAngle + (Math.random() - 0.5) * 0.3;
                    const sjLen = config.subBranchLength * (0.8 + Math.random() * 0.4);
                    
                    const sx = bx + Math.cos(sjAngle) * sjLen;
                    const sy = by + Math.sin(sjAngle) * sjLen;
                    
                    const subNode = new LayerNode(sx, sy, colorStart + i + j + 2);
                    treeNodes.push(subNode);
                    
                    const subStem = new LayerStem(bx, by, sx, sy, branchNode.color);
                    treeStems.push(subStem);
                }
            }
            
            return { nodes: treeNodes, stems: treeStems };
        }
        
        // ===== BUILD SEQUENCE =====
        function buildSequence() {
            const seq = createSequencer();
            
            layers = [];
            flipAngle = 0;
            targetFlipAngle = 0;
            globalOpacity = 1;
            
            let colorOffset = Math.floor(Math.random() * palette.length);
            let totalFlips = 0;
            
            for (let cycle = 0; cycle < config.numCycles; cycle++) {
                const cycleColorStart = colorOffset + cycle * 4;
                
                // Create a new layer for this growth cycle
                let currentLayer = null;
                let tree = null;
                
                // Step: Fade in origin node
                seq.add(config.originFadeDuration, (p) => {
                    if (!currentLayer) {
                        currentLayer = new Layer(anchorX, anchorY);
                        tree = buildGrowthTree(cycleColorStart);
                        currentLayer.nodes = tree.nodes;
                        currentLayer.stems = tree.stems;
                        layers.push(currentLayer);
                        
                        // All nodes/stems start invisible
                        tree.nodes.forEach(n => { n.opacity = 0; });
                        tree.stems.forEach(s => { s.progress = 0; });
                    }
                    // Fade in origin
                    tree.nodes[0].opacity = easeOutCubic(p);
                }, () => {
                    tree.nodes[0].opacity = 1;
                });
                
                // Step: Grow main branches
                seq.add(config.growDuration, (p) => {
                    const eased = easeOutCubic(p);
                    // Main branches are first branchCount stems
                    for (let i = 0; i < config.branchCount; i++) {
                        if (tree.stems[i]) tree.stems[i].progress = eased;
                        // Branch node is index i+1
                        if (tree.nodes[i + 1]) tree.nodes[i + 1].opacity = Math.min(1, p * 2);
                    }
                }, () => {
                    for (let i = 0; i < config.branchCount; i++) {
                        if (tree.stems[i]) tree.stems[i].progress = 1;
                        if (tree.nodes[i + 1]) tree.nodes[i + 1].opacity = 1;
                    }
                });
                
                // Step: Grow sub-branches
                seq.add(config.subGrowDuration, (p) => {
                    const eased = easeOutCubic(p);
                    // Sub-branch stems start after main branches
                    for (let i = config.branchCount; i < tree.stems.length; i++) {
                        tree.stems[i].progress = eased;
                    }
                    // Sub-branch nodes start after origin + main branch nodes
                    for (let i = config.branchCount + 1; i < tree.nodes.length; i++) {
                        tree.nodes[i].opacity = Math.min(1, p * 2.5);
                    }
                }, () => {
                    tree.stems.forEach(s => { s.progress = 1; });
                    tree.nodes.forEach(n => { n.opacity = 1; });
                });
                
                // Step: Pause before flip
                seq.add(config.pauseAfterGrow, () => {}, () => {});
                
                // Step: Flip — rotate everything 180 degrees
                const flipFrom = totalFlips * Math.PI;
                const flipTo = (totalFlips + 1) * Math.PI;
                totalFlips++;
                
                seq.add(config.flipDuration, (p) => {
                    const eased = easeInOutQuad(p);
                    flipAngle = flipFrom + (flipTo - flipFrom) * eased;
                    
                    // Fade older layers as they become roots
                    layers.forEach((layer, idx) => {
                        if (idx < layers.length - 1) {
                            // Already a root layer — keep dim
                            layer.opacity = config.rootFadeAmount;
                        } else {
                            // Current layer transitions to root opacity
                            layer.opacity = 1 - (1 - config.rootFadeAmount) * eased;
                        }
                    });
                }, () => {
                    flipAngle = flipTo;
                    // Mark current layer as root
                    currentLayer.isRoot = true;
                });
                
                // Step: Pause after flip
                seq.add(config.pauseAfterFlip, () => {}, () => {});
            }
            
            // Final fade out
            seq.add(config.fadeOutDuration, (p) => {
                globalOpacity = 1 - easeInOutCubic(p);
            }, () => {
                globalOpacity = 0;
            });
            
            // Rest then restart
            seq.add(config.restDuration, () => {}, () => {
                layers = [];
                flipAngle = 0;
                globalOpacity = 1;
                sequencer = buildSequence();
            });
            
            return seq;
        }
        
        // ===== UPDATE =====
        function update(dt) {
            animationTime += dt;
            if (sequencer) sequencer.update(dt);
        }
        
        // ===== DRAW =====
        function draw() {
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw all layers: stems first, then nodes
            layers.forEach(layer => {
                layer.stems.forEach(s => drawStem(layer, s));
            });
            layers.forEach(layer => {
                layer.nodes.forEach(n => drawNode(layer, n));
            });
        }
        
        // ===== ANIMATION LOOP =====
        let lastTime = 0;
        function animate(currentTime) {
            const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016;
            lastTime = currentTime;
            const cappedDelta = Math.min(deltaTime, 0.1);
            
            update(cappedDelta);
            draw();
            
            requestAnimationFrame(animate);
        }
        
        // Initialize and start
        sequencer = buildSequence();
        requestAnimationFrame(animate);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelfLearningSystems);
    } else {
        initSelfLearningSystems();
    }
})();
