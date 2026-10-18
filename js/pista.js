import { cubo, rampa, cunya, cilindro, esfera, donut, escalera, piscina } from './geom.js';
import { medirModelo, colocarModelo } from './modelos.js';

const
    rodillos = [],
    circulos = [],
    guantes = [],
    esferas = [];

let
    tiempoCirculos = 0;

// Materiales de colores:
let matAzul, matGris, matGrisOffset, matRojo, matRojoOscuro, matCesped;
const matCeleste = new THREE.MeshPhongMaterial({ color: 0x609bb6 });
const matOscuro = new THREE.MeshPhongMaterial({ color: 0x0055aa });
const matGrisOscuro = new THREE.MeshPhongMaterial({ color: 0x333333 });
const matMorado = new THREE.MeshPhongMaterial({ color: 0x4b3b8c });
const matColision = new THREE.MeshBasicMaterial({ visible: false });
const matCirculoOff = new THREE.MeshBasicMaterial({ color: 0 });
const matCirculoOn = new THREE.MeshBasicMaterial({ color: 0xd15322 });
const matAgua = new THREE.MeshPhongMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.55,
    shininess: 90,
    depthWrite: false
});
const matLodo = new THREE.MeshPhongMaterial({
    color: 0x4a2e18,
    transparent: true,
    opacity: 0.9,
    specular: 0x2b1d0c,
    shininess: 30,
    roughness: 0.8
});
const matEspuma = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    specular: 0x8cfffb,
    shininess: 30,
    roughness: 0.8
});

export function crearPista() {
    const escena = new THREE.Group();

    // Carga de texturas:
    const loader = new THREE.TextureLoader();

    const colchonetaNormal = loader.load('textures/colchoneta_normal.jpg');
    colchonetaNormal.wrapS = THREE.RepeatWrapping;
    colchonetaNormal.wrapT = THREE.RepeatWrapping;
    colchonetaNormal.repeat.set(1, 1);

    const colchonetaRough = loader.load('textures/colchoneta_rough.jpg');
    colchonetaRough.wrapS = THREE.RepeatWrapping;
    colchonetaRough.wrapT = THREE.RepeatWrapping;
    colchonetaRough.repeat.set(1, 1);

    const obstaculoNormal = loader.load('textures/obstaculo_normal.jpg');
    obstaculoNormal.wrapS = THREE.RepeatWrapping;
    obstaculoNormal.wrapT = THREE.RepeatWrapping;
    obstaculoNormal.repeat.set(8, 8);

    const obstaculoRough = loader.load('textures/obstaculo_rough.jpg');
    obstaculoRough.wrapS = THREE.RepeatWrapping;
    obstaculoRough.wrapT = THREE.RepeatWrapping;
    obstaculoRough.repeat.set(8, 8);

    const cesped = loader.load('textures/cesped.jpg');
    cesped.wrapS = THREE.MirroredRepeatWrapping;
    cesped.wrapT = THREE.MirroredRepeatWrapping;

    matAzul = new THREE.MeshStandardMaterial({
        color: 0x1e90ff,
        roughnessMap: colchonetaRough,
        roughness: 0.65,
        metalness: 0.05,
        normalMap: colchonetaNormal,
        normalScale: new THREE.Vector2(0.3, 0.3)
    });
    matGris = new THREE.MeshStandardMaterial({
        color: 0x9fb1b4,
        roughnessMap: colchonetaRough,
        roughness: 0.65,
        metalness: 0.05,
        normalMap: colchonetaNormal,
        normalScale: new THREE.Vector2(0.3, 0.3),
    });
    // Creamos una versión con offset para evitar solapamientos:
    matGrisOffset = new THREE.MeshStandardMaterial({
        color: 0x9fb1b4,
        roughnessMap: colchonetaRough,
        roughness: 0.65,
        metalness: 0.05,
        normalMap: colchonetaNormal,
        normalScale: new THREE.Vector2(0.3, 0.3),
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });
    matRojo = new THREE.MeshStandardMaterial({
        color: 0xe61919,
        roughnessMap: obstaculoRough,
        roughness: 0.65,
        metalness: 0.05,
        normalMap: obstaculoNormal,
        normalScale: new THREE.Vector2(1, 1)
    });
    matRojoOscuro = new THREE.MeshStandardMaterial({
        color: 0xa50c12,
        roughnessMap: obstaculoRough,
        roughness: 0.65,
        metalness: 0.05,
        normalMap: obstaculoNormal,
        normalScale: new THREE.Vector2(1, 1)
    });
    matCesped = new THREE.MeshStandardMaterial({
        map: cesped
    });

    // Altura y grosor de las paredes de las piscinas:
    const alturaPiscina = 12, grosorParedPiscina = 0.5, profundidadPiscina = 0.75, grosorSalida = 1;

    // =========================================================================
    // SUELO BASE:
    // =========================================================================
    const dimBase = 2000, metrosCesped = 30;
    cesped.repeat.set(dimBase / metrosCesped, dimBase / metrosCesped);
    const geomBase = new THREE.PlaneGeometry(dimBase, dimBase);
    const sueloBase = new THREE.Mesh(geomBase, matCesped);
    sueloBase.rotation.x = -Math.PI / 2;
    sueloBase.position.set(0, -alturaPiscina - grosorSalida * 2, 0);
    escena.add(sueloBase)

    // =========================================================================
    // RAMPA DE SALIDA:
    // =========================================================================
    const largoRampa = 30, altoRampa = 12;
    const largoSalida = 12, anchoSalida = 8, ySalida = altoRampa - grosorSalida;
    const anchoPasarela = 5

    // Plataforma inicio de rampa:
    escena.add(cubo(largoSalida + 1, altoRampa + grosorSalida + alturaPiscina, anchoSalida * 2, -1, ySalida, anchoSalida / 2, matGris));

    // Rampa:
    escena.add(cunya(largoRampa, altoRampa - grosorSalida, anchoSalida * 2,
        largoSalida, ySalida, anchoSalida / 2,
        'tras', matAzul));

    escena.add(cubo(largoRampa, grosorSalida + alturaPiscina, anchoSalida * 2,
        largoSalida, ySalida - altoRampa + grosorSalida, anchoSalida / 2, matAzul))

    // Plataforma final de rampa:
    const finRampaX = largoSalida + largoRampa;
    const platFinRampa = cubo(largoSalida, grosorSalida + alturaPiscina, anchoSalida * 2, finRampaX, 0, anchoSalida / 2, matGris);
    platFinRampa.castShadow = false;
    escena.add(platFinRampa);

    // Escaleras anexas a la plataforma:

    // Escalera izquierda:
    escena.add(escalera(largoSalida, alturaPiscina, alturaPiscina,
        finRampaX, -grosorSalida, -3 / 2 * anchoSalida, alturaPiscina, 'izq', matGrisOffset));

    // Escalera derecha:
    escena.add(escalera(largoSalida, alturaPiscina, alturaPiscina,
        finRampaX, -grosorSalida, anchoSalida / 2, alturaPiscina, 'der', matGrisOffset));

    // Añadimos cuñas invisibles que actúen como colisiones de la escaleras:
    escena.add(cunya(largoSalida, grosorSalida + alturaPiscina, alturaPiscina + 1,
        finRampaX, 0, -3 / 2 * anchoSalida, 'izq', matColision));

    escena.add(cunya(largoSalida, grosorSalida + alturaPiscina, alturaPiscina + 1,
        finRampaX, 0, anchoSalida / 2, 'der', matColision));

    // =========================================================================
    // OBSTÁCULO #1: RODILLOS GIRATORIOS
    // =========================================================================
    const largoPasarela = 200, huecoPasarela = 8, inicioPasarelaX = finRampaX + largoSalida + huecoPasarela;

    escena.add(cubo(largoPasarela, grosorSalida, anchoPasarela, inicioPasarelaX, 0, -(anchoSalida - anchoPasarela) / 2, matAzul));

    // Pilares bajo la pasarela:
    const sepPilares = 4; // Separación entre pilares 
    const mod = largoPasarela % sepPilares, inicioPilares = inicioPasarelaX + mod / 2 + (mod < 2 ? sepPilares / 2 : 0);
    for (let x = inicioPilares; x < inicioPasarelaX + largoPasarela; x += sepPilares)
        escena.add(cilindro(0.25, alturaPiscina, x, -alturaPiscina - grosorSalida, -anchoSalida / 2, matGris));

    // Rodillos giratorios:
    const numRodillos = 4, paddingRodillos = largoPasarela / 5, radioRodillo = 0.75, alturaRodillo = 20;
    let lado = 1;
    for (let i = 0; i < numRodillos; i++) {
        // Rodillo:
        const
            rodilloX = inicioPasarelaX + paddingRodillos + (largoPasarela - paddingRodillos * 2) * i / (numRodillos - 1),
            rodilloY = 3,
            // rodilloZ = lado > 0 ? -anchoSalida : 0,
            baseZ = lado * alturaRodillo / 2 + (lado > 0 ? -anchoSalida : 0);

        // Cilindro base:
        escena.add(cilindro(radioRodillo / 2, alturaPiscina + grosorSalida + rodilloY, rodilloX, -alturaPiscina - grosorSalida, baseZ, matGris));

        // Creamos un grupo que actúe como pivote para cada cilindro:
        const pivote = new THREE.Group();
        pivote.position.set(rodilloX, rodilloY, baseZ);

        // Colocamos el centro del rodillo sobre el pivote:
        const rodillo = cilindro(radioRodillo, alturaRodillo, 0, 0, -alturaRodillo / 2, matRojo);
        rodillo.rotation.x = Math.PI / 2;
        pivote.add(rodillo);

        // Guardamos el sentido de giro del rodillo:
        pivote.userData.sentido = lado;

        // También guardamos las propiedades del rodillo:
        rodillo.userData.esRodillo = true;
        rodillo.userData.pivote = pivote;

        escena.add(pivote);
        rodillos.push(pivote);

        lado = -lado;
    }

    // Plataforma final:
    const largoFinalRodillos = largoSalida * 2, finalRodillosX = inicioPasarelaX + largoPasarela + huecoPasarela;

    escena.add(cubo(largoFinalRodillos, grosorSalida + alturaPiscina, anchoSalida, finalRodillosX, 0, 0, matGris));

    // PISCINA:
    const largoPiscinaRodillos = finalRodillosX - finRampaX + largoFinalRodillos, anchoPiscinaRodillos = 100;
    const piscinaRodillos = piscina(largoPiscinaRodillos, alturaPiscina, anchoPiscinaRodillos, grosorParedPiscina,
        finRampaX, -grosorSalida, (anchoPiscinaRodillos - anchoSalida) / 2,
        matGrisOffset, matCeleste, matAgua, profundidadPiscina
    )

    escena.add(piscinaRodillos)

    // ========================================================================
    // OBSTÁCULO #2: MURO DE PUÑOS
    // ========================================================================

    // Plataforma inicial:
    const largoEntradaMuro = 14, anchoEntradaMuro = anchoSalida * 5,
        entradaMuroX = finalRodillosX + largoFinalRodillos, entradaMuroZ = (anchoEntradaMuro - anchoSalida) / 2;

    escena.add(cubo(largoEntradaMuro, grosorSalida, anchoEntradaMuro, entradaMuroX, 0, entradaMuroZ, matAzul));

    // Pasarela del muro:
    const
        largoMuro = 40,
        altoMuro = 7.8,
        anchoMuro = 5,
        muroX = entradaMuroX + largoEntradaMuro,
        muroZ = -(anchoEntradaMuro + anchoSalida) / 2 + anchoMuro;

    const pasarelaMuro = cubo(largoMuro, grosorSalida, anchoPasarela, entradaMuroX + largoEntradaMuro,
        0, muroZ + anchoPasarela, matAzul);
    pasarelaMuro.userData.esPasarelaMuro = true;
    pasarelaMuro.userData.muroZ = muroZ;
    escena.add(pasarelaMuro);

    // Muro de puños:
    escena.add(cubo(largoMuro, altoMuro + grosorSalida, anchoMuro,
        muroX, altoMuro, muroZ, matAzul));

    // Dividimos el muro en cuadrados en cuyos centros colocaremos los guantes de boxeo:
    const
        tamCuadro = altoMuro / 3,
        cuadrosPorFila = Math.floor(largoMuro / tamCuadro),
        cuadrosPorColumna = Math.floor(altoMuro / tamCuadro),
        totalCuadros = cuadrosPorFila * cuadrosPorColumna,
        numGuantes = totalCuadros,
        radioGuantes = tamCuadro / 4;

    // Definimos una pequeña función para barajar la lista de posibles posiciones:
    function barajar(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Intercambio de elementos
        }
        return array;
    }

    // Creamos un array que contenga los valores de 0 a 'totalCuadros':
    let array = []
    for (let i = 0; i < totalCuadros; i++) array.push(i);

    // Lo barajamos y obtenemos sus primeros 'numGuantes' elementos:
    array = barajar(array);
    for (let i = 0; i < numGuantes; i++) {
        const
            fila = Math.floor(array[i] / cuadrosPorFila),
            col = array[i] % cuadrosPorFila,
            centroX = tamCuadro * (col + 0.5),
            centroY = tamCuadro * (fila + 0.5);

        // Dibujamos el círculo en sí:
        const geomCirculo = new THREE.CircleGeometry(radioGuantes, 32);
        const circulo = new THREE.Mesh(geomCirculo, matCirculoOff);
        circulo.position.set(muroX + centroX, centroY, muroZ + 0.05);
        circulos.push(circulo);
        escena.add(circulo);

        // Colocamos un guante en cada círculo y lo ocultamos:
        const guante = colocarModelo('guante', 'x', radioGuantes * 2, 'cen_cen',
            muroX + centroX, centroY, muroZ - radioGuantes - 0.1,
            0, 0, 0, matRojoOscuro);

        guante.visible = false;

        guante.userData = {
            activado: false,
            esperando: false,
            saliendo: true,
            iniZ: muroZ - radioGuantes - 0.1,
            desp: 0,
            recorrido: radioGuantes * 2 + 0.1,
            circulo: circulo
        };

        // Marcamos las mallas hijas del guante para las colisiones:
        guante.traverse(function (child) {
            if (child.isMesh) {
                child.userData.esGuante = true;
                child.userData.guanteRaiz = guante;
            }
        });

        // guante.visible = false;

        guantes.push(guante);

        escena.add(guante);
    }

    // Plataforma final:
    escena.add(cubo(largoEntradaMuro, grosorSalida, anchoEntradaMuro,
        entradaMuroX + largoEntradaMuro + largoMuro, 0, entradaMuroZ, matAzul));

    // Escalera:
    const anchoEscaleraMuro = 7;
    escena.add(escalera(alturaPiscina, alturaPiscina, anchoEscaleraMuro,
        entradaMuroX + largoEntradaMuro, -grosorSalida, entradaMuroZ,
        alturaPiscina, 'tras', matGrisOffset));

    // Colisión de la escalera:
    escena.add(cunya(alturaPiscina + 1, alturaPiscina + grosorSalida, anchoEscaleraMuro,
        entradaMuroX + largoEntradaMuro, 0, entradaMuroZ,
        'tras', matColision));

    // Piscina de lodo:
    const piscinaLodo = piscina(largoMuro, alturaPiscina, anchoEntradaMuro - anchoMuro - anchoPasarela, grosorParedPiscina,
        entradaMuroX + largoEntradaMuro, -grosorSalida, entradaMuroZ,
        matGrisOffset, matGris, matLodo, profundidadPiscina);

    escena.add(piscinaLodo);

    // ========================================================================
    // OBSTÁCULO #3: ESFERAS TRAICIONERAS
    // ========================================================================

    // RAMPA INICIAL:
    const entradaEsferasX = entradaMuroX + largoEntradaMuro * 2 + largoMuro,
        anchoEntradaRampaEsferas = (anchoEntradaMuro - anchoSalida) / 2 + anchoSalida;

    // Plataforma inicio de rampa:
    escena.add(cubo(largoSalida, grosorSalida, anchoEntradaRampaEsferas,
        entradaEsferasX, 0, entradaMuroZ, matGris));

    // Escalera para volver a la plataforma de inicio:
    escena.add(escalera(alturaPiscina, alturaPiscina, anchoEscaleraMuro,
        entradaEsferasX + largoSalida, -grosorSalida, entradaMuroZ,
        alturaPiscina, 'tras', matGrisOffset));

    // Colisión de la escalera:
    escena.add(cunya(alturaPiscina + 1, alturaPiscina + grosorSalida, anchoEscaleraMuro,
        entradaEsferasX + largoSalida, 0, entradaMuroZ,
        'tras', matColision));

    // Rampa:
    /*
    escena.add(rampa(largoRampa, altoRampa, anchoSalida,
        entradaEsferasX + largoSalida, 0, 0, grosorSalida / altoRampa, matAzul, true));
    */
    const cunyaEsferas = new THREE.Group();
    cunyaEsferas.add(cunya(largoRampa, altoRampa - grosorSalida, anchoSalida,
        entradaEsferasX + largoSalida, ySalida, 0, 'del', matAzul));

    cunyaEsferas.add(cubo(largoRampa, grosorSalida + alturaPiscina, anchoSalida,
        entradaEsferasX + largoSalida, 0, 0, matAzul));

    escena.add(cunyaEsferas);

    // Plataforma final de rampa:
    escena.add(cubo(largoSalida, altoRampa + alturaPiscina, anchoSalida,
        entradaEsferasX + largoSalida + largoRampa, ySalida, 0, matGris));

    // Esferas:
    const separacionEsferas = 8,
        radioEsferas = 8,
        diamEsferas = radioEsferas * 2,
        numEsferas = 4,
        inicioEsferasX = entradaEsferasX + largoSalida * 2 + largoRampa - radioEsferas / 2,
        esferasY = ySalida - grosorSalida - diamEsferas + radioEsferas / 2,
        superficiePiscinaY = -grosorSalida - alturaPiscina * (1 - profundidadPiscina);

    let esferasZ = 8;

    for (let i = 1; i <= numEsferas; i++) {
        var esferaX = inicioEsferasX + (separacionEsferas + diamEsferas) * i;
        const mallaEsfera = esfera(radioEsferas, esferaX, esferasY, -anchoSalida / 2 + esferasZ, matRojo);
        mallaEsfera.userData.esEsfera = true;
        mallaEsfera.userData.radioOrig = radioEsferas;
        mallaEsfera.userData.aplastamiento = 0;
        esferas.push(mallaEsfera);
        escena.add(mallaEsfera);

        // Colocamos modelos de andamio en forma de brazalete debajo de las esferas:
        const estructura = colocarModelo('brazalete', 'x', radioEsferas * 1.5,
            'inf_cen', esferaX, superficiePiscinaY, -anchoSalida / 2 + esferasZ);
        escena.add(estructura);

        // Así como cilindros de apoyo:
        escena.add(cilindro(radioEsferas / 2, alturaPiscina * profundidadPiscina + esferasY - superficiePiscinaY,
            esferaX, -grosorSalida - alturaPiscina, -anchoSalida / 2 + esferasZ, matAzul));

        esferasZ *= -1;
    }

    // Plataforma final de esfera:
    const platFinalEsferasX = esferaX + diamEsferas + separacionEsferas - radioEsferas / 2;
    escena.add(cubo(largoFinalRodillos, altoRampa + alturaPiscina, anchoSalida,
        platFinalEsferasX, ySalida, 0, matGris));

    // Andamios debajo de la plataforma: 
    /*
    escena.add(colocarModelo('andamio', 'y', altoRampa - grosorSalida + alturaPiscina,
        'sup_izq', platFinalEsferasX, ySalida - grosorSalida, 0));

    escena.add(colocarModelo('andamio', 'y', altoRampa - grosorSalida + alturaPiscina,
        'sup_izq', platFinalEsferasX, ySalida - grosorSalida, -anchoSalida / 2));
    */

    // Piscina esferas:
    const piscinaEsferas = piscina(platFinalEsferasX - (entradaEsferasX + largoSalida) + largoFinalRodillos, alturaPiscina, anchoPiscinaRodillos, grosorParedPiscina,
        entradaEsferasX + largoSalida, -grosorSalida, (anchoPiscinaRodillos - anchoSalida) / 2,
        matGrisOffset, matCeleste, matAgua, profundidadPiscina
    );

    escena.add(piscinaEsferas);

    // ========================================================================
    // OBSTÁCULO #4: LIANA
    // ========================================================================

    // Plataforma inicio:
    const entradaLianaX = platFinalEsferasX + largoFinalRodillos, largoEntradaLiana = largoSalida * 4,
        alturaEntradaLiana = altoRampa + alturaPiscina + grosorSalida / 2;
    escena.add(cubo(largoEntradaLiana, alturaEntradaLiana, anchoSalida * 3,
        entradaLianaX, ySalida, anchoSalida, matGris));

    /*
    // Escalera sobre la plataforma de inicio:
    const alturaEscaleraLiana = 20, plataformaLianaX = entradaLianaX + largoEntradaLiana;
    escena.add(escalera(largoEntradaLiana / 2, alturaEscaleraLiana, anchoEntradaMuro,
        plataformaLianaX, ySalida + alturaEscaleraLiana, entradaMuroZ - anchoEntradaMuro,
        alturaEscaleraLiana, 'del', matGris)
    );
    */

    // Rampa sobre la plataforma de inicio:
    const alturaPrimeraRampaLiana = 20, primeraRampaLianaX = entradaLianaX + largoEntradaLiana;
    const primeraRampaLiana = new THREE.Group();

    primeraRampaLiana.add(cunya(largoRampa, alturaPrimeraRampaLiana - grosorSalida, anchoSalida * 3,
        primeraRampaLianaX, ySalida + alturaPrimeraRampaLiana - grosorSalida, anchoSalida, 'del', matAzul));

    primeraRampaLiana.add(cubo(largoRampa, alturaPiscina + altoRampa, anchoSalida * 3,
        primeraRampaLianaX, ySalida, anchoSalida, matAzul));

    escena.add(primeraRampaLiana)

    // Plataforma tras la rampa:
    const largoPlataformaFinalLiana = largoSalida * 1.2,
        altoPlataformaFinalLiana = alturaPrimeraRampaLiana - grosorSalida + altoRampa + alturaPiscina;
    escena.add(cubo(largoPlataformaFinalLiana, altoPlataformaFinalLiana, anchoSalida * 3,
        primeraRampaLianaX + largoRampa, ySalida + alturaPrimeraRampaLiana - grosorSalida, anchoSalida, matGris));

    // Segunda rampa:
    const segundaprimeraRampaLianaX = primeraRampaLianaX + largoRampa + largoPlataformaFinalLiana,
        alturaSegundaRampaLiana = alturaPrimeraRampaLiana / 2;

    /*
    escena.add(rampa(largoRampa, alturaSegundaRampaLiana, anchoSalida * 3,
        segundaprimeraRampaLianaX, ySalida + alturaPrimeraRampaLiana - grosorSalida, anchoSalida,
        grosorSalida / alturaSegundaRampaLiana, matAzul, false));
    */

    const segundaRampaLiana = new THREE.Group();

    segundaRampaLiana.add(cunya(largoRampa, alturaSegundaRampaLiana, anchoSalida * 3,
        segundaprimeraRampaLianaX, ySalida + alturaPrimeraRampaLiana - grosorSalida, anchoSalida, 'tras', matAzul));

    segundaRampaLiana.add(cubo(largoRampa, altoPlataformaFinalLiana - alturaSegundaRampaLiana, anchoSalida * 3,
        segundaprimeraRampaLianaX, ySalida + alturaPrimeraRampaLiana - alturaSegundaRampaLiana - grosorSalida, anchoSalida, matAzul));

    escena.add(segundaRampaLiana);

    const finalSegundaprimeraRampaLianaX = segundaprimeraRampaLianaX + largoRampa;

    // DONUTS CON ESPUMA:
    const separacionDonut = 90, radioDonut = 10, radioTubo = 3, numDonuts = 4,
        donutX = finalSegundaprimeraRampaLianaX + separacionDonut + radioDonut;

    for (let i = 0; i < numDonuts; i++)
        escena.add(donut(radioDonut, radioTubo, donutX, -grosorSalida - alturaPiscina + radioTubo * i, -anchoSalida / 2, matAzul));

    // La espuma en sí:
    const espuma = cilindro(radioDonut - radioTubo, radioTubo * numDonuts,
        donutX, -grosorSalida - alturaPiscina, -anchoSalida / 2, matEspuma);
    espuma.userData.liquido = true;
    escena.add(espuma);

    // Cilindro de suelo:
    escena.add(cilindro(radioDonut - radioTubo, radioTubo * 2,
        donutX, -grosorSalida - alturaPiscina, -anchoSalida / 2, matCeleste));

    // Piscina liana:
    const margenPiscinaLiana = 50,
        largoPiscinaLiana = (finalSegundaprimeraRampaLianaX - primeraRampaLianaX) + separacionDonut + radioDonut * 2 + margenPiscinaLiana,
        largoEscaleraLiana = largoEntradaLiana / 4;
    const piscinaLiana = piscina(largoPiscinaLiana + largoEscaleraLiana, alturaPiscina, anchoPiscinaRodillos, grosorParedPiscina,
        primeraRampaLianaX - largoEscaleraLiana, -grosorSalida, (anchoPiscinaRodillos - anchoSalida) / 2,
        matGrisOffset, matCeleste, matAgua, profundidadPiscina
    );

    escena.add(piscinaLiana);

    // Escalera para salir de la piscina:
    escena.add(escalera(largoEscaleraLiana, alturaEntradaLiana - grosorSalida * 2, alturaEntradaLiana - grosorSalida * 2,
        primeraRampaLianaX - largoEscaleraLiana, ySalida - grosorSalida, anchoSalida, alturaEntradaLiana - grosorSalida * 2,
        'der', matGrisOffset));

    // Colisión:
    escena.add(cunya(largoEscaleraLiana, alturaEntradaLiana - grosorSalida / 2, alturaEntradaLiana - grosorSalida / 2,
        primeraRampaLianaX - largoEscaleraLiana, ySalida, anchoSalida,
        'der', matColision));

    // Estructura que soporta la liana:
    const
        estructuraLianaY = 10,
        estructuraLianaX = finalSegundaprimeraRampaLianaX + 24;

    const estructuraLiana = colocarModelo('estructura', 'z', anchoPiscinaRodillos * 0.8,
        'inf_cen', estructuraLianaX, estructuraLianaY, -anchoSalida / 2,
        0, Math.PI / 2, 0);
    escena.add(estructuraLiana);

    // Pilares de la estructura:
    const dimEstructuraLiana = medirModelo(estructuraLiana).dim,
        escalaPilaresEstructuraLiana = 1.5;

    escena.add(cubo(dimEstructuraLiana.x * escalaPilaresEstructuraLiana,
        estructuraLianaY + grosorSalida + alturaPiscina,
        dimEstructuraLiana.x * escalaPilaresEstructuraLiana,
        estructuraLianaX - dimEstructuraLiana.x * escalaPilaresEstructuraLiana / 2,
        estructuraLianaY,
        (dimEstructuraLiana.z - anchoSalida) / 2 + dimEstructuraLiana.x * (escalaPilaresEstructuraLiana - 1) / 2,
        matGris
    ));

    escena.add(cubo(dimEstructuraLiana.x * escalaPilaresEstructuraLiana,
        estructuraLianaY + grosorSalida + alturaPiscina,
        dimEstructuraLiana.x * escalaPilaresEstructuraLiana,
        estructuraLianaX - dimEstructuraLiana.x * escalaPilaresEstructuraLiana / 2,
        estructuraLianaY,
        (-dimEstructuraLiana.z - anchoSalida) / 2 + dimEstructuraLiana.x * (escalaPilaresEstructuraLiana + 1) / 2,
        matGris
    ));

    // Cuerda de la liana:
    const
        radioLiana = 0.1,
        altoLiana = dimEstructuraLiana.y / 2;

    // Agarre de la liana:
    const
        radioAgarre = 4,
        radioTuboAgarre = 1;

    // Grupo pivote en el soporte superior para el balanceo pendular de la liana:
    const topeLianaY = estructuraLianaY + dimEstructuraLiana.y - dimEstructuraLiana.x;
    const pivoteLiana = new THREE.Group();
    pivoteLiana.position.set(estructuraLianaX, topeLianaY, -anchoSalida / 2);

    const cuerda = cilindro(radioLiana, altoLiana, 0, -altoLiana, 0, matGris);
    pivoteLiana.add(cuerda);

    const geomAgarre = new THREE.TorusGeometry(radioAgarre, radioTuboAgarre, 3, 3);
    const agarre = new THREE.Mesh(geomAgarre, matGris);
    agarre.rotation.set(0, Math.PI / 2, Math.PI / 2);
    agarre.position.set(0, -altoLiana - radioAgarre, 0);

    agarre.userData = {
        esAgarre: true,
        pivoteLiana: pivoteLiana,
        longitudPendulo: altoLiana + radioAgarre
    };

    pivoteLiana.add(agarre);
    escena.add(pivoteLiana);

    return escena;
}

function activarGuante(guante, delta) {
    const datos = guante.userData;

    // Si aún no hemos llegado al tope del recorrido, retrocedemos. Si no, avanzamos:
    const velGuante = 5 * (datos.saliendo ? 1 : -1);

    // Acotamos el desplazamiento entre 0 y el diámetro del guante:
    let despGuante = Math.max(0, Math.min(datos.recorrido, datos.desp + velGuante * delta));

    // Si llegamos al tope del recorrido, marcamos 'saliendo' a falso:
    if (despGuante >= datos.recorrido) datos.saliendo = false;

    // Actualizamos la posición del guante respecto de su posición:
    guante.position.z = datos.iniZ + despGuante;
    datos.desp = despGuante;
    guante.updateMatrixWorld(true);

    // Si ya hemos regresado, desactivamos el guante:
    if (despGuante == 0) {
        guante.visible = false;
        datos.activado = false;
        datos.circulo.material = matCirculoOff;
        datos.circulo.material.needsUpdate = true;
    }
}

/* Función para actualizar los elementos móviles de la pista: */
export function actualizarPista(delta) {
    const velRodillo = 2.5;

    // Iteramos sobre cada rodillo y lo giramos:
    for (let rodillo of rodillos) {
        if (rodillo.userData.sentido > 0) rodillo.rotation.y += delta * velRodillo;
        else rodillo.rotation.y -= delta * velRodillo;
        rodillo.updateMatrixWorld(true);
    }

    // Vamos eligiendo un círculo aleatorio para encenderse periódicamente:
    const
        numCirculos = 4,
        intervalo = 1 / numCirculos;

    // Iremos sumando deltas hasta que lleguen a 'intervalo' segundos:
    tiempoCirculos += delta;

    if (tiempoCirculos > intervalo) {
        tiempoCirculos = 0;

        // Elegimos un círculo aleatorio:
        let indiceCirculo = Math.floor(Math.random() * circulos.length);

        // Si el guante asociado al círculo no está activado, iluminamos el círculo
        // y activamos el guante tras un segundo:
        if (!guantes[indiceCirculo].userData.activado && !guantes[indiceCirculo].userData.esperando) {
            circulos[indiceCirculo].material = matCirculoOn;
            circulos[indiceCirculo].material.needsUpdate = true;
            guantes[indiceCirculo].userData.esperando = true;

            setTimeout(() => {
                guantes[indiceCirculo].visible = true;
                guantes[indiceCirculo].userData.esperando = false;
                guantes[indiceCirculo].userData.saliendo = true;
                guantes[indiceCirculo].userData.activado = true;
            }, 1000);
        }
    }

    for (let guante of guantes) {
        if (guante.userData.activado) activarGuante(guante, delta);
    }

    // Recuperamos progresivamente la forma original de las esferas aplastadas:
    for (let esf of esferas) {
        if (esf.userData.aplastamiento > 0) {
            esf.userData.aplastamiento = Math.max(0, esf.userData.aplastamiento - delta * 2.5);
            const r = esf.userData.radioOrig;
            const fY = 1 - 0.22 * esf.userData.aplastamiento;
            const fXZ = 1 + 0.11 * esf.userData.aplastamiento;
            esf.scale.set(r * fXZ, r * fY, r * fXZ);
            esf.updateMatrixWorld(true);
        }
    }
}