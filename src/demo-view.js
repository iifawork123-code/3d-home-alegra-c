import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// HDRI files list
const hdriFiles = [
  'bathroom_2k.hdr',
  'cayley_interior_2k.hdr',
  'comfy_cafe_2k.hdr',
  'decor_shop_2k.hdr',
  'glasshouse_interior_2k.hdr',
  'kiara_interior_2k.hdr'
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

// Camera position
camera.position.z = 0.1;

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

// Sphere for HDRI display
let sphere = null;
let currentHdri = 'bathroom_2k.hdr';

// Initialize HDRI grid
function initializeHdriGrid() {
  hdriGrid.innerHTML = '';
  hdriFiles.forEach(file => {
    const btn = document.createElement('button');
    btn.className = 'hdri-option';
    btn.type = 'button';
    btn.dataset.hdri = file;
    if (file === currentHdri) btn.classList.add('active');
    btn.textContent = file.replace('_2k.hdr', '').replace(/_/g, ' ');
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      loadHdri(file);
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

      // Create sphere with HDRI texture
      const geometry = new THREE.SphereGeometry(500, 64, 32);
      
      // Apply texture directly (HDRLoader returns already processed texture)
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });

      sphere = new THREE.Mesh(geometry, material);
      sphere.rotation.order = 'YXZ';
      scene.add(sphere);

      // Update display
      currentHdriDisplay.textContent = fileName.replace('_2k.hdr', '').toUpperCase();

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

// Mouse events
document.addEventListener('mousedown', (e) => {
  // Exclude clicks on UI elements
  if (e.target.closest('#hdri-selector') || 
      e.target.closest('#back-btn') || 
      e.target.closest('#info-display') ||
      e.target.closest('.hdri-option')) {
    return;
  }
  isMouseDown = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (isMouseDown && sphere) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    // Directly apply rotation to sphere
    sphere.rotation.y += deltaX * 0.01;
    sphere.rotation.x += deltaY * 0.01;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

document.addEventListener('mouseup', () => {
  isMouseDown = false;
});

// Touch events for mobile
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('#hdri-selector') || e.target.closest('#back-btn')) {
    return;
  }
  isMouseDown = true;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
  if (isMouseDown && sphere) {
    const deltaX = e.touches[0].clientX - lastMouseX;
    const deltaY = e.touches[0].clientY - lastMouseY;

    // Directly apply rotation to sphere
    sphere.rotation.y += deltaX * 0.01;
    sphere.rotation.x += deltaY * 0.01;

    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
});

document.addEventListener('touchend', () => {
  isMouseDown = false;
});

// Wheel zoom support (smooth rotation speed)
document.addEventListener('wheel', (e) => {
  if (e.target.closest('#hdri-selector')) return;
  e.preventDefault();
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
loadHdri(currentHdri);
animate();
