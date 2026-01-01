// Minimal post graph visualization with pan and zoom
(function() {
  'use strict';

  function initGraph() {
    const canvas = document.getElementById('post-graph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
  
    // Set canvas size
    function resizeCanvas() {
      canvas.width = container.clientWidth;
      canvas.height = 300; // Fixed height for the graph
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Get posts data from the page
    const posts = Array.from(document.querySelectorAll('.posts li:not(.year-separator)')).map((li, index) => {
    const link = li.querySelector('a');
    const time = li.querySelector('time');
    return {
      id: index,
      title: link ? link.textContent.trim() : '',
      url: link ? link.href : '',
      date: time ? new Date(time.getAttribute('datetime')) : new Date(),
      element: li
    };
  });

    if (posts.length === 0) return;

    // Graph nodes and edges
    const nodes = posts.map((post, i) => ({
    ...post,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 24
  }));

    // Create edges based on date proximity (connect posts within 30 days)
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const daysDiff = Math.abs((nodes[i].date - nodes[j].date) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        edges.push({ source: i, target: j, strength: 1 - (daysDiff / 30) });
      }
    }
  }

    // Initialize positions in a circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });

    // Force simulation parameters
    const k = Math.sqrt((canvas.width * canvas.height) / nodes.length);
    const repulsionStrength = 0.1;
    const attractionStrength = 0.01;

    // Zoom (panning disabled)
    let zoom = 1;
    let autoZoom = true; // Track if we're using auto-zoom

    // Calculate center of graph for centering (will be updated in updateForces)
    let graphCenterX = canvas.width / 2;
    let graphCenterY = canvas.height / 2;

    // Click to navigate
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const x = (e.clientX - rect.left - centerX) / zoom + graphCenterX;
      const y = (e.clientY - rect.top - centerY) / zoom + graphCenterY;

    // Find clicked node
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= node.radius * 2) {
        window.location.href = node.url;
        return;
      }
    }
  });

    // Force simulation
    function updateForces() {
    // Reset velocities
    nodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (k * k) / distance * repulsionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const source = nodes[edge.source];
      const target = nodes[edge.target];
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance / k) * attractionStrength * edge.strength;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    // Update positions
    nodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
    });

    // Calculate bounding box and center of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    graphCenterX = (minX + maxX) / 2;
    graphCenterY = (minY + maxY) / 2;

    // Calculate optimal zoom to fit all nodes with padding (only if auto-zoom is enabled)
    if (autoZoom && graphWidth > 0 && graphHeight > 0) {
      const padding = 80; // Padding around the graph
      const scaleX = (canvas.width - padding * 2) / graphWidth;
      const scaleY = (canvas.height - padding * 2) / graphHeight;
      const optimalZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x
      
      // Smoothly adjust zoom towards optimal
      zoom = optimalZoom;
    }
  }

    // Render
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Center the graph and apply zoom (no panning)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);
      ctx.translate(-graphCenterX, -graphCenterY);

      // Draw edges (clearer visibility)
      ctx.strokeStyle = 'rgba(108, 112, 134, 0.66)'; // Catppuccin Mocha surface2 with higher opacity
      ctx.lineWidth = 4.5;
      edges.forEach(edge => {
        const source = nodes[edge.source];
        const target = nodes[edge.target];
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      // Draw nodes (static, no pulsing)
      nodes.forEach(node => {
        ctx.fillStyle = '#b4befe'; // Catppuccin Mocha lavender
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

    ctx.restore();
  }

    // Animation loop
    let animationId;
    function animate() {
      updateForces();
      render();
      animationId = requestAnimationFrame(animate);
    }

    // Start animation
    canvas.style.cursor = 'pointer';
    animate();

    // Stop animation when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animate();
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();

