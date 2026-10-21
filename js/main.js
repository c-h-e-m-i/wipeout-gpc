import { cargarModelo, cargarAnimaciones } from './modelos.js';
import { crearPista, actualizarPista } from './pista.js';
import { crearJugador, actualizarJugador, pausa, jugador, posJugador } from './jugador.js';

// Variables de la escena y el reloj de simulación:
let renderer, escena, camera, stats;
let controlesCamara;
let clock = new THREE.Clock();

// Variables de cronómetro y control:
let cronometro = null;
let tiempoTranscurrido = 0;
let juegoGanado = false;
let enPantallaInicio = true;

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

  // Cargamos el cronómetro:
  cargarCronometro('textures/cronometro.svg');

  // Creamos un panel para mostrar los FPS del juego:
  stats = new Stats();
  stats.showPanel(0);
  document.getElementById('container').appendChild(stats.domElement);

  // Creamos también un panel con los controles:
  crearPanelControles();

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

  // Definimos un listener para mostrar la pantalla de victoria:
  window.addEventListener('juego-ganado', () => {
    juegoGanado = true;
    mostrarPantallaVictoria();
  });

  // También definimos listeners para saber cuándo reiniciar el cronómetro
  // (y ocultar la pantalla de victoria):
  window.addEventListener('reiniciar-cronometro', () => {
    tiempoTranscurrido = 0;
    juegoGanado = false;
    if (cronometro) cronometro.textContent = '00:00.0';
    const panelVictoria = document.getElementById('panel-victoria');
    if (panelVictoria) panelVictoria.style.display = 'none';
  });

  // Mostramos la pantalla de inicio:
  mostrarPantallaInicio();

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

async function cargarCronometro(rutaSVG) {
  const estilo = document.createElement('style');
  estilo.innerHTML = `
    @font-face {
      font-family: 'Eurostile';
      src: url('fonts/eurostile_bd.ttf') format('truetype');
      font-weight: normal;
    }
    #cronometro {
      position: fixed;
      bottom: 15px;
      left: 25px;
      width: 320px;
      z-index: 1000;
      pointer-events: none;
      user-select: none;
    }
    #cronometro svg {
      width: 100%;
      height: auto;
      display: block;
    }
  `;
  document.head.appendChild(estilo);

  // Creamos el contenedor en el cuerpo del documento:
  const contenedor = document.createElement('div');
  contenedor.id = 'cronometro';
  document.body.appendChild(contenedor);

  // Cargamos el SVG externo e inyectamos su contenido:
  try {
    const respuesta = await fetch(rutaSVG);
    const svgTexto = await respuesta.text();
    contenedor.innerHTML = svgTexto;

    // Guardamos la referencia a la etiqueta del texto que contendrá el tiempo:
    cronometro = document.getElementById('texto-cronometro');
  } catch (error) {
    console.error('Error al cargar el cronómetro:', error);
  }
}

function mostrarPantallaVictoria() {
  let panel = document.getElementById('panel-victoria');

  if (!panel) {
    const estiloVictoria = document.createElement('style');
    estiloVictoria.innerHTML = `
      #panel-victoria {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(4, 15, 28, 0.82);
        backdrop-filter: blur(6px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        user-select: none;
        font-family: 'Eurostile', 'Arial Black', sans-serif;
      }
      .caja-victoria {
        background: linear-gradient(180deg, #16365c 0%, #081626 100%);
        border: 2px solid #00ffff;
        border-radius: 14px;
        padding: 40px 60px;
        text-align: center;
        box-shadow: 0 0 35px rgba(0, 255, 255, 0.45);
      }
      .caja-victoria h1 {
        color: #00ffff;
        font-size: 46px;
        margin: 0 0 10px 0;
        letter-spacing: 3px;
        text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
      }
      .caja-victoria p {
        color: #dce5ee;
        font-size: 18px;
        margin: 8px 0;
      }
      .tiempo-final {
        font-size: 52px;
        color: #ffffff;
        margin: 20px 0;
        letter-spacing: 4px;
        text-shadow: 2px 2px 4px #000000;
      }
      .btn-reiniciar {
        margin-top: 15px;
        padding: 12px 28px;
        background: #00aaff;
        border: none;
        border-radius: 6px;
        color: #ffffff;
        font-family: inherit;
        font-size: 16px;
        font-weight: bold;
        letter-spacing: 1px;
        cursor: pointer;
        transition: transform 0.15s, background 0.15s;
      }
      .btn-reiniciar:hover {
        background: #00d4ff;
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(estiloVictoria);

    panel = document.createElement('div');
    panel.id = 'panel-victoria';
    document.body.appendChild(panel);
  }

  const minutos = Math.floor(tiempoTranscurrido / 60).toString().padStart(2, '0');
  const segundos = Math.floor(tiempoTranscurrido % 60).toString().padStart(2, '0');
  const decimas = Math.floor((tiempoTranscurrido % 1) * 10);
  const tiempoFinalStr = `${minutos}:${segundos}.${decimas}`;

  panel.innerHTML = `
    <div class="caja-victoria">
      <h1>¡ENHORABUENA!</h1>
      <p>Has alcanzado la meta en:</p>
      <div class="tiempo-final">${tiempoFinalStr}</div>
      <button class="btn-reiniciar" onclick="window.dispatchEvent(new CustomEvent('reiniciar-cronometro')); document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyR'}));">VOLVER A JUGAR</button>
      <p style="font-size: 13px; color: #7b93a8; margin-top: 15px;">o pulsa la tecla [R] para reiniciar</p>
    </div>
  `;

  panel.style.display = 'flex';
}

function mostrarPantallaInicio() {
  // Definimos el estilo de la pantalla de inicio:
  const estiloInicio = document.createElement('style');
  estiloInicio.innerHTML = `
    #panel-inicio {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, #0d2454 0%, #040f1c 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 20000; /* Por encima de todo */
      user-select: none;
      font-family: 'Eurostile', 'Arial Black', sans-serif;
    }
    
    #logo-wipeout {
      max-width: 80%;
      height: auto;
      filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.8));
      margin-bottom: 50px;
      transform: scale(0.9);
      animation: latidoLogo 3s ease-in-out infinite alternate;
    }

    @keyframes latidoLogo {
      from { transform: scale(0.95) translateY(0px); filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.8)); }
      to { transform: scale(1.02) translateY(-10px); filter: drop-shadow(0 20px 30px rgba(0, 255, 255, 0.4)); }
    }

    .texto-parpadeante {
      color: #ffffff;
      font-size: 22px;
      letter-spacing: 6px;
      text-transform: uppercase;
      text-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
      animation: parpadeoTexto 1.5s infinite;
    }

    @keyframes parpadeoTexto {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(estiloInicio);

  // Creamos el contenedor de la pantalla:
  const panel = document.createElement('div');
  panel.id = 'panel-inicio';

  // Insertamos el logo y el texto:
  panel.innerHTML = `
    <img id="logo-wipeout" src="textures/logo_wipeout.png" alt="Wipeout">
    <div class="texto-parpadeante">Pulsa cualquier tecla para empezar</div>
  `;
  document.body.appendChild(panel);

  // Arrancamos el juego al pulsar cualquier tecla:
  const iniciarJuego = (evento) => {
    // Retiramos el listener para que no se vuelva a ejecutar al pulsar más teclas:
    document.removeEventListener('keydown', iniciarJuego);

    // Ocultamos el fondo opaco con una transición suave:
    panel.style.transition = "opacity 0.5s ease";
    panel.style.opacity = "0";

    setTimeout(() => {
      panel.style.display = 'none';
      enPantallaInicio = false;

      // Reiniciamos el reloj para que no cuente el tiempo que estuvimos en el menú:
      window.dispatchEvent(new CustomEvent('reiniciar-cronometro'));
      clock.start();
    }, 500);
  };

  // Escuchamos la primera tecla que pulse el jugador:
  document.addEventListener('keydown', iniciarJuego);
}

function updateAspectRatio() {
  // Ajustamos el tamaño del renderer y la matriz de proyección de la cámara:
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update() {
  var delta = Math.min(clock.getDelta(), 0.05);

  if (!enPantallaInicio && !pausa() && !juegoGanado) {
    // Actualizamos los obstáculos de la pista:
    actualizarPista(delta);

    // Actualizamos el cronómetro:
    tiempoTranscurrido += delta;
    if (cronometro) {
      const minutos = Math.floor(tiempoTranscurrido / 60).toString().padStart(2, '0');
      const segundos = Math.floor(tiempoTranscurrido % 60).toString().padStart(2, '0');
      const decimas = Math.floor((tiempoTranscurrido % 1) * 10);
      cronometro.textContent = `${minutos}:${segundos}.${decimas}`;
    }
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

function crearPanelControles() {
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
    font-family: 'Eurostile', Arial, sans-serif;
    font-size: 16px;
    z-index: 9999;
    display: none;
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
    gap: 30px;
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

  // Creamos el div del panel y lo añadimos al cuerpo:
  const panelControles = document.createElement('div');
  panelControles.id = 'panel-controles';
  panelControles.innerHTML = `
  <h2>CONTROLES</h2>
  <ul>
    <li><span>Moverse:</span> <kbd>W A S D / Flechas</kbd></li>
    <li><span>Saltar:</span> <kbd>Espacio</kbd></li>
    <li><span>Cambiar Cámara:</span> <kbd>C</kbd></li>
    <li><span>Girar Cámara:</span> <kbd>Q / E</kbd></li>
    <li><span>Restablecer Cámara:</span> <kbd>X</kbd></li>
    <li><span>Pausar Juego:</span> <kbd>P</kbd></li>
    <li><span>Reiniciar Juego:</span> <kbd>R</kbd></li>
    <li><span>Mostrar/Ocultar FPS:</span> <kbd>F</kbd></li>
    <li><span>Mostrar/Ocultar Controles:</span> <kbd>H</kbd></li>
  </ul>
`;
  document.body.appendChild(panelControles);
}
