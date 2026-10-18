import { cargarModelo, cargarAnimaciones } from './modelos.js';
import { crearPista, actualizarPista } from './pista.js';
import { crearJugador, actualizarJugador, pausa, jugador, posJugador } from './jugador.js';

// Definimos las variables globales de la escena y el reloj de simulación:
let renderer, escena, camera, stats;
let controlesCamara;
let clock = new THREE.Clock();

// Luz direccional:
let sol;
const offsetSol = new THREE.Vector3(-25, 60, 35);

init();
loadScene();
render();

function init() {
  // Definimos nuestro renderer con recorte local habilitado:
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x87ceeb));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Añadimos el lienzo al contenedor principal del documento:
  document.getElementById('container').appendChild(renderer.domElement);

  // Creamos la escena:
  escena = new THREE.Scene();
  window.escena = escena;

  // Configuramos la cámara perspectiva ampliando el plano lejano para cubrir la pista:
  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);
  camera.position.set(50, 35, 65);

  // Inicializamos los controles orbitales apuntando al centro del recorrido:
  controlesCamara = new THREE.OrbitControls(camera, renderer.domElement);
  controlesCamara.target.set(50, 2, -2.5);
  controlesCamara.update();

  // Creamos un panel para mostrar los FPS del juego:
  stats = new Stats();
  stats.showPanel(0);
  document.getElementById('container').appendChild(stats.domElement);

  // Creamos también un panel con los controles:
  crearPanel();

  // Definimos listeners para ocultar o mostrar nuestros paneles de información:
  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF' && !event.repeat) {
      if (stats.dom.style.display === 'none') {
        stats.dom.style.display = 'block';
      } else {
        stats.dom.style.display = 'none';
      }
    }

    if (event.code === 'KeyH' && !event.repeat) {
      const panel = document.getElementById('panel-controles');
      if (panel) {
        panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
      }
    }
  });

  // Actualizamos la relación de aspecto al redimensionar la ventana:
  window.addEventListener('resize', updateAspectRatio);
}

async function loadScene() {
  // Creamos un cubemap:
  const cubeTextureLoader = new THREE.CubeTextureLoader();
  let cubemap = cubeTextureLoader.load([
    'textures/cubemap/02_left.jpg',
    'textures/cubemap/04_right.jpg',
    'textures/cubemap/01_up.jpg',
    'textures/cubemap/06_down.jpg',
    'textures/cubemap/05_front.jpg',
    'textures/cubemap/03_back.jpg'
  ],
    function (texture) {
      console.log('Cubemap cargado correctamente.');

      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      escena.background = texture;
    },
    undefined,
    function (error) {
      console.error('Error al cargar el cubemap', error);
    }
  );

  // Luz ambiental:
  const luzHemisferica = new THREE.HemisphereLight(0xffffff, 0x8b8b8b, 0.6);
  escena.add(luzHemisferica);

  // Luz direccional:
  sol = new THREE.DirectionalLight(0xffffff, 0.9);
  escena.add(sol);
  escena.add(sol.target);

  // Habilitamos sombras:
  sol.castShadow = true;
  sol.shadow.mapSize.width = 2048;
  sol.shadow.mapSize.height = 2048;

  // Reducimos la caja a lo que haya alrededor del jugador:
  const alcance = 200;
  sol.shadow.camera.left = -alcance;
  sol.shadow.camera.right = alcance;
  sol.shadow.camera.top = alcance;
  sol.shadow.camera.bottom = -alcance;

  sol.shadow.camera.near = 10;
  sol.shadow.camera.far = 350;

  sol.shadow.camera.updateProjectionMatrix();

  // Ayuda visual para verificar que encierra toda la pista:
  /*
  const shadowHelper = new THREE.CameraHelper(sol.shadow.camera);
  escena.add(shadowHelper);
  */

  // Cargamos los modelos 3D de manera asíncrona antes de construir la pista:
  try {
    await Promise.all([
      cargarModelo('andamio', 'models/scaffold_arreglado.glb'),
      cargarModelo('estructura', 'models/truss_estructura_lp.glb'),
      cargarModelo('brazalete', 'models/truss_bracelet_lp.glb'),
      cargarModelo('guante', 'models/guante.glb'),
      cargarAnimaciones()
    ]);

    console.log('Todos los modelos 3D se han precargado con éxito.');
  } catch (error) {
    console.error('Hubo un problema cargando los modelos 3D:', error);
  }

  // Creamos la pista de obstáculos y la añadimos a la escena:
  const circuito = crearPista();
  escena.add(circuito);

  // Instanciamos al jugador sobre el circuito y vinculamos la cámara:
  crearJugador(escena, circuito, controlesCamara);
}

function updateAspectRatio() {
  // Ajustamos el tamaño del renderer y la matriz de proyección de la cámara:
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update() {
  var delta = Math.min(clock.getDelta(), 0.05);

  if (!pausa()) {
    actualizarPista(delta);
  }

  actualizarJugador(delta, camera, controlesCamara);

  // Hacemos que la luz direccional acompañe al jugador:
  if (jugador !== null) {
    sol.target.position.copy(posJugador);
    sol.position.copy(posJugador).add(offsetSol);
  }

  // Actualizamos las estadísticas:
  stats.update();
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(escena, camera);
}

function crearPanel() {
  // Creamos y añadimos los estilos del panel de controles de forma dinámica:
  const estiloPanel = document.createElement('style');
  estiloPanel.innerHTML = `
  #panel-controles {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: #ffffff;
    padding: 25px 35px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 9999;
    display: none; /* Oculto por defecto */
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
    border: 1px solid #00ffff;
  }
  #panel-controles h2 {
    margin-top: 0;
    color: #00ffff;
    text-align: center;
    font-size: 20px;
  }
  #panel-controles ul {
    list-style-type: none;
    padding: 0;
    margin: 15px 0 0 0;
  }
  #panel-controles li {
    margin: 8px 0;
    display: flex;
    justify-content: space-between;
  }
  #panel-controles kbd {
    background: #333;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #555;
    color: #00ffff;
    font-weight: bold;
  }
`;
  document.head.appendChild(estiloPanel);

  // Creamos el div del panel y lo añadimos al body:
  const panelControles = document.createElement('div');
  panelControles.id = 'panel-controles';
  panelControles.innerHTML = `
  <h2>CONTROLES</h2>
  <ul>
    <li><span>Moverse:</span> <kbd>W A S D / Flechas</kbd></li>
    <li><span>Saltar:</span> <kbd>Espacio</kbd></li>
    <li><span>Cambiar Cámara:</span> <kbd>C</kbd></li>
    <li><span>Restablecer Cámara:</span> <kbd>X</kbd></li>
    <li><span>Pausar Juego:</span> <kbd>P</kbd></li>
    <li><span>Mostrar/Ocultar FPS:</span> <kbd>F</kbd></li>
    <li><span>Mostrar/Ocultar Controles:</span> <kbd>H</kbd></li>
  </ul>
`;
  document.body.appendChild(panelControles);
}