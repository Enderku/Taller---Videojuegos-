import { metalness, roughness } from "three/tsl";
import "./style.css"; // <--- ¡Añade esta línea para que limpie la pantalla!
import * as THREE from "three";

// 1. ESCENA
const scene = new THREE.Scene();

// 2. CÁMARA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 3;

// 3. RENDERIZADOR
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.OctahedronGeometry(0.8, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x6734eb,
  metalness: 0.7,
  roughness: 0.2,
});
const octahedron = new THREE.Mesh(geometry, material);
scene.add(octahedron);

//luces

const light1 = new THREE.DirectionalLight(0xffffff, 1);
light1.position.set(5, 5, 5);
scene.add(light1);

const light2 = new THREE.AmbientLight(0xffffff, 1);
scene.add(light2);

const light3 = new THREE.PointLight(0xffffff, 1);
light3.position.set(0, 3, 3);
scene.add(light3);

/* // 4. CUBO
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x32a852 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
 */
// Diccionario para registrar qué teclas están presionadas
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  q: false,
  e: false,
  o: false,
  l: false,
  k: false,
  ñ: false,
  i: false,
  p: false,
  shift: false,
};

// 5. BUCLE DE ANIMACIÓN (Game Loop)

function animate() {
  requestAnimationFrame(animate);
  console.log(octahedron.position.x);

  // 1. CALCULAR VELOCIDAD (Si presiona Shift, corre al doble de velocidad)
  let currentSpeed = 0.05;
  if (keys.shift) {
    currentSpeed = 0.12; // Velocidad de Sprint
  }

  // --- MECÁNICA DE MOVIMIENTO ---
  if (keys.o) octahedron.rotation.x -= currentSpeed; // Arriba
  if (keys.l) octahedron.rotation.x += currentSpeed; // Abajo
  if (keys.k) octahedron.rotation.y -= currentSpeed; // Izquierda
  if (keys.ñ) octahedron.rotation.y += currentSpeed; // Derecha
  if (keys.i) octahedron.rotation.z -= currentSpeed; // Adelante
  if (keys.p) octahedron.rotation.z += currentSpeed; // Atras

  if (keys.w) octahedron.position.y += currentSpeed; // Arriba
  if (keys.s) octahedron.position.y -= currentSpeed; // Abajo
  if (keys.a) octahedron.position.x -= currentSpeed; // Izquierda
  if (keys.d) octahedron.position.x += currentSpeed; // Derecha
  if (keys.q) octahedron.position.z -= currentSpeed; // Adelante
  if (keys.e) octahedron.position.z += currentSpeed; // Atras

  // --- LIMITAR LA POSICIÓN (Lógica de colisión con el borde) ---
  // Límite Derecha (X positivo)
  if (octahedron.position.x > 5) {
    cube.position.x = 5;
  }
  // Límite Izquierda (X negativo)
  else if (octahedron.position.x < -5) {
    cube.position.x = -5;
  }

  // Límite Arriba (Y positivo)
  if (octahedron.position.y > 3) {
    cube.position.y = 3;
  }
  // Límite Abajo (Y negativo)
  else if (octahedron.position.y < -3) {
    cube.position.y = -3;
  }

  // Mantener una leve rotación para que se siga viendo en 3D
  //cube.rotation.x += 0.005;
  //cube.rotation.y += 0.005;

  renderer.render(scene, camera);
}

animate();

// 6. AJUSTE DE PANTALLA (Hacer el juego responsivo)
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Detectar cuando se presiona la tecla
window.addEventListener("keydown", (event) => {
  let key = event.key.toLowerCase();

  // Si presionaron cualquier Shift, lo normalizamos a 'shift'
  if (key === "shift") key = "shift";

  if (key in keys) {
    keys[key] = true;
  }
});

window.addEventListener("keyup", (event) => {
  let key = event.key.toLowerCase();

  if (key === "shift") key = "shift";

  if (key in keys) {
    keys[key] = false;
  }
});
