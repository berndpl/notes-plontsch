// Self-Learning Systems - Adaptive Network Visualization
// Nodes explore randomly, gradually self-organize into clusters,
// connections strengthen as patterns emerge, then dissolve and repeat.
// Represents: exploration → pattern recognition → adaptation → reset.
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
        
        // Node color palette
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
        
        // ===== CONFIGURATION =====
        const config = {
            numNodes: 28,                // Total nodes in the system
            nodeSize: 4,                 // Base node radius
            connectionDistance: 140,     // Max distance for connections
            connectionOpacity: 0.12,     // Base opacity of connection lines
            
            // Phase durations (seconds)
            exploreDuration: 4.0,        // Random wandering phase
            learnDuration: 5.0,          // Nodes self-organize into clusters
            settledDuration: 2.5,        // Resting in learned positions
            fadeDuration: 2.0,           // Fade out before reset
            restDuration: 1.0,           // Pause before next cycle
            
            // Movement
            exploreSpeed: 0.6,           // Speed during exploration
            driftSpeed: 0.15,            // Gentle drift when settled
            attractionStrength: 0.012,   // How strongly nodes pull toward targets
            repulsionDistance: 30,        // Minimum distance between nodes
            repulsionStrength: 0.8,      // How strongly close nodes push apart
            
            // Clusters
            numClusters: 4,              // Number of clusters to form
            clusterSpread: 60,           // Radius of each cluster
            clusterRegionRadius: 200,    // How far cluster centers are from canvas center
            
            // Learning trail
            trailLength: 8,              // Number of past positions to keep
            trailOpacity: 0.06           // Opacity of trail dots
        };
        // ===== END CONFIGURATION =====
        
        // Animation state
        let animationTime = 0;
        let phase = 'explore'; // 'explore', 'learn', 'settled', 'fading', 'rest'
        let phaseStartTime = 0;
        let nodes = [];
        let clusterCenters = [];
        let cycleCount = 0;
        
        // Parse hex color to RGB
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 180, g: 190, b: 254 };
        }
        
        // Easing functions
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        
        function easeOutQuad(t) {
            return 1 - (1 - t) * (1 - t);
        }
        
        // Node class
        class Node {
            constructor(index) {
                this.index = index;
                this.x = Math.random() * canvas.width * 0.7 + canvas.width * 0.15;
                this.y = Math.random() * canvas.height * 0.7 + canvas.height * 0.15;
                this.vx = (Math.random() - 0.5) * config.exploreSpeed;
                this.vy = (Math.random() - 0.5) * config.exploreSpeed;
                
                // Visual properties
                this.colorIndex = Math.floor(Math.random() * nodeColorPalette.length);
                this.color = nodeColorPalette[this.colorIndex];
                this.rgb = hexToRgb(this.color);
                this.opacity = 1;
                this.size = config.nodeSize;
                
                // Learning state
                this.targetX = this.x;
                this.targetY = this.y;
                this.clusterIndex = -1;
                this.learned = 0; // 0 to 1, how "learned" this node is
                
                // Trail
                this.trail = [];
                
                // Wander angle for organic movement
                this.wanderAngle = Math.random() * Math.PI * 2;
                this.wanderSpeed = 0.5 + Math.random() * 0.5;
            }
            
            recordTrail() {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > config.trailLength) {
                    this.trail.shift();
                }
            }
        }
        
        // Generate random cluster positions for this cycle
        function generateClusters() {
            clusterCenters = [];
            const angleOffset = Math.random() * Math.PI * 2;
            
            for (let i = 0; i < config.numClusters; i++) {
                const angle = angleOffset + (Math.PI * 2 / config.numClusters) * i;
                // Add some randomness to cluster positions
                const radius = config.clusterRegionRadius * (0.7 + Math.random() * 0.6);
                clusterCenters.push({
                    x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
                    y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40
                });
            }
        }
        
        // Assign nodes to clusters and set target positions
        function assignClusters() {
            // Assign each node to a cluster
            nodes.forEach((node, i) => {
                node.clusterIndex = i % config.numClusters;
                const cluster = clusterCenters[node.clusterIndex];
                
                // Target position within cluster, with some spread
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * config.clusterSpread;
                node.targetX = cluster.x + Math.cos(angle) * dist;
                node.targetY = cluster.y + Math.sin(angle) * dist;
            });
        }
        
        // Initialize nodes
        function initNodes() {
            nodes = [];
            for (let i = 0; i < config.numNodes; i++) {
                nodes.push(new Node(i));
            }
            generateClusters();
            assignClusters();
            phase = 'explore';
            phaseStartTime = animationTime;
            cycleCount++;
        }
        
        // Keep nodes within bounds with soft boundary
        function constrainToBounds(node) {
            const margin = 40;
            const bounce = 0.02;
            
            if (node.x < margin) { node.vx += bounce; }
            if (node.x > canvas.width - margin) { node.vx -= bounce; }
            if (node.y < margin) { node.vy += bounce; }
            if (node.y > canvas.height - margin) { node.vy -= bounce; }
        }
        
        // Apply repulsion between close nodes
        function applyRepulsion(node) {
            nodes.forEach(other => {
                if (other === node) return;
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < config.repulsionDistance && dist > 0) {
                    const force = (config.repulsionDistance - dist) / config.repulsionDistance * config.repulsionStrength;
                    node.vx += (dx / dist) * force * 0.01;
                    node.vy += (dy / dist) * force * 0.01;
                }
            });
        }
        
        // Update explore phase - random wandering
        function updateExplore(node, deltaTime) {
            // Organic wandering using angle variation
            node.wanderAngle += (Math.random() - 0.5) * 1.5 * deltaTime;
            node.vx += Math.cos(node.wanderAngle) * config.exploreSpeed * deltaTime * 0.3;
            node.vy += Math.sin(node.wanderAngle) * config.exploreSpeed * deltaTime * 0.3;
            
            // Damping
            node.vx *= 0.98;
            node.vy *= 0.98;
            
            // Speed limit
            const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
            const maxSpeed = config.exploreSpeed * 1.5;
            if (speed > maxSpeed) {
                node.vx = (node.vx / speed) * maxSpeed;
                node.vy = (node.vy / speed) * maxSpeed;
            }
        }
        
        // Update learn phase - attract toward targets
        function updateLearn(node, deltaTime, progress) {
            // Attraction toward target position, increasing with progress
            const attraction = config.attractionStrength * easeInOutCubic(progress);
            const dx = node.targetX - node.x;
            const dy = node.targetY - node.y;
            
            node.vx += dx * attraction;
            node.vy += dy * attraction;
            
            // Increase damping as learning progresses
            const damping = 0.96 - progress * 0.06;
            node.vx *= damping;
            node.vy *= damping;
            
            // Update learned state
            const dist = Math.sqrt(dx * dx + dy * dy);
            node.learned = Math.min(1, 1 - dist / 300);
        }
        
        // Update settled phase - gentle drift
        function updateSettled(node, deltaTime) {
            // Very gentle oscillation around target
            const dx = node.targetX - node.x;
            const dy = node.targetY - node.y;
            
            node.vx += dx * 0.003;
            node.vy += dy * 0.003;
            node.vx *= 0.95;
            node.vy *= 0.95;
            
            node.learned = 1;
        }
        
        // Main update
        function update(deltaTime) {
            animationTime += deltaTime;
            
            const phaseElapsed = animationTime - phaseStartTime;
            
            switch (phase) {
                case 'explore':
                    if (phaseElapsed >= config.exploreDuration) {
                        phase = 'learn';
                        phaseStartTime = animationTime;
                    }
                    nodes.forEach(node => {
                        updateExplore(node, deltaTime);
                        applyRepulsion(node);
                        constrainToBounds(node);
                        node.learned = 0;
                    });
                    break;
                    
                case 'learn':
                    const learnProgress = Math.min(1, phaseElapsed / config.learnDuration);
                    if (phaseElapsed >= config.learnDuration) {
                        phase = 'settled';
                        phaseStartTime = animationTime;
                    }
                    nodes.forEach(node => {
                        updateLearn(node, deltaTime, learnProgress);
                        applyRepulsion(node);
                        constrainToBounds(node);
                    });
                    break;
                    
                case 'settled':
                    if (phaseElapsed >= config.settledDuration) {
                        phase = 'fading';
                        phaseStartTime = animationTime;
                    }
                    nodes.forEach(node => {
                        updateSettled(node, deltaTime);
                        applyRepulsion(node);
                    });
                    break;
                    
                case 'fading':
                    const fadeProgress = Math.min(1, phaseElapsed / config.fadeDuration);
                    nodes.forEach(node => {
                        node.opacity = 1 - easeInOutCubic(fadeProgress);
                        updateSettled(node, deltaTime);
                    });
                    if (phaseElapsed >= config.fadeDuration) {
                        phase = 'rest';
                        phaseStartTime = animationTime;
                    }
                    break;
                    
                case 'rest':
                    if (phaseElapsed >= config.restDuration) {
                        initNodes();
                    }
                    break;
            }
            
            // Apply velocity and record trail
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;
                
                // Record trail every few frames
                if (Math.random() < 0.3) {
                    node.recordTrail();
                }
            });
        }
        
        // Draw connection lines between nearby nodes
        function drawConnections() {
            nodes.forEach((nodeA, i) => {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeB = nodes[j];
                    const dx = nodeA.x - nodeB.x;
                    const dy = nodeA.y - nodeB.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < config.connectionDistance) {
                        // Stronger connections between same-cluster nodes
                        const sameCluster = nodeA.clusterIndex === nodeB.clusterIndex;
                        const clusterBonus = sameCluster ? 1.5 : 0.4;
                        
                        // Connection strength based on distance and learning state
                        const distFactor = 1 - dist / config.connectionDistance;
                        const learnFactor = (nodeA.learned + nodeB.learned) / 2;
                        const opacity = Math.min(nodeA.opacity, nodeB.opacity) 
                            * config.connectionOpacity 
                            * distFactor 
                            * (0.3 + learnFactor * 0.7)
                            * clusterBonus;
                        
                        if (opacity <= 0.005) return;
                        
                        // Blend colors of the two nodes
                        const rgb = {
                            r: (nodeA.rgb.r + nodeB.rgb.r) / 2,
                            g: (nodeA.rgb.g + nodeB.rgb.g) / 2,
                            b: (nodeA.rgb.b + nodeB.rgb.b) / 2
                        };
                        
                        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                        ctx.lineWidth = sameCluster ? 1.2 : 0.6;
                        ctx.beginPath();
                        ctx.moveTo(nodeA.x, nodeA.y);
                        ctx.lineTo(nodeB.x, nodeB.y);
                        ctx.stroke();
                    }
                }
            });
        }
        
        // Draw node trails
        function drawTrails() {
            nodes.forEach(node => {
                if (node.opacity <= 0) return;
                
                node.trail.forEach((pos, i) => {
                    const trailOpacity = (i / node.trail.length) * config.trailOpacity * node.opacity;
                    if (trailOpacity <= 0.003) return;
                    
                    ctx.fillStyle = `rgba(${node.rgb.r}, ${node.rgb.g}, ${node.rgb.b}, ${trailOpacity})`;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        }
        
        // Draw a single node
        function drawNode(node) {
            if (node.opacity <= 0) return;
            
            // Size grows slightly as node learns
            const learnedSize = config.nodeSize + node.learned * 1.5;
            
            // Subtle glow for learned nodes
            if (node.learned > 0.5 && node.opacity > 0) {
                const glowOpacity = node.opacity * node.learned * 0.08;
                const gradient = ctx.createRadialGradient(
                    node.x, node.y, 0,
                    node.x, node.y, learnedSize * 4
                );
                gradient.addColorStop(0, `rgba(${node.rgb.r}, ${node.rgb.g}, ${node.rgb.b}, ${glowOpacity})`);
                gradient.addColorStop(1, `rgba(${node.rgb.r}, ${node.rgb.g}, ${node.rgb.b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, learnedSize * 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw the node
            ctx.fillStyle = node.color;
            ctx.globalAlpha = node.opacity;
            ctx.beginPath();
            ctx.arc(node.x, node.y, learnedSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Main draw function
        function draw() {
            // Clear canvas
            ctx.fillStyle = colors.base;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw layers: trails → connections → nodes
            drawTrails();
            drawConnections();
            nodes.forEach(drawNode);
        }
        
        // Animation loop
        let lastTime = 0;
        function animate(currentTime) {
            const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016;
            lastTime = currentTime;
            
            // Cap delta to prevent jumps on tab switch
            const cappedDelta = Math.min(deltaTime, 0.1);
            
            update(cappedDelta);
            draw();
            
            requestAnimationFrame(animate);
        }
        
        // Initialize and start
        initNodes();
        requestAnimationFrame(animate);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelfLearningSystems);
    } else {
        initSelfLearningSystems();
    }
})();
