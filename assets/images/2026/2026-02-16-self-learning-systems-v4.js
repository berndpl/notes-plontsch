// Self-Learning Systems v4 - Accelerating Growth & Return
// A seed grows, splits into multiple leaves (increasing over time),
// everything accelerates. Fallen leaves collect back into the root. Repeat.
// Represents: explore → branch → shed → absorb → grow again.
(function() {
    'use strict';
    
    function initSelfLearningSystems() {
        const canvas = document.getElementById('2026-02-16-self-learning-systems-v4-canvas');
        if (!canvas) {
            console.warn('Self-Learning Systems v4: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Self-Learning Systems v4: Could not get 2D context');
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
        function easeInQuad(t) { return t * t; }
        
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
            // Increasing split count as the system "learns" to branch more
            splitCounts: [2, 3, 3, 4, 5, 6],
            
            // How many grow-split-fall cycles
            maxGenerations: 6,
            
            // Falling — more straight down, minimal drift
            fallGravity: 100,
            fallDrift: 8,
            fallDriftFreq: 2.2,
            
            // Collection phase — leaves return to root
            collectDuration: 2.5,
            collectPause: 0.8,
            
            // Fade and reset
            fadeOutDuration: 1.5,
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
            windFreq2: 0.17,        // secondary slower frequency for organic feel
            
            // Root absorption bump
            rootBumpSize: 2.5,      // extra radius added per absorbed node
            rootBumpDecay: 12.0     // how fast the bump fades (units/sec) — snappy reset
        };
        // ===== END CONFIGURATION =====
        
        // ===== STATE =====
        let animationTime = 0;
        let nodes = [];
        let stems = [];
        let fallingLeaves = [];   // Currently falling
        let landedLeaves = [];    // Resting on ground
        let currentTip = null;
        let sequencer = null;
        let globalOpacity = 1;
        let rootNode = null;      // Reference to the seed/root
        let rootBump = 0;         // Temporary size increase when absorbing nodes
        
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
                // If this is the root node, add the absorption bump (capped at 2x original size)
                const drawSize = (this === rootNode)
                    ? Math.min(this.size + rootBump, this.size * 2)
                    : this.size;
                ctx.arc(this.x, this.y, drawSize, 0, Math.PI * 2);
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
        class FallingLeaf {
            constructor(node, noDrift = false, fallDelay = 0) {
                this.startX = node.x;
                this.startY = node.y;
                this.x = node.x;
                this.y = node.y;
                this.color = node.color;
                this.rgb = node.rgb;
                this.size = node.size;
                this.opacity = 1;
                this.elapsed = 0;
                this.landed = false;
                this.driftDir = Math.random() > 0.5 ? 1 : -1;
                // noDrift: for tree-collapse, minimal sideways movement
                this.driftAmount = noDrift ? 5 : config.fallDrift;
                // Stagger: delay before this leaf starts falling
                this.fallDelay = fallDelay;
            }
            
            update(dt) {
                if (this.landed) return;
                
                this.elapsed += dt;
                // Wait out the stagger delay before physics kicks in
                if (this.elapsed < this.fallDelay) return;
                const t = this.elapsed - this.fallDelay;
                
                const newY = this.startY + 0.5 * config.fallGravity * t * t;
                const newX = this.startX + this.driftDir * Math.sin(t * config.fallDriftFreq) * this.driftAmount;
                
                if (newY >= groundY) {
                    this.landed = true;
                    this.y = groundY;
                    // Final X position with some scatter
                    this.x = newX + (Math.random() - 0.5) * 10;
                    this.opacity = 0.6;
                    // Normalize size so all ground nodes sit at same level
                    this.size = config.nodeSize;
                } else {
                    this.y = newY;
                    this.x = newX;
                }
            }
            
            draw() {
                const op = this.opacity * globalOpacity;
                if (op <= 0) return;
                
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.85, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        
        // ===== COLLECTING LEAF =====
        // A landed leaf that animates back toward the root
        class CollectingLeaf {
            constructor(leaf, targetX, targetY, delay, totalDuration) {
                this.startX = leaf.x;
                this.startY = leaf.y;
                this.x = leaf.x;
                this.y = leaf.y;
                this.color = leaf.color;
                this.rgb = leaf.rgb;
                this.size = leaf.size;
                this.opacity = leaf.opacity;
                this.delay = delay;
                this.totalDuration = totalDuration;
                this.targetX = targetX;
                this.targetY = targetY;
                this.elapsed = 0;
                this.done = false;
            }
            
            update(dt) {
                if (this.done) return;
                this.elapsed += dt;
                
                const activeTime = this.elapsed - this.delay;
                if (activeTime < 0) return; // Still waiting
                
                const moveDuration = this.totalDuration - this.delay;
                const p = Math.min(1, activeTime / moveDuration);
                const eased = easeInOutCubic(p);
                
                this.x = this.startX + (this.targetX - this.startX) * eased;
                this.y = this.startY + (this.targetY - this.startY) * eased;
                
                // Shrink as approaching target
                this.size = config.nodeSize * 0.85 * (1 - eased * 0.6);
                
                // Fade slightly toward end
                this.opacity = 0.6 * (1 - eased * 0.3);
                
                if (p >= 1) {
                    this.done = true;
                }
            }
            
            draw() {
                const op = this.opacity * globalOpacity;
                if (op <= 0 || this.done) return;
                
                ctx.fillStyle = this.color;
                ctx.globalAlpha = op;
                ctx.beginPath();
                ctx.arc(this.x, this.y, Math.max(1, this.size), 0, Math.PI * 2);
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
        function buildSequence() {
            const seq = createSequencer();
            
            const startX = centerX;
            const startY = canvas.height - 60;
            let colorIdx = Math.floor(Math.random() * palette.length);
            let collectingLeaves = [];
            
            // Get duration for a generation, applying speed-up
            function dur(base, gen) {
                return base * Math.pow(config.speedUpFactor, gen);
            }
            
            // Step 1: Seed rises
            const seedStartY = canvas.height + 20;
            let seedNode = null;
            
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
            
            // Grow-split-fall cycles with acceleration
            function addGrowSplitCycle(gen) {
                let stemSegment = null;
                let topNode = null;
                let leafNodes = [];
                let leafStems = [];
                let tipAtStart = null;
                
                colorIdx++;
                const thisColorIdx = colorIdx;
                const splitCount = config.splitCounts[Math.min(gen, config.splitCounts.length - 1)];
                
                // Grow stem upward
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
                
                // Split into multiple leaves
                seq.add(dur(config.baseSplitDuration, gen), (p) => {
                    const tipX = currentTip.x;
                    const tipY = currentTip.y;
                    const eased = easeOutCubic(p);
                    
                    // Create leaf nodes on first frame
                    if (leafNodes.length === 0) {
                        const totalSpread = Math.PI * 0.7 + splitCount * 0.08;
                        for (let i = 0; i < splitCount; i++) {
                            // Distribute evenly across the angular spread, centered upward
                            const frac = splitCount === 1 ? 0.5 : i / (splitCount - 1);
                            const angle = -Math.PI / 2 - totalSpread / 2 + totalSpread * frac;
                            // Slight random variation
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
                    
                    // Animate leaves outward
                    const tipX2 = currentTip.x;
                    const tipY2 = currentTip.y;
                    leafNodes.forEach((leaf, i) => {
                        leaf.x = tipX2 + (leaf._targetX - tipX2) * eased;
                        leaf.y = tipY2 + (leaf._targetY - tipY2) * eased;
                        leaf.opacity = Math.min(1, p * 2.5);
                        leafStems[i].progress = eased;
                    });
                    
                    // Junction shrinks
                    currentTip.size = config.nodeSize * (1 - eased * 0.3);
                }, () => {
                    leafNodes.forEach(l => { l.opacity = 1; });
                });
                
                // Brief pause
                seq.add(dur(config.basePauseAfterSplit, gen), () => {}, () => {});
                
                // All leaves except one (the survivor) fall
                let fallStarted = false;
                // Pick a random survivor
                const survivorIdx = Math.floor(Math.random() * splitCount);
                
                seq.add(dur(config.baseFallDuration, gen), (p) => {
                    if (!fallStarted) {
                        fallStarted = true;
                        
                        leafNodes.forEach((leaf, i) => {
                            if (i === survivorIdx) {
                                leaf._surviving = true;
                            } else {
                                leaf._falling = true;
                                
                                const fl = new FallingLeaf(leaf);
                                fallingLeaves.push(fl);
                                
                                // Remove from nodes
                                const idx = nodes.indexOf(leaf);
                                if (idx >= 0) nodes.splice(idx, 1);
                                
                                // Mark stem for fading
                                leafStems[i]._fading = true;
                            }
                        });
                    }
                    
                    // Fade detached stems
                    leafStems.forEach(s => {
                        if (s && s._fading) {
                            s.progress = Math.max(0, 1 - easeInCubic(p));
                        }
                    });
                }, () => {
                    const survivor = leafNodes[survivorIdx];
                    currentTip = survivor;
                    stems = stems.filter(s => !s._fading);
                });
                
                // Brief pause
                seq.add(dur(config.basePauseAfterFall, gen), () => {}, () => {});
            }
            
            // Add all grow-split-fall cycles
            for (let g = 0; g < config.maxGenerations; g++) {
                addGrowSplitCycle(g);
            }
            
            // ===== COLLECTION PHASE =====
            // Fade the tree, then animate landed leaves back to root
            
            // Fade tree (nodes + stems) but keep landed leaves
            seq.add(1.0, (p) => {
                const eased = easeInOutCubic(p);
                // Fade tree nodes
                nodes.forEach(n => {
                    n.opacity = 1 - eased;
                });
            }, () => {
                // Remove all tree nodes and stems
                nodes = [];
                stems = [];
                // Move falling (still airborne) to landed
                fallingLeaves.forEach(fl => {
                    if (!fl.landed) {
                        fl.landed = true;
                        fl.y = groundY;
                        fl.opacity = 0.6;
                    }
                });
                // Merge all into landedLeaves
                landedLeaves = [...landedLeaves, ...fallingLeaves];
                fallingLeaves = [];
            });
            
            // Brief pause before collection
            seq.add(0.5, () => {}, () => {});
            
            // Collect all landed leaves back to root position
            seq.add(config.collectDuration, (p) => {
                // On first frame, create collecting leaves from all landed
                if (collectingLeaves.length === 0 && landedLeaves.length > 0) {
                    const spread = landedLeaves.length;
                    landedLeaves.forEach((leaf, i) => {
                        // Stagger the start: leaves further away start slightly later
                        const dx = leaf.x - startX;
                        const distFactor = Math.abs(dx) / (canvas.width / 2);
                        const delay = distFactor * config.collectDuration * 0.3;
                        
                        const cl = new CollectingLeaf(
                            leaf, startX, startY,
                            delay, config.collectDuration
                        );
                        collectingLeaves.push(cl);
                    });
                    landedLeaves = [];
                }
                
                collectingLeaves.forEach(cl => cl.update(0)); // driven by sequencer progress below
            }, () => {
                collectingLeaves = [];
            });
            
            // Drive collecting leaves via their own update in the main update loop
            // We need a reference accessible in update()
            let collectingRef = { leaves: collectingLeaves };
            
            // Override: instead of the above, let's inject collecting leaves
            // into the main update more simply. We'll use a different approach:
            // Store collectingLeaves at module level.
            
            // Pause to let root "absorb"
            seq.add(config.collectPause, (p) => {
                // Pulse the root position with a subtle glow
            }, () => {});
            
            // Restart
            seq.add(config.restDuration, () => {}, () => {
                nodes = [];
                stems = [];
                fallingLeaves = [];
                landedLeaves = [];
                globalOpacity = 1;
                rootNode = null;
                sequencer = buildSequence();
            });
            
            return seq;
        }
        
        // Module-level collecting leaves for the collection phase
        let collectingLeaves = [];
        
        // ===== PATCHED BUILD SEQUENCE =====
        // Rewrite buildSequence to properly handle collecting leaves
        // (The above has a scoping issue — let's do it properly)
        
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
                // Short pause instead of rise animation
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
                                // Stagger detach: each leaf gets a small random delay
                                // so they don't all release at the exact same moment
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
            // Tree collapses: remaining nodes fall to ground.
            // Don't wait for retraction — start growing again immediately.
            // Continuous retraction (in update loop) absorbs leaves in the background.
            
            let treeFallStarted = false;
            seq.add(1.2, (p, dt) => {
                if (!treeFallStarted) {
                    treeFallStarted = true;
                    // Convert every remaining tree node into a falling leaf
                    // EXCEPT the root node — it persists for continuity
                    nodes.forEach(n => {
                        if (n === seedNode) return; // keep root alive
                        const stagger = Math.random() * 0.4;
                        const fl = new FallingLeaf(n, true, stagger);
                        fallingLeaves.push(fl);
                    });
                    // Keep only the root node
                    nodes = seedNode ? [seedNode] : [];
                }
                // Fade stems while tree collapses
                const stemFade = easeInOutCubic(Math.min(1, p * 2));
                stems.forEach(s => { s.progress = Math.max(0, 1 - stemFade); });
            }, () => {
                stems = [];
            });
            
            // Restart immediately — leaves still falling/retracting in background
            seq.add(0.3, () => {}, () => {
                // Don't clear fallingLeaves or collectingLeaves — they persist
                // and get absorbed naturally by the update loop
                nodes = seedNode ? [seedNode] : [];
                stems = [];
                landedLeaves = [];
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
            
            // Decay root absorption bump smoothly
            if (rootBump > 0) {
                rootBump = Math.max(0, rootBump - config.rootBumpDecay * dt);
            }
            
            // Continuous retraction: as soon as a leaf lands, it starts
            // returning to the root node position
            for (let i = fallingLeaves.length - 1; i >= 0; i--) {
                const fl = fallingLeaves[i];
                if (fl.landed && rootNode) {
                    // Small random delay so they don't all move at once
                    const delay = Math.random() * 0.3;
                    const cl = new CollectingLeaf(
                        fl, rootNode.x, rootNode.y,
                        delay, 2.0
                    );
                    collectingLeaves.push(cl);
                    fallingLeaves.splice(i, 1);
                }
            }
            
            // Update & prune finished collecting leaves;
            // bump root size when a leaf is absorbed
            collectingLeaves.forEach(cl => cl.update(dt));
            const before = collectingLeaves.length;
            collectingLeaves = collectingLeaves.filter(cl => !cl.done);
            const absorbed = before - collectingLeaves.length;
            if (absorbed > 0) {
                rootBump += config.rootBumpSize * absorbed;
            }
        }
        
        // ===== DRAW =====
        function draw() {
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Wind sway: pivot the whole scene around the root point.
            // Offset increases with distance from ground (root), so the
            // tree top sways most while the base stays planted.
            const windOffset = Math.sin(animationTime * Math.PI * 2 * config.windFreq)
                             * config.windAmplitude
                             + Math.sin(animationTime * Math.PI * 2 * config.windFreq2 + 1.3)
                             * config.windAmplitude * 0.5;
            
            // Pivot point is the root (bottom of tree)
            const pivotX = rootNode ? rootNode.x : centerX;
            const pivotY = groundY;
            
            ctx.save();
            // Apply a subtle shear: translate proportional to height above ground
            // We use a skew transform: points at pivotY stay put, higher points shift more
            // setTransform approach: skewX based on windOffset / canvas height
            const skew = windOffset / (canvas.height * 0.6);
            ctx.transform(1, 0, skew, 1, -skew * pivotY, 0);
            
            stems.forEach(s => s.draw());
            nodes.forEach(n => n.draw());
            
            ctx.restore();
            
            // Falling leaves and collecting leaves are NOT swayed — they're detached
            fallingLeaves.forEach(l => l.draw());
            collectingLeaves.forEach(cl => cl.draw());
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
