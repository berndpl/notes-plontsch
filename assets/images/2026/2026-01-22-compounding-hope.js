// Compounding Hope - Exponential Growth Visualization
(function() {
    'use strict';
    
    function initCompoundingHope() {
        const canvas = document.getElementById('2026-01-22-compounding-hope-canvas');
        if (!canvas) {
            console.warn('Compounding Hope: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Compounding Hope: Could not get 2D context');
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
        
        // Mixed color palette for all nodes
        const nodeColorPalette = [
            colors.lavender,
            colors.blue,
            colors.sapphire,
            colors.sky,
            colors.teal,
            colors.green,
            colors.yellow,
            colors.peach,
            colors.mauve,
            colors.pink,
            colors.rosewater
        ];
        
        // Track used positions to avoid overlap
        let usedPositions = [];
        const minNodeDistance = 12; // Minimum distance between nodes
        
        // Animation timing configuration
        const config = {
            maxGenerations: 8,          // Total generations to grow
            nodesPerParent: 2,          // Each node spawns this many children
            generationDelay: 1.2,       // Base seconds between generations
            fastGenerationDelay: 0.3,   // Faster delay after generation 4
            speedUpAfterGen: 4,         // Speed up after this generation
            spawnVariation: 0.3,        // Random variation in spawn timing (0-1)
            expansionRadius: 80,        // Base distance between parent and child (shorter)
            radiusDecay: 0.85,          // Each generation is this fraction of parent distance
            nodeSize: 4,                // Node size (consistent for all)
            animationDuration: 0.5,     // Seconds for node to travel from parent
            fadeOutDuration: 2.0,       // Seconds for fade out
            restDuration: 1.5,          // Seconds of rest before restart
            lineOpacity: 0.15           // Opacity of connecting lines
        };
        
        // Animation state
        let animationTime = 0;
        let nodes = [];
        let phase = 'growing'; // 'growing', 'complete', 'fading', 'rest'
        let currentGeneration = 0;
        let generationStartTime = 0;
        let phaseStartTime = 0;
        
        // Node class
        class Node {
            constructor(x, y, generation, angle, parent = null) {
                this.targetX = x;
                this.targetY = y;
                this.generation = generation;
                this.angle = angle;
                this.parent = parent;
                this.children = [];
                this.birthTime = animationTime;
                this.opacity = 0;
                this.targetOpacity = 1;
                this.size = config.nodeSize; // Consistent size for all nodes
                
                // Random color from palette
                this.colorIndex = Math.floor(Math.random() * nodeColorPalette.length);
                
                // Random spawn delay variation for this node's children
                this.spawnDelayOffset = (Math.random() - 0.5) * 2 * config.spawnVariation;
                
                // Start at parent position (or target if no parent)
                if (parent) {
                    this.x = parent.x;
                    this.y = parent.y;
                } else {
                    this.x = x;
                    this.y = y;
                }
                
                // Track if this node has spawned children
                this.hasSpawned = false;
            }
            
            // Get current animated position
            getAnimatedPosition() {
                if (!this.parent) {
                    return { x: this.x, y: this.y };
                }
                
                const elapsed = animationTime - this.birthTime;
                const progress = Math.min(1, elapsed / config.animationDuration);
                
                // Ease out cubic for smooth deceleration
                const eased = 1 - Math.pow(1 - progress, 3);
                
                return {
                    x: this.parent.x + (this.targetX - this.parent.x) * eased,
                    y: this.parent.y + (this.targetY - this.parent.y) * eased
                };
            }
            
            // Get this node's spawn delay (with variation)
            getSpawnDelay() {
                const baseDelay = this.generation >= config.speedUpAfterGen 
                    ? config.fastGenerationDelay 
                    : config.generationDelay;
                return baseDelay * (1 + this.spawnDelayOffset);
            }
            
            // Check if ready to spawn children
            isReadyToSpawn() {
                if (this.hasSpawned) return false;
                const elapsed = animationTime - this.birthTime;
                return elapsed >= this.getSpawnDelay();
            }
            
            get color() {
                return nodeColorPalette[this.colorIndex];
            }
        }
        
        // Initialize with center node
        function initNodes() {
            nodes = [];
            usedPositions = [];
            currentGeneration = 0;
            generationStartTime = 0;
            phase = 'growing';
            phaseStartTime = animationTime;
            
            // Create center node
            const centerNode = new Node(centerX, centerY, 0, 0);
            centerNode.opacity = 1;
            nodes.push(centerNode);
            usedPositions.push({ x: centerX, y: centerY });
        }
        
        // Check if position is too close to existing nodes
        function isTooClose(x, y) {
            for (let pos of usedPositions) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minNodeDistance) {
                    return true;
                }
            }
            return false;
        }
        
        // Find valid position that doesn't overlap
        function findValidPosition(parentX, parentY, baseAngle, radius, attempts = 8) {
            for (let i = 0; i < attempts; i++) {
                const angleOffset = (Math.random() - 0.5) * 0.6;
                const radiusOffset = radius * (0.9 + Math.random() * 0.2);
                const angle = baseAngle + angleOffset;
                const x = parentX + Math.cos(angle) * radiusOffset;
                const y = parentY + Math.sin(angle) * radiusOffset;
                
                if (!isTooClose(x, y)) {
                    return { x, y, angle };
                }
            }
            // Fallback: use original position with slight offset
            const angle = baseAngle + (Math.random() - 0.5) * 0.4;
            return {
                x: parentX + Math.cos(angle) * radius,
                y: parentY + Math.sin(angle) * radius,
                angle
            };
        }
        
        // Spawn children for a single parent node
        function spawnChildrenForNode(parent) {
            const gen = parent.generation + 1;
            if (gen > config.maxGenerations) return;
            
            const numChildren = config.nodesPerParent;
            const baseAngle = parent.angle;
            const radius = config.expansionRadius * Math.pow(config.radiusDecay, gen - 1);
            const angleSpread = Math.PI * 0.7;
            
            for (let i = 0; i < numChildren; i++) {
                // Calculate base angle
                let targetAngle;
                if (parent.generation === 0) {
                    // First generation: spread evenly around center
                    targetAngle = (Math.PI * 2 / numChildren) * i + Math.random() * 0.4;
                } else {
                    // Subsequent generations: spread within a cone from parent angle
                    const spreadOffset = (i / (numChildren - 1 || 1) - 0.5) * angleSpread;
                    targetAngle = baseAngle + spreadOffset;
                }
                
                // Find position that doesn't overlap
                const pos = findValidPosition(parent.targetX, parent.targetY, targetAngle, radius);
                
                const child = new Node(pos.x, pos.y, gen, pos.angle, parent);
                parent.children.push(child);
                nodes.push(child);
                usedPositions.push({ x: pos.x, y: pos.y });
            }
            
            parent.hasSpawned = true;
        }
        
        // Update animation state
        function update(deltaTime) {
            animationTime += deltaTime;
            
            // Update node opacities (fade in)
            nodes.forEach(node => {
                if (node.opacity < node.targetOpacity) {
                    node.opacity = Math.min(node.targetOpacity, node.opacity + deltaTime * 3);
                }
            });
            
            switch (phase) {
                case 'growing':
                    // Check each node individually for spawn timing
                    let anyCanSpawn = false;
                    nodes.forEach(node => {
                        if (node.generation < config.maxGenerations && !node.hasSpawned) {
                            anyCanSpawn = true;
                            if (node.isReadyToSpawn()) {
                                spawnChildrenForNode(node);
                            }
                        }
                    });
                    
                    // Check if all nodes have spawned
                    const allSpawned = nodes.every(n => 
                        n.generation >= config.maxGenerations || n.hasSpawned
                    );
                    
                    if (allSpawned && !anyCanSpawn) {
                        phase = 'complete';
                        phaseStartTime = animationTime;
                    }
                    break;
                    
                case 'complete':
                    // Brief pause at full expansion
                    if (animationTime - phaseStartTime >= 0.5) {
                        phase = 'fading';
                        phaseStartTime = animationTime;
                        // Start fading all nodes except center
                        nodes.forEach(node => {
                            if (node.generation > 0) {
                                node.targetOpacity = 0;
                            }
                        });
                    }
                    break;
                    
                case 'fading':
                    const fadeProgress = (animationTime - phaseStartTime) / config.fadeOutDuration;
                    
                    // Fade out non-center nodes
                    nodes.forEach(node => {
                        if (node.generation > 0) {
                            node.opacity = Math.max(0, 1 - fadeProgress);
                        }
                    });
                    
                    if (fadeProgress >= 1) {
                        phase = 'rest';
                        phaseStartTime = animationTime;
                    }
                    break;
                    
                case 'rest':
                    if (animationTime - phaseStartTime >= config.restDuration) {
                        // Restart the cycle
                        initNodes();
                    }
                    break;
            }
        }
        
        // Draw connecting line between parent and child
        function drawLine(parent, child) {
            const opacity = Math.min(parent.opacity, child.opacity) * config.lineOpacity;
            if (opacity <= 0) return;
            
            const childPos = child.getAnimatedPosition();
            
            ctx.strokeStyle = `rgba(180, 190, 254, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(parent.x, parent.y);
            ctx.lineTo(childPos.x, childPos.y);
            ctx.stroke();
        }
        
        // Draw a node
        function drawNode(node) {
            if (node.opacity <= 0) return;
            
            const pos = node.getAnimatedPosition();
            // Update node position for children to reference
            node.x = pos.x;
            node.y = pos.y;
            
            ctx.fillStyle = node.color;
            ctx.globalAlpha = node.opacity;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, node.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Main draw function
        function draw() {
            // Clear canvas
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Sort nodes by generation (draw parents first, then children)
            const sortedNodes = [...nodes].sort((a, b) => a.generation - b.generation);
            
            // Draw lines first (behind nodes)
            sortedNodes.forEach(node => {
                if (node.parent) {
                    drawLine(node.parent, node);
                }
            });
            
            // Draw nodes
            sortedNodes.forEach(drawNode);
        }
        
        // Animation loop
        let lastTime = 0;
        function animate(currentTime) {
            const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016;
            lastTime = currentTime;
            
            update(deltaTime);
            draw();
            
            requestAnimationFrame(animate);
        }
        
        // Initialize and start
        initNodes();
        requestAnimationFrame(animate);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCompoundingHope);
    } else {
        initCompoundingHope();
    }
})();
