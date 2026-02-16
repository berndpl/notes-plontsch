// Self-Learning Systems v2 - Seed Growth Visualization
// A seed emerges from the bottom, grows upward, splits into two leaves,
// one leaf falls while the other continues growing. Cycle repeats.
// Represents: emergence → growth → divergence → selection → persistence.
(function() {
    'use strict';
    
    function initSelfLearningSystems() {
        const canvas = document.getElementById('2026-02-16-self-learning-systems-v2-canvas');
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
        
        // Growth palette — each generation picks from these
        const growthColors = [
            colors.lavender,
            colors.blue,
            colors.sapphire,
            colors.teal,
            colors.green,
            colors.mauve,
            colors.sky,
            colors.pink,
            colors.peach,
            colors.rosewater
        ];
        
        // Parse hex to RGB
        function hexToRgb(hex) {
            const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return r ? {
                r: parseInt(r[1], 16),
                g: parseInt(r[2], 16),
                b: parseInt(r[3], 16)
            } : { r: 180, g: 190, b: 254 };
        }
        
        // Easing
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        function easeInCubic(t) {
            return t * t * t;
        }
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        
        // ===== CONFIGURATION =====
        const config = {
            nodeSize: 5,                  // Node radius
            stemSegmentLength: 60,        // Vertical distance per growth step
            splitAngle: Math.PI * 0.28,   // Angle of leaf split from vertical
            splitLength: 55,              // Length of split branches
            
            // Timing (seconds)
            seedRiseDuration: 1.8,        // Seed rises from bottom
            stemGrowDuration: 1.2,        // Stem grows upward
            splitDuration: 1.0,           // Node splits into two leaves
            pauseAfterSplit: 0.6,         // Brief pause after split
            fallDuration: 2.5,            // Falling leaf duration
            pauseAfterFall: 0.4,          // Pause after leaf falls
            
            // How many grow-split-fall cycles before full reset
            maxGenerations: 5,
            
            // Fade and reset
            fadeOutDuration: 2.0,
            restDuration: 1.5,
            
            // Falling leaf physics
            fallGravity: 120,             // Pixels/s² downward
            fallDrift: 40,                // Horizontal drift amplitude
            fallDriftFreq: 2.5,           // Drift oscillation frequency
            
            // Stem line
            stemOpacity: 0.15,
            stemWidth: 1.2,
            
            // Glow
            glowRadius: 18,
            glowOpacity: 0.1
        };
        // ===== END CONFIGURATION =====
        
        // ===== ANIMATION STATE =====
        let animationTime = 0;
        let nodes = [];           // All visible nodes
        let stems = [];           // Connection lines
        let fallingLeaves = [];   // Leaves currently falling
        let currentTip = null;    // The node that will next grow/split
        let sequencer = null;     // Step-by-step animation sequencer
        let globalOpacity = 1;
        let generation = 0;
        
        // ===== NODE =====
        class GrowthNode {
            constructor(x, y, colorIndex) {
                this.x = x;
                this.y = y;
                this.color = growthColors[colorIndex % growthColors.length];
                this.rgb = hexToRgb(this.color);
                this.opacity = 0;
                this.targetOpacity = 1;
                this.size = config.nodeSize;
                this.fadeSpeed = 3;
                this._falling = false;
                this._surviving = false;
            }
            
            update(dt) {
                if (this.opacity < this.targetOpacity) {
                    this.opacity = Math.min(this.targetOpacity, this.opacity + dt * this.fadeSpeed);
                } else if (this.opacity > this.targetOpacity) {
                    this.opacity = Math.max(this.targetOpacity, this.opacity - dt * this.fadeSpeed);
                }
            }
            
            draw() {
                const op = this.opacity * globalOpacity;
                if (op <= 0) return;
                
                // Glow
                if (op > 0.3) {
                    const gradient = ctx.createRadialGradient(
                        this.x, this.y, 0,
                        this.x, this.y, config.glowRadius
                    );
                    gradient.addColorStop(0, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${config.glowOpacity * op})`);
                    gradient.addColorStop(1, `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, config.glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Node
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        
        // ===== STEM SEGMENT =====
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
        class FallingLeaf {
            constructor(node) {
                this.startX = node.x;
                this.startY = node.y;
                this.x = node.x;
                this.y = node.y;
                this.color = node.color;
                this.rgb = node.rgb;
                this.size = node.size;
                this.opacity = 1;
                this.elapsed = 0;
                this.done = false;
                this.driftDir = Math.random() > 0.5 ? 1 : -1;
                this.driftPhase = Math.random() * Math.PI * 2;
            }
            
            update(dt) {
                this.elapsed += dt;
                const t = this.elapsed;
                
                // Gravity
                this.y = this.startY + 0.5 * config.fallGravity * t * t;
                
                // Horizontal drift
                this.x = this.startX + this.driftDir * Math.sin(t * config.fallDriftFreq + this.driftPhase) * config.fallDrift;
                
                // Fade out
                const fadeStart = config.fallDuration * 0.4;
                if (this.elapsed > fadeStart) {
                    this.opacity = Math.max(0, 1 - (this.elapsed - fadeStart) / (config.fallDuration - fadeStart));
                }
                
                if (this.y > canvas.height + 20 || this.opacity <= 0) {
                    this.done = true;
                }
            }
            
            draw() {
                const op = this.opacity * globalOpacity;
                if (op <= 0) return;
                
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op * 0.7;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.9, 0, Math.PI * 2);
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
        
        // ===== BUILD THE ANIMATION SEQUENCE =====
        function buildSequence() {
            const seq = createSequencer();
            
            const startX = centerX;
            const startY = canvas.height - 60;
            let colorIdx = Math.floor(Math.random() * growthColors.length);
            
            // Step 1: Seed rises from below the canvas
            const seedStartY = canvas.height + 20;
            let seedNode = null;
            
            seq.add(config.seedRiseDuration, (p) => {
                if (!seedNode) {
                    seedNode = new GrowthNode(startX, seedStartY, colorIdx);
                    seedNode.opacity = 0;
                    nodes.push(seedNode);
                }
                const eased = easeOutCubic(p);
                seedNode.y = seedStartY + (startY - seedStartY) * eased;
                seedNode.opacity = Math.min(1, p * 3);
            }, () => {
                seedNode.y = startY;
                seedNode.opacity = 1;
                currentTip = seedNode;
            });
            
            // Grow-split-fall cycles
            function addGrowSplitCycle(gen) {
                let stemSegment = null;
                let topNode = null;
                let leftNode = null;
                let rightNode = null;
                let leftStem = null;
                let rightStem = null;
                let tipAtStart = null;
                
                colorIdx++;
                const thisColorIdx = colorIdx;
                
                // Grow stem upward
                seq.add(config.stemGrowDuration, (p) => {
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
                
                // Split into two leaves
                seq.add(config.splitDuration, (p) => {
                    const tipX = currentTip.x;
                    const tipY = currentTip.y;
                    const eased = easeOutCubic(p);
                    
                    const leftAngle = -Math.PI / 2 - config.splitAngle;
                    const leftTargetX = tipX + Math.cos(leftAngle) * config.splitLength;
                    const leftTargetY = tipY + Math.sin(leftAngle) * config.splitLength;
                    
                    const rightAngle = -Math.PI / 2 + config.splitAngle;
                    const rightTargetX = tipX + Math.cos(rightAngle) * config.splitLength;
                    const rightTargetY = tipY + Math.sin(rightAngle) * config.splitLength;
                    
                    if (!leftNode) {
                        leftNode = new GrowthNode(tipX, tipY, thisColorIdx + 1);
                        leftNode.opacity = 0;
                        nodes.push(leftNode);
                        leftStem = new Stem(tipX, tipY, leftTargetX, leftTargetY, leftNode.color);
                        stems.push(leftStem);
                    }
                    if (!rightNode) {
                        rightNode = new GrowthNode(tipX, tipY, thisColorIdx + 2);
                        rightNode.opacity = 0;
                        nodes.push(rightNode);
                        rightStem = new Stem(tipX, tipY, rightTargetX, rightTargetY, rightNode.color);
                        stems.push(rightStem);
                    }
                    
                    leftNode.x = tipX + (leftTargetX - tipX) * eased;
                    leftNode.y = tipY + (leftTargetY - tipY) * eased;
                    leftNode.opacity = Math.min(1, p * 2.5);
                    leftStem.progress = eased;
                    
                    rightNode.x = tipX + (rightTargetX - tipX) * eased;
                    rightNode.y = tipY + (rightTargetY - tipY) * eased;
                    rightNode.opacity = Math.min(1, p * 2.5);
                    rightStem.progress = eased;
                    
                    // Junction node shrinks slightly
                    currentTip.size = config.nodeSize * (1 - eased * 0.3);
                }, () => {
                    leftNode.opacity = 1;
                    rightNode.opacity = 1;
                });
                
                // Brief pause
                seq.add(config.pauseAfterSplit, () => {}, () => {});
                
                // One leaf falls
                let fallStarted = false;
                seq.add(config.fallDuration, (p) => {
                    if (!fallStarted) {
                        fallStarted = true;
                        // Alternate which side falls
                        const fallLeft = gen % 2 === 0;
                        const faller = fallLeft ? leftNode : rightNode;
                        const survivor = fallLeft ? rightNode : leftNode;
                        
                        faller._falling = true;
                        survivor._surviving = true;
                        
                        const leaf = new FallingLeaf(faller);
                        fallingLeaves.push(leaf);
                        
                        const idx = nodes.indexOf(faller);
                        if (idx >= 0) nodes.splice(idx, 1);
                        
                        const fallerStem = fallLeft ? leftStem : rightStem;
                        if (fallerStem) fallerStem._fading = true;
                    }
                    
                    // Fade the disconnected stem
                    [leftStem, rightStem].forEach(s => {
                        if (s && s._fading) {
                            s.progress = Math.max(0, 1 - easeInCubic(p));
                        }
                    });
                }, () => {
                    const survivor = leftNode._surviving ? leftNode : rightNode;
                    currentTip = survivor;
                    stems = stems.filter(s => !s._fading);
                });
                
                // Brief pause after fall
                seq.add(config.pauseAfterFall, () => {}, () => {});
            }
            
            for (let g = 0; g < config.maxGenerations; g++) {
                addGrowSplitCycle(g);
            }
            
            // Final fade out
            seq.add(config.fadeOutDuration, (p) => {
                globalOpacity = 1 - easeInOutCubic(p);
            }, () => {
                globalOpacity = 0;
            });
            
            // Rest then restart
            seq.add(config.restDuration, () => {}, () => {
                nodes = [];
                stems = [];
                fallingLeaves = [];
                currentTip = null;
                globalOpacity = 1;
                generation++;
                sequencer = buildSequence();
            });
            
            return seq;
        }
        
        // ===== UPDATE =====
        function update(dt) {
            animationTime += dt;
            
            if (sequencer) {
                sequencer.update(dt);
            }
            
            nodes.forEach(n => n.update(dt));
            
            fallingLeaves.forEach(l => l.update(dt));
            fallingLeaves = fallingLeaves.filter(l => !l.done);
        }
        
        // ===== DRAW =====
        function draw() {
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            stems.forEach(s => s.draw());
            nodes.forEach(n => n.draw());
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
