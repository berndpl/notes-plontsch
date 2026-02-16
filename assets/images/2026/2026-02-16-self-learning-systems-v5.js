// Self-Learning Systems v5 - Growth & Dissolve
// A seed grows, splits into multiple leaves (increasing over time),
// everything accelerates. Fallen leaves dissolve into the ground. Repeat.
// Represents: explore → branch → shed → nourish the soil → grow again.
(function() {
    'use strict';
    
    function initSelfLearningSystems() {
        const canvas = document.getElementById('2026-02-16-self-learning-systems-v5-canvas');
        if (!canvas) {
            console.warn('Self-Learning Systems v5: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Self-Learning Systems v5: Could not get 2D context');
            return;
        }
        
        canvas.width = 1200;
        canvas.height = 638;
        
        // Catppuccin Mocha colors
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
        const groundY = canvas.height - 35;
        
        const palette = [
            colors.lavender, colors.blue, colors.sapphire,
            colors.sky, colors.teal, colors.green,
            colors.yellow, colors.peach, colors.mauve,
            colors.pink, colors.rosewater
        ];
        
        function hexToRgb(hex) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
                     : { r: 180, g: 190, b: 254 };
        }
        
        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        function easeInCubic(t) { return t * t * t; }
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        
        // ===== CONFIGURATION =====
        const config = {
            nodeSize: 4,
            stemSegmentLength: 55,
            splitLength: 50,
            
            // Starting timing (seconds) — these get faster each generation
            baseStemGrowDuration: 1.2,
            baseSplitDuration: 0.9,
            basePauseAfterSplit: 0.5,
            baseFallDuration: 2.0,
            basePauseAfterFall: 0.3,
            
            // Speed multiplier: each generation multiplies duration by this
            // (< 1 means faster — aggressive ramp-up)
            speedUpFactor: 0.6,
            
            // Seed rise
            seedRiseDuration: 1.5,
            
            // Split counts: how many leaves per generation [gen0, gen1, gen2, ...]
            splitCounts: [2, 3, 3, 4, 5, 6],
            
            // How many grow-split-fall cycles
            maxGenerations: 6,
            
            // Falling — mostly straight down
            fallGravity: 100,
            fallDrift: 8,
            fallDriftFreq: 2.2,
            
            // Dissolve — landed leaves fade into the ground
            // Duration in seconds for a landed leaf to fully dissolve
            dissolveDuration: 3.0,
            
            // Fade and reset
            restDuration: 1.0,
            
            // Stem
            stemOpacity: 0.15,
            stemWidth: 1.2,
            
            // Glow
            glowRadius: 14,
            glowOpacity: 0.08,
            
            // Wind sway — gentle oscillation like grass in a breeze
            // The whole structure pivots slightly around the root
            windAmplitude: 6,       // max horizontal pixel offset at tree top
            windFreq: 0.4,          // oscillation speed (Hz)
            windFreq2: 0.17         // secondary slower frequency for organic feel
        };
        // ===== END CONFIGURATION =====
        
        // ===== STATE =====
        let animationTime = 0;
        let nodes = [];
        let stems = [];
        let fallingLeaves = [];   // Currently falling or dissolving on ground
        let currentTip = null;
        let sequencer = null;
        let globalOpacity = 1;
        let rootNode = null;      // Reference to the seed/root
        
        // Wind skew helper — returns the current horizontal offset
        // for a point at the given y coordinate due to wind sway.
        // Used to bake visual position into detaching leaves so they
        // don't jump when leaving the swayed coordinate space.
        function getWindXOffset(y) {
            const windOffset = Math.sin(animationTime * Math.PI * 2 * config.windFreq)
                             * config.windAmplitude
                             + Math.sin(animationTime * Math.PI * 2 * config.windFreq2 + 1.3)
                             * config.windAmplitude * 0.5;
            const skew = windOffset / (canvas.height * 0.6);
            return skew * (y - groundY);
        }
        
        // ===== NODE =====
        class GrowthNode {
            constructor(x, y, colorIndex) {
                this.x = x;
                this.y = y;
                this.color = palette[colorIndex % palette.length];
                this.rgb = hexToRgb(this.color);
                this.opacity = 0;
                this.size = config.nodeSize;
                this._falling = false;
                this._surviving = false;
            }
            
            update(dt) {}
            
            draw() {
                const op = this.opacity * globalOpacity;
                if (op <= 0) return;
                
                if (op > 0.2) {
                    const gradient = ctx.createRadialGradient(
                        this.x, this.y, 0, this.x, this.y, config.glowRadius
                    );
                    gradient.addColorStop(0, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${config.glowOpacity * op})`);
                    gradient.addColorStop(1, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, config.glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        
        // ===== STEM =====
        class Stem {
            constructor(x1, y1, x2, y2, color) {
                this.x1 = x1; this.y1 = y1;
                this.x2 = x2; this.y2 = y2;
                this.color = color;
                this.rgb = hexToRgb(color);
                this.progress = 0;
                this._fading = false;
            }
            
            draw() {
                const op = config.stemOpacity * globalOpacity;
                if (op <= 0 || this.progress <= 0) return;
                
                const ex = this.x1 + (this.x2 - this.x1) * this.progress;
                const ey = this.y1 + (this.y2 - this.y1) * this.progress;
                
                ctx.strokeStyle = `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${op})`;
                ctx.lineWidth = config.stemWidth;
                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
        
        // ===== FALLING LEAF =====
        // Falls to ground, then slowly dissolves (fades + shrinks) in place
        class FallingLeaf {
            constructor(node, noDrift = false, fallDelay = 0) {
                // Bake wind offset into start position so there's no
                // visual jump when leaving the swayed coordinate space
                const windX = getWindXOffset(node.y);
                this.startX = node.x + windX;
                this.startY = node.y;
                this.x = node.x + windX;
                this.y = node.y;
                this.color = node.color;
                this.rgb = node.rgb;
                this.size = node.size;
                this.opacity = 1;
                this.elapsed = 0;
                this.landed = false;
                this.dissolved = false;  // fully gone
                this.driftDir = Math.random() > 0.5 ? 1 : -1;
                this.driftAmount = noDrift ? 5 : config.fallDrift;
                this.fallDelay = fallDelay;
                // Dissolve tracking
                this.dissolveElapsed = 0;
                // Randomise dissolve duration slightly for organic feel
                this.dissolveDuration = config.dissolveDuration * (0.7 + Math.random() * 0.6);
            }
            
            update(dt) {
                if (this.dissolved) return;
                
                if (!this.landed) {
                    // Falling phase
                    this.elapsed += dt;
                    if (this.elapsed < this.fallDelay) return;
                    const t = this.elapsed - this.fallDelay;
                    
                    const newY = this.startY + 0.5 * config.fallGravity * t * t;
                    const newX = this.startX + this.driftDir * Math.sin(t * config.fallDriftFreq) * this.driftAmount;
                    
                    if (newY >= groundY) {
                        this.landed = true;
                        this.y = groundY;
                        this.x = newX + (Math.random() - 0.5) * 10;
                        this.opacity = 0.6;
                        this.size = config.nodeSize;
                    } else {
                        this.y = newY;
                        this.x = newX;
                    }
                } else {
                    // Dissolve phase — slowly fade and shrink into the ground
                    this.dissolveElapsed += dt;
                    const p = Math.min(1, this.dissolveElapsed / this.dissolveDuration);
                    const eased = easeInCubic(p); // slow start, accelerates toward end
                    
                    this.opacity = 0.6 * (1 - eased);
                    this.size = config.nodeSize * (1 - eased * 0.8);
                    
                    if (p >= 1) {
                        this.dissolved = true;
                    }
                }
            }
            
            draw() {
                if (this.dissolved) return;
                const op = this.opacity * globalOpacity;
                if (op <= 0) return;
                
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(this.x, this.y, Math.max(0.5, this.size * 0.85), 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
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
        
        // ===== BUILD SEQUENCE =====
        function buildSequenceProper() {
            const seq = createSequencer();
            
            const startX = centerX;
            // Root node sits at ground level — same height where leaves land
            const startY = groundY;
            let colorIdx = Math.floor(Math.random() * palette.length);
            
            function dur(base, gen) {
                return base * Math.pow(config.speedUpFactor, gen);
            }
            
            // Seed appears at ground level
            const seedStartY = canvas.height + 20;
            let seedNode = null;
            
            // If rootNode already exists (from previous cycle), reuse it
            // instead of creating a new one — keeps continuity
            if (rootNode) {
                seedNode = rootNode;
                currentTip = seedNode;
                seq.add(0.3, () => {}, () => {});
            } else {
                seq.add(config.seedRiseDuration, (p) => {
                    if (!seedNode) {
                        seedNode = new GrowthNode(startX, seedStartY, colorIdx);
                        seedNode.opacity = 0;
                        nodes.push(seedNode);
                        rootNode = seedNode;
                    }
                    const eased = easeOutCubic(p);
                    seedNode.y = seedStartY + (startY - seedStartY) * eased;
                    seedNode.opacity = Math.min(1, p * 3);
                }, () => {
                    seedNode.y = startY;
                    seedNode.opacity = 1;
                    currentTip = seedNode;
                });
            }
            
            function addCycle(gen) {
                let stemSegment = null;
                let topNode = null;
                let leafNodes = [];
                let leafStems = [];
                let tipAtStart = null;
                
                colorIdx++;
                const thisColorIdx = colorIdx;
                const splitCount = config.splitCounts[Math.min(gen, config.splitCounts.length - 1)];
                
                // Grow
                seq.add(dur(config.baseStemGrowDuration, gen), (p) => {
                    if (!tipAtStart) tipAtStart = currentTip;
                    const fromX = tipAtStart.x;
                    const fromY = tipAtStart.y;
                    const toY = fromY - config.stemSegmentLength;
                    
                    if (!stemSegment) {
                        stemSegment = new Stem(fromX, fromY, fromX, toY, tipAtStart.color);
                        stems.push(stemSegment);
                    }
                    stemSegment.progress = easeOutCubic(p);
                    
                    if (!topNode) {
                        topNode = new GrowthNode(fromX, fromY, thisColorIdx);
                        topNode.opacity = 0;
                        nodes.push(topNode);
                    }
                    topNode.y = fromY + (toY - fromY) * easeOutCubic(p);
                    topNode.x = fromX;
                    topNode.opacity = Math.min(1, p * 2);
                }, () => {
                    topNode.opacity = 1;
                    stemSegment.progress = 1;
                    currentTip = topNode;
                });
                
                // Split
                seq.add(dur(config.baseSplitDuration, gen), (p) => {
                    const tipX = currentTip.x;
                    const tipY = currentTip.y;
                    const eased = easeOutCubic(p);
                    
                    if (leafNodes.length === 0) {
                        const totalSpread = Math.PI * 0.7 + splitCount * 0.08;
                        for (let i = 0; i < splitCount; i++) {
                            const frac = splitCount === 1 ? 0.5 : i / (splitCount - 1);
                            const angle = -Math.PI / 2 - totalSpread / 2 + totalSpread * frac;
                            const jAngle = angle + (Math.random() - 0.5) * 0.15;
                            const jLen = config.splitLength * (0.85 + Math.random() * 0.3);
                            
                            const targetX = tipX + Math.cos(jAngle) * jLen;
                            const targetY = tipY + Math.sin(jAngle) * jLen;
                            
                            const leaf = new GrowthNode(tipX, tipY, thisColorIdx + i + 1);
                            leaf.opacity = 0;
                            leaf._targetX = targetX;
                            leaf._targetY = targetY;
                            nodes.push(leaf);
                            leafNodes.push(leaf);
                            
                            const stem = new Stem(tipX, tipY, targetX, targetY, leaf.color);
                            stems.push(stem);
                            leafStems.push(stem);
                        }
                    }
                    
                    leafNodes.forEach((leaf, i) => {
                        leaf.x = tipX + (leaf._targetX - tipX) * eased;
                        leaf.y = tipY + (leaf._targetY - tipY) * eased;
                        leaf.opacity = Math.min(1, p * 2.5);
                        leafStems[i].progress = eased;
                    });
                    
                    currentTip.size = config.nodeSize * (1 - eased * 0.3);
                }, () => {
                    leafNodes.forEach(l => { l.opacity = 1; });
                });
                
                // Pause
                seq.add(dur(config.basePauseAfterSplit, gen), () => {}, () => {});
                
                // Leaves fall (all except survivor)
                let fallStarted = false;
                const survivorIdx = Math.floor(Math.random() * splitCount);
                
                seq.add(dur(config.baseFallDuration, gen), (p) => {
                    if (!fallStarted) {
                        fallStarted = true;
                        leafNodes.forEach((leaf, i) => {
                            if (i === survivorIdx) {
                                leaf._surviving = true;
                            } else {
                                leaf._falling = true;
                                const staggerDelay = Math.random() * 0.35;
                                const fl = new FallingLeaf(leaf, false, staggerDelay);
                                fallingLeaves.push(fl);
                                const idx = nodes.indexOf(leaf);
                                if (idx >= 0) nodes.splice(idx, 1);
                                leafStems[i]._fading = true;
                            }
                        });
                    }
                    
                    leafStems.forEach(s => {
                        if (s && s._fading) {
                            s.progress = Math.max(0, 1 - easeInCubic(p));
                        }
                    });
                }, () => {
                    currentTip = leafNodes[survivorIdx];
                    stems = stems.filter(s => !s._fading);
                });
                
                // Pause
                seq.add(dur(config.basePauseAfterFall, gen), () => {}, () => {});
            }
            
            for (let g = 0; g < config.maxGenerations; g++) {
                addCycle(g);
            }
            
            // ===== END PHASE =====
            // Tree collapses: remaining nodes fall to ground and dissolve.
            // New growth starts immediately — dissolving continues in background.
            
            let treeFallStarted = false;
            seq.add(1.2, (p, dt) => {
                if (!treeFallStarted) {
                    treeFallStarted = true;
                    nodes.forEach(n => {
                        if (n === seedNode) return; // keep root alive
                        const stagger = Math.random() * 0.4;
                        const fl = new FallingLeaf(n, true, stagger);
                        fallingLeaves.push(fl);
                    });
                    nodes = seedNode ? [seedNode] : [];
                }
                const stemFade = easeInOutCubic(Math.min(1, p * 2));
                stems.forEach(s => { s.progress = Math.max(0, 1 - stemFade); });
            }, () => {
                stems = [];
            });
            
            // Restart immediately — leaves dissolve in background
            seq.add(0.3, () => {}, () => {
                nodes = seedNode ? [seedNode] : [];
                stems = [];
                globalOpacity = 1;
                sequencer = buildSequenceProper();
            });
            
            return seq;
        }
        
        // ===== UPDATE =====
        function update(dt) {
            animationTime += dt;
            if (sequencer) sequencer.update(dt);
            
            nodes.forEach(n => n.update(dt));
            fallingLeaves.forEach(l => l.update(dt));
            
            // Remove fully dissolved leaves
            fallingLeaves = fallingLeaves.filter(fl => !fl.dissolved);
        }
        
        // ===== DRAW =====
        function draw() {
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Wind sway: pivot the whole scene around the root point.
            // Offset increases with distance from ground, so tree top
            // sways most while the base stays planted — like grass in wind.
            const windOffset = Math.sin(animationTime * Math.PI * 2 * config.windFreq)
                             * config.windAmplitude
                             + Math.sin(animationTime * Math.PI * 2 * config.windFreq2 + 1.3)
                             * config.windAmplitude * 0.5;
            
            const pivotY = groundY;
            
            ctx.save();
            const skew = windOffset / (canvas.height * 0.6);
            ctx.transform(1, 0, skew, 1, -skew * pivotY, 0);
            
            stems.forEach(s => s.draw());
            nodes.forEach(n => n.draw());
            
            ctx.restore();
            
            // Falling/dissolving leaves are NOT swayed — they're detached
            fallingLeaves.forEach(l => l.draw());
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
        
        sequencer = buildSequenceProper();
        requestAnimationFrame(animate);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelfLearningSystems);
    } else {
        initSelfLearningSystems();
    }
})();
