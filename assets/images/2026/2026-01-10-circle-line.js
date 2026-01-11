// Circle to Line - Nodes Forming Circle Then Lining Up
(function() {
    'use strict';
    
    function initCircleLine() {
        const canvas = document.getElementById('circle-line-canvas');
        if (!canvas) {
            console.warn('Circle to Line: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Circle to Line: Could not get 2D context');
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
        
        // Animation state
        let time = 0;
        let hoveredNode = null;
        
        // ===== TIMING CONFIGURATION =====
        const cycleDuration = 10; // Full cycle duration
        const circleRadius = 200; // Radius of the circle
        const lineSpacing = 15; // Spacing between nodes in the line
        // ===== END TIMING CONFIGURATION =====
        
        // ===== NODE CONFIGURATION =====
        const numNodes = 60; // Number of nodes
        const nodeSize = 4;
        const activeNodeSize = 6;
        const padding = 60; // Padding from canvas edges
        // ===== END NODE CONFIGURATION =====
        
        // Color palette for nodes
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
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Generate random initial positions for nodes
        const initialPositions = [];
        const maxDistance = Math.min(canvas.width, canvas.height) / 2 - padding;
        
        for (let i = 0; i < numNodes; i++) {
            // Generate random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxDistance;
            
            const baseX = centerX + Math.cos(angle) * distance;
            const baseY = centerY + Math.sin(angle) * distance;
            
            // Ensure nodes stay within canvas bounds
            const clampedX = Math.max(padding, Math.min(canvas.width - padding, baseX));
            const clampedY = Math.max(padding, Math.min(canvas.height - padding, baseY));
            
            initialPositions.push({
                x: clampedX,
                y: clampedY,
                index: i
            });
        }
        
        // Easing function for smooth transitions
        function easeInOut(t) {
            return t < 0.5 
                ? 2 * t * t 
                : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }
        
        // Get animation phases
        function getPhases(t) {
            const cyclePhase = (t % cycleDuration) / cycleDuration;
            
            if (cyclePhase < 0.5) {
                // First half: random -> circle -> line
                const progress = cyclePhase * 2; // 0 -> 1
                
                if (progress < 0.5) {
                    // Forming circle phase
                    const circlePhase = easeInOut(progress * 2); // 0 -> 1
                    return { circlePhase: circlePhase, linePhase: 0 };
                } else {
                    // Lining up phase
                    const linePhase = easeInOut((progress - 0.5) * 2); // 0 -> 1
                    return { circlePhase: 1, linePhase: linePhase };
                }
            } else {
                // Second half: line -> circle -> random
                const progress = (cyclePhase - 0.5) * 2; // 0 -> 1
                
                if (progress < 0.5) {
                    // From line to circle
                    const linePhase = easeInOut(1 - progress * 2); // 1 -> 0
                    return { circlePhase: 1, linePhase: linePhase };
                } else {
                    // From circle to random
                    const circlePhase = easeInOut(1 - (progress - 0.5) * 2); // 1 -> 0
                    return { circlePhase: circlePhase, linePhase: 0 };
                }
            }
        }
        
        // Calculate target position on circle
        function getCirclePosition(baseX, baseY, nodeIndex) {
            // Calculate angle from center
            const dx = baseX - centerX;
            const dy = baseY - centerY;
            const angle = Math.atan2(dy, dx);
            
            // Place node on circle perimeter
            const targetX = centerX + Math.cos(angle) * circleRadius;
            const targetY = centerY + Math.sin(angle) * circleRadius;
            
            return {
                x: targetX,
                y: targetY,
                angle: angle
            };
        }
        
        // Calculate target position on line
        function getLinePosition(nodeIndex) {
            // Calculate total line length
            const totalLineLength = (numNodes - 1) * lineSpacing;
            const startX = centerX - totalLineLength / 2;
            
            // Place nodes evenly along horizontal line
            const lineX = startX + nodeIndex * lineSpacing;
            const lineY = centerY;
            
            return {
                x: lineX,
                y: lineY
            };
        }
        
        // Get node positions for current time
        function getNodePositions(t) {
            const positions = [];
            const phases = getPhases(t);
            
            // Sort nodes by angle for consistent circle formation
            const sortedNodes = initialPositions.map((pos, index) => {
                const dx = pos.x - centerX;
                const dy = pos.y - centerY;
                const angle = Math.atan2(dy, dx);
                return { ...pos, angle: angle };
            }).sort((a, b) => a.angle - b.angle);
            
            sortedNodes.forEach((node, index) => {
                const baseX = node.x;
                const baseY = node.y;
                
                // Calculate circle position
                const circlePos = getCirclePosition(baseX, baseY, index);
                
                // Calculate line position
                const linePos = getLinePosition(index);
                
                // First: move from random to circle
                const circleX = baseX + (circlePos.x - baseX) * phases.circlePhase;
                const circleY = baseY + (circlePos.y - baseY) * phases.circlePhase;
                
                // Then: move from circle to line
                const finalX = circleX + (linePos.x - circleX) * phases.linePhase;
                const finalY = circleY + (linePos.y - circleY) * phases.linePhase;
                
                // Calculate distance from center for color variation
                const distFromCenter = Math.sqrt(
                    Math.pow(baseX - centerX, 2) + Math.pow(baseY - centerY, 2)
                );
                const maxDist = Math.sqrt(
                    Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2)
                );
                const colorIndex = Math.floor((distFromCenter / maxDist) * nodeColors.length);
                
                // Opacity based on movement
                const totalMovement = Math.sqrt(
                    Math.pow(finalX - baseX, 2) + Math.pow(finalY - baseY, 2)
                );
                const opacity = 0.6 + (Math.abs(totalMovement) / maxDist) * 0.4;
                
                positions.push({
                    x: finalX,
                    y: finalY,
                    baseX: baseX,
                    baseY: baseY,
                    color: nodeColors[colorIndex % nodeColors.length],
                    opacity: Math.min(1, opacity),
                    index: index,
                    circlePhase: phases.circlePhase,
                    linePhase: phases.linePhase
                });
            });
            
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
            // Clear canvas with background
            ctx.fillStyle = '#1e1e2e'; // Catppuccin Mocha base - matches page background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const nodes = getNodePositions(time);
            
            // Draw all nodes
            nodes.forEach(node => {
                const isHovered = hoveredNode === node;
                const size = isHovered ? activeNodeSize : nodeSize;
                drawNode(ctx, node.x, node.y, size, node.color, node.opacity);
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
            
            const nodes = getNodePositions(time);
            
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
        document.addEventListener('DOMContentLoaded', initCircleLine);
    } else {
        initCircleLine();
    }
})();
