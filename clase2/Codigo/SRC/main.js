import "./style.css"; // <--- ¡Añade esta línea para que limpie la pantalla!
import * as THREE from "three";

// ESCENA ==============
// Contenedor principal donde viven todos los objetos 3D,
// luces, cámaras y efectos visuales.
const scene = new THREE.Scene();

// Color de fondo de la escena.
scene.background = new THREE.Color(0x111111);

// Niebla que oculta gradualmente los objetos lejanos.
scene.fog = new THREE.Fog(0x111111, 10, 50);

// Muestra los ejes del mundo:
// X = rojo
// Y = verde
// Z = azul
/*const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);*/

// CÁMARA ============

// Simula la visión del jugador.
// aspect = relación ancho/alto de la ventana
const camera = new THREE.PerspectiveCamera(
  75, // 75 = campo de visión (FOV)
  window.innerWidth / window.innerHeight,
  0.1, // 0.1 = distancia mínima visible
  1000, // 1000 = distancia máxima visible
);

// Posición inicial de la cámara.
camera.position.z = 3;

// RENDERIZADOR ============

// Convierte la escena 3D en píxeles visibles en pantalla.
const renderer = new THREE.WebGLRenderer({
  antialias: true, // Suaviza bordes dentados
});

// Activa el sistema de sombras.
renderer.shadowMap.enabled = true;

// Ajusta el tamaño al tamaño de la ventana.
renderer.setSize(window.innerWidth, window.innerHeight);

// Inserta el canvas generado por Three.js en la página.
document.body.appendChild(renderer.domElement);

// OCTAEDRO =============

// Objeto jugable de la escena.
const octahedron = new THREE.Mesh(
  // Forma geométrica.
  // 0.8 = tamaño
  // 1 = nivel de detalle
  new THREE.OctahedronGeometry(0.8, 1),

  // Material físico que reacciona a la luz.
  new THREE.MeshStandardMaterial({
    color: 0x6734eb,
    metalness: 0.7,
    roughness: 0.2,
  }),
);

// El objeto puede proyectar y recibir sombras.
octahedron.castShadow = true;
octahedron.receiveShadow = true;

// Posición inicial.
octahedron.position.set(0, 0, -20);

// Agregar el objeto a la escena.
scene.add(octahedron);

// BLOQUES SUPERIORES ==========

// Geometría compartida por los 3 cubos.
// 1,1,1 = ancho, alto y profundidad.
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

// Material amarillo compartido.
const boxMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd700,
});

// Cubo izquierdo
const box1 = new THREE.Mesh(boxGeometry, boxMaterial);

// Cubo central
const box2 = new THREE.Mesh(boxGeometry, boxMaterial);

// Cubo derecho
const box3 = new THREE.Mesh(boxGeometry, boxMaterial);

// Permitir sombras
box1.castShadow = true;
box1.receiveShadow = true;

box2.castShadow = true;
box2.receiveShadow = true;

box3.castShadow = true;
box3.receiveShadow = true;

// POSICIONES
// Todos comparten Z=-20 para estar
// en el mismo plano que el octaedro.
box1.position.set(-1.5, 2, -20);

box2.position.set(0, 2, -20);
// Velocidad del movimiento
let speed = 0.2;
// Dirección del movimiento
let direction = 1;

box3.position.set(1.5, 2, -20);

// Agregar cubos a la escena
scene.add(box1, box2, box3);

// ILUMINACIÓN ==============

// Luz direccional similar al sol.
const light1 = new THREE.DirectionalLight(0xffffff, 1);
light1.position.set(5, 5, 5);
light1.castShadow = true;

// Luz ambiental que ilumina todo por igual.
const light2 = new THREE.AmbientLight(0xffffff, 1);

// Luz puntual que emite luz desde un punto específico.
const light3 = new THREE.PointLight(0xffffff, 1);
light3.position.set(0, 3, 3);

// Añadir luces a la escena.
scene.add(light1, light2, light3);

// PISO =========

// Geometría del plano (ancho, alto)
const floorGeometry = new THREE.PlaneGeometry(10, 50);

// Material blanco
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide, // visible por ambos lados
});

// Crear el plano
const floor = new THREE.Mesh(floorGeometry, floorMaterial);

// Rotarlo para que sea horizontal
floor.rotation.x = -Math.PI / 2;

// Posicionarlo debajo del jugador
floor.position.y = -0.5;

// Permitir sombras
floor.receiveShadow = true;

// Añadir a la escena
scene.add(floor);

// ENTRADAS DE TECLADO ==========

// Guarda qué teclas están presionadas actualmente.
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

// Calcula el tiempo transcurrido entre frames.
// Permite que la velocidad sea igual sin importar los FPS.
const clock = new THREE.Clock();

// GAME LOOP ============

// Se ejecuta una vez por frame.
function animate() {
  // Solicita el siguiente frame.
  requestAnimationFrame(animate);

  // Tiempo transcurrido desde el frame anterior.
  const delta = clock.getDelta();

  // Velocidad normal o sprint.
  const currentSpeed = (keys.shift ? 0.12 : 0.05) * delta * 60;

  // --- ROTACIONES ---

  if (keys.o) camera.rotation.x += currentSpeed;
  if (keys.l) camera.rotation.x -= currentSpeed;

  if (keys.k) camera.rotation.y += currentSpeed;
  if (keys.ñ) camera.rotation.y -= currentSpeed;

  if (keys.i) camera.rotation.z += currentSpeed;
  if (keys.p) camera.rotation.z -= currentSpeed;

  // --- MOVIMIENTO ---

  if (keys.w) camera.position.y += currentSpeed;
  if (keys.s) camera.position.y -= currentSpeed;

  if (keys.a) camera.position.x -= currentSpeed;
  if (keys.d) camera.position.x += currentSpeed;

  if (keys.q) camera.position.z -= currentSpeed;
  if (keys.e) camera.position.z += currentSpeed;

  // MOVIMIENTO DEL BLOQUE CENTRAL ==============

  // Mueve el cubo en el eje Z
  box2.position.z += speed * direction;

  // Cuando llega al límite delantero,
  // comienza a retroceder
  if (box2.position.z > 3) {
    direction = -1;
  }

  // Cuando llega al límite trasero,
  // vuelve a avanzar
  if (box2.position.z < -25) {
    direction = 1;
  }

  // Dibuja la escena desde el punto de vista de la cámara.
  renderer.render(scene, camera);
}

animate();

// AJUSTE DE VENTANA ==========

// Actualiza la cámara y el renderer
// cuando cambia el tamaño de la ventana.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// KEYDOWN ===========

// Marca una tecla como presionada.
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = true;
  }
});

// KEYUP ====================

// Marca una tecla como liberada.
window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = false;
  }
});
