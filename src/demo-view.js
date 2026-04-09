import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// HDRI files list with proper names
const hdriFiles = [
  { file: 'living_room_2k.hdr', name: 'Living Room' },
  { file: 'Balcony.hdr', name: 'Balcony' },
  { file: 'Bedroom.hdr', name: 'Bedroom' },
  { file: 'Kitchen.hdr', name: 'Kitchen' }
];

// ===== HOTSPOT CONFIGURATION =====
// EASY ADJUSTMENT SECTION - Change these values to adjust hotspots
const HOTSPOT_SIZE = 3;           // Increase for larger hotspot markers
const HOTSPOT_OPACITY = 0.95;     // Transparency (0 = invisible, 1 = solid)
const HOTSPOT_DISTANCE = 65;      // Radius position inside the HDRI sphere

// Hotspots configuration - positioned like real doors/walls in living room
// Values for x, y, z are normalized directions from -1 to 1.
// x: left (-1) to right (1)
// y: bottom (-1) to top (1)
// z: back (-1) to front (1)
const hotspots = {
  'living_room_2k.hdr': [
    // Kitchen front (swapped with balcony)
    { x: 0.15, y: 0.25, z: 0.95, targetHdri: 'Kitchen.hdr', label: '🍳 Kitchen', color: 0xff6b35 },
    // Bedroom door moved closer to balcony as a smaller hotspot
    { x: 0.90, y: 0.05, z: -0.75, targetHdri: 'Bedroom.hdr', label: '🛏️ Bedroom', color: 0x4ecdc4, size: 4 },
    // Balcony at back of the room (swapped with kitchen)
    { x: 0, y: 0.05, z: -0.75, targetHdri: 'Balcony.hdr', label: '🌅 Balcony', color: 0xffa500 }
  ],
  'Balcony.hdr': [
    { x: -0.25, y: 0.15, z: 0.9, targetHdri: 'living_room_2k.hdr', label: '🏠 Back to Living Room', color: 0x95e1d3 },
    // Bedroom on right side
    // { x: 0.8, y: 0.0, z: 0.45, targetHdri: 'Bedroom.hdr', label: '🛏️ Bedroom', color: 0x4ecdc4 }
  ],
  'Bedroom.hdr': [
    { x: 0.35, y: 0.15, z: 0.9, targetHdri: 'living_room_2k.hdr', label: '🏠 Back to Living Room', color: 0x95e1d3 }
  ],
  'Kitchen.hdr': [
    { x: -0.35, y: 0.2, z: 0.9, targetHdri: 'living_room_2k.hdr', label: '🏠 Back to Living Room', color: 0x95e1d3 }
  ]
};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('threejs-canvas'),
  antialias: true,
  alpha: true
});

console.log('Renderer created, canvas found:', !!document.getElementById('threejs-canvas'));

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000);
renderer.sortObjects = true;  // Enable sorting by renderOrder

console.log('Renderer initialized, WebGL context:', !!renderer.getContext());

// Enhanced tone mapping for better HDR visuals
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Camera position - moved further back for better view
camera.position.z = 3;

// DOM elements
const loaderOverlay = document.getElementById('loader-overlay');
const loaderProgress = document.getElementById('loader-progress');
const loaderText = document.getElementById('loader-text');
const currentHdriDisplay = document.getElementById('current-hdri');
const hdriGrid = document.getElementById('hdri-grid');
const hdriSelector = document.getElementById('hdri-selector');

// Mouse controls
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

// Zoom controls
let currentFov = 75;
let minFov = 40; // Maximum zoom in (less extreme)
let maxFov = 100; // Maximum zoom out (less extreme)
let zoomSpeed = 1; // Slower zoom speed

// Sphere for HDRI display
let sphere = null;
let currentHdri = hdriFiles[0].file; // default to first available HDRI

// Hotspot management
let hotspotsGroup = null; // Container for all hotspot visuals
let hotspotMeshes = []; // Array to track hotspot meshes for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredHotspot = null; // Track which hotspot is currently hovered

// Create hotspots for the current HDRI
function createHotspots(hdriFile) {
  // Remove old hotspots
  if (hotspotsGroup) {
    scene.remove(hotspotsGroup);
    hotspotMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    hotspotMeshes = [];
  }

  // Create new group for hotspots
  hotspotsGroup = new THREE.Group();
  hotspotsGroup.name = 'hotspots-group';
  // Attach hotspots to the sphere so they rotate with it
  if (sphere) {
    sphere.add(hotspotsGroup);
    console.log('✅ Hotspots attached to sphere');
  } else {
    scene.add(hotspotsGroup); // Fallback if sphere doesn't exist yet
    console.log('⚠️ Hotspots attached to scene (sphere not ready)');
  }

  // Get hotspots for current HDRI
  const currentHotspots = hotspots[hdriFile] || [];
  
  console.log(`Creating ${currentHotspots.length} hotspots for ${hdriFile}`);


  currentHotspots.forEach((hotspot, index) => {
    // Allow per-hotspot sizing, with a default for all others
    const hotspotSize = hotspot.size || HOTSPOT_SIZE;
    const geometry = new THREE.SphereGeometry(hotspotSize, 24, 16);
    const material = new THREE.MeshBasicMaterial({
      color: hotspot.color,
      transparent: true,
      opacity: HOTSPOT_OPACITY,
      toneMapped: false,
      depthTest: false  // Render on top of everything
    });

    const hotspotMesh = new THREE.Mesh(geometry, material);
    hotspotMesh.renderOrder = 999;  // Render last (on top)

    // Position hotspots using normalized coordinates
    const posX = hotspot.x * HOTSPOT_DISTANCE;
    const posY = hotspot.y * HOTSPOT_DISTANCE;
    const posZ = hotspot.z * HOTSPOT_DISTANCE;
    hotspotMesh.position.set(posX, posY, posZ);
    
    console.log(`Hotspot ${index}: ${hotspot.label} at (${posX.toFixed(1)}, ${posY.toFixed(1)}, ${posZ.toFixed(1)})`);

    // Store metadata
    hotspotMesh.userData = {
      targetHdri: hotspot.targetHdri,
      label: hotspot.label,
      originalOpacity: HOTSPOT_OPACITY,
      originalColor: hotspot.color,
      index: index
    };

    hotspotsGroup.add(hotspotMesh);
    hotspotMeshes.push(hotspotMesh);
  });
  
  console.log(`✅ TOTAL HOTSPOTS CREATED: ${hotspotMeshes.length}`);;
}

// Update hotspot hover effects
function updateHotspotHover() {
  // Update mouse position based on where cursor is on canvas
  const canvas = document.getElementById('threejs-canvas');
  const rect = canvas.getBoundingClientRect();
  const tooltip = document.getElementById('hotspot-tooltip');
  
  // No raycasting if no hotspots exist
  if (hotspotMeshes.length === 0) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspotMeshes);

  // Reset all hotspots
  hotspotMeshes.forEach(mesh => {
    mesh.material.opacity = mesh.userData.originalOpacity;
    mesh.scale.setScalar(1.0);  // Reset scale
  });

  // Highlight hovered hotspot
  if (intersects.length > 0) {
    const intersectedMesh = intersects[0].object;
    intersectedMesh.material.opacity = 1.0;  // Full opacity on hover
    intersectedMesh.scale.setScalar(1.2);    // Slightly larger on hover
    canvas.style.cursor = 'pointer';
    hoveredHotspot = intersectedMesh;
    
    // Show tooltip
    tooltip.textContent = intersectedMesh.userData.label;
    tooltip.classList.add('visible');
    tooltip.style.left = (mouse.x * window.innerWidth / 2 + window.innerWidth / 2) + 'px';
    tooltip.style.top = (-mouse.y * window.innerHeight / 2 + window.innerHeight / 2) + 'px';
  } else {
    canvas.style.cursor = 'default';
    hoveredHotspot = null;
    tooltip.classList.remove('visible');
    
    // Reset all hotspot scales
    hotspotMeshes.forEach(mesh => {
      mesh.scale.setScalar(1.0);
    });
  }
}

// Handle hotspot click
function onHotspotClick(event) {
  if (hoveredHotspot) {
    const targetHdri = hoveredHotspot.userData.targetHdri;
    loadHdri(targetHdri);
  }
}

// Show loader
function showLoader() {
  loaderOverlay.classList.add('active');
}

// Hide loader
function hideLoader() {
  loaderOverlay.classList.remove('active');
}

// Update loader progress
function updateLoaderProgress(percent) {
  loaderProgress.style.width = percent + '%';
  loaderText.textContent = Math.round(percent) + '%';
}

// Initialize HDRI selector panel
function initializeHdriGrid() {
  if (!hdriGrid) return;
  hdriGrid.innerHTML = '';
  hdriFiles.forEach(hdri => {
    const btn = document.createElement('button');
    btn.className = 'hdri-option';
    btn.type = 'button';
    btn.dataset.hdri = hdri.file;
    if (hdri.file === currentHdri) btn.classList.add('active');
    btn.textContent = hdri.name;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      loadHdri(hdri.file);
    });
    hdriGrid.appendChild(btn);
  });
}

// Zoom functions
function zoomIn() {
  console.log('Zoom In clicked');
  currentFov = Math.max(minFov, currentFov - zoomSpeed);
  updateCameraFov();
}

function zoomOut() {
  console.log('Zoom Out clicked');
  currentFov = Math.min(maxFov, currentFov + zoomSpeed);
  updateCameraFov();
}

function resetZoom() {
  console.log('Reset Zoom clicked');
  currentFov = 75; // Reset to default FOV
  updateCameraFov();
}

function updateCameraFov() {
  camera.fov = currentFov;
  camera.updateProjectionMatrix();
  
  // Update zoom display
  const zoomPercent = Math.round((75 / currentFov) * 100);
  const zoomDisplay = document.getElementById('zoom-display');
  if (zoomDisplay) {
    zoomDisplay.textContent = `ZOOM: ${zoomPercent}%`;
    console.log('Zoom display updated to:', zoomDisplay.textContent);
  } else {
    console.error('Zoom display element not found!');
  }
}

// Load HDRI function
function loadHdri(fileName) {
  console.log('Loading HDRI:', fileName);
  showLoader();
  currentHdri = fileName;

  // Use HDRLoader for proper HDRI handling
  const hdrLoader = new HDRLoader();
  
  // Simulate progress loading
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    updateLoaderProgress(progress);
  }, 100);

  let imagePath = `/hdri_image/${fileName}`;
  console.log('Loading HDRI from path:', imagePath);
  
  hdrLoader.load(
    imagePath,
    (texture) => {
      console.log('HDRI loaded successfully:', fileName);
      clearInterval(progressInterval);
      updateLoaderProgress(100);
      
      // If sphere exists, remove it
      if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }

      // Create sphere with HDRI texture - enhanced version
      const geometry = new THREE.SphereGeometry(100, 128, 64); // Reduced size for better viewing distance
      
      // Apply texture with equirectangular mapping
      texture.mapping = THREE.EquirectangularReflectionMapping;
      
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        toneMapped: true,  // Enable tone mapping for HDR
        encoding: THREE.sRGBEncoding
      });

      sphere = new THREE.Mesh(geometry, material);
      sphere.rotation.order = 'YXZ';
      scene.add(sphere);

      // Create hotspots for this HDRI
      createHotspots(fileName);

      // Update display - use proper name from hdriFiles array
      const hdriData = hdriFiles.find(hdri => hdri.file === fileName);
      currentHdriDisplay.textContent = hdriData ? hdriData.name.toUpperCase() : fileName.toUpperCase();

      // Hide loader after a short delay
      setTimeout(() => {
        hideLoader();
      }, 500);
    },
    (progressEvent) => {
      // Handle actual loading progress if available
      if (progressEvent.total > 0) {
        const percentComplete = (progressEvent.loaded / progressEvent.total) * 90;
        updateLoaderProgress(percentComplete);
      }
    },
    (error) => {
      clearInterval(progressInterval);
      console.error('Error loading HDRI:', error, 'Path:', imagePath);
      updateLoaderProgress(0);
      hideLoader();
      currentHdriDisplay.textContent = 'Error loading HDRI';
    }
  );
}

// Mouse events - attach to canvas for better control
const canvas = document.getElementById('threejs-canvas');

canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Update mouse position for raycaster (normalize to -1 to 1)
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  // Update hotspot hover effects
  if (!isMouseDown) {
    updateHotspotHover();
  }

  if (isMouseDown && sphere) {
    const deltaX = e.clientX - lastMouseX;

    // Only horizontal rotation (left/right)
    sphere.rotation.y += deltaX * 0.005;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

// Handle hotspot clicks
canvas.addEventListener('click', onHotspotClick);

document.addEventListener('mouseup', () => {
  isMouseDown = false;
});

// Touch events for mobile
canvas.addEventListener('touchstart', (e) => {
  isMouseDown = true;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', (e) => {
  if (isMouseDown && sphere) {
    const deltaX = e.touches[0].clientX - lastMouseX;

    // Only horizontal rotation (left/right)
    sphere.rotation.y += deltaX * 0.005;

    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
}, { passive: true });

canvas.addEventListener('touchend', () => {
  isMouseDown = false;
});

// Zoom button event listeners
console.log('Setting up zoom controls...');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const resetZoomBtn = document.getElementById('reset-zoom-btn');

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', zoomIn);
  console.log('Zoom in button found and listener attached');
} else {
  console.error('Zoom in button not found!');
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', zoomOut);
  console.log('Zoom out button found and listener attached');
} else {
  console.error('Zoom out button not found!');
}

if (resetZoomBtn) {
  resetZoomBtn.addEventListener('click', resetZoom);
  console.log('Reset zoom button found and listener attached');
} else {
  console.error('Reset zoom button not found!');
}

// Wheel zoom support
document.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  // Zoom based on wheel direction
  if (e.deltaY < 0) {
    zoomIn(); // Scroll up = zoom in
  } else {
    zoomOut(); // Scroll down = zoom out
  }
}, { passive: false });

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  
  // Debug: Log scene info occasionally
  if (renderer.info.render.frame % 300 === 0) {
    console.log('Rendering frame:', renderer.info.render.frame);
    console.log('Scene children:', scene.children.length);
    console.log('Sphere in scene:', sphere ? 'Yes' : 'No');
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
console.log('Initializing application...');
initializeHdriGrid();
const bottomArrow = document.getElementById('bottom-arrow');
let hidePanelTimeout = null;

function showHdriSelector() {
  if (!hdriSelector) return;
  clearTimeout(hidePanelTimeout);
  hdriSelector.classList.add('visible');
}

function hideHdriSelectorDelayed() {
  if (!hdriSelector) return;
  clearTimeout(hidePanelTimeout);
  hidePanelTimeout = setTimeout(() => {
    const bottomHovered = bottomArrow ? bottomArrow.matches(':hover') : false;
    if (!hdriSelector.matches(':hover') && !bottomHovered) {
      hdriSelector.classList.remove('visible');
    }
  }, 150);
}

if (bottomArrow) {
  bottomArrow.addEventListener('mouseenter', showHdriSelector);
  bottomArrow.addEventListener('mouseleave', hideHdriSelectorDelayed);
}

if (hdriSelector) {
  hdriSelector.addEventListener('mouseenter', showHdriSelector);
  hdriSelector.addEventListener('mouseleave', hideHdriSelectorDelayed);
}

resetZoom(); // Initialize zoom display
loadHdri(currentHdri);
animate();
console.log('Application initialized');

// Fallback: Hide loader after 10 seconds in case of issues
setTimeout(() => {
  hideLoader();
  console.log('Fallback: Loader hidden after timeout');
}, 10000);
