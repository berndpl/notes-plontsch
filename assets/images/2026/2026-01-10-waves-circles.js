// Waves to Circles - Morphing Visualization
(function() {
    'use strict';
    
    function initWavesCircles() {
        const canvas = document.getElementById('waves-circles-canvas');
        if (!canvas) {
            console.warn('Waves to Circles: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Waves to Circles: Could not get 2D context');
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
        const cycleDuration = 12; // Full cycle duration (waves -> circles -> waves)
        const waveSpeed = 2.0; // Speed of wave propagation
        const waveFrequency = 0.8; // Frequency of waves
        const waveAmplitude = 40; // Maximum vertical displacement
        const numWaves = 3; // Number of simultaneous waves
        const circlePulseSpeed = 1.5; // Speed of circle pulsing
        const circlePulseAmplitude = 30; // Amplitude of circle pulsing
        // ===== END TIMING CONFIGURATION =====
        
        // ===== GRID CONFIGURATION =====
        const gridSpacing = 30; // Distance between nodes
        const nodeSize = 4;
        const activeNodeSize = 6;
        const padding = 40; // Padding from canvas edges
        // ===== END GRID CONFIGURATION =====
        
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
        
        // Calculate grid dimensions
        const cols = Math.floor((canvas.width - padding * 2) / gridSpacing);
        const rows = Math.floor((canvas.height - padding * 2) / gridSpacing);
        const startX = (canvas.width - (cols - 1) * gridSpacing) / 2;
        const startY = (canvas.height - (rows - 1) * gridSpacing) / 2;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Get morph phase (0 = waves, 1 = circles)
        function getMorphPhase(t) {
            const cyclePhase = (t % cycleDuration) / cycleDuration;
            // Smooth transition: waves -> circles -> waves
            // Use sine wave for smooth morphing
            return (Math.sin(cyclePhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        }
        
        // Wave sources
        function getWaveSources(t) {
            const sources = [];
            for (let i = 0; i < numWaves; i++) {
                const phase = (t * 0.1 + i * Math.PI * 2 / numWaves) % (Math.PI * 2);
                sources.push({
                    x: centerX + Math.cos(phase) * (canvas.width * 0.3),
                    y: centerY + Math.sin(phase) * (canvas.height * 0.3),
                    phase: phase
                });
            }
            return sources;
        }
        
        // Calculate wave displacement for a point
        function getWaveDisplacement(x, y, t, sources) {
            let totalDisplacement = 0;
            let maxInfluence = 0;
            
            sources.forEach((source) => {
                const dx = x - source.x;
                const dy = y - source.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const maxDistance = Math.max(canvas.width, canvas.height) * 0.6;
                const influence = Math.max(0, 1 - distance / maxDistance);
                
                if (influence > 0) {
                    const wavePhase = (distance * waveFrequency - t * waveSpeed + source.phase * 10) % (Math.PI * 2);
                    const waveValue = Math.sin(wavePhase);
                    
                    totalDisplacement += waveValue * influence * waveAmplitude;
                    maxInfluence += influence;
                }
            });
            
            if (maxInfluence > 0) {
                return totalDisplacement / Math.max(1, maxInfluence * 0.7);
            }
            
            return 0;
        }
        
        // Calculate circle displacement for a point
        function getCircleDisplacement(baseX, baseY, t) {
            // Calculate distance from center
            const dx = baseX - centerX;
            const dy = baseY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate angle from center
            const angle = Math.atan2(dy, dx);
            
            // Snap to nearest circle radius (quantize distance)
            const circleSpacing = gridSpacing * 1.5;
            const circleRadius = Math.round(distance / circleSpacing) * circleSpacing;
            
            // Calculate target position on circle
            const targetX = centerX + Math.cos(angle) * circleRadius;
            const targetY = centerY + Math.sin(angle) * circleRadius;
            
            // Add pulsing effect (radial expansion/contraction)
            const pulsePhase = (t * circlePulseSpeed) % (Math.PI * 2);
            const pulseAmount = Math.sin(pulsePhase) * circlePulseAmplitude;
            const pulseX = centerX + Math.cos(angle) * (circleRadius + pulseAmount);
            const pulseY = centerY + Math.sin(angle) * (circleRadius + pulseAmount);
            
            // Return displacement from base position
            return {
                x: pulseX - baseX,
                y: pulseY - baseY
            };
        }
        
        // Get node positions for current time
        function getNodePositions(t) {
            const positions = [];
            const morphPhase = getMorphPhase(t);
            const sources = getWaveSources(t);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const baseX = startX + col * gridSpacing;
                    const baseY = startY + row * gridSpacing;
                    
                    // Calculate wave displacement
                    const waveDisp = getWaveDisplacement(baseX, baseY, t, sources);
                    const waveY = baseY + waveDisp;
                    
                    // Calculate circle displacement
                    const circleDisp = getCircleDisplacement(baseX, baseY, t);
                    const circleX = baseX + circleDisp.x;
                    const circleY = baseY + circleDisp.y;
                    
                    // Blend between wave and circle positions
                    const finalX = baseX + (circleDisp.x * morphPhase);
                    const finalY = baseY + (waveDisp * (1 - morphPhase)) + (circleDisp.y * morphPhase);
                    
                    // Calculate distance from center for color variation
                    const distFromCenter = Math.sqrt(
                        Math.pow(baseX - centerX, 2) + Math.pow(baseY - centerY, 2)
                    );
                    const maxDist = Math.sqrt(
                        Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2)
                    );
                    const colorIndex = Math.floor((distFromCenter / maxDist) * nodeColors.length);
                    
                    // Opacity based on movement (blend between wave and circle movement)
                    const waveMovement = Math.abs(waveDisp);
                    const circleMovement = Math.sqrt(circleDisp.x * circleDisp.x + circleDisp.y * circleDisp.y);
                    const totalMovement = waveMovement * (1 - morphPhase) + circleMovement * morphPhase;
                    const opacity = 0.6 + (totalMovement / Math.max(waveAmplitude, circlePulseAmplitude)) * 0.4;
                    
                    positions.push({
                        x: finalX,
                        y: finalY,
                        baseX: baseX,
                        baseY: baseY,
                        color: nodeColors[colorIndex % nodeColors.length],
                        opacity: Math.min(1, opacity),
                        index: row * cols + col,
                        morphPhase: morphPhase
                    });
                }
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
        document.addEventListener('DOMContentLoaded', initWavesCircles);
    } else {
        initWavesCircles();
    }
})();
