import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// HDRI files list with proper names
const hdriFiles = [
  { file: 'living_room_2k.hdr', name: 'Living Room' },
  { file: 'Balcony.hdr', name: 'Balcony' },
  { file: 'Bedroom.hdr', name: 'Bedroom' },
  { file: 'Kitchen.hdr', name: 'Kitchen' }
];

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

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000);

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
const hdriGrid = document.getElementById('hdri-grid');
const currentHdriDisplay = document.getElementById('current-hdri');

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

// Initialize HDRI grid
function initializeHdriGrid() {
  hdriGrid.innerHTML = '';
  hdriFiles.forEach(hdri => {
    const btn = document.createElement('button');
    btn.className = 'hdri-option';
    btn.type = 'button';
    btn.dataset.hdri = hdri.file;
    if (hdri.file === currentHdri) btn.classList.add('active');
    btn.textContent = hdri.name;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      loadHdri(hdri.file);
    });
    hdriGrid.appendChild(btn);
  });
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

// Zoom functions
function zoomIn() {
  currentFov = Math.max(minFov, currentFov - zoomSpeed);
  updateCameraFov();
}

function zoomOut() {
  currentFov = Math.min(maxFov, currentFov + zoomSpeed);
  updateCameraFov();
}

function resetZoom() {
  currentFov = 75; // Reset to default FOV
  updateCameraFov();
}

function updateCameraFov() {
  camera.fov = currentFov;
  camera.updateProjectionMatrix();
  
  // Update zoom display
  const zoomPercent = Math.round((75 / currentFov) * 100);
  document.getElementById('zoom-display').textContent = `ZOOM: ${zoomPercent}%`;
}

// Load HDRI function
function loadHdri(fileName) {
  showLoader();
  currentHdri = fileName;
  
  // Update button states using data attribute
  const allButtons = document.querySelectorAll('.hdri-option');
  allButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find and activate the button
  const targetButton = document.querySelector(`[data-hdri="${fileName}"]`);
  if (targetButton) {
    targetButton.classList.add('active');
  }

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
  
  hdrLoader.load(
    imagePath,
    (texture) => {
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
        toneMapped: false,
        encoding: THREE.sRGBEncoding
      });

      sphere = new THREE.Mesh(geometry, material);
      sphere.rotation.order = 'YXZ';
      scene.add(sphere);

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
      console.error('Error loading HDRI:', error);
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

  if (isMouseDown && sphere) {
    const deltaX = e.clientX - lastMouseX;

    // Only horizontal rotation (left/right)
    sphere.rotation.y += deltaX * 0.005;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

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
document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
document.getElementById('reset-zoom-btn').addEventListener('click', resetZoom);

// Wheel zoom support
document.addEventListener('wheel', (e) => {
  if (e.target.closest('#hdri-selector')) return;
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
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
initializeHdriGrid();
resetZoom(); // Initialize zoom display
loadHdri(currentHdri);
animate();

// Bottom Arrow and HDRI Selector visibility
const bottomArrow = document.getElementById('bottom-arrow');
const hdriSelector = document.getElementById('hdri-selector');

let selectorHideTimeout = null;

// Show selector on arrow hover
bottomArrow.addEventListener('mouseenter', () => {
  hdriSelector.classList.add('visible');
  clearTimeout(selectorHideTimeout);
});

// Show selector when hovering over the selector itself
hdriSelector.addEventListener('mouseenter', () => {
  clearTimeout(selectorHideTimeout);
});

// Auto-hide selector when leaving both arrow and selector
hdriSelector.addEventListener('mouseleave', () => {
  selectorHideTimeout = setTimeout(() => {
    hdriSelector.classList.remove('visible');
  }, 2000); // 2 second delay before auto-hide
});

bottomArrow.addEventListener('mouseleave', () => {
  if (!hdriSelector.matches(':hover')) {
    selectorHideTimeout = setTimeout(() => {
      hdriSelector.classList.remove('visible');
    }, 2000); // 2 second delay before auto-hide
  }
});
