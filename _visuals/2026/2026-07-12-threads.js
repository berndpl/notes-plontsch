import {
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NoToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

const CANVAS_ID = '2026-07-12-threads-canvas';
const ASPECT = 1200 / 638;
const FIXED_STEP = 1 / 60;
const SEGMENT_LENGTH = 0.085;
const THREAD_RADIUS = 0.042;
const COLLISION_DISTANCE = 0.09;
const SOURCE_HEIGHT = 6.4;
const VIEW_HALF_WIDTH = 7.75;
const VIEW_HALF_DEPTH = VIEW_HALF_WIDTH / ASPECT;
const ACTIVE_PARTICLES = 1100;
const MAX_SEGMENTS = 25000;
const MIN_COMPLETION_SEGMENTS = 15000;
const DEFAULT_FEED_SPEED = 2.5;
const DEFAULT_SOLVER_ITERATIONS = 6;
const DEFAULT_GRAVITY = 42;
const AIR_DAMPING = 0.994;
const GROUND_DAMPING = 0.55;
const COVERAGE_COLUMNS = 96;
const COVERAGE_ROWS = 51;
const COVERAGE_TARGET = 0.88;
const TOP_POLAR_ANGLE = 0.16;
const SIDE_POLAR_ANGLE = 1.5;
const MIN_POLAR_ANGLE = 0.12;
const MAX_POLAR_ANGLE = 1.56;
const CAMERA_RADIUS = 17.8;
const ORTHOGRAPHIC_HALF_HEIGHT = 4.1;
const DOUBLE_TAP_DELAY = 300;
const BLACK = 0x000000;
const WHITE = 0xffffff;

function init() {
  const canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return;

  canvas.setAttribute('role', 'application');
  canvas.setAttribute('tabindex', '0');
  canvas.textContent = 'A black and white 3D thread falling and accumulating in layers.';

  const header = canvas.parentElement;
  if (header) header.style.position = 'relative';

  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    showFallback(canvas, error);
    return;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new Scene();
  const perspectiveCamera = new PerspectiveCamera(26, ASPECT, 0.1, 100);
  const orthographicCamera = new OrthographicCamera(
    -ORTHOGRAPHIC_HALF_HEIGHT * ASPECT,
    ORTHOGRAPHIC_HALF_HEIGHT * ASPECT,
    ORTHOGRAPHIC_HALF_HEIGHT,
    -ORTHOGRAPHIC_HALF_HEIGHT,
    0.1,
    100,
  );
  perspectiveCamera.up.set(0, 1, 0);
  orthographicCamera.up.set(0, 1, 0);
  let camera = perspectiveCamera;

  const initialThreadColor = contrastingThreadColor();
  const threadMaterial = new MeshBasicMaterial({ color: initialThreadColor });
  const risographMaterial = new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uInkA: { value: new Color('#ff5f69') },
      uInkB: { value: new Color('#4f6fff') },
      uInkC: { value: new Color('#f2c94c') },
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 localPosition = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          localPosition = instanceMatrix * localPosition;
        #endif
        vec4 worldPosition = modelMatrix * localPosition;
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uInkA;
      uniform vec3 uInkB;
      uniform vec3 uInkC;
      varying vec3 vWorldPosition;

      float hash21(vec2 value) {
        value = fract(value * vec2(123.34, 456.21));
        value += dot(value, value + 45.32);
        return fract(value.x * value.y);
      }

      vec3 inkFor(float selector) {
        if (selector < 0.3333) return uInkA;
        if (selector < 0.6666) return uInkB;
        return uInkC;
      }

      void main() {
        vec2 printPosition =
          vWorldPosition.xz * 2.7 +
          vWorldPosition.y * vec2(0.71, -0.43);
        float primarySelector =
          0.5 +
          sin(printPosition.x * 2.3 + sin(printPosition.y * 1.6)) * 0.25 +
          sin(printPosition.y * 2.1 - printPosition.x * 0.7) * 0.25;
        float secondarySelector =
          0.5 +
          sin(printPosition.x * 1.4 - printPosition.y * 2.6 + 1.7) * 0.5;
        vec3 primaryInk = inkFor(primarySelector);
        vec3 secondaryInk = inkFor(fract(secondarySelector + 0.37));

        vec2 paperPixel = floor(gl_FragCoord.xy);
        float fineGrain = hash21(paperPixel);
        float coarseGrain = hash21(floor(paperPixel * 0.19));
        float registration = hash21(
          floor(paperPixel * 0.11) + floor(printPosition)
        );
        float overprint = smoothstep(
          0.76,
          0.98,
          secondarySelector + (registration - 0.5) * 0.24
        );

        if (fineGrain < 0.045) discard;

        vec3 ink = mix(primaryInk, primaryInk * secondaryInk, overprint * 0.7);
        float density = 0.76 + fineGrain * 0.18 + coarseGrain * 0.06;
        float alpha = 0.86 + coarseGrain * 0.12;
        gl_FragColor = vec4(clamp(ink * density, 0.0, 1.0), alpha);
      }
    `,
  });
  const segmentGeometry = new CylinderGeometry(
    THREAD_RADIUS,
    THREAD_RADIUS,
    1,
    5,
    1,
    false,
  );
  const thread = new InstancedMesh(segmentGeometry, threadMaterial, MAX_SEGMENTS);
  thread.instanceMatrix.setUsage(DynamicDrawUsage);
  thread.frustumCulled = false;
  thread.count = 0;
  scene.add(thread);

  const prompt = document.createElement('div');
  prompt.setAttribute('aria-live', 'polite');
  Object.assign(prompt.style, {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    zIndex: '1',
    color: '#ffffff',
    fontFamily: "'Inconsolata', monospace",
    fontSize: '1rem',
    lineHeight: '1.2',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 180ms ease',
  });
  if (header) header.appendChild(prompt);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = {
    threadWidth: 1,
    smoothness: DEFAULT_SOLVER_ITERATIONS,
    speed: DEFAULT_FEED_SPEED,
    gravity: DEFAULT_GRAVITY,
    spread: 0.18,
    projection: 'orthographic',
    renderStyle: 'monochrome',
  };
  const matrix = new Matrix4();
  const midpoint = new Vector3();
  const direction = new Vector3();
  const scale = new Vector3(1, 1, 1);
  const rotation = new Quaternion();
  const yAxis = new Vector3(0, 1, 0);
  const cameraLookAt = new Vector3(0, 0.35, 0);
  const orbit = {
    azimuth: 0,
    polar: TOP_POLAR_ANGLE,
    targetAzimuth: 0,
    targetPolar: TOP_POLAR_ANGLE,
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  };
  const coverage = new Uint8Array(COVERAGE_COLUMNS * COVERAGE_ROWS);

  let backgroundColor = null;
  let threadColor = initialThreadColor;
  let layer = 0;
  let particles = [];
  let frozenCount = 0;
  let particleSerial = 0;
  let sourceTime = 0;
  let feedAccumulator = 0;
  let state = 'feeding';
  let accumulator = 0;
  let lastTime = performance.now();
  let coverageFrame = 0;
  let animationFrame = 0;
  let staticGrid = new Map();
  let random = seededRandom(0x74687264);
  let tapTimer = 0;
  let pendingTap = null;
  createDebugMenu();

  function particle(x, y, z, pinned = false) {
    return {
      x,
      y,
      z,
      px: x,
      py: y,
      pz: z,
      pinned,
      id: particleSerial++,
      phase: random() * Math.PI * 2,
    };
  }

  function sourcePosition() {
    return { x: 0, y: SOURCE_HEIGHT, z: 0 };
  }

  function pileProgress() {
    return Math.min(1, Math.max(0, (particles.length - 1) / MAX_SEGMENTS));
  }

  function effectiveSpread() {
    const progress = pileProgress();
    const easedProgress = progress * progress * (3 - 2 * progress);
    return settings.spread + easedProgress * 1.35;
  }

  function resetSimulation() {
    particleSerial = 0;
    sourceTime = 0;
    feedAccumulator = 0;
    accumulator = 0;
    coverageFrame = 0;
    coverage.fill(0);
    staticGrid = new Map();
    frozenCount = 0;
    random = seededRandom(0x74687264 ^ ((layer + 1) * 0x9e3779b1));
    particles = [];

    const source = sourcePosition();
    particles = [
      particle(source.x, source.y - SEGMENT_LENGTH, source.z),
      particle(source.x, source.y, source.z, true),
    ];

    state = 'feeding';
    thread.count = 0;
    hidePrompt();
    updateAccessibility();
    updateThreadGeometry(0);
  }

  function buildReducedMotionLayer() {
    particleSerial = 0;
    particles = [];
    const segmentCount = 12000;
    const maxRadius = VIEW_HALF_DEPTH * 0.8;

    for (let index = 0; index <= segmentCount; index += 1) {
      const progress = index / segmentCount;
      const angle = index * 0.31 + layer * 0.47;
      const radius = Math.sqrt(progress) * maxRadius;
      const x = Math.cos(angle) * radius * 1.45;
      const z = Math.sin(angle) * radius * 0.78;
      const y =
        THREAD_RADIUS +
        Math.pow(1 - progress, 2) * 1.3 +
        Math.abs(Math.sin(index * 0.17)) * THREAD_RADIUS * 0.45;
      particles.push(particle(x, y, z));
    }

    state = 'complete';
    updateThreadGeometry(0);
    showPrompt();
    updateAccessibility();
  }

  function injectSegments() {
    const source = sourcePosition();
    feedAccumulator += settings.speed;
    const segmentsToInject = Math.floor(feedAccumulator);
    feedAccumulator -= segmentsToInject;

    for (
      let index = 0;
      index < segmentsToInject && particles.length - 1 < MAX_SEGMENTS;
      index += 1
    ) {
      const currentHead = particles[particles.length - 1];
      currentHead.pinned = false;
      particles.push(particle(source.x, source.y, source.z, true));
      solveConstraintRange(Math.max(0, particles.length - 30), 2);
    }
  }

  function integrateParticles() {
    const start = Math.max(frozenCount, 0);
    const boundaryX = VIEW_HALF_WIDTH * 1.08;
    const boundaryZ = VIEW_HALF_DEPTH * 1.12;
    const dtSquared = FIXED_STEP * FIXED_STEP;

    for (let index = start; index < particles.length; index += 1) {
      const point = particles[index];
      if (point.pinned) continue;

      const velocityX = (point.x - point.px) * AIR_DAMPING;
      const velocityY = (point.y - point.py) * AIR_DAMPING;
      const velocityZ = (point.z - point.pz) * AIR_DAMPING;

      point.px = point.x;
      point.py = point.y;
      point.pz = point.z;

      let forceX = 0;
      let forceZ = 0;
      if (point.y < SOURCE_HEIGHT * 0.5) {
        const radius = Math.hypot(point.x, point.z) || 1;
        const spread = effectiveSpread();
        const heightSlide = 1 + Math.min(2, point.y) * 0.3;
        const outward =
          3.8 *
          spread *
          heightSlide *
          (1 - Math.min(1, radius / VIEW_HALF_WIDTH));
        forceX += (point.x / radius) * outward;
        forceZ += (point.z / radius) * outward;
        forceX += Math.sin(point.phase + sourceTime * 0.7) * 2.2 * spread;
        forceZ +=
          Math.cos(point.phase * 1.17 + sourceTime * 0.61) * 2.2 * spread;
      }

      if (Math.abs(point.x) > VIEW_HALF_WIDTH * 0.9) {
        forceX -= Math.sign(point.x) * (Math.abs(point.x) - VIEW_HALF_WIDTH * 0.9) * 24;
      }
      if (Math.abs(point.z) > VIEW_HALF_DEPTH * 0.88) {
        forceZ -= Math.sign(point.z) * (Math.abs(point.z) - VIEW_HALF_DEPTH * 0.88) * 28;
      }

      point.x += velocityX + forceX * dtSquared;
      point.y += velocityY - settings.gravity * dtSquared;
      point.z += velocityZ + forceZ * dtSquared;

      if (point.x < -boundaryX || point.x > boundaryX) {
        point.x = Math.max(-boundaryX, Math.min(boundaryX, point.x));
        point.px = point.x + velocityX * GROUND_DAMPING;
      }
      if (point.z < -boundaryZ || point.z > boundaryZ) {
        point.z = Math.max(-boundaryZ, Math.min(boundaryZ, point.z));
        point.pz = point.z + velocityZ * GROUND_DAMPING;
      }

      constrainToGround(point);
    }
  }

  function solveDistanceConstraints() {
    solveConstraintRange(Math.max(0, frozenCount - 1), settings.smoothness);
  }

  function solveConstraintRange(firstConstraint, iterations) {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (let index = particles.length - 2; index >= firstConstraint; index -= 1) {
        const a = particles[index];
        const b = particles[index + 1];
        const aMovable = index >= frozenCount && !a.pinned;
        const bMovable = index + 1 >= frozenCount && !b.pinned;
        if (!aMovable && !bMovable) continue;

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let distance = Math.hypot(dx, dy, dz);

        if (distance < 0.00001) {
          const offsetX = Math.sin(a.phase) * 0.006;
          const offsetZ = Math.cos(a.phase) * 0.006;
          if (aMovable && bMovable) {
            a.x -= offsetX;
            a.y -= SEGMENT_LENGTH * 0.5;
            a.z -= offsetZ;
            b.x += offsetX;
            b.y += SEGMENT_LENGTH * 0.5;
            b.z += offsetZ;
          } else if (aMovable) {
            a.x -= offsetX;
            a.y -= SEGMENT_LENGTH;
            a.z -= offsetZ;
          } else {
            b.x += offsetX;
            b.y += SEGMENT_LENGTH;
            b.z += offsetZ;
          }
          if (aMovable) constrainToGround(a);
          if (bMovable) constrainToGround(b);
          continue;
        }

        const difference = (distance - SEGMENT_LENGTH) / distance;

        if (aMovable && bMovable) {
          const correction = difference * 0.5;
          a.x += dx * correction;
          a.y += dy * correction;
          a.z += dz * correction;
          b.x -= dx * correction;
          b.y -= dy * correction;
          b.z -= dz * correction;
        } else if (aMovable) {
          a.x += dx * difference;
          a.y += dy * difference;
          a.z += dz * difference;
        } else {
          b.x -= dx * difference;
          b.y -= dy * difference;
          b.z -= dz * difference;
        }

        if (aMovable) constrainToGround(a);
        if (bMovable) constrainToGround(b);
      }
    }
  }

  function solveSelfCollisions() {
    const dynamicGrid = new Map();
    const cellSize = COLLISION_DISTANCE;
    const start = Math.max(frozenCount, 0);

    for (let index = start; index < particles.length - 1; index += 1) {
      const point = particles[index];
      const cellX = Math.floor(point.x / cellSize);
      const cellY = Math.floor(point.y / cellSize);
      const cellZ = Math.floor(point.z / cellSize);

      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
          for (let zOffset = -1; zOffset <= 1; zOffset += 1) {
            const key = gridKey(cellX + xOffset, cellY + yOffset, cellZ + zOffset);
            resolveAgainstEntries(point, index, staticGrid.get(key), false);
            resolveAgainstEntries(point, index, dynamicGrid.get(key), true);
          }
        }
      }

      const key = gridKey(cellX, cellY, cellZ);
      if (!dynamicGrid.has(key)) dynamicGrid.set(key, []);
      dynamicGrid.get(key).push({ point, index });
    }
  }

  function resolveAgainstEntries(point, index, entries, moveOther) {
    if (!entries) return;

    for (const entry of entries) {
      if (Math.abs(index - entry.index) <= 2) continue;
      const other = entry.point;
      let dx = point.x - other.x;
      let dy = point.y - other.y;
      let dz = point.z - other.z;
      let distance = Math.hypot(dx, dy, dz);
      if (!Number.isFinite(distance)) continue;

      const horizontalDistance = Math.hypot(dx, dz);
      if (
        horizontalDistance < COLLISION_DISTANCE * 0.88 &&
        point.y >= other.y - COLLISION_DISTANCE * 0.35
      ) {
        dy = Math.max(dy, COLLISION_DISTANCE * 0.34);
        if (horizontalDistance < COLLISION_DISTANCE * 0.24) {
          dx += Math.sin(point.phase + other.phase) * COLLISION_DISTANCE * 0.22;
          dz += Math.cos(point.phase - other.phase) * COLLISION_DISTANCE * 0.22;
        }
        distance = Math.hypot(dx, dy, dz);
      }
      if (distance >= COLLISION_DISTANCE) continue;

      if (distance < 0.00001) {
        dx = Math.sin(point.phase + other.phase);
        dy = 0.15;
        dz = Math.cos(point.phase - other.phase);
        distance = Math.hypot(dx, dy, dz);
      }

      const overlap = (COLLISION_DISTANCE - distance) / distance;
      const share = moveOther ? 0.5 : 1;
      point.x += dx * overlap * share;
      point.y += dy * overlap * share;
      point.z += dz * overlap * share;

      if (moveOther && !other.pinned && entry.index >= frozenCount) {
        other.x -= dx * overlap * 0.5;
        other.y -= dy * overlap * 0.5;
        other.z -= dz * overlap * 0.5;
        constrainToGround(other);
      }
      constrainToGround(point);
    }
  }

  function constrainToGround(point) {
    if (point.y >= THREAD_RADIUS) return;
    const velocityX = point.x - point.px;
    const velocityZ = point.z - point.pz;
    point.y = THREAD_RADIUS;
    point.py = THREAD_RADIUS;
    point.px = point.x - velocityX * GROUND_DAMPING;
    point.pz = point.z - velocityZ * GROUND_DAMPING;
  }

  function freezeSettledTail() {
    const targetFrozenCount = Math.max(0, particles.length - 1 - ACTIVE_PARTICLES);
    while (frozenCount < targetFrozenCount) {
      const point = particles[frozenCount];
      const key = gridKey(
        Math.floor(point.x / COLLISION_DISTANCE),
        Math.floor(point.y / COLLISION_DISTANCE),
        Math.floor(point.z / COLLISION_DISTANCE),
      );
      if (!staticGrid.has(key)) staticGrid.set(key, []);
      staticGrid.get(key).push({ point, index: frozenCount });
      frozenCount += 1;
    }
  }

  function simulateStep() {
    sourceTime += FIXED_STEP;
    injectSegments();

    const source = sourcePosition();
    const head = particles[particles.length - 1];
    head.x = source.x;
    head.y = source.y;
    head.z = source.z;
    head.px = source.x;
    head.py = source.y;
    head.pz = source.z;

    integrateParticles();
    solveDistanceConstraints();
    solveSelfCollisions();
    solveDistanceConstraints();
    freezeSettledTail();

    if (particles.length - 1 >= MAX_SEGMENTS) completeLayer();
  }

  function updateThreadGeometry(startIndex) {
    const segmentCount = Math.min(MAX_SEGMENTS, Math.max(0, particles.length - 1));
    const start = Math.max(0, Math.min(startIndex, segmentCount));

    for (let index = start; index < segmentCount; index += 1) {
      const a = particles[index];
      const b = particles[index + 1];
      direction.set(b.x - a.x, b.y - a.y, b.z - a.z);
      const length = Math.max(0.0001, direction.length());
      direction.multiplyScalar(1 / length);
      midpoint.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
      rotation.setFromUnitVectors(yAxis, direction);
      scale.set(settings.threadWidth, length * 1.08, settings.threadWidth);
      matrix.compose(midpoint, rotation, scale);
      thread.setMatrixAt(index, matrix);
    }

    thread.count = segmentCount;
    thread.instanceMatrix.needsUpdate = true;
    canvas.dataset.threadSegments = String(segmentCount);
  }

  function calculateCoverage() {
    coverage.fill(0);
    let occupied = 0;
    const segmentCount = particles.length - 1;

    for (let index = 0; index < segmentCount; index += 1) {
      const a = particles[index];
      const b = particles[index + 1];
      const x = (a.x + b.x) * 0.5;
      const z = (a.z + b.z) * 0.5;
      const column = Math.floor(((x + VIEW_HALF_WIDTH) / (VIEW_HALF_WIDTH * 2)) * COVERAGE_COLUMNS);
      const row = Math.floor(((z + VIEW_HALF_DEPTH) / (VIEW_HALF_DEPTH * 2)) * COVERAGE_ROWS);
      if (column < 0 || column >= COVERAGE_COLUMNS || row < 0 || row >= COVERAGE_ROWS) continue;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const targetColumn = column + columnOffset;
          const targetRow = row + rowOffset;
          if (
            targetColumn < 0 ||
            targetColumn >= COVERAGE_COLUMNS ||
            targetRow < 0 ||
            targetRow >= COVERAGE_ROWS
          ) {
            continue;
          }
          const coverageIndex = targetRow * COVERAGE_COLUMNS + targetColumn;
          if (coverage[coverageIndex] === 0) {
            coverage[coverageIndex] = 1;
            occupied += 1;
          }
        }
      }
    }

    const ratio = occupied / coverage.length;
    canvas.dataset.threadCoverage = ratio.toFixed(3);
    return ratio;
  }

  function completeLayer() {
    if (state === 'complete') return;
    state = 'complete';
    showPrompt();
    updateAccessibility();
  }

  function advanceLayer() {
    if (state !== 'complete') return;

    backgroundColor = threadColor;
    threadColor = backgroundColor === BLACK ? WHITE : BLACK;
    layer += 1;
    applyBackdrop();
    threadMaterial.color.setHex(threadColor);
    prompt.style.color = colorCss(threadColor);

    if (reducedMotion) {
      buildReducedMotionLayer();
    } else {
      resetSimulation();
    }
    render();
  }

  function showPrompt() {
    prompt.textContent = 'double-click or double-tap to continue';
    prompt.style.color = colorCss(threadColor === BLACK ? WHITE : BLACK);
    prompt.style.opacity = '0.64';
    canvas.style.cursor = 'grab';
  }

  function hidePrompt() {
    prompt.textContent = '';
    prompt.style.opacity = '0';
    canvas.style.cursor = 'grab';
  }

  function updateAccessibility() {
    const colorName = threadColor === BLACK ? 'black' : 'white';
    canvas.dataset.threadState = state;
    canvas.dataset.threadLayer = String(layer);
    if (state === 'complete') {
      canvas.setAttribute(
        'aria-label',
        `The ${colorName} thread has finished piling up. Drag to orbit, activate to toggle top and side views, or press Space or double-activate to invert the colors and continue.`,
      );
    } else {
      canvas.setAttribute(
        'aria-label',
        `A ${colorName} 3D thread is falling and accumulating. Drag to orbit or activate to toggle top and side views.`,
      );
    }
  }

  function updateCamera() {
    orbit.azimuth += (orbit.targetAzimuth - orbit.azimuth) * 0.09;
    orbit.polar += (orbit.targetPolar - orbit.polar) * 0.09;
    const horizontalRadius = Math.sin(orbit.polar) * CAMERA_RADIUS;
    const x = Math.sin(orbit.azimuth) * horizontalRadius;
    const y = Math.cos(orbit.polar) * CAMERA_RADIUS + cameraLookAt.y;
    const z = Math.cos(orbit.azimuth) * horizontalRadius;
    perspectiveCamera.position.set(x, y, z);
    orthographicCamera.position.set(x, y, z);
    perspectiveCamera.lookAt(cameraLookAt);
    orthographicCamera.lookAt(cameraLookAt);
    canvas.dataset.cameraPolar = orbit.polar.toFixed(3);
    canvas.dataset.cameraAzimuth = orbit.azimuth.toFixed(3);
  }

  function updateReducedMotionCamera() {
    if (!reducedMotion) return;
    orbit.azimuth = orbit.targetAzimuth;
    orbit.polar = orbit.targetPolar;
    updateCamera();
    render();
  }

  function togglePerspective() {
    const midpointAngle = (TOP_POLAR_ANGLE + SIDE_POLAR_ANGLE) * 0.5;
    orbit.targetPolar =
      orbit.targetPolar < midpointAngle ? SIDE_POLAR_ANGLE : TOP_POLAR_ANGLE;
    updateReducedMotionCamera();
  }

  function setProjection(projection) {
    settings.projection = projection === 'orthographic' ? 'orthographic' : 'perspective';
    camera = settings.projection === 'orthographic' ? orthographicCamera : perspectiveCamera;
    canvas.dataset.cameraProjection = settings.projection;
    const select = header?.querySelector('#threads-debug-menu select[aria-label="projection"]');
    if (select) select.value = settings.projection;
    updateReducedMotionCamera();
    render();
  }

  function setRenderStyle(renderStyle) {
    settings.renderStyle = renderStyle === 'risograph' ? 'risograph' : 'monochrome';
    thread.material =
      settings.renderStyle === 'risograph' ? risographMaterial : threadMaterial;
    thread.material.needsUpdate = true;
    canvas.dataset.threadRenderStyle = settings.renderStyle;
    const select = header?.querySelector('#threads-debug-menu select[aria-label="render style"]');
    if (select) select.value = settings.renderStyle;
    render();
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth || 1200);
    const height = Math.max(1, width / ASPECT);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.updateProjectionMatrix();
    orthographicCamera.left = -ORTHOGRAPHIC_HALF_HEIGHT * aspect;
    orthographicCamera.right = ORTHOGRAPHIC_HALF_HEIGHT * aspect;
    orthographicCamera.top = ORTHOGRAPHIC_HALF_HEIGHT;
    orthographicCamera.bottom = -ORTHOGRAPHIC_HALF_HEIGHT;
    orthographicCamera.updateProjectionMatrix();
    render();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function applyBackdrop() {
    if (backgroundColor === null) {
      renderer.setClearColor(new Color(BLACK), 0);
      canvas.style.backgroundColor = 'transparent';
      return;
    }
    renderer.setClearColor(new Color(backgroundColor), 1);
    canvas.style.backgroundColor = colorCss(backgroundColor);
  }

  function createDebugMenu() {
    if (!header) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'tune';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'threads-debug-menu');
    Object.assign(button.style, {
      position: 'absolute',
      top: '0.75rem',
      right: '0.75rem',
      zIndex: '3',
      padding: '0.32rem 0.48rem',
      border: '1px solid var(--theme-overlay0, #6c7086)',
      borderRadius: '3px',
      color: 'var(--theme-text, #cdd6f4)',
      background: 'var(--theme-base, #1e1e2e)',
      fontFamily: "'Inconsolata', monospace",
      fontSize: '0.75rem',
      lineHeight: '1',
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 160ms ease',
    });

    const panel = document.createElement('div');
    panel.id = 'threads-debug-menu';
    panel.hidden = true;
    Object.assign(panel.style, {
      position: 'absolute',
      top: '2.7rem',
      right: '0.75rem',
      zIndex: '3',
      width: '12.5rem',
      boxSizing: 'border-box',
      padding: '0.75rem',
      border: '1px solid var(--theme-overlay0, #6c7086)',
      borderRadius: '4px',
      color: 'var(--theme-text, #cdd6f4)',
      background: 'var(--theme-base, #1e1e2e)',
      boxShadow: '0 0.45rem 1.2rem rgba(0, 0, 0, 0.18)',
      fontFamily: "'Inconsolata', monospace",
      fontSize: '0.75rem',
      lineHeight: '1.25',
    });

    const title = document.createElement('div');
    title.textContent = 'thread controls';
    Object.assign(title.style, {
      marginBottom: '0.7rem',
      color: 'var(--theme-overlay0, #6c7086)',
    });
    panel.appendChild(title);

    const controls = [
      {
        label: 'width',
        key: 'threadWidth',
        min: 0.45,
        max: 1.8,
        step: 0.05,
        format: (value) => value.toFixed(2),
      },
      {
        label: 'smoothness',
        key: 'smoothness',
        min: 2,
        max: 10,
        step: 1,
        format: (value) => String(Math.round(value)),
      },
      {
        label: 'speed',
        key: 'speed',
        min: 0.1,
        max: 24,
        step: 0.1,
        format: (value) => value.toFixed(1),
      },
      {
        label: 'gravity',
        key: 'gravity',
        min: 12,
        max: 76,
        step: 2,
        format: (value) => String(Math.round(value)),
      },
      {
        label: 'spread',
        key: 'spread',
        min: 0,
        max: 2,
        step: 0.05,
        format: (value) => value.toFixed(2),
      },
    ];
    const inputs = new Map();

    for (const control of controls) {
      const row = document.createElement('label');
      Object.assign(row.style, {
        display: 'block',
        marginBottom: '0.62rem',
      });

      const heading = document.createElement('span');
      Object.assign(heading.style, {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '0.5rem',
        marginBottom: '0.2rem',
      });
      const name = document.createElement('span');
      name.textContent = control.label;
      const value = document.createElement('output');
      value.textContent = control.format(settings[control.key]);
      heading.append(name, value);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = String(settings[control.key]);
      input.setAttribute('aria-label', control.label);
      Object.assign(input.style, {
        display: 'block',
        width: '100%',
        margin: '0',
        accentColor: 'var(--theme-overlay0, #6c7086)',
      });
      input.addEventListener('input', () => {
        settings[control.key] = Number(input.value);
        value.textContent = control.format(settings[control.key]);
        if (control.key === 'threadWidth') {
          updateThreadGeometry(0);
          render();
        }
      });

      row.append(heading, input);
      panel.appendChild(row);
      inputs.set(control.key, { input, value, control });
    }

    const renderStyleRow = document.createElement('label');
    Object.assign(renderStyleRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.6rem',
      marginBottom: '0.7rem',
    });
    const renderStyleLabel = document.createElement('span');
    renderStyleLabel.textContent = 'render';
    const renderStyleSelect = document.createElement('select');
    renderStyleSelect.setAttribute('aria-label', 'render style');
    for (const renderStyle of ['monochrome', 'risograph']) {
      const option = document.createElement('option');
      option.value = renderStyle;
      option.textContent = renderStyle;
      renderStyleSelect.appendChild(option);
    }
    renderStyleSelect.value = settings.renderStyle;
    Object.assign(renderStyleSelect.style, {
      maxWidth: '7.2rem',
      padding: '0.2rem',
      border: '1px solid var(--theme-overlay0, #6c7086)',
      borderRadius: '3px',
      color: 'var(--theme-text, #cdd6f4)',
      background: 'var(--theme-base, #1e1e2e)',
      font: 'inherit',
    });
    renderStyleSelect.addEventListener('change', () =>
      setRenderStyle(renderStyleSelect.value),
    );
    renderStyleRow.append(renderStyleLabel, renderStyleSelect);
    panel.appendChild(renderStyleRow);

    const projectionRow = document.createElement('label');
    Object.assign(projectionRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.6rem',
      marginBottom: '0.7rem',
    });
    const projectionLabel = document.createElement('span');
    projectionLabel.textContent = 'projection';
    const projectionSelect = document.createElement('select');
    projectionSelect.setAttribute('aria-label', 'projection');
    for (const projection of ['perspective', 'orthographic']) {
      const option = document.createElement('option');
      option.value = projection;
      option.textContent = projection;
      projectionSelect.appendChild(option);
    }
    projectionSelect.value = settings.projection;
    Object.assign(projectionSelect.style, {
      maxWidth: '7.2rem',
      padding: '0.2rem',
      border: '1px solid var(--theme-overlay0, #6c7086)',
      borderRadius: '3px',
      color: 'var(--theme-text, #cdd6f4)',
      background: 'var(--theme-base, #1e1e2e)',
      font: 'inherit',
    });
    projectionSelect.addEventListener('change', () => setProjection(projectionSelect.value));
    projectionRow.append(projectionLabel, projectionSelect);
    panel.appendChild(projectionRow);

    const copyPrompt = debugButton('copy prompt');
    Object.assign(copyPrompt.style, {
      width: '100%',
      marginBottom: '0.55rem',
    });
    copyPrompt.addEventListener('click', async () => {
      copyPrompt.disabled = true;
      try {
        await copyText(buildSettingsPrompt());
        copyPrompt.textContent = 'copied';
      } catch (error) {
        console.error('Threads settings could not be copied:', error);
        copyPrompt.textContent = 'copy failed';
      } finally {
        window.setTimeout(() => {
          copyPrompt.textContent = 'copy prompt';
          copyPrompt.disabled = false;
        }, 1400);
      }
    });
    panel.appendChild(copyPrompt);

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '0.5rem',
      marginTop: '0.2rem',
    });

    const restart = debugButton('restart');
    restart.addEventListener('click', () => {
      if (reducedMotion) {
        buildReducedMotionLayer();
      } else {
        resetSimulation();
      }
      render();
    });

    const defaults = debugButton('defaults');
    defaults.addEventListener('click', () => {
      Object.assign(settings, {
        threadWidth: 1,
        smoothness: DEFAULT_SOLVER_ITERATIONS,
        speed: DEFAULT_FEED_SPEED,
        gravity: DEFAULT_GRAVITY,
        spread: 0.18,
        projection: 'orthographic',
        renderStyle: 'monochrome',
      });
      syncControls();
      setRenderStyle(settings.renderStyle);
      setProjection(settings.projection);
      updateThreadGeometry(0);
      render();
    });

    actions.append(restart, defaults);
    panel.appendChild(actions);
    header.append(button, panel);

    let open = false;
    let hovering = false;
    let focused = false;
    const alwaysVisible = window.matchMedia('(hover: none)').matches;

    function updateButtonVisibility() {
      button.style.opacity = open || hovering || focused || alwaysVisible ? '1' : '0';
    }

    function setOpen(nextOpen) {
      open = nextOpen;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      updateButtonVisibility();
    }

    function syncControls() {
      for (const [key, item] of inputs) {
        item.input.value = String(settings[key]);
        item.value.textContent = item.control.format(settings[key]);
      }
      projectionSelect.value = settings.projection;
      renderStyleSelect.value = settings.renderStyle;
    }

    button.addEventListener('click', () => setOpen(!open));
    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.focus();
    });
    header.addEventListener('pointerenter', () => {
      hovering = true;
      updateButtonVisibility();
    });
    header.addEventListener('pointerleave', () => {
      hovering = false;
      updateButtonVisibility();
    });
    header.addEventListener('focusin', () => {
      focused = true;
      updateButtonVisibility();
    });
    header.addEventListener('focusout', (event) => {
      focused = header.contains(event.relatedTarget);
      updateButtonVisibility();
    });

    updateButtonVisibility();
    return { sync: syncControls };
  }

  function debugButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      flex: '1',
      padding: '0.32rem 0.4rem',
      border: '1px solid var(--theme-overlay0, #6c7086)',
      borderRadius: '3px',
      color: 'var(--theme-text, #cdd6f4)',
      background: 'transparent',
      font: 'inherit',
      cursor: 'pointer',
    });
    return button;
  }

  function buildSettingsPrompt() {
    return `Create a self-contained Three.js 3D interactive header titled "Threads" for a Jekyll blog.

Scene and behavior:
- Use a transparent canvas with a black or white thread chosen for contrast with the current site theme.
- Lower one continuous thread straight down from a fixed point at the center onto an invisible collision plane.
- Give the rope real volume with closely spaced cylindrical segments, distance constraints, spatial-hash self-collision, gravity, ground friction, and sideways buckling.
- Let the early rope form a mound. Gradually increase lateral spread as the layer grows so later rope expands outward instead of only stacking vertically.
- Hold when the layer reaches capacity. Double-click or double-tap to bake the completed thread color into the background, invert the thread color, clear the geometry, and begin the next layer.
- Single-click toggles top and near-horizontal side views. Drag orbits freely between them.
- Support perspective and orthographic projection.

Use these current control values as the new defaults:
- Thread width: ${settings.threadWidth.toFixed(2)}
- Constraint smoothness: ${Math.round(settings.smoothness)} iterations
- Feed speed: ${settings.speed.toFixed(1)} segments per fixed simulation step
- Gravity: ${Math.round(settings.gravity)}
- Base spread: ${settings.spread.toFixed(2)}
- Projection: ${settings.projection}
- Render style: ${settings.renderStyle}

Keep these physics characteristics:
- Fixed simulation rate: 60 Hz
- Rope segment length: ${SEGMENT_LENGTH}
- Rendered rope radius: ${THREAD_RADIUS}
- Collision spacing: ${COLLISION_DISTANCE}
- Active settling particles: ${ACTIVE_PARTICLES}
- Maximum segments per layer: ${MAX_SEGMENTS}

Bundle Three.js and the scene into one browser-ready JavaScript file with no runtime CDN dependency.`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        console.warn('Clipboard API failed; trying the document fallback.', error);
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    Object.assign(textarea.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0',
    });
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('The browser rejected both clipboard methods.');
  }

  function animate(now) {
    animationFrame = requestAnimationFrame(animate);
    if (document.hidden) {
      lastTime = now;
      return;
    }

    const elapsed = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    updateCamera();

    if (!reducedMotion && state === 'feeding') {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 3) {
        simulateStep();
        accumulator -= FIXED_STEP;
        steps += 1;
      }

      updateThreadGeometry(Math.max(0, frozenCount - 2));
      coverageFrame += 1;
      if (
        coverageFrame % 12 === 0 &&
        particles.length - 1 >= MIN_COMPLETION_SEGMENTS &&
        calculateCoverage() >= COVERAGE_TARGET
      ) {
        completeLayer();
      }
    }

    render();
  }

  function handlePointerDown(event) {
    if (orbit.pointerId !== null) return;
    orbit.dragging = true;
    orbit.moved = false;
    orbit.pointerId = event.pointerId;
    orbit.startX = event.clientX;
    orbit.startY = event.clientY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function handlePointerMove(event) {
    if (!orbit.dragging || event.pointerId !== orbit.pointerId) return;
    const deltaX = event.clientX - orbit.lastX;
    const deltaY = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    if (Math.hypot(event.clientX - orbit.startX, event.clientY - orbit.startY) > 5) {
      orbit.moved = true;
    }
    if (!orbit.moved) return;

    orbit.targetAzimuth -= deltaX * 0.008;
    orbit.targetPolar = Math.max(
      MIN_POLAR_ANGLE,
      Math.min(MAX_POLAR_ANGLE, orbit.targetPolar + deltaY * 0.007),
    );
    updateReducedMotionCamera();
  }

  function handlePointerEnd(event) {
    if (event.pointerId !== orbit.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    const wasMoved = orbit.moved;
    orbit.dragging = false;
    orbit.moved = false;
    orbit.pointerId = null;
    canvas.style.cursor = 'grab';
    if (!wasMoved) handleTap(event);
  }

  function handleTap(event) {
    const currentTap = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    const isDoubleTap =
      pendingTap &&
      currentTap.time - pendingTap.time <= DOUBLE_TAP_DELAY &&
      Math.hypot(currentTap.x - pendingTap.x, currentTap.y - pendingTap.y) <= 24;

    if (isDoubleTap) {
      clearTimeout(tapTimer);
      tapTimer = 0;
      pendingTap = null;
      if (state === 'complete') {
        advanceLayer();
      } else {
        togglePerspective();
      }
      return;
    }

    pendingTap = currentTap;
    clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => {
      pendingTap = null;
      tapTimer = 0;
      togglePerspective();
    }, DOUBLE_TAP_DELAY);
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      togglePerspective();
      return;
    }
    if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      setProjection(settings.projection === 'perspective' ? 'orthographic' : 'perspective');
      return;
    }
    if (event.key === ' ' && state === 'complete') {
      event.preventDefault();
      advanceLayer();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      orbit.targetAzimuth += event.key === 'ArrowLeft' ? 0.18 : -0.18;
      updateReducedMotionCamera();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      orbit.targetPolar = Math.max(
        MIN_POLAR_ANGLE,
        Math.min(MAX_POLAR_ANGLE, orbit.targetPolar + direction * 0.12),
      );
      updateReducedMotionCamera();
    }
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);
  canvas.addEventListener('keydown', handleKeydown);
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      showFallback(canvas, new Error('The WebGL context was lost.'));
    },
    { once: true },
  );

  new MutationObserver(() => {
    if (backgroundColor !== null || layer !== 0) return;
    const nextColor = contrastingThreadColor();
    if (nextColor === threadColor) return;
    threadColor = nextColor;
    threadMaterial.color.setHex(threadColor);
    updateAccessibility();
    render();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  if ('ResizeObserver' in window && header) {
    new ResizeObserver(resize).observe(header);
  } else {
    window.addEventListener('resize', resize, { passive: true });
  }

  applyBackdrop();
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  setRenderStyle(settings.renderStyle);
  setProjection(settings.projection);
  updateCamera();
  resize();

  if (reducedMotion) {
    buildReducedMotionLayer();
    render();
  } else {
    resetSimulation();
    animationFrame = requestAnimationFrame(animate);
  }
}

function gridKey(x, y, z) {
  return `${x},${y},${z}`;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function colorCss(value) {
  if (value === null) return 'transparent';
  return value === BLACK ? '#000000' : '#ffffff';
}

function contrastingThreadColor() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--theme-base')
    .trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return BLACK;
  const number = Number.parseInt(match[1], 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance < 0.5 ? WHITE : BLACK;
}

function showFallback(canvas, error) {
  console.error('Threads visualization could not start:', error);
  const parent = canvas.parentElement;
  canvas.style.display = 'none';
  if (!parent) return;

  const fallback = document.createElement('div');
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', 'The Threads visualization requires WebGL.');
  fallback.textContent = 'The Threads visualization requires WebGL.';
  Object.assign(fallback.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    aspectRatio: '1200 / 638',
    color: '#000000',
    background: 'transparent',
    fontFamily: "'Inconsolata', monospace",
    fontSize: '1rem',
  });
  parent.appendChild(fallback);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
