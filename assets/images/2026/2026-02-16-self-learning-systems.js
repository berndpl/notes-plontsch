// Self-Learning Systems v6 - Sub-leaf Branching & Dissolve
// Some leaves grow sub-leaves before falling. Fallen leaves dissolve
// into the ground. New cycle starts quickly.
// Represents: explore → branch → sub-explore → shed → nourish → grow again.
(function() {
    'use strict';
    
    function initSelfLearningSystems() {
        const canvas = document.getElementById('2026-02-16-self-learning-systems-canvas');
        if (!canvas) {
            console.warn('Self-Learning Systems: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Self-Learning Systems: Could not get 2D context');
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
            
            // Sub-leaf branching — smaller secondary branches off non-surviving leaves
            subLeafSplitLength: 28,     // shorter than main branches
            subLeafChance: 0.35,        // probability a non-surviving leaf grows sub-leaves
            subLeafCount: [2, 3],       // min/max sub-leaves per branching leaf
            subLeafGrowDuration: 0.6,   // how long sub-leaves take to sprout
            subLeafPause: 0.25,         // pause after sub-leaves appear before everything falls
            
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
            windAmplitude: 6,
            windFreq: 0.4,
            windFreq2: 0.17
        };
        // ===== END CONFIGURATION =====
        
        // ===== SOUND ENGINE =====
        // Web Audio API synthesizer using a C-major pentatonic scale.
        // Every event picks notes from the same scale, so simultaneous
        // sounds naturally form consonant chords.
        // Three voices: pluck (appear), release (detach), thud (land).
        //
        // Sound starts muted. Tapping anywhere on the page toggles
        // sound on/off and shows a brief "sound on" / "sound off" toast
        // styled to match blockquote body text (Inconsolata, #6c7086).
        let soundEnabled = false;
        
        // Toast overlay — positioned on top of the canvas container
        // so text sizing stays consistent with the page's CSS.
        // Uses blockquote body style: Inconsolata, overlay0 (#6c7086).
        let toastTimeout = null;
        
        const toastEl = document.createElement('div');
        toastEl.setAttribute('aria-live', 'polite');
        Object.assign(toastEl.style, {
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Inconsolata', monospace",
            fontSize: '1rem',
            color: '#6c7086',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            zIndex: '1'
        });
        
        // Place inside the canvas's parent container
        const header = canvas.parentElement;
        if (header) {
            header.style.position = 'relative';
            header.appendChild(toastEl);
        }
        
        function showToast(text, duration) {
            toastEl.textContent = text;
            toastEl.style.opacity = '1';
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toastEl.style.opacity = '0';
            }, duration || 1200);
        }
        
        function toggleSound(e) {
            if (e.target.closest('a, button')) return;
            soundEnabled = !soundEnabled;
            showToast(soundEnabled ? 'unmuted' : 'muted');
            // Eagerly init AudioContext on first unmute (user gesture)
            // so subsequent notes play without resume() latency.
            if (soundEnabled) sound.init();
        }
        
        document.addEventListener('click', toggleSound);
        
        // Show initial hint so users know they can click
        showToast('tap to unmute', 3000);
        const sound = (function() {
            let audioCtx = null;
            
            // C major pentatonic — C D E G A — across three octaves
            // Source: equal-temperament tuning, A4 = 440 Hz
            const scale = [
                130.81, 146.83, 164.81, 196.00, 220.00,   // C3–A3  (land)
                261.63, 293.66, 329.63, 392.00, 440.00,   // C4–A4  (detach)
                523.25, 587.33, 659.26, 783.99, 880.00    // C5–A5  (appear)
            ];
            
            // Create and resume AudioContext once — called on first
            // user interaction (unmute click) to satisfy browser policy.
            // After that, playNote skips the resume() overhead entirely.
            function ensureCtx() {
                if (!audioCtx) {
                    try {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    } catch(e) { return null; }
                }
                if (audioCtx.state === 'suspended') audioCtx.resume();
                return audioCtx;
            }
            
            function playNote(freq, opts) {
                if (!audioCtx || audioCtx.state !== 'running') return;
                const now = audioCtx.currentTime + (opts.delay || 0);
                
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = opts.type || 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                // Optional pitch slide for detach voice
                if (opts.slide) {
                    osc.frequency.exponentialRampToValueAtTime(
                        freq * opts.slide,
                        now + (opts.attack || 0.005) + (opts.decay || 0.3)
                    );
                }
                
                const vol = opts.gain || 0.04;
                const atk = opts.attack || 0.005;
                const dec = opts.decay || 0.3;
                
                // Start at target volume immediately for near-zero latency
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + atk + dec);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start(now);
                osc.stop(now + atk + dec + 0.05);
            }
            
            let noteIdx = 0;
            
            return {
                // Called on unmute to pre-warm AudioContext
                init() { ensureCtx(); },
                
                // Bright pluck — high register, short decay
                appear(delay) {
                    if (!soundEnabled) return;
                    const i = 10 + (noteIdx++ % 5);
                    playNote(scale[i], {
                        type: 'triangle', gain: 0.03,
                        attack: 0.003, decay: 0.22, delay: delay || 0
                    });
                },
                // Softer release — mid register, gentle pitch drop
                detach(delay) {
                    if (!soundEnabled) return;
                    const i = 5 + Math.floor(Math.random() * 5);
                    playNote(scale[i], {
                        type: 'sine', gain: 0.035,
                        attack: 0.008, decay: 0.35,
                        delay: delay || 0, slide: 0.92
                    });
                },
                // Low thud — bass register, very short, instant attack
                land() {
                    if (!soundEnabled) return;
                    const i = Math.floor(Math.random() * 3);
                    playNote(scale[i], {
                        type: 'sine', gain: 0.04,
                        attack: 0.001, decay: 0.10
                    });
                }
            };
        })();
        
        // ===== STATE =====
        let animationTime = 0;
        let nodes = [];
        let stems = [];
        let fallingLeaves = [];
        let currentTip = null;
        let sequencer = null;
        let globalOpacity = 1;
        let rootNode = null;
        
        // Wind skew helper — returns the current horizontal offset
        // for a point at the given y coordinate due to wind sway.
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
        class FallingLeaf {
            constructor(node, noDrift = false, fallDelay = 0) {
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
                this.dissolved = false;
                this.driftDir = Math.random() > 0.5 ? 1 : -1;
                this.driftAmount = noDrift ? 5 : config.fallDrift;
                this.fallDelay = fallDelay;
                this.dissolveElapsed = 0;
                this.dissolveDuration = config.dissolveDuration * (0.7 + Math.random() * 0.6);
            }
            
            update(dt) {
                if (this.dissolved) return;
                
                if (!this.landed) {
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
                        sound.land();
                    } else {
                        this.y = newY;
                        this.x = newX;
                    }
                } else {
                    this.dissolveElapsed += dt;
                    const p = Math.min(1, this.dissolveElapsed / this.dissolveDuration);
                    const eased = easeInCubic(p);
                    
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
            const startY = groundY;
            let colorIdx = Math.floor(Math.random() * palette.length);
            
            function dur(base, gen) {
                return base * Math.pow(config.speedUpFactor, gen);
            }
            
            // Seed
            const seedStartY = canvas.height + 20;
            let seedNode = null;
            
            if (rootNode) {
                seedNode = rootNode;
                currentTip = seedNode;
                // Very brief pause — start growing almost immediately
                seq.add(0.15, () => {}, () => {});
            } else {
                seq.add(config.seedRiseDuration, (p) => {
                    if (!seedNode) {
                        seedNode = new GrowthNode(startX, seedStartY, colorIdx);
                        seedNode.opacity = 0;
                        nodes.push(seedNode);
                        rootNode = seedNode;
                        sound.appear();
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
                        sound.appear();
                    }
                    topNode.y = fromY + (toY - fromY) * easeOutCubic(p);
                    topNode.x = fromX;
                    topNode.opacity = Math.min(1, p * 2);
                }, () => {
                    topNode.opacity = 1;
                    stemSegment.progress = 1;
                    currentTip = topNode;
                });
                
                // Split into leaves
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
                        // Staggered pluck chord — one note per leaf
                        leafNodes.forEach((_, li) => sound.appear(li * 0.06));
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
                
                // Pause after split
                seq.add(dur(config.basePauseAfterSplit, gen), () => {}, () => {});
                
                // Determine survivor and which non-survivors get sub-leaves
                const survivorIdx = Math.floor(Math.random() * splitCount);
                
                // Track sub-leaf nodes and stems for the sub-branching phase
                let subLeafData = []; // { parentLeaf, subNodes, subStems }
                let subLeafDecided = false;
                
                // Sub-leaf growth phase — some non-surviving leaves sprout
                // small secondary branches before everything falls
                seq.add(dur(config.subLeafGrowDuration, gen), (p) => {
                    if (!subLeafDecided) {
                        subLeafDecided = true;
                        leafNodes.forEach((leaf, i) => {
                            if (i === survivorIdx) return; // survivor doesn't sub-branch
                            if (Math.random() > config.subLeafChance) return; // skip by chance
                            
                            const [minSub, maxSub] = config.subLeafCount;
                            const count = minSub + Math.floor(Math.random() * (maxSub - minSub + 1));
                            const entry = { parentLeaf: leaf, subNodes: [], subStems: [] };
                            
                            const parentX = leaf._targetX || leaf.x;
                            const parentY = leaf._targetY || leaf.y;
                            const totalSpread = Math.PI * 0.5 + count * 0.1;
                            
                            for (let j = 0; j < count; j++) {
                                const frac = count === 1 ? 0.5 : j / (count - 1);
                                const angle = -Math.PI / 2 - totalSpread / 2 + totalSpread * frac;
                                const jAngle = angle + (Math.random() - 0.5) * 0.3;
                                const jLen = config.subLeafSplitLength * (0.8 + Math.random() * 0.4);
                                
                                const targetX = parentX + Math.cos(jAngle) * jLen;
                                const targetY = parentY + Math.sin(jAngle) * jLen;
                                
                                colorIdx++;
                                const subNode = new GrowthNode(parentX, parentY, colorIdx);
                                subNode.opacity = 0;
                                subNode._targetX = targetX;
                                subNode._targetY = targetY;
                                subNode._isSubLeaf = true;
                                nodes.push(subNode);
                                entry.subNodes.push(subNode);
                                
                                const subStem = new Stem(parentX, parentY, targetX, targetY, subNode.color);
                                stems.push(subStem);
                                entry.subStems.push(subStem);
                            }
                            
                            // Staggered sub-leaf pluck
                            entry.subNodes.forEach((_, si) => sound.appear(si * 0.05));
                            subLeafData.push(entry);
                        });
                    }
                    
                    // Animate sub-leaves growing outward
                    const eased = easeOutCubic(p);
                    subLeafData.forEach(entry => {
                        const px = entry.parentLeaf.x;
                        const py = entry.parentLeaf.y;
                        entry.subNodes.forEach((sn, j) => {
                            sn.x = px + (sn._targetX - px) * eased;
                            sn.y = py + (sn._targetY - py) * eased;
                            sn.opacity = Math.min(1, p * 2.5);
                            entry.subStems[j].progress = eased;
                        });
                    });
                }, () => {
                    subLeafData.forEach(entry => {
                        entry.subNodes.forEach(sn => { sn.opacity = 1; });
                    });
                });
                
                // Brief pause after sub-leaves appear
                seq.add(dur(config.subLeafPause, gen), () => {}, () => {});
                
                // Everything falls — all leaves (+ sub-leaves) except survivor
                let fallStarted = false;
                
                seq.add(dur(config.baseFallDuration, gen), (p) => {
                    if (!fallStarted) {
                        fallStarted = true;
                        
                        // Collect all sub-leaf nodes and stems for mass detach
                        const allSubStems = [];
                        subLeafData.forEach(entry => {
                            entry.subStems.forEach(s => allSubStems.push(s));
                        });
                        
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
                                sound.detach(staggerDelay);
                            }
                        });
                        
                        // Sub-leaves also fall
                        subLeafData.forEach(entry => {
                            entry.subNodes.forEach(sn => {
                                const staggerDelay = Math.random() * 0.4 + 0.1; // offset slightly after parent
                                const fl = new FallingLeaf(sn, false, staggerDelay);
                                fallingLeaves.push(fl);
                                const idx = nodes.indexOf(sn);
                                if (idx >= 0) nodes.splice(idx, 1);
                                sound.detach(staggerDelay);
                            });
                            entry.subStems.forEach(s => { s._fading = true; });
                        });
                    }
                    
                    // Fade all detached stems
                    const fadeProgress = easeInCubic(p);
                    leafStems.forEach(s => {
                        if (s && s._fading) {
                            s.progress = Math.max(0, 1 - fadeProgress);
                        }
                    });
                    subLeafData.forEach(entry => {
                        entry.subStems.forEach(s => {
                            if (s._fading) {
                                s.progress = Math.max(0, 1 - fadeProgress);
                            }
                        });
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
            // Tree collapses quickly, new growth starts almost immediately.
            
            let treeFallStarted = false;
            seq.add(0.8, (p, dt) => {
                if (!treeFallStarted) {
                    treeFallStarted = true;
                    nodes.forEach((n, ni) => {
                        if (n === seedNode) return;
                        const stagger = Math.random() * 0.4;
                        const fl = new FallingLeaf(n, true, stagger);
                        fallingLeaves.push(fl);
                        sound.detach(stagger + ni * 0.03);
                    });
                    nodes = seedNode ? [seedNode] : [];
                }
                const stemFade = easeInOutCubic(Math.min(1, p * 2.5));
                stems.forEach(s => { s.progress = Math.max(0, 1 - stemFade); });
            }, () => {
                stems = [];
            });
            
            // Restart quickly — leaves dissolve in background
            seq.add(0.15, () => {}, () => {
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
            
            // Wind sway
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
            
            // Falling/dissolving leaves are not swayed
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
