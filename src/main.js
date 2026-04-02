import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threejs-canvas'), antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Create video element
const video = document.createElement('video');
video.src = 'home-3d.mp4';
video.crossOrigin = 'anonymous';
video.loop = true;
video.muted = true;
video.playsInline = true;

// Video texture
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBFormat;

// Sphere geometry and material
let sphereGeometry = new THREE.SphereGeometry(0.1, 64, 32);
const material = new THREE.MeshBasicMaterial({
  map: videoTexture,
  side: THREE.BackSide // Render inside of sphere
});

const sphere = new THREE.Mesh(sphereGeometry, material);
scene.add(sphere);

// Camera position
camera.position.z = 0.1;

// Mouse controls
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;
let velocityX = 0;
let velocityY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let autoRotateTimeout;
let isAutoRotating = false;
let minZoom = 0.05;
let maxZoom = 2;
let currentZoom = 0.1;

document.addEventListener('mousedown', (event) => {
  isMouseDown = true;
  mouseX = event.clientX;
  mouseY = event.clientY;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  clearTimeout(autoRotateTimeout);
  isAutoRotating = false;
});

document.addEventListener('mousemove', (event) => {
  if (isMouseDown) {
    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;

    velocityX = deltaX * 0.002;
    velocityY = deltaY * 0.002;

    targetRotationY += deltaX * 0.005;
    targetRotationX += deltaY * 0.005;

    mouseX = event.clientX;
    mouseY = event.clientY;
  }
});

document.addEventListener('mouseup', () => {
  isMouseDown = false;
  startAutoRotate();
});

// Zoom with mouse wheel
document.addEventListener('wheel', (event) => {
  event.preventDefault();
  const zoomSpeed = 0.001;
  currentZoom += event.deltaY * zoomSpeed;
  currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));
  updateSphereSize();
}, { passive: false });

// Touch controls for mobile
document.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1) {
    isMouseDown = true;
    mouseX = event.touches[0].clientX;
    mouseY = event.touches[0].clientY;
    lastMouseX = event.touches[0].clientX;
    lastMouseY = event.touches[0].clientY;
    clearTimeout(autoRotateTimeout);
    isAutoRotating = false;
  }
});

document.addEventListener('touchmove', (event) => {
  if (isMouseDown && event.touches.length === 1) {
    event.preventDefault();
    const deltaX = event.touches[0].clientX - mouseX;
    const deltaY = event.touches[0].clientY - mouseY;

    velocityX = deltaX * 0.002;
    velocityY = deltaY * 0.002;

    targetRotationY += deltaX * 0.005;
    targetRotationX += deltaY * 0.005;

    mouseX = event.touches[0].clientX;
    mouseY = event.touches[0].clientY;
  }
});

document.addEventListener('touchend', () => {
  isMouseDown = false;
  startAutoRotate();
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Update sphere size for zoom
function updateSphereSize() {
  // Dispose old geometry
  sphereGeometry.dispose();
  
  // Create new geometry with updated size
  sphereGeometry = new THREE.SphereGeometry(currentZoom, 64, 32);
  sphere.geometry = sphereGeometry;
}

// Auto-rotate when idle
function startAutoRotate() {
  clearTimeout(autoRotateTimeout);
  autoRotateTimeout = setTimeout(() => {
    isAutoRotating = true;
  }, 3000); // Start auto-rotate after 3 seconds of inactivity
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Auto-rotation
  if (isAutoRotating && !isMouseDown) {
    targetRotationY += 0.001;
  }

  // Momentum with friction
  if (!isMouseDown) {
    velocityX *= 0.95; // Friction
    velocityY *= 0.95;
    
    targetRotationY += velocityX;
    targetRotationX += velocityY;
  }

  // Smooth rotation interpolation
  sphere.rotation.y += (targetRotationY - sphere.rotation.y) * 0.08;
  sphere.rotation.x += (targetRotationX - sphere.rotation.x) * 0.08;

  renderer.render(scene, camera);
}

// Start video and animation when video is ready
video.addEventListener('canplay', () => {
  video.play();
  animate();
});

// Fallback: start animation even if video doesn't load
setTimeout(() => {
  if (!video.played) {
    animate();
  }
}, 3000);

// UI Controls
const zoomDisplay = document.getElementById('zoom-display');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const autoRotateBtn = document.getElementById('auto-rotate');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Zoom buttons
zoomInBtn.addEventListener('click', () => {
  currentZoom += 0.1;
  currentZoom = Math.min(currentZoom, maxZoom);
  updateSphereSize();
  updateZoomDisplay();
  clearTimeout(autoRotateTimeout);
  isAutoRotating = false;
});

zoomOutBtn.addEventListener('click', () => {
  currentZoom -= 0.1;
  currentZoom = Math.max(currentZoom, minZoom);
  updateSphereSize();
  updateZoomDisplay();
  clearTimeout(autoRotateTimeout);
  isAutoRotating = false;
});

// Auto-rotate toggle button
autoRotateBtn.addEventListener('click', () => {
  isAutoRotating = !isAutoRotating;
  autoRotateBtn.classList.toggle('active');
});

// Fullscreen button
fullscreenBtn.addEventListener('click', () => {
  const canvas = document.getElementById('threejs-canvas');
  if (!document.fullscreenElement) {
    canvas.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
  } else {
    document.exitFullscreen();
  }
});

// Update zoom display
function updateZoomDisplay() {
  const zoomPercent = Math.round((currentZoom / maxZoom) * 100);
  zoomDisplay.textContent = `ZOOM: ${zoomPercent}%`;
}

// Video progress tracking
const progressBar = document.getElementById('video-progress');
video.addEventListener('timeupdate', () => {
  if (video.duration) {
    const progress = (video.currentTime / video.duration) * 100;
    progressBar.style.width = progress + '%';
  }
});

video.addEventListener('ended', () => {
  progressBar.style.width = '0%';
});

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
  // Only if not typing in an input
  if (event.target === document.body) {
    if (event.key === '+' || event.key === '=') {
      currentZoom += 0.1;
      currentZoom = Math.min(currentZoom, maxZoom);
      updateSphereSize();
      updateZoomDisplay();
    } else if (event.key === '-' || event.key === '_') {
      currentZoom -= 0.1;
      currentZoom = Math.max(currentZoom, minZoom);
      updateSphereSize();
      updateZoomDisplay();
    } else if (event.key === ' ') {
      event.preventDefault();
      isAutoRotating = !isAutoRotating;
      autoRotateBtn.classList.toggle('active');
    }
  }
});

// Initialize zoom display
updateZoomDisplay();

// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});

// Disable developer tools keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    (e.ctrlKey && e.shiftKey && e.key === 'J') ||
    (e.ctrlKey && e.shiftKey && e.key === 'C') ||
    (e.ctrlKey && e.shiftKey && e.key === 'U') || // View page source
    (e.ctrlKey && e.key === 'U') // Firefox view page source
  ) {
    e.preventDefault();
    return false;
  }
});
