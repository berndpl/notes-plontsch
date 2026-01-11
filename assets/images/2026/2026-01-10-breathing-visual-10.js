// Breathing Variant 10 - Smooth Wave
// Nodes expand with smooth sin-based speed variation creating a continuous wave pattern
(function() {
    'use strict';
    
    function initBreathing() {
        const canvas = document.getElementById('breathing-variant-10-canvas');
        if (!canvas) {
            console.warn('Breathing Variant 10: Canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Breathing Variant 10: Could not get 2D context');
            return;
        }
        
        canvas.width = 1200;
        canvas.height = 638;
        
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
        
        let time = 0;
        let hoveredNode = null;
        
        // Timing: Configurable via preset (durations in seconds)
        let expandDuration = 2.4;
        let expandRestDuration = 1.2;
        let collapseDuration = 1.2;
        let collapseRestDuration = 1.2;
        
        // Calculate cycleDuration from sum of all durations
        let cycleDuration = expandDuration + expandRestDuration + collapseDuration + collapseRestDuration;
        
        // Calculate phase boundaries (as fractions of cycle)
        let expandEnd = expandDuration / cycleDuration;
        let expandRestEnd = expandEnd + (expandRestDuration / cycleDuration);
        let collapseEnd = expandRestEnd + (collapseDuration / cycleDuration);
        let collapseRestEnd = collapseEnd + (collapseRestDuration / cycleDuration);
        
        // Easing: Standard
        const expansionEaseInPower = 5;
        const expansionEaseOutPower = 2;
        
        // Nodes: Standard
        const numExplorationNodes = 24;
        const maxExplorationRadius = 280;
        const nodeSize = 5;
        const activeNodeSize = 7;
        
        // Wave configuration - smooth sin function
        const waveAmplitude = 0.04; // Maximum speed variation (as fraction of expandDuration) - reduced for smoother movement
        const waveFrequency = 3; // Number of waves around the circle
        
        // Background color transition
        let bgAlpha = 0; // 0 = transparent, 1 = black
        const colorTransitionSpeed = 0.05;
        
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
        
        function breathingEase(t) {
            return t < 0.5 
                ? 8 * t * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 4) / 2;
        }
        
        function expansionEase(t) {
            if (t < 0.5) {
                return Math.pow(2 * t, expansionEaseInPower) / 2;
            } else {
                return 1 - Math.pow(-2 * t + 2, expansionEaseOutPower) / 2;
            }
        }
        
        function getPhase(t) {
            return (t % cycleDuration) / cycleDuration;
        }
        
        function getExplorationRadius(phase) {
            if (phase < expandEnd) {
                const p = phase / expandEnd;
                const eased = expansionEase(p);
                return maxExplorationRadius * eased;
            } else if (phase < expandRestEnd) {
                return maxExplorationRadius;
            } else if (phase < collapseEnd) {
                // Use phase fraction for collapse duration
                const collapsePhaseDuration = collapseEnd - expandRestEnd;
                const p = (phase - expandRestEnd) / collapsePhaseDuration;
                const eased = breathingEase(p);
                return maxExplorationRadius * (1 - eased);
            } else {
                return 0;
            }
        }
        
        // Get smooth sin-based speed offset for continuous wave pattern
        function getNodeSpeedOffset(nodeIndex) {
            const angleStep = (Math.PI * 2) / numExplorationNodes;
            const nodeAngle = angleStep * nodeIndex;
            
            // Use sin function to create smooth, continuous speed variation
            const sinValue = Math.sin(nodeAngle * waveFrequency);
            
            // Map from [-1, 1] to [-waveAmplitude, waveAmplitude]
            return -sinValue * waveAmplitude;
        }
        
        function getNodeRadius(phase, nodeIndex) {
            const speedOffset = getNodeSpeedOffset(nodeIndex);
            let adjustedPhase = phase;
            
            if (phase < expandEnd) {
                // Smooth sin-based speed variation during expansion
                adjustedPhase = phase - speedOffset;
                adjustedPhase = Math.max(0, Math.min(expandEnd, adjustedPhase));
            } else if (phase < expandRestEnd) {
                // Rest phase: ensure all nodes are fully expanded
                const remainingExpansion = phase - expandEnd;
                const catchUpPhase = expandEnd - speedOffset + remainingExpansion;
                if (catchUpPhase < expandEnd) {
                    adjustedPhase = catchUpPhase;
                } else {
                    adjustedPhase = expandRestEnd;
                }
            } else if (phase < collapseEnd) {
                // Collapse: use the same speed pattern as expansion
                const collapsePhase = phase - expandRestEnd;
                adjustedPhase = expandRestEnd + collapsePhase - speedOffset;
                adjustedPhase = Math.max(expandRestEnd, Math.min(collapseEnd, adjustedPhase));
            } else {
                adjustedPhase = collapseEnd;
            }
            
            return getExplorationRadius(adjustedPhase);
        }
        
        function getNodePositions(phase) {
            const positions = [];
            const angleStep = (Math.PI * 2) / numExplorationNodes;
            
            positions.push({
                x: centerX,
                y: centerY,
                angle: 0,
                radius: 0,
                color: colors.lavender,
                index: -1,
                isCenter: true
            });
            
            for (let i = 0; i < numExplorationNodes; i++) {
                const radius = getNodeRadius(phase, i);
                const angle = angleStep * i;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                positions.push({
                    x,
                    y,
                    angle,
                    radius,
                    color: nodeColors[i % nodeColors.length],
                    index: i,
                    isCenter: false,
                    opacity: 1
                });
            }
            
            return positions;
        }
        
        function drawNode(ctx, x, y, size, color, opacity = 1) {
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        function drawLines(nodes) {
            const centerNode = nodes.find(n => n.isCenter);
            if (!centerNode) return;
            
            nodes.forEach(node => {
                if (node.isCenter) return;
                
                const lineOpacity = (node.opacity || 1) * 0.2;
                ctx.strokeStyle = `rgba(180, 190, 254, ${lineOpacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerNode.x, centerNode.y);
                ctx.lineTo(node.x, node.y);
                ctx.stroke();
            });
        }
        
        function isNodeHovered(node, mx, my) {
            const dx = mx - node.x;
            const dy = my - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const size = hoveredNode === node ? activeNodeSize : nodeSize;
            return distance < size + 5;
        }
        
        function draw() {
            // Update background alpha based on fullscreen state
            const isFullscreen = document.fullscreenElement !== null;
            const targetAlpha = isFullscreen ? 1 : 0;
            
            // Smoothly transition alpha
            if (Math.abs(bgAlpha - targetAlpha) > 0.01) {
                if (bgAlpha < targetAlpha) {
                    bgAlpha = Math.min(1, bgAlpha + colorTransitionSpeed);
                } else {
                    bgAlpha = Math.max(0, bgAlpha - colorTransitionSpeed);
                }
            } else {
                bgAlpha = targetAlpha;
            }
            
            // Clear canvas - use transparent clearRect for transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Fill background if alpha > 0
            if (bgAlpha > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            const phase = getPhase(time);
            const nodes = getNodePositions(phase);
            
            drawLines(nodes);
            
            nodes.forEach(node => {
                const isHovered = hoveredNode === node;
                const size = isHovered ? activeNodeSize : nodeSize;
                const opacity = node.opacity !== undefined ? node.opacity : 1;
                drawNode(ctx, node.x, node.y, size, node.color, opacity);
            });
            
            time += 0.016;
        }
        
        // Update timing from preset
        function updateTiming(timing) {
            expandDuration = timing.expandDuration;
            expandRestDuration = timing.expandRestDuration;
            collapseDuration = timing.collapseDuration;
            collapseRestDuration = timing.collapseRestDuration;
            
            // Recalculate cycleDuration from sum
            cycleDuration = expandDuration + expandRestDuration + collapseDuration + collapseRestDuration;
            
            // Recalculate phase boundaries (as fractions of cycle)
            expandEnd = expandDuration / cycleDuration;
            expandRestEnd = expandEnd + (expandRestDuration / cycleDuration);
            collapseEnd = expandRestEnd + (collapseDuration / cycleDuration);
            collapseRestEnd = collapseEnd + (collapseRestDuration / cycleDuration);
        }
        
        // Listen for preset changes
        window.addEventListener('breathingPresetChange', function(event) {
            updateTiming(event.detail);
        });
        
        // Initialize with default timing
        if (window.breathingPresets) {
            updateTiming(window.breathingPresets.calm);
        }
        
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
            
            for (let node of nodes) {
                if (isNodeHovered(node, mouseX, mouseY)) {
                    hoveredNode = node;
                    break;
                }
            }
            
            if (hoveredNode !== previousHovered) {
                draw();
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            hoveredNode = null;
            draw();
        });
        
        function animate() {
            draw();
            requestAnimationFrame(animate);
        }
        
        draw();
        animate();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBreathing);
    } else {
        initBreathing();
    }
})();
