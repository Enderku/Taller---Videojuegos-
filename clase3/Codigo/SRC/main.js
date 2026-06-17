// IMPORTACIONES ===============

// Estilos CSS
import "./style.css";

// Librería principal de Three.js
import * as THREE from "three";

// Cargador de modelos GLB / GLTF
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ESCENA ==============

// La escena es el contenedor principal donde viven:
// - Modelos 3D
// - Luces
// - Cámaras
// - Efectos visuales
const scene = new THREE.Scene();

// Color de fondo
scene.background = new THREE.Color(0x111111);

// Niebla para dar sensación de profundidad
scene.fog = new THREE.Fog(0x111111, 10, 50);

// CÁMARA ======================

// La cámara representa la vista del jugador
const camera = new THREE.PerspectiveCamera(
  75, // Campo de visión
  window.innerWidth / window.innerHeight,
  0.1, // Distancia mínima visible
  1000, // Distancia máxima visible
);

// Posición fija de la cámara
camera.position.set(0, 3, 8);

// Apunta hacia la zona donde estará el modelo
camera.lookAt(0, 0, -20);

// RENDERIZADOR ==================

// Convierte la escena 3D en píxeles visibles
const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

// Activar sombras
renderer.shadowMap.enabled = true;

// Ajustar tamaño al navegador
renderer.setSize(window.innerWidth, window.innerHeight);

// Insertar el canvas en la página
document.body.appendChild(renderer.domElement);

// RELOJ =================

// Permite calcular el tiempo entre frames
const clock = new THREE.Clock();

// MODELO 3D ======================

// Variable global donde guardaremos el modelo
let modelo = null;

// Crear cargador GLTF
const loader = new GLTFLoader();

// Cargar modelo
loader.load(
  "/models/esqueleto.glb",

  // MODELO ==============

  (gltf) => {
    modelo = gltf.scene;

    // Escala del modelo
    modelo.scale.set(5, 5, 5);

    // Posición inicial
    modelo.position.set(0, 0, 0);

    // Activar sombras para todas las piezas
    modelo.traverse((objeto) => {
      if (objeto.isMesh) {
        objeto.castShadow = true;
        objeto.receiveShadow = true;
      }
    });

    // Agregar modelo a la escena
    scene.add(modelo);

    console.log("✅ Modelo cargado correctamente");
  },

  // PROGRESO =================

  (xhr) => {
    console.log(((xhr.loaded / xhr.total) * 100).toFixed(2) + "% cargado");
  },

  // ERROR ==========================

  (error) => {
    console.error("❌ Error al cargar el modelo:", error);
  },
);

// LUZ ===============

// Luz ambiental
// Ilumina toda la escena por igual
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);

scene.add(ambientLight);

// Luz direccional
// Similar a la luz del sol
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);

directionalLight.position.set(5, 10, 7);

directionalLight.castShadow = true;

scene.add(directionalLight);

// Luz puntual
// Emite luz desde un punto específico
const pointLight = new THREE.PointLight(0xffffff, 1);

pointLight.position.set(0, 3, 3);

scene.add(pointLight);

// TECLADO ==================

// Estado actual de cada tecla
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

// GAME LOOP ================

// Se ejecuta una vez por frame
function animate() {
  requestAnimationFrame(animate);

  // Tiempo transcurrido desde el frame anterior
  const delta = clock.getDelta();

  // Velocidad normal o sprint
  const currentSpeed = (keys.shift ? 0.12 : 0.05) * delta * 60;

  // MOVIMIENTO DEL MODELO ==============

  if (modelo) {
    // POSICIÓN -----------------

    // Subir
    if (keys.w) {
      modelo.position.y += currentSpeed;
    }

    // Bajar
    if (keys.s) {
      modelo.position.y -= currentSpeed;
    }

    // Izquierda
    if (keys.a) {
      modelo.position.x -= currentSpeed;
    }

    // Derecha
    if (keys.d) {
      modelo.position.x += currentSpeed;
    }

    // Adelante
    if (keys.q) {
      modelo.position.z -= currentSpeed;
    }

    // Atrás
    if (keys.e) {
      modelo.position.z += currentSpeed;
    }

    // ROTACION ----------------

    // Eje X -
    if (keys.o) {
      modelo.rotation.x -= currentSpeed;
    }

    // Eje X +
    if (keys.l) {
      modelo.rotation.x += currentSpeed;
    }

    // Eje Y -
    if (keys.k) {
      modelo.rotation.y -= currentSpeed;
    }

    // Eje Y +
    if (keys.ñ) {
      modelo.rotation.y += currentSpeed;
    }

    // Eje Z +
    if (keys.i) {
      modelo.rotation.z += currentSpeed;
    }

    // Eje Z -
    if (keys.p) {
      modelo.rotation.z -= currentSpeed;
    }
  }

  // Dibujar escena
  renderer.render(scene, camera);
}

// Iniciar bucle
animate();

// REDIMENSIONAR VENTANA ===============

// Cuando cambia el tamaño de la ventana
window.addEventListener("resize", () => {
  // Actualizar relación de aspecto
  camera.aspect = window.innerWidth / window.innerHeight;

  // Recalcular proyección
  camera.updateProjectionMatrix();

  // Ajustar tamaño del renderizador
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// KEYDOWN =========================

// Cuando una tecla es presionada
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = true;
  }
});

// KEYUP ========================

// Cuando una tecla es liberada
window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = false;
  }
});
