// Interactive Double Diamond Visualization - Breathing Animation
(function() {
    'use strict';
    
    function initDoubleDiamond() {
        const canvas = document.getElementById('deep-exploration-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match header images (1200x638)
        canvas.width = 1200;
        canvas.height = 638;
        
        // Color scheme matching the site (Catppuccin Mocha)
        const catppuccinColors = {
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
            flamingo: '#f2cdcd'
        };
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = 200;
        const numNodes = 18;
        
        // Animation state
        let animationPhase = 0;
        let hoveredNode = null;
        
        // Node properties
        const nodeSize = 4;
        const activeNodeSize = 6;
        
        // Color palette for nodes
        const nodeColors = [
            catppuccinColors.blue,
            catppuccinColors.sapphire,
            catppuccinColors.sky,
            catppuccinColors.teal,
            catppuccinColors.green,
            catppuccinColors.lavender,
            catppuccinColors.mauve,
            catppuccinColors.pink,
            catppuccinColors.rosewater,
            catppuccinColors.flamingo,
            catppuccinColors.maroon,
            catppuccinColors.red
        ];
        
        // Spring easing function with overshoot
        function springEase(t) {
            // Spring physics: overshoots and bounces back
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
        
        // Get node positions based on breathing animation
        function getNodePositions(phase) {
            const positions = [];
            const angleStep = (Math.PI * 2) / numNodes;
            const normalizedPhase = phase % (Math.PI * 2);
            
            // Extended cycle: longer collapsed state
            // 0 to 0.3π: collapsed with pulsing
            // 0.3π to 1.3π: expansion
            // 1.3π to 2π: collapse
            const collapsedEnd = Math.PI * 0.3;
            const expansionEnd = Math.PI * 1.3;
            
            // Calculate base expansion
            let baseExpansion;
            let isCollapsedState = false;
            
            if (normalizedPhase < collapsedEnd) {
                // Collapsed state - stay at 0, just pulse
                baseExpansion = 0;
                isCollapsedState = true;
            } else if (normalizedPhase < expansionEnd) {
                // Expansion phase - slower, less linear
                const t = (normalizedPhase - collapsedEnd) / (expansionEnd - collapsedEnd);
                // Use ease-out cubic for smoother, less linear expansion
                baseExpansion = 1 - Math.pow(1 - t, 3);
            } else {
                // Collapse phase - with spring overshoot
                const t = (normalizedPhase - expansionEnd) / (Math.PI * 2 - expansionEnd);
                // Use spring easing for collapse (inverted)
                const springT = springEase(1 - t);
                baseExpansion = springT;
            }
            
            // During expansion, calculate how many nodes should be visible
            let visibleNodes = numNodes;
            if (isCollapsedState) {
                // No nodes visible during collapsed state
                visibleNodes = 0;
            } else if (normalizedPhase >= collapsedEnd && normalizedPhase < expansionEnd) {
                // During expansion: nodes appear one at a time
                visibleNodes = Math.max(1, Math.ceil(baseExpansion * numNodes));
            }
            
            for (let i = 0; i < numNodes; i++) {
                // Calculate individual node expansion
                let nodeExpansion = baseExpansion;
                
                if (isCollapsedState) {
                    // No nodes during collapsed state
                    continue;
                } else if (normalizedPhase >= collapsedEnd && normalizedPhase < expansionEnd) {
                    // During expansion: nodes appear one at a time
                    const nodeAppearanceProgress = i / numNodes;
                    if (i >= visibleNodes) {
                        // Node hasn't appeared yet - skip it
                        continue;
                    }
                    // Calculate expansion for this specific node
                    if (visibleNodes > 1 && baseExpansion > nodeAppearanceProgress) {
                        const remainingProgress = 1 - nodeAppearanceProgress;
                        const nodeT = (baseExpansion - nodeAppearanceProgress) / remainingProgress;
                        nodeExpansion = Math.max(0, Math.min(1, nodeT));
                    } else if (i === 0) {
                        // First node always expands with base expansion
                        nodeExpansion = baseExpansion;
                    }
                }
                
                // More circular during expansion: reduce variations more aggressively
                const circleFactor = nodeExpansion > 0.7 ? Math.pow((1 - nodeExpansion) / 0.3, 2) : 1; // Fade out variations earlier and more smoothly
                const angleVariation = Math.sin(phase * 0.7 + i) * 0.1 * circleFactor; // Subtle angle wobble
                const radiusVariation = 1 + Math.sin(phase * 0.5 + i * 0.8) * 0.08 * circleFactor; // Subtle radius variation
                const angle = angleStep * i + angleVariation;
                const radius = maxRadius * nodeExpansion * radiusVariation;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                positions.push({
                    x,
                    y,
                    angle,
                    radius,
                    expansion: nodeExpansion,
                    color: nodeColors[i % nodeColors.length],
                    shape: 'circle',
                    index: i
                });
            }
            
            // Always include center dot with pulsing during collapsed state
            let centerExpansion = baseExpansion;
            let centerPulse = 1;
            
            if (isCollapsedState) {
                // Pulsing effect during collapsed state
                centerPulse = 1 + Math.sin(phase * 3) * 0.3; // Pulse size
            }
            
            positions.push({
                x: centerX,
                y: centerY,
                angle: 0,
                radius: 0,
                expansion: centerExpansion,
                pulse: centerPulse,
                color: catppuccinColors.blue,
                shape: 'circle',
                index: -1,
                isCenter: true
            });
            
            return positions;
        }
        
        // Draw different shapes
        function drawNode(ctx, x, y, size, shape, color, pulse = 1) {
            const actualSize = size * pulse;
            ctx.fillStyle = color;
            ctx.beginPath();
            
            switch(shape) {
                case 'square':
                    ctx.fillRect(x - actualSize, y - actualSize, actualSize * 2, actualSize * 2);
                    break;
                case 'triangle':
                    ctx.moveTo(x, y - actualSize);
                    ctx.lineTo(x - actualSize, y + actualSize);
                    ctx.lineTo(x + actualSize, y + actualSize);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'diamond':
                    ctx.moveTo(x, y - actualSize);
                    ctx.lineTo(x + actualSize, y);
                    ctx.lineTo(x, y + actualSize);
                    ctx.lineTo(x - actualSize, y);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'circle':
                default:
                    ctx.arc(x, y, actualSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
        
        // Draw connecting lines from center to nodes
        function drawLines(nodes) {
            const centerNode = nodes.find(n => n.isCenter);
            if (!centerNode) return;
            
            nodes.forEach(node => {
                if (node.isCenter) return;
                
                // Line opacity based on expansion
                const opacity = node.expansion * 0.3;
                ctx.strokeStyle = `rgba(180, 190, 254, ${opacity})`;
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
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Get node positions based on breathing animation
            const nodes = getNodePositions(animationPhase);
            
            // Draw connecting lines
            drawLines(nodes);
            
            // Draw all nodes
            nodes.forEach(node => {
                const isHovered = hoveredNode === node;
                const size = isHovered ? activeNodeSize : nodeSize;
                const pulse = node.pulse || 1;
                drawNode(ctx, node.x, node.y, size, node.shape, node.color, pulse);
            });
            
            // Update animation - faster overall
            animationPhase += 0.02;
            if (animationPhase > Math.PI * 2) {
                animationPhase = 0;
            }
        }
        
        // Mouse interaction
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            // Get current nodes
            const nodes = getNodePositions(animationPhase);
            
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
        
        // Start animation loop
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
        document.addEventListener('DOMContentLoaded', initDoubleDiamond);
    } else {
        initDoubleDiamond();
    }
})();
