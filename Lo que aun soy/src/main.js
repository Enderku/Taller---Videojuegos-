// IMPORTACIONES ===============

// Estilos CSS
import "./style.css";

// Librería principal de Three.js
import * as THREE from "three";

// Cargador de modelos GLB / GLTF
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Para clonar modelos con esqueleto/animación (necesario para tener varios enemigos)
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

// ESCENA ==============

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 10, 50);

// CÁMARA ======================

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

camera.position.set(0, 16, 10);
camera.lookAt(0, 0, 3);

// RENDERIZADOR ==================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.shadowMap.enabled = true;

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

// RELOJ =================

const clock = new THREE.Clock();

// MODELO 3D (PERSONAJE PRINCIPAL) ======================

let modelo = null;

const loader = new GLTFLoader();

loader.load(
  "/models/esqueleto.glb",
  (gltf) => {
    modelo = gltf.scene;

    modelo.scale.set(1.5, 1.5, 1.5);
    modelo.position.set(0, 0, 0);

    modelo.traverse((objeto) => {
      if (objeto.isMesh) {
        objeto.castShadow = true;
        objeto.receiveShadow = true;
      }
    });

    scene.add(modelo);

    console.log("Modelo cargado");
  },
  (xhr) => {
    console.log(((xhr.loaded / xhr.total) * 100).toFixed(2) + "% cargado");
  },
  (error) => {
    console.error("Error cargando modelo", error);
  },
);

// ENEMIGOS =================
// IMPORTANTE: copiá tu archivo Enemigo.glb a la carpeta "public/models/"
// del proyecto. Una ruta de tu disco (E:\...) no se puede cargar desde
// el navegador, tiene que servirse desde el proyecto igual que el esqueleto.

// Cacheamos el GLTF cargado una sola vez, y de ahí clonamos tantos
// enemigos como necesitemos por piso (SkeletonUtils.clone soporta modelos
// con esqueleto/animaciones, a diferencia de un .clone() normal).

let enemigoGLTF = null;

const enemyLoader = new GLTFLoader();

enemyLoader.load(
  "/models/Enemigo.glb",
  (gltf) => {
    enemigoGLTF = gltf;

    console.log("Modelo de enemigo cargado");

    // En cuanto está listo el modelo, arrancamos el primer piso
    iniciarNivel(nivelState.actual);
  },
  (xhr) => {
    console.log(
      ((xhr.loaded / xhr.total) * 100).toFixed(2) + "% cargado (enemigo)",
    );
  },
  (error) => {
    console.error("Error cargando enemigo", error);
  },
);

// Configuración general de los enemigos

const enemigoConfig = {
  velocidad: 3.2, // unidades por segundo, un poco más lento que el jugador
  radioContacto: 1.4, // distancia a la que se considera "toque" con el jugador
  danioPorSegundo: 12, // cuánta vida quita por segundo mientras está en contacto
};

const enemigoStats = {
  vidaMax: 30, // con daño de bola de fuego de 12, mueren en 3 golpes
};

// Lista de enemigos vivos actualmente. Cada elemento: { mesh, vida, vidaMax }
const enemigos = [];

// LUCES =================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// ARENA =================

const arena = {
  minX: -12,
  maxX: 12,
  minZ: -12,
  maxZ: 12,
};

// PISO =================

const floorGeometry = new THREE.PlaneGeometry(24, 24);

const textureLoader = new THREE.TextureLoader();

const floorTexture = textureLoader.load("/textures/piso.jpg");

floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

const floorMaterial = new THREE.MeshStandardMaterial({
  map: floorTexture,
  side: THREE.DoubleSide,
});

const floor = new THREE.Mesh(floorGeometry, floorMaterial);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;

scene.add(floor);

//=====================================================
// OBSTÁCULOS
//=====================================================

const obstaculos = [];

function generarObstaculos(cantidad) {
  obstaculos.forEach((obj) => scene.remove(obj));
  obstaculos.length = 0;

  for (let i = 0; i < cantidad; i++) {
    const geometry = new THREE.BoxGeometry(1.5, 2, 1.5);

    const material = new THREE.MeshStandardMaterial({
      color: 0x777777,
    });

    const obstaculo = new THREE.Mesh(geometry, material);

    obstaculo.castShadow = true;
    obstaculo.receiveShadow = true;

    //====================================================
    // BUSCAMOS UNA POSICIÓN VÁLIDA PARA EL OBSTÁCULO
    //====================================================

    let posicionValida = false;

    while (!posicionValida) {
      posicionValida = true;

      const x = THREE.MathUtils.randFloat(-10, 10);
      const z = THREE.MathUtils.randFloat(-10, 10);

      // 1) Evitar el centro del mapa (ahí aparece el jugador)

      if (Math.hypot(x, z) < 4) {
        posicionValida = false;
      }

      // 2) Evitar que los obstáculos se toquen

      for (const otro of obstaculos) {
        const distancia = Math.hypot(x - otro.position.x, z - otro.position.z);

        if (distancia < 3) {
          posicionValida = false;
          break;
        }
      }

      // 3) Evitar generar encima de enemigos

      for (const enemigo of enemigos) {
        const distancia = Math.hypot(
          x - enemigo.mesh.position.x,
          z - enemigo.mesh.position.z,
        );

        if (distancia < 3) {
          posicionValida = false;
          break;
        }
      }

      if (posicionValida) {
        obstaculo.position.set(x, 1, z);
      }
    }

    scene.add(obstaculo);

    obstaculos.push(obstaculo);
  }
}

// CUADRICULA =================

const gridHelper = new THREE.GridHelper(24, 24, 0xffffff, 0x444444);
scene.add(gridHelper);

// TECLADO =================

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
};

// ESTADO DEL JUGADOR (VIDA / ENERGÍA) =================

const jugadorStats = {
  vida: 50,
  vidaMax: 50,

  energia: 100,
  energiaMax: 100,

  costoEnergiaPorSegundo: 25,
  regenEnergiaPorSegundo: 15,
};

// MEJORAS DEL JUGADOR (lo que van desbloqueando las cartas) =================

const jugadorUpgrades = {
  proyectilAtras: false, // "Mi Antiguo Yo"
  proyectilesLaterales: false, // "La Memoria de Mis Manos"
  atraviesaObstaculos: false, // "Recuerdo Cómo Caminar"
  proyectilesAtraviesanObstaculos: false, // "Ni La Distancia Ni El Olvido"
  escudo: 0, // "No Perderé Lo Último Que Me Queda"
  escudoMax: 100,
};

// SISTEMA DE MEJORAS (cartas tipo Vampire Survivors / Brotato) =================
// Cada vez que se limpia un piso, se muestran 3 de estas 7 al azar.

const mejorasPool = [
  {
    id: "recordar_respirar",
    nombre: "Recuerdo Cómo Respirar",
    descripcion: "Recuperás toda tu salud al instante.",
    aplicar: () => {
      jugadorStats.vida = jugadorStats.vidaMax;
    },
  },
  {
    id: "antiguo_yo",
    nombre: "Mi Antiguo Yo",
    descripcion: "Cada disparo lanza también una bola de fuego hacia atrás.",
    aplicar: () => {
      jugadorUpgrades.proyectilAtras = true;
    },
  },
  {
    id: "recordar_caminar",
    nombre: "Recuerdo Cómo Caminar",
    descripcion: "Atravesás los obstáculos como si no existieran.",
    aplicar: () => {
      jugadorUpgrades.atraviesaObstaculos = true;
    },
  },
  {
    id: "memoria_manos",
    nombre: "La Memoria de Mis Manos",
    descripcion: "Cada disparo lanza fuego extra a tu izquierda y derecha.",
    aplicar: () => {
      jugadorUpgrades.proyectilesLaterales = true;
    },
  },
  {
    id: "no_perdere",
    nombre: "No Perderé Lo Último Que Me Queda",
    descripcion:
      "Ganás un escudo de 100 puntos. Al romperse, explota y mata todo lo que esté cerca.",
    aplicar: () => {
      jugadorUpgrades.escudo = jugadorUpgrades.escudoMax;
    },
  },
  {
    id: "ni_distancia",
    nombre: "Ni La Distancia Ni El Olvido",
    descripcion: "Tus bolas de fuego atraviesan los obstáculos.",
    aplicar: () => {
      jugadorUpgrades.proyectilesAtraviesanObstaculos = true;
    },
  },
  {
    id: "no_olvidare",
    nombre: "No Olvidaré Cómo Sentir",
    descripcion: "Aumenta el daño de tus bolas de fuego.",
    aplicar: () => {
      fireballConfig.danio += 8;
    },
  },
];

let mostrandoMejoras = false;
let juegoPausado = false;

function elegirMejorasAleatorias(cantidad) {
  const copia = [...mejorasPool];
  const elegidas = [];

  for (let i = 0; i < cantidad && copia.length > 0; i++) {
    const indice = Math.floor(Math.random() * copia.length);
    elegidas.push(copia[indice]);
    copia.splice(indice, 1);
  }

  return elegidas;
}

function mostrarSeleccionDeMejoras() {
  mostrandoMejoras = true;
  juegoPausado = true;

  const opciones = elegirMejorasAleatorias(3);

  const overlay = document.createElement("div");
  overlay.id = "ui-mejoras";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0, 0, 0, 0.8)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "20";
  overlay.style.fontFamily = "sans-serif";

  const titulo = document.createElement("div");
  titulo.textContent = "Elegí un recuerdo";
  titulo.style.color = "#fff";
  titulo.style.fontSize = "24px";
  titulo.style.fontWeight = "bold";
  titulo.style.marginBottom = "24px";
  titulo.style.letterSpacing = "1px";

  overlay.appendChild(titulo);

  const cardsWrap = document.createElement("div");
  cardsWrap.style.display = "flex";
  cardsWrap.style.gap = "18px";
  cardsWrap.style.flexWrap = "wrap";
  cardsWrap.style.justifyContent = "center";
  cardsWrap.style.maxWidth = "800px";

  opciones.forEach((mejora) => {
    const card = document.createElement("div");
    card.style.width = "210px";
    card.style.padding = "18px";
    card.style.background = "#1a1a1a";
    card.style.border = "2px solid #ff5500";
    card.style.borderRadius = "10px";
    card.style.color = "#fff";
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.12s ease, background 0.12s ease";

    card.addEventListener("mouseenter", () => {
      card.style.transform = "scale(1.05)";
      card.style.background = "#241a1a";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "scale(1)";
      card.style.background = "#1a1a1a";
    });

    const nombre = document.createElement("div");
    nombre.textContent = mejora.nombre;
    nombre.style.fontWeight = "bold";
    nombre.style.fontSize = "15px";
    nombre.style.marginBottom = "10px";
    nombre.style.color = "#ff9955";

    const descripcion = document.createElement("div");
    descripcion.textContent = mejora.descripcion;
    descripcion.style.fontSize = "13px";
    descripcion.style.lineHeight = "1.4";
    descripcion.style.color = "#ddd";

    card.appendChild(nombre);
    card.appendChild(descripcion);

    card.addEventListener("click", () => {
      mejora.aplicar();
      cerrarSeleccionDeMejoras();
    });

    cardsWrap.appendChild(card);
  });

  overlay.appendChild(cardsWrap);
  document.body.appendChild(overlay);
}

function cerrarSeleccionDeMejoras() {
  const overlay = document.getElementById("ui-mejoras");
  if (overlay) overlay.remove();

  mostrandoMejoras = false;
  juegoPausado = false;

  iniciarNivel(nivelState.actual + 1);
}

// DAÑO AL JUGADOR (pasa primero por el escudo, si hay) =================

function aplicarDanioAlJugador(cantidad) {
  if (jugadorUpgrades.escudo > 0) {
    jugadorUpgrades.escudo -= cantidad;

    if (jugadorUpgrades.escudo <= 0) {
      const sobrante = -jugadorUpgrades.escudo; // daño que "sobra" pasa a la vida

      jugadorUpgrades.escudo = 0;

      explotarEscudo();

      jugadorStats.vida -= sobrante;
    }
  } else {
    jugadorStats.vida -= cantidad;
  }

  jugadorStats.vida = Math.max(0, jugadorStats.vida);

  if (jugadorStats.vida <= 0) {
    reiniciarJuego();
  }
}

// EXPLOSIÓN DEL ESCUDO: mata todo lo que esté cerca del jugador =================

function explotarEscudo() {
  if (!modelo) return;

  const radioExplosion = 6;

  for (let i = enemigos.length - 1; i >= 0; i--) {
    const en = enemigos[i];
    const distancia = modelo.position.distanceTo(en.mesh.position);

    if (distancia <= radioExplosion) {
      scene.remove(en.mesh);
      enemigos.splice(i, 1);
    }
  }

  // Efecto visual simple: una esfera translúcida que se expande y se desvanece

  const geometry = new THREE.SphereGeometry(0.5, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.6,
  });

  const esfera = new THREE.Mesh(geometry, material);
  esfera.position.copy(modelo.position);
  esfera.position.y = 1;

  scene.add(esfera);

  let escala = 0.5;

  const animarExplosion = setInterval(() => {
    escala += 1.2;
    esfera.scale.set(escala, escala, escala);
    material.opacity -= 0.08;

    if (material.opacity <= 0) {
      clearInterval(animarExplosion);
      scene.remove(esfera);
    }
  }, 30);
}

// SISTEMA DE NIVELES =================

const nivelState = {
  actual: 1,
  enemigosBase: 1, // enemigos en el piso 1
};

// En cada piso el número de enemigos se multiplica por el nivel:
// piso 1 -> 1, piso 2 -> 2, piso 3 -> 3, etc.
function calcularCantidadEnemigos(nivel) {
  return nivelState.enemigosBase * nivel;
}

function generarEnemigos(cantidad) {
  enemigos.forEach((en) => scene.remove(en.mesh));
  enemigos.length = 0;

  if (!enemigoGLTF) return;

  for (let i = 0; i < cantidad; i++) {
    const mesh = skeletonClone(enemigoGLTF.scene);

    mesh.scale.set(1.5, 1.5, 1.5);

    let x = 0;
    let z = 0;

    let posicionCorrecta = false;

    while (!posicionCorrecta) {
      posicionCorrecta = true;

      x = THREE.MathUtils.randFloat(arena.minX + 1, arena.maxX - 1);
      z = THREE.MathUtils.randFloat(arena.minZ + 1, arena.maxZ - 1);

      // No aparecer cerca del jugador

      if (Math.hypot(x, z) < 4) {
        posicionCorrecta = false;
      }

      // No aparecer encima de otro enemigo

      for (const enemigo of enemigos) {
        const distancia = Math.hypot(
          x - enemigo.mesh.position.x,
          z - enemigo.mesh.position.z,
        );

        if (distancia < 3) {
          posicionCorrecta = false;
          break;
        }
      }
    }

    mesh.position.set(x, 0, z);

    mesh.traverse((objeto) => {
      if (objeto.isMesh) {
        objeto.castShadow = true;
        objeto.receiveShadow = true;
      }
    });

    scene.add(mesh);

    enemigos.push({
      mesh,
      vida: enemigoStats.vidaMax,
      vidaMax: enemigoStats.vidaMax,
    });
  }
}

function iniciarNivel(nivel) {
  nivelState.actual = nivel;

  // Cada piso empieza desde el centro de la arena

  if (modelo) {
    modelo.position.set(0, 0, 0);
  }

  // Limpiamos las bolas de fuego del piso anterior

  fireballs.forEach((fb) => {
    scene.remove(fb.mesh);
  });

  fireballs.length = 0;

  generarEnemigos(calcularCantidadEnemigos(nivel));
  generarObstaculos(6 + nivel);

  actualizarUINivel();
}

// ATAQUE: BOLA DE FUEGO + APUNTADO CON MOUSE =================

const fireballConfig = {
  velocidad: 14,
  danio: 12,
  danioBase: 12, // para poder resetear al morir, aunque hayas mejorado el daño
  radioImpacto: 1,
  duracion: 2, // segundos antes de desaparecer si no pega a nada
};

const fireballs = []; // { mesh, direccion, tiempoVida }

// Raycaster para saber en qué punto del piso está apuntando el mouse
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, 0);
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorldPoint = new THREE.Vector3();

// Mira/reticle que muestra dónde estás apuntando
const miraGeometry = new THREE.RingGeometry(0.3, 0.4, 24);
const miraMaterial = new THREE.MeshBasicMaterial({
  color: 0xff3300,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.85,
});
const mira = new THREE.Mesh(miraGeometry, miraMaterial);
mira.rotation.x = -Math.PI / 2;
mira.position.y = 0.05;
scene.add(mira);

window.addEventListener("mousemove", (event) => {
  mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener("click", () => {
  if (mostrandoMejoras) return; // no disparar con el menú de mejoras abierto

  dispararBolaDeFuego();
});

function crearFireball(direccion) {
  const geometry = new THREE.SphereGeometry(0.3, 12, 12);

  const material = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff2200,
    emissiveIntensity: 2,
  });

  const bola = new THREE.Mesh(geometry, material);

  bola.position.copy(modelo.position);
  bola.position.y = 1;

  // Luz chiquita para que se sienta como fuego de verdad
  const luzBola = new THREE.PointLight(0xff6600, 1.5, 4);
  bola.add(luzBola);

  scene.add(bola);

  fireballs.push({
    mesh: bola,
    direccion: direccion.clone(),
    tiempoVida: fireballConfig.duracion,
  });
}

function dispararBolaDeFuego() {
  if (!modelo) return;

  const direccion = new THREE.Vector3().subVectors(
    mouseWorldPoint,
    modelo.position,
  );

  direccion.y = 0;

  if (direccion.lengthSq() < 0.0001) return;

  direccion.normalize();

  // Disparo principal, hacia donde apunta el mouse
  crearFireball(direccion);

  // "Mi Antiguo Yo": proyectil extra hacia atrás
  if (jugadorUpgrades.proyectilAtras) {
    crearFireball(direccion.clone().negate());
  }

  // "La Memoria de Mis Manos": proyectiles extra a los costados
  if (jugadorUpgrades.proyectilesLaterales) {
    const lateralDerecha = new THREE.Vector3(
      -direccion.z,
      0,
      direccion.x,
    ).normalize();

    const lateralIzquierda = lateralDerecha.clone().negate();

    crearFireball(lateralDerecha);
    crearFireball(lateralIzquierda);
  }

  // El personaje gira hacia donde está disparando
  modelo.rotation.y = Math.atan2(direccion.x, direccion.z);
}

function actualizarFireballs(delta) {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fb = fireballs[i];

    fb.mesh.position.x += fb.direccion.x * fireballConfig.velocidad * delta;
    fb.mesh.position.z += fb.direccion.z * fireballConfig.velocidad * delta;

    fb.tiempoVida -= delta;

    // COLISIÓN DE BOLA DE FUEGO CON OBSTÁCULOS
    // ("Ni La Distancia Ni El Olvido" hace que esto se ignore)

    let golpeoObstaculo = false;

    if (!jugadorUpgrades.proyectilesAtraviesanObstaculos) {
      for (const obstaculo of obstaculos) {
        const distancia = fb.mesh.position.distanceTo(obstaculo.position);

        if (distancia < 1) {
          golpeoObstaculo = true;
          break;
        }
      }
    }

    let impacto = false;

    for (let j = enemigos.length - 1; j >= 0; j--) {
      const en = enemigos[j];

      const distancia = fb.mesh.position.distanceTo(en.mesh.position);

      if (distancia < fireballConfig.radioImpacto + 1) {
        en.vida -= fireballConfig.danio;
        impacto = true;

        if (en.vida <= 0) {
          scene.remove(en.mesh);
          enemigos.splice(j, 1);
        }

        break;
      }
    }

    const fueraDeArena =
      fb.mesh.position.x < arena.minX ||
      fb.mesh.position.x > arena.maxX ||
      fb.mesh.position.z < arena.minZ ||
      fb.mesh.position.z > arena.maxZ;

    if (impacto || golpeoObstaculo || fb.tiempoVida <= 0 || fueraDeArena) {
      scene.remove(fb.mesh);
      fireballs.splice(i, 1);
    }
  }

  // Si ya no quedan enemigos, mostramos las mejoras y después avanzamos de piso

  if (enemigos.length === 0 && enemigoGLTF && !mostrandoMejoras) {
    mostrarSeleccionDeMejoras();
  }
}

// UI - BARRAS DE VIDA, ENERGÍA, ESCUDO Y NIVEL =================

function crearUIBarras() {
  const contenedor = document.createElement("div");
  contenedor.id = "ui-barras";
  contenedor.style.position = "fixed";
  contenedor.style.top = "16px";
  contenedor.style.left = "16px";
  contenedor.style.display = "flex";
  contenedor.style.flexDirection = "column";
  contenedor.style.gap = "8px";
  contenedor.style.fontFamily = "sans-serif";
  contenedor.style.zIndex = "10";
  contenedor.style.userSelect = "none";

  // Nivel / piso actual

  const nivelTexto = document.createElement("div");
  nivelTexto.id = "ui-nivel";
  nivelTexto.style.color = "#fff";
  nivelTexto.style.fontSize = "14px";
  nivelTexto.style.fontWeight = "bold";
  nivelTexto.style.marginBottom = "4px";
  nivelTexto.textContent = "Piso 1";

  // Barra de vida

  const vidaWrap = document.createElement("div");
  vidaWrap.style.width = "220px";
  vidaWrap.style.height = "20px";
  vidaWrap.style.background = "#3a0000";
  vidaWrap.style.border = "2px solid #000";
  vidaWrap.style.borderRadius = "4px";
  vidaWrap.style.overflow = "hidden";

  const vidaFill = document.createElement("div");
  vidaFill.id = "barra-vida-fill";
  vidaFill.style.height = "100%";
  vidaFill.style.width = "100%";
  vidaFill.style.background = "#e63946";
  vidaFill.style.transition = "width 0.15s linear";

  vidaWrap.appendChild(vidaFill);

  const vidaTexto = document.createElement("div");
  vidaTexto.id = "barra-vida-texto";
  vidaTexto.style.color = "#fff";
  vidaTexto.style.fontSize = "13px";
  vidaTexto.style.marginBottom = "2px";
  vidaTexto.textContent = `Vida: ${jugadorStats.vida}/${jugadorStats.vidaMax}`;

  // Barra de energía

  const energiaWrap = document.createElement("div");
  energiaWrap.style.width = "220px";
  energiaWrap.style.height = "20px";
  energiaWrap.style.background = "#002b3a";
  energiaWrap.style.border = "2px solid #000";
  energiaWrap.style.borderRadius = "4px";
  energiaWrap.style.overflow = "hidden";

  const energiaFill = document.createElement("div");
  energiaFill.id = "barra-energia-fill";
  energiaFill.style.height = "100%";
  energiaFill.style.width = "100%";
  energiaFill.style.background = "#48cae4";
  energiaFill.style.transition = "width 0.15s linear";

  energiaWrap.appendChild(energiaFill);

  const energiaTexto = document.createElement("div");
  energiaTexto.id = "barra-energia-texto";
  energiaTexto.style.color = "#fff";
  energiaTexto.style.fontSize = "13px";
  energiaTexto.style.marginBottom = "2px";
  energiaTexto.textContent = `Energía: ${jugadorStats.energia}/${jugadorStats.energiaMax}`;

  // Barra de escudo (solo se ve si hay escudo activo)

  const escudoWrap = document.createElement("div");
  escudoWrap.id = "ui-escudo-wrap";
  escudoWrap.style.width = "220px";
  escudoWrap.style.height = "20px";
  escudoWrap.style.background = "#001a2b";
  escudoWrap.style.border = "2px solid #000";
  escudoWrap.style.borderRadius = "4px";
  escudoWrap.style.overflow = "hidden";
  escudoWrap.style.display = "none";

  const escudoFill = document.createElement("div");
  escudoFill.id = "barra-escudo-fill";
  escudoFill.style.height = "100%";
  escudoFill.style.width = "100%";
  escudoFill.style.background = "#66ccff";
  escudoFill.style.transition = "width 0.15s linear";

  escudoWrap.appendChild(escudoFill);

  const escudoTexto = document.createElement("div");
  escudoTexto.id = "ui-escudo-texto";
  escudoTexto.style.color = "#fff";
  escudoTexto.style.fontSize = "13px";
  escudoTexto.style.marginBottom = "2px";
  escudoTexto.style.display = "none";
  escudoTexto.textContent = "Escudo: 0/0";

  contenedor.appendChild(nivelTexto);
  contenedor.appendChild(vidaTexto);
  contenedor.appendChild(vidaWrap);
  contenedor.appendChild(energiaTexto);
  contenedor.appendChild(energiaWrap);
  contenedor.appendChild(escudoTexto);
  contenedor.appendChild(escudoWrap);

  document.body.appendChild(contenedor);
}

crearUIBarras();

function actualizarUIBarras() {
  const vidaFill = document.getElementById("barra-vida-fill");
  const vidaTexto = document.getElementById("barra-vida-texto");

  const energiaFill = document.getElementById("barra-energia-fill");
  const energiaTexto = document.getElementById("barra-energia-texto");

  const escudoWrap = document.getElementById("ui-escudo-wrap");
  const escudoFill = document.getElementById("barra-escudo-fill");
  const escudoTexto = document.getElementById("ui-escudo-texto");

  const porcentajeVida = (jugadorStats.vida / jugadorStats.vidaMax) * 100;
  const porcentajeEnergia =
    (jugadorStats.energia / jugadorStats.energiaMax) * 100;

  vidaFill.style.width = `${porcentajeVida}%`;
  vidaTexto.textContent = `Vida: ${Math.ceil(jugadorStats.vida)}/${jugadorStats.vidaMax}`;

  energiaFill.style.width = `${porcentajeEnergia}%`;
  energiaTexto.textContent = `Energía: ${Math.ceil(jugadorStats.energia)}/${jugadorStats.energiaMax}`;

  if (jugadorUpgrades.escudo > 0) {
    const porcentajeEscudo =
      (jugadorUpgrades.escudo / jugadorUpgrades.escudoMax) * 100;

    escudoWrap.style.display = "block";
    escudoTexto.style.display = "block";

    escudoFill.style.width = `${porcentajeEscudo}%`;
    escudoTexto.textContent = `Escudo: ${Math.ceil(jugadorUpgrades.escudo)}/${jugadorUpgrades.escudoMax}`;
  } else {
    escudoWrap.style.display = "none";
    escudoTexto.style.display = "none";
  }
}

function actualizarUINivel() {
  const nivelTexto = document.getElementById("ui-nivel");
  if (!nivelTexto) return;

  nivelTexto.textContent = `Piso ${nivelState.actual} — Enemigos: ${enemigos.length}`;
}

//========================================
// REINICIAR JUEGO
//========================================

function reiniciarJuego() {
  console.log("Reiniciando...");

  jugadorStats.vida = jugadorStats.vidaMax;
  jugadorStats.energia = jugadorStats.energiaMax;

  // Reseteamos todas las mejoras (partida nueva desde cero)

  jugadorUpgrades.proyectilAtras = false;
  jugadorUpgrades.proyectilesLaterales = false;
  jugadorUpgrades.atraviesaObstaculos = false;
  jugadorUpgrades.proyectilesAtraviesanObstaculos = false;
  jugadorUpgrades.escudo = 0;

  fireballConfig.danio = fireballConfig.danioBase;

  if (modelo) {
    modelo.position.set(0, 0, 0);
  }

  fireballs.forEach((fb) => scene.remove(fb.mesh));
  fireballs.length = 0;

  const overlay = document.getElementById("ui-mejoras");
  if (overlay) overlay.remove();

  mostrandoMejoras = false;
  juegoPausado = false;

  iniciarNivel(1);
}

//====================================================
// COMPROBAR COLISION DE UN OBJETO CON OBSTACULOS
//====================================================
//
// Devuelve true si la posición está chocando.
// La usamos para jugador, enemigos y disparos.
//

function estaChocandoObstaculo(posicion, radio) {
  for (const obstaculo of obstaculos) {
    const distancia = Math.hypot(
      posicion.x - obstaculo.position.x,
      posicion.z - obstaculo.position.z,
    );

    if (distancia < radio + 0.5) {
      return true;
    }
  }

  return false;
}

// GAME LOOP =================

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Actualizamos a dónde apunta el mouse en el mundo (para la mira y el disparo)

  raycaster.setFromCamera(mouseNDC, camera);

  if (raycaster.ray.intersectPlane(groundPlane, mouseWorldPoint)) {
    mira.position.set(mouseWorldPoint.x, 0.05, mouseWorldPoint.z);
  }

  // Si está el menú de mejoras abierto, no movemos nada, solo renderizamos

  if (juegoPausado) {
    renderer.render(scene, camera);
    return;
  }

  const puedeCorrer = keys.shift && jugadorStats.energia > 0;

  const speed = (puedeCorrer ? 0.18 : 0.1) * delta * 60;

  if (modelo) {
    let movX = 0;
    let movZ = 0;

    if (keys.w) movZ -= 1;
    if (keys.s) movZ += 1;
    if (keys.a) movX -= 1;
    if (keys.d) movX += 1;

    if (movX !== 0 || movZ !== 0) {
      const length = Math.sqrt(movX * movX + movZ * movZ);

      movX /= length;
      movZ /= length;

      modelo.position.x += movX * speed;
      modelo.position.z += movZ * speed;

      // COLISIONES CON OBSTÁCULOS
      // ("Recuerdo Cómo Caminar" hace que esto se ignore)

      if (!jugadorUpgrades.atraviesaObstaculos) {
        for (const obstaculo of obstaculos) {
          const distancia = modelo.position.distanceTo(obstaculo.position);

          if (distancia < 1.5) {
            modelo.position.x -= movX * speed;
            modelo.position.z -= movZ * speed;
          }
        }
      }

      modelo.rotation.y = Math.atan2(movX, movZ);
    }

    // LÍMITES

    modelo.position.x = Math.max(
      arena.minX,
      Math.min(arena.maxX, modelo.position.x),
    );

    modelo.position.z = Math.max(
      arena.minZ,
      Math.min(arena.maxZ, modelo.position.z),
    );
  }

  // ENERGÍA

  if (keys.shift && jugadorStats.energia > 0) {
    jugadorStats.energia -= jugadorStats.costoEnergiaPorSegundo * delta;
  } else if (!keys.shift && jugadorStats.energia < jugadorStats.energiaMax) {
    jugadorStats.energia += jugadorStats.regenEnergiaPorSegundo * delta;
  }

  jugadorStats.energia = Math.max(
    0,
    Math.min(jugadorStats.energiaMax, jugadorStats.energia),
  );

  // ENEMIGOS: perseguir al jugador, chocar con obstáculos y hacer daño por contacto

  if (modelo) {
    for (const en of enemigos) {
      const direccion = new THREE.Vector3()
        .subVectors(modelo.position, en.mesh.position)
        .setY(0);

      const distancia = direccion.length();

      if (distancia > 0.01) {
        direccion.normalize();

        const movX = direccion.x * enemigoConfig.velocidad * delta;
        const movZ = direccion.z * enemigoConfig.velocidad * delta;

        const posicionAnterior = {
          x: en.mesh.position.x,
          z: en.mesh.position.z,
        };

        en.mesh.position.x += movX;
        en.mesh.position.z += movZ;

        // Si chocó con un obstáculo, intentamos rodearlo por un costado

        if (estaChocandoObstaculo(en.mesh.position, 0.8)) {
          en.mesh.position.x = posicionAnterior.x;
          en.mesh.position.z = posicionAnterior.z;

          const lateral = new THREE.Vector3(-direccion.z, 0, direccion.x);

          lateral.normalize();
          lateral.multiplyScalar(enemigoConfig.velocidad * delta);

          en.mesh.position.x += lateral.x;
          en.mesh.position.z += lateral.z;

          // Si tampoco pudo rodear, se queda donde estaba

          if (estaChocandoObstaculo(en.mesh.position, 0.8)) {
            en.mesh.position.x = posicionAnterior.x;
            en.mesh.position.z = posicionAnterior.z;
          }
        }

        en.mesh.rotation.y = Math.atan2(direccion.x, direccion.z);
      }

      // CONTACTO CON EL JUGADOR (pasa por el escudo si hay uno activo)

      if (distancia <= enemigoConfig.radioContacto && jugadorStats.vida > 0) {
        aplicarDanioAlJugador(enemigoConfig.danioPorSegundo * delta);

        if (jugadorStats.vida <= 0) {
          break;
        }
      }
    }
  }

  // BOLAS DE FUEGO (impacto, daño, y mostrar mejoras si ya no hay enemigos)

  actualizarFireballs(delta);

  actualizarUIBarras();
  actualizarUINivel();

  renderer.render(scene, camera);
}

animate();

// RESIZE =================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// KEYDOWN =================

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = true;
  }
});

// KEYUP =================

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key in keys) {
    keys[key] = false;
  }
});
