// Deep Exploration - Expansion and Collapse Visualization
(function() {
    'use strict';
    
    function initDeepExploration() {
        const canvas = document.getElementById('deep-exploration-canvas');
        if (!canvas) {
            console.warn('Deep Exploration: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Deep Exploration: Could not get 2D context');
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
            surface0: '#313244'
        };
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Animation state
        let time = 0;
        let hoveredNode = null;
        let currentCycle = -1;
        let nodeSpeedOffsets = []; // Randomized speed offsets for each node per cycle
        
        // ===== TIMING CONFIGURATION =====
        // Adjust these values to control the animation timing
        const cycleDuration = 6; // seconds for full cycle
        
        // Phase durations (as fractions of the cycle, should sum to 1.0)
        const expandDuration = 0.3;    // Duration of expansion (inhale)
        const expandRestDuration = 0.3; // Rest at expanded state
        const collapseDuration = 0.2;   // Duration of collapse (exhale)
        const collapseRestDuration = 0.00; // Rest at center state
        
        // Calculate phase boundaries
        const expandEnd = expandDuration;
        const expandRestEnd = expandEnd + expandRestDuration;
        const collapseEnd = expandRestEnd + collapseDuration;
        const collapseRestEnd = collapseEnd + collapseRestDuration; // Should be 1.0
        // ===== END TIMING CONFIGURATION =====
        
        // ===== EASING CONFIGURATION =====
        // Adjust these values to control the easing curves
        const expansionEaseInPower = 5;   // Ease-in power for expansion (higher = stronger acceleration)
        const expansionEaseOutPower = 2;  // Ease-out power for expansion (higher = slower settling)
        // ===== END EASING CONFIGURATION =====
        
        // Node configuration
        const numExplorationNodes = 24;
        const maxExplorationRadius = 280;
        const minExplorationRadius = 0; // Start from center
        const nodeSize = 5;
        const activeNodeSize = 7;
        
        // Speed variation per node (0.0 = no variation, 0.1 = 10% variation)
        const nodeSpeedVariation = 0.08; // 8% variation for organic feel
        
        // Color palette for exploration nodes
        const nodeColors = [
            colors.blue,
            colors.sapphire,
            colors.sky,
            colors.teal,
            colors.green,
            colors.lavender,
            colors.mauve,
            colors.pink
        ];
        
        // Easing function for organic, breathing-like motion (ease-in-out with slight curve)
        function easeInOutCubic(t) {
            return t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        
        // More organic easing - like breathing with smooth ramps
        function breathingEase(t) {
            // Intensified ease-in-out quartic for stronger acceleration/deceleration
            return t < 0.5 
                ? 8 * t * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 4) / 2;
        }
        
        // More curved easing for expansion - stronger ease-out (slower settling)
        function expansionEase(t) {
            // Asymmetric ease-in-out: stronger ease-out for slower settling
            if (t < 0.5) {
                // Ease-in: configurable power (scaled to reach 0.5 at t=0.5)
                return Math.pow(2 * t, expansionEaseInPower) / 2;
            } else {
                // Ease-out: configurable power for slower settling at the end
                return 1 - Math.pow(-2 * t + 2, expansionEaseOutPower) / 2;
            }
        }
        
        
        // Get phase (0-1) and track cycle changes
        function getPhase(t) {
            const phase = (t % cycleDuration) / cycleDuration;
            const cycleNumber = Math.floor(t / cycleDuration);
            
            // Generate new random speed offsets for each node at the start of each cycle
            if (cycleNumber !== currentCycle) {
                currentCycle = cycleNumber;
                nodeSpeedOffsets = [];
                let sumOffsets = 0;
                
                // Generate random offsets for each node
                for (let i = 0; i < numExplorationNodes; i++) {
                    const offset = (Math.random() * 2 - 1) * nodeSpeedVariation; // -variation to +variation
                    nodeSpeedOffsets.push(offset);
                    sumOffsets += offset;
                }
                
                // Normalize offsets so they average to 0 (keeps total cycle duration constant)
                const averageOffset = sumOffsets / numExplorationNodes;
                for (let i = 0; i < numExplorationNodes; i++) {
                    nodeSpeedOffsets[i] -= averageOffset;
                }
            }
            
            return phase;
        }
        
        // Get exploration radius based on phase with organic easing
        function getExplorationRadius(phase) {
            if (phase < expandEnd) {
                // Expand from center - breathing in (with more curved easing)
                const p = phase / expandEnd;
                const eased = expansionEase(p);
                return maxExplorationRadius * eased; // Start from 0, expand to max
            } else if (phase < expandRestEnd) {
                // Rest at expanded state
                return maxExplorationRadius;
            } else if (phase < collapseEnd) {
                // Collapse back to center - breathing out
                const p = (phase - expandRestEnd) / collapseDuration;
                const eased = breathingEase(p);
                return maxExplorationRadius * (1 - eased); // Collapse from max to 0
            } else {
                // Rest at center
                return 0; // All nodes at center
            }
        }
        
        // Get node-specific phase offset for variable expansion speed
        function getNodePhaseOffset(nodeIndex) {
            // Use randomized offset for this cycle (generated in getPhase)
            return nodeSpeedOffsets[nodeIndex] || 0;
        }
        
        // Get exploration radius for a specific node with speed variation
        function getNodeRadius(phase, nodeIndex) {
            // Only apply speed variation during expansion phase
            // During collapse, all nodes use the same phase (synchronized collapse)
            let adjustedPhase = phase;
            
            if (phase < expandEnd) {
                // During expansion: apply node-specific phase offset for variable speed
                const nodeOffset = getNodePhaseOffset(nodeIndex);
                
                // Smoothly blend out the offset as we approach expandEnd to ensure smooth landing
                // Blend starts at 80% of expansion phase
                const blendStart = expandEnd * 0.8;
                let blendFactor = 1.0;
                
                if (phase > blendStart) {
                    // Gradually reduce offset effect from 80% to 100% of expansion
                    blendFactor = 1.0 - ((phase - blendStart) / (expandEnd - blendStart));
                }
                
                adjustedPhase = phase + (nodeOffset * blendFactor);
                // Clamp phase to 0-1 range to prevent abrupt jumps (no wrap-around)
                adjustedPhase = Math.max(0, Math.min(1, adjustedPhase));
            }
            // During collapse and rest phases: use the same phase for all nodes (no offset)
            
            return getExplorationRadius(adjustedPhase);
        }
        
        // Get node positions for current phase
        function getNodePositions(phase) {
            const positions = [];
            const angleStep = (Math.PI * 2) / numExplorationNodes;
            
            // Add center node (always visible)
            positions.push({
                x: centerX,
                y: centerY,
                angle: 0,
                radius: 0,
                color: colors.lavender,
                index: -1,
                isCenter: true
            });
            
            // Always show all exploration nodes with variable expansion speed
            for (let i = 0; i < numExplorationNodes; i++) {
                // Get node-specific radius with speed variation
                const radius = getNodeRadius(phase, i);
                const angle = angleStep * i;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                // Full opacity for all nodes - no fading
                const opacity = 1;
                
                positions.push({
                    x,
                    y,
                    angle,
                    radius,
                    color: nodeColors[i % nodeColors.length],
                    index: i,
                    isCenter: false,
                    opacity: opacity
                });
            }
            
            return positions;
        }
        
        // Draw node
        function drawNode(ctx, x, y, size, color, opacity = 1) {
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw connecting lines from center to nodes
        function drawLines(nodes) {
            const centerNode = nodes.find(n => n.isCenter);
            if (!centerNode) return;
            
            nodes.forEach(node => {
                if (node.isCenter) return;
                
                // Line opacity matches node opacity
                const lineOpacity = (node.opacity || 1) * 0.2;
                
                ctx.strokeStyle = `rgba(180, 190, 254, ${lineOpacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerNode.x, centerNode.y);
                ctx.lineTo(node.x, node.y);
                ctx.stroke();
            });
        }
        
        // Check if node is hovered
        function isNodeHovered(node, mx, my) {
            const dx = mx - node.x;
            const dy = my - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const size = hoveredNode === node ? activeNodeSize : nodeSize;
            return distance < size + 5;
        }
        
        // Main draw function
        function draw() {
            // Clear canvas with subtle background
            ctx.fillStyle = '#1e1e2e'; // Catppuccin Mocha base - matches page background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const phase = getPhase(time);
            const nodes = getNodePositions(phase);
            
            // Draw connecting lines
            drawLines(nodes);
            
            // Draw all nodes (plain, no glow, minimal style)
            nodes.forEach(node => {
                const isHovered = hoveredNode === node;
                const size = isHovered ? activeNodeSize : nodeSize;
                
                // Use node opacity (fades as it approaches center)
                const opacity = node.opacity !== undefined ? node.opacity : 1;
                drawNode(ctx, node.x, node.y, size, node.color, opacity);
            });
            
            // Update time
            time += 0.016; // ~60fps
        }
        
        // Mouse interaction
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            const phase = getPhase(time);
            const nodes = getNodePositions(phase);
            
            const previousHovered = hoveredNode;
            hoveredNode = null;
            
            // Check which node is hovered
            for (let node of nodes) {
                if (isNodeHovered(node, mouseX, mouseY)) {
                    hoveredNode = node;
                    break;
                }
            }
            
            // Redraw if hover state changed
            if (hoveredNode !== previousHovered) {
                draw();
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            hoveredNode = null;
            draw();
        });
        
        // Animation loop
        function animate() {
            draw();
            requestAnimationFrame(animate);
        }
        
        // Initial draw
        draw();
        animate();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeepExploration);
    } else {
        initDeepExploration();
    }
})();
