import { medirModelo, colocarModelo, aplicarAnimaciones, cacheAnimaciones } from './modelos.js';

/* Acciones del jugador: */
let mixer = null;
let acciones = null;
let accionActual = null;

/* Variables de estado y dimensiones del jugador: */
const largoJugador = 3;
const alturaJugador = 6.8;
const anchoJugador = 3;
const radioColision = 1.8;
const activarHitbox = false;
let cajaHitbox;

/* Posición y orientación inicial sobre la primera plataforma: */
const posicionInicial = new THREE.Vector3(5, 11, -4);
const anguloInicial = Math.PI / 2;

export let jugador = null;
export let posJugador = posicionInicial.clone();
let dirJugador = new THREE.Vector3(0, 0, 0);
let angJugador = anguloInicial;

/* Parámetros cinemáticos de movimiento, gravedad y salto: */
const velAvance = 28;
const gravedad = -75;
const impulsoSalto = 30;
let velVertical = 0;
let enSuelo = true;

/* Tiempo de gracia en segundos para saltar tras salir de un borde: */
const margenSaltoCoyote = 0.15;
let tiempoCoyote = 0;

/* Vectores y raycasters para la detección del suelo, las paredes y la cámara: */
const objetosSuelo = [];
const objectsToCheck = [];
const objetosRodillos = [];
const objetosGuantes = [];
let objetoAgarreLiana = null;
const posAgarreMundo = new THREE.Vector3();
const raycasterSuelo = new THREE.Raycaster();
const raycasterPared = new THREE.Raycaster();
const raycasterCamara = new THREE.Raycaster();
const origenRayoSuelo = new THREE.Vector3();
const direccionRayoSuelo = new THREE.Vector3(0, -1, 0);
const origenRayoPared = new THREE.Vector3();
const direccionRayoCamara = new THREE.Vector3();
const normalSuelo = new THREE.Vector3();
const normalPared = new THREE.Vector3();
const matrizNormal = new THREE.Matrix3();
const alturaRayoSuelo = 35;
const pendienteMaxima = 1.2;
const alturaMaximaSuelo = 0.5;
const margenColisionCamara = 0.5;

/* Variables para la física de los empujones de los rodillos: */
const velEmpuje = new THREE.Vector3();
let tiempoEmpuje = 0;
const duracionEmpuje = 1.5;
const fuerzaEmpujeRodillo = 75;
const fuerzaLevantamientoRodillo = 26;

/* Variables para la pasarela del muro, esferas y el péndulo de la liana: */
let enPasarelaMuro = false;
let sobreEsfera = false;
let colgadoLiana = false;
let pivoteLianaActual = null;
let longitudPenduloActual = 0;
let anguloPendulo = 0;
let velAngularPendulo = 0;
let enfriamientoLiana = 0;
const velInerciaLiana = new THREE.Vector3();
let conInerciaLiana = false;

/* Parámetros de la cámara elástica en tercera persona: */
let distanciaCamara = 44;
let alturaCamara = 24;
let desfaseLookAtY = 2.8;
const rigidezCamara = 50;
const amortiguacionCamara = 14;
const velCamara = new THREE.Vector3();
const velMiradaCamara = new THREE.Vector3();
const posicionObjetivoCamara = new THREE.Vector3();
const miradaObjetivoCamara = new THREE.Vector3();
const miradaActualCamara = new THREE.Vector3();
const aceleracionCamara = new THREE.Vector3();
let camaraSpringIniciada = false;

/* Modos de cámara disponibles y selector: */
const modosCamara = ['terceraPersona', 'primeraPersona', 'orbital'];
let indiceModoCamara = 0;
let juegoPausado = false;
let referenciaControlesCamara = null;
let referenciaCamara = null;
let anguloCamara = anguloInicial + Math.PI;

/* Parámetros de campo de visión para cada perspectiva: */
const fovTerceraPersona = 50;
const fovPrimeraPersona = 80;

/* Estado de los controles de teclado: */
const controles = {
    adelante: false,
    atras: false,
    izquierda: false,
    derecha: false,
    rotarCamaraIzq: false,
    rotarCamaraDer: false
};

export function crearJugador(escena, circuito, controlesCamara) {
    referenciaControlesCamara = controlesCamara;
    referenciaControlesCamara.enabled = false;
    referenciaControlesCamara.enablePan = true;
    referenciaControlesCamara.screenSpacePanning = true;

    // Cargamos el jugador y su textura:
    jugador = cacheAnimaciones.get('reposo');
    jugador.position.copy(posJugador);
    const factorEscala = alturaJugador / 1.7;
    jugador.scale.set(factorEscala, factorEscala, factorEscala);
    escena.add(jugador);

    const loaderTextura = new THREE.TextureLoader();
    const texturaJugador = loaderTextura.load('models/textura_jugador.png');

    jugador.traverse(function (child) {
        if (child.isMesh) {
            child.material.map = texturaJugador;
            child.material.needsUpdate = true;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    if (activarHitbox) {
        // Creamos una caja con estilo wireframe con las dimensiones del jugador:
        const
            geomHitbox = new THREE.BoxGeometry(largoJugador, alturaJugador, anchoJugador),
            matHitbox = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

        cajaHitbox = new THREE.Mesh(geomHitbox, matHitbox);

        // La colocamos a la altura del cuerpo y la añadimos a la escena:
        cajaHitbox.position.copy(posJugador);
        cajaHitbox.position.y += alturaJugador / 2;
        escena.add(cajaHitbox);
    }

    // Vinculamos el mixer de animaciones al modelo del jugador:
    const datosAnim = aplicarAnimaciones(jugador);
    mixer = datosAnim.mixer;
    acciones = datosAnim.acciones;

    // Configuramos el salto y el golpe para que sean una acciones puntuales:
    acciones['salto'].setLoop(THREE.LoopOnce, 1);
    acciones['salto'].clampWhenFinished = true;

    acciones['golpe'].setLoop(THREE.LoopOnce, 1);
    acciones['golpe'].clampWhenFinished = true;

    // Iniciamos la animación de reposo por defecto:
    acciones['reposo'].play();
    accionActual = acciones['reposo'];

    // Registramos las colisiones del mapa:
    circuito.updateMatrixWorld(true);

    circuito.traverse(function (objeto) {
        if (!objeto.isMesh) return;

        if (objeto.userData.esRodillo) {
            objetosRodillos.push(objeto);
            return;
        }

        if (objeto.userData.esGuante) {
            objetosGuantes.push(objeto);
            return;
        }

        if (objeto.userData.esAgarre) {
            objetoAgarreLiana = objeto;
            return;
        }

        if (!objeto.userData.liquido && !objeto.userData.traspasable) {
            objetosSuelo.push(objeto);
            objectsToCheck.push(objeto);
        }
    });

    configurarEventosTeclado();

    return jugador;
}

/* Función para devolver al jugador a la plataforma de salida: */
function reiniciarJugador() {
    posJugador.copy(posicionInicial);
    angJugador = anguloInicial;
    anguloCamara = anguloInicial + Math.PI;
    velVertical = 0;
    enSuelo = true;
    tiempoCoyote = margenSaltoCoyote;

    // Anulamos la inercia y el temporizador del empujón:
    tiempoEmpuje = 0;
    velEmpuje.set(0, 0, 0);

    // Reiniciamos los estados de pasarela, esferas y liana:
    enPasarelaMuro = false;
    sobreEsfera = false;
    colgadoLiana = false;
    conInerciaLiana = false;
    velInerciaLiana.set(0, 0, 0);
    if (pivoteLianaActual) {
        pivoteLianaActual.rotation.z = 0;
        pivoteLianaActual.updateMatrixWorld(true);
        pivoteLianaActual = null;
    }

    if (jugador !== null) {
        jugador.position.copy(posJugador);
        jugador.rotation.set(0, angJugador, 0);
    }

    // Restablecemos la animación inicial de reposo:
    cambiarAnimacion('reposo', 0.1);

    velCamara.set(0, 0, 0);
    velMiradaCamara.set(0, 0, 0);
    camaraSpringIniciada = false;
}

/* Función para iniciar un salto: */
function saltar() {
    if (jugador === null || juegoPausado) return;

    // Si estamos colgados de la liana, nos soltamos conservando la velocidad tangencial:
    if (colgadoLiana) {
        colgadoLiana = false;
        enfriamientoLiana = 0.6;
        conInerciaLiana = true;

        const vTangencial = velAngularPendulo * longitudPenduloActual;
        velInerciaLiana.set(vTangencial * Math.cos(anguloPendulo), 0, 0);
        velVertical = vTangencial * Math.sin(anguloPendulo) + impulsoSalto * 0.45;

        enSuelo = false;
        tiempoCoyote = 0;
        jugador.rotation.set(0, angJugador, 0);
        cambiarAnimacion('salto', 0.1, true);
        return;
    }

    // Desactivamos el salto manual si estamos sobre las esferas:
    if (sobreEsfera || enPasarelaMuro || tiempoCoyote <= 0) return;

    velVertical = impulsoSalto;
    enSuelo = false;
    tiempoCoyote = 0;

    // Activamos la animación de salto:
    cambiarAnimacion('salto', 0.1, true);
}

/* Función para detectar la altura y la pendiente del suelo bajo el jugador mediante múltiples apoyos: */
function detectarSuelo(posicion) {
    const margenDeteccion = alturaMaximaSuelo;
    const semilargo = (largoJugador / 2) * 0.75;
    const semiancho = (anchoJugador / 2) * 0.75;

    // Definimos cinco puntos de apoyo sobre la planta de los pies (centro y cuatro esquinas):
    const apoyos = [
        posicion,
        posicion.clone().add(new THREE.Vector3(semilargo, 0, semiancho)),
        posicion.clone().add(new THREE.Vector3(-semilargo, 0, semiancho)),
        posicion.clone().add(new THREE.Vector3(semilargo, 0, -semiancho)),
        posicion.clone().add(new THREE.Vector3(-semilargo, 0, -semiancho))
    ];

    let mejorAltura = -Infinity;
    let mejorPendiente = 0;
    let mejorObjeto = null;
    let impactoEncontrado = false;

    // Disparamos un rayo vertical desde cada punto de apoyo:
    for (let j = 0; j < apoyos.length; j++) {
        // Colocamos el raycaster a 'alturaRayoSuelo' metros por encima de cada apoyo:
        origenRayoSuelo.copy(apoyos[j]);
        origenRayoSuelo.y += alturaRayoSuelo;
        raycasterSuelo.set(origenRayoSuelo, direccionRayoSuelo);
        raycasterSuelo.far = alturaRayoSuelo * 2;

        // Nos guardamos con qué objetos intersecta el rayo:
        var impactos = raycasterSuelo.intersectObjects(objetosSuelo, false);
        if (impactos.length === 0) continue;

        // Buscamos la primera superficie situada por debajo de la altura de margen permitida:
        var impactoValido = null;
        for (var i = 0; i < impactos.length; i++) {
            if (impactos[i].point.y <= posicion.y + margenDeteccion) {
                impactoValido = impactos[i];
                break;
            }
        }

        if (impactoValido === null) continue;

        // Transformamos la normal de la superficie encontrada al espacio global de la escena:
        normalSuelo.copy(impactoValido.face.normal);
        matrizNormal.getNormalMatrix(impactoValido.object.matrixWorld);
        normalSuelo.applyNormalMatrix(matrizNormal).normalize();

        // Si por algún casual la componente Y de la normal del suelo no es positiva, la invertimos:
        if (normalSuelo.y < 0) normalSuelo.negate();

        const pendienteActual = Math.sqrt(
            normalSuelo.x * normalSuelo.x + normalSuelo.z * normalSuelo.z
        ) / Math.max(normalSuelo.y, 0.0001);

        // Conservamos la superficie de contacto más alta encontrada entre todos los apoyos:
        if (impactoValido.point.y > mejorAltura) {
            mejorAltura = impactoValido.point.y;
            mejorPendiente = pendienteActual;
            mejorObjeto = impactoValido.object;
            impactoEncontrado = true;
        }
    }

    // Si ninguna esquina ni el centro encontraron superficie válida, devolvemos null:
    if (!impactoEncontrado) return null;

    // Devolvemos la altura del punto de impacto, su pendiente y el objeto pisado:
    return {
        altura: mejorAltura,
        pendiente: mejorPendiente,
        objeto: mejorObjeto
    };
}

/* Función para detectar impactos contra rodillos, guantes y el agarre de la liana: */
function comprobarImpactosRodeando() {
    // Comprobación de distancia para el agarre de la liana:
    if (objetoAgarreLiana !== null && !enSuelo && enfriamientoLiana <= 0) {
        objetoAgarreLiana.getWorldPosition(posAgarreMundo);
        const dx = posJugador.x - posAgarreMundo.x;
        const dz = posJugador.z - posAgarreMundo.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        // Si estamos cerca en XZ y cualquier parte desde los pies hasta por encima de las manos toca el aro:
        if (
            distXZ <= 6.5 &&
            posJugador.y + alturaJugador + 2.5 >= posAgarreMundo.y - 4.5 &&
            posJugador.y - 2.0 <= posAgarreMundo.y + 4.5
        ) {
            engancharLiana(objetoAgarreLiana);
            return true;
        }
    }

    // Filtramos solo los obstáculos móviles que están cerca o activos en este instante:
    const objetivosActivos = [];
    for (let i = 0; i < objetosRodillos.length; i++) {
        objetivosActivos.push(objetosRodillos[i]);
    }
    if (enPasarelaMuro) {
        for (let i = 0; i < objetosGuantes.length; i++) {
            const g = objetosGuantes[i];
            if (g.userData.guanteRaiz && g.userData.guanteRaiz.userData.activado) {
                objetivosActivos.push(g);
            }
        }
    }

    if (objetivosActivos.length === 0) return false;

    const direcciones = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1)
    ];

    const alturas = [
        alturaJugador * 0.25,
        alturaJugador * 0.55,
        alturaJugador * 0.85
    ];

    for (let h = 0; h < alturas.length; h++) {
        origenRayoPared.copy(posJugador).setY(posJugador.y + alturas[h]);

        for (let d = 0; d < direcciones.length; d++) {
            raycasterPared.set(origenRayoPared, direcciones[d]);
            raycasterPared.far = radioColision + 0.35;

            const impactos = raycasterPared.intersectObjects(objetivosActivos, false);
            if (impactos.length > 0) {
                const obj = impactos[0].object;

                if (obj.userData.esRodillo) {
                    aplicarGolpeRodillo(impactos[0]);
                    return true;
                }

                if (obj.userData.esGuante) {
                    aplicarGolpeGuante();
                    return true;
                }
            }
        }
    }

    return false;
}

/* Función para comprobar colisiones y obtener la normal del obstáculo impactado: */
function obtenerColisionHorizontal(direccion, distanciaAvance) {
    const direccionLateral = new THREE.Vector3(-direccion.z, 0, direccion.x).normalize();
    const mitadLargo = largoJugador / 2;

    // Evaluamos tres alturas del cuerpo: tobillos, cintura (mitad) y pecho (80%):
    const alturasRayo = [
        alturaMaximaSuelo + 0.1,
        alturaJugador * 0.5,
        alturaJugador * 0.8
    ];

    for (let h = 0; h < alturasRayo.length; h++) {
        const alturaActual = alturasRayo[h];
        const esNivelPies = h === 0;

        // Proyectamos tres puntos de origen por cada altura (Centro, Izquierda, Derecha):
        const origenesRayo = [
            posJugador.clone().setY(posJugador.y + alturaActual),
            posJugador.clone().setY(posJugador.y + alturaActual).addScaledVector(direccionLateral, mitadLargo),
            posJugador.clone().setY(posJugador.y + alturaActual).addScaledVector(direccionLateral, -mitadLargo)
        ];

        for (let i = 0; i < origenesRayo.length; i++) {
            raycasterPared.set(origenesRayo[i], direccion);
            raycasterPared.far = radioColision + distanciaAvance;

            var impactos = raycasterPared.intersectObjects(objectsToCheck, false);

            if (impactos.length > 0) {
                normalPared.copy(impactos[0].face.normal);
                matrizNormal.getNormalMatrix(impactos[0].object.matrixWorld);
                normalPared.applyNormalMatrix(matrizNormal).normalize();

                const pendienteCara = Math.sqrt(
                    normalPared.x * normalPared.x + normalPared.z * normalPared.z
                ) / Math.max(Math.abs(normalPared.y), 0.0001);

                // Si choca a la altura del pecho/cintura, o si a nivel de pies es un muro empinado, bloqueamos:
                if (!esNivelPies || (enSuelo && pendienteCara > pendienteMaxima)) {
                    return normalPared;
                }
            }
        }
    }

    return null;
}

/* Función para actualizar la cota vertical y la caída libre: */
function actualizarAlturaJugador(delta, sueloDetectado) {
    var sueloTransitable =
        sueloDetectado !== null &&
        (sueloDetectado.pendiente <= pendienteMaxima || sueloDetectado.objeto.userData.esEsfera);

    var cercaDelSuelo =
        sueloTransitable &&
        Math.abs(posJugador.y - sueloDetectado.altura) <= alturaMaximaSuelo;

    // Si pisamos una esfera estando en suelo, rebotamos automáticamente y reiniciamos la animación de salto:
    if (enSuelo && cercaDelSuelo && sueloDetectado.objeto.userData.esEsfera) {
        posJugador.y = sueloDetectado.altura;
        sueloDetectado.objeto.userData.aplastamiento = 1.0;
        sobreEsfera = true;
        velVertical = impulsoSalto * 1.15;
        enSuelo = false;
        tiempoCoyote = 0;
        cambiarAnimacion('salto', 0.1, true);
        return;
    }

    // Si caminamos sobre una superficie válida, fijamos nuestra altura a ella:
    if (enSuelo && cercaDelSuelo) {
        posJugador.y = sueloDetectado.altura;
        velVertical = 0;
        tiempoCoyote = margenSaltoCoyote;
        sobreEsfera = false;
        return;
    }

    if (enSuelo) enSuelo = false;

    // Descontamos el tiempo de gracia de salto mientras estamos en el aire:
    if (tiempoCoyote > 0) {
        tiempoCoyote -= delta;
    }

    // Aplicamos gravedad a la caída:
    velVertical += gravedad * delta;
    posJugador.y += velVertical * delta;

    // Cambiamos la animación a la de salto (si no estamos siendo golpeados):
    if (tiempoEmpuje <= 0) cambiarAnimacion('salto', 0.15);

    // Aterrizamos si caemos con la vel invertida sobre suelo firme:
    if (velVertical <= 0 && sueloTransitable && posJugador.y <= sueloDetectado.altura) {
        posJugador.y = sueloDetectado.altura;
        conInerciaLiana = false;

        // Si caemos sobre una esfera traicionera, la aplastamos y reiniciamos el salto automáticamente:
        if (sueloDetectado.objeto.userData.esEsfera) {
            sueloDetectado.objeto.userData.aplastamiento = 1.0;
            sobreEsfera = true;
            velVertical = impulsoSalto * 1.15;
            enSuelo = false;
            tiempoCoyote = 0;
            tiempoEmpuje = 0;
            cambiarAnimacion('salto', 0.1, true);
            return;
        }

        sobreEsfera = false;
        velVertical = 0;
        enSuelo = true;
        tiempoCoyote = margenSaltoCoyote;

        // Al tocar tierra, cambiamos a correr, pared o reposo según dónde estemos:
        if (tiempoEmpuje <= 0) {
            if (sueloDetectado.objeto.userData.esPasarelaMuro) {
                cambiarAnimacion('pared', 0.2);
            } else {
                const seMueve = controles.adelante || controles.atras || controles.izquierda || controles.derecha;
                cambiarAnimacion(seMueve ? 'correr' : 'reposo', 0.25);
            }
        }
    }

    // Reiniciamos la posición si el jugador cae al vacío fuera del escenario:
    if (posJugador.y < -25) {
        reiniciarJugador();
    }
}

/* Función para aplicar los empujones de los rodillos: */
function aplicarGolpeRodillo(impacto) {
    if (tiempoEmpuje > 0) return;

    // Obtenemos la posición global del pivote del rodillo:
    const pivote = impacto.object.userData.pivote;
    const centroPivote = new THREE.Vector3();
    pivote.getWorldPosition(centroPivote);

    // Vector horizontal desde el poste hacia el punto de contacto:
    const radioVector = new THREE.Vector3().subVectors(impacto.point, centroPivote);
    radioVector.y = 0;

    // Calculamos el vector perpendicular al molinete según su sentido de giro:
    const sentido = pivote.userData.sentido;
    const dirTangencial = new THREE.Vector3(radioVector.z, 0, -radioVector.x).normalize();
    dirTangencial.multiplyScalar(sentido);

    // Multiplicamos ese vector perpendicular por la fuerza del rodillo:
    velEmpuje.copy(dirTangencial).multiplyScalar(fuerzaEmpujeRodillo);

    // El rodillo también nos levantará un poco por los aires:
    velVertical = fuerzaLevantamientoRodillo;

    // Ponemos al jugador en el aire y bloqueamos los controles:
    enSuelo = false;
    tiempoCoyote = 0;
    tiempoEmpuje = duracionEmpuje;

    // Reproducimos la animación de golpe:
    cambiarAnimacion('golpe', 0.1, true);
}

/* Función para aplicar el empujón de los guantes de boxeo hacia la piscina de lodo: */
function aplicarGolpeGuante() {
    if (tiempoEmpuje > 0) return;

    velEmpuje.set(0, 0, 1).multiplyScalar(fuerzaEmpujeRodillo * 0.65);
    velVertical = fuerzaLevantamientoRodillo * 0.7;

    enSuelo = false;
    enPasarelaMuro = false;
    tiempoCoyote = 0;
    tiempoEmpuje = duracionEmpuje;

    cambiarAnimacion('golpe', 0.1, true);
}

/* Función para enganchar las manos del jugador al agarre de la liana: */
function engancharLiana(objetoAgarre) {
    colgadoLiana = true;
    conInerciaLiana = false;
    pivoteLianaActual = objetoAgarre.userData.pivoteLiana;
    longitudPenduloActual = objetoAgarre.userData.longitudPendulo;

    anguloPendulo = pivoteLianaActual.rotation.z;
    velAngularPendulo = (velAvance * 0.45) / longitudPenduloActual;

    enSuelo = false;
    velVertical = 0;
    tiempoEmpuje = 0;

    const animColgar = acciones['colgando'] ? 'colgando' : 'liana';
    cambiarAnimacion(animColgar, 0.15);
}

/* Función para realizar una transición suave entre dos animaciones: */
function cambiarAnimacion(nombreNueva, duracion = 0.2, forzarReinicio = false) {
    const nuevaAccion = acciones[nombreNueva];
    if (!nuevaAccion) return;

    // Si ya se está reproduciendo esa misma animación y no forzamos su reinicio, no hacemos nada:
    if (accionActual === nuevaAccion) {
        if (forzarReinicio) {
            nuevaAccion.reset();
            nuevaAccion.play();
        }
        return;
    }

    // Reiniciamos y preparamos la nueva animación:
    nuevaAccion.reset();
    nuevaAccion.enabled = true;
    nuevaAccion.setEffectiveTimeScale(1);
    nuevaAccion.setEffectiveWeight(1);

    // Si había una animación anterior, hacemos el fundido cruzado:
    if (accionActual) {
        accionActual.crossFadeTo(nuevaAccion, duracion, true);
    }

    nuevaAccion.play();
    accionActual = nuevaAccion;
}

/* Función para actualizar la vista en primera persona: */
function camaraPrimeraPersona(camara) {
    // Situamos la cámara en la cabeza del personaje:
    const alturaOjos = alturaJugador * 0.88;
    camara.position.set(posJugador.x, posJugador.y + alturaOjos, posJugador.z);

    // Calculamos el punto hacia el que mira hacia el frente según el ángulo de la cámara:
    const puntoMirada = camara.position.clone().add(new THREE.Vector3(
        -Math.sin(anguloCamara),
        0,
        -Math.cos(anguloCamara)
    ));

    camara.lookAt(puntoMirada);
}

/* Función para alternar cíclicamente entre tercera persona, primera persona y orbital: */
function cambiarCamara() {
    if (referenciaControlesCamara === null || referenciaCamara === null) return;

    // Avanzamos al siguiente modo de la lista:
    indiceModoCamara = (indiceModoCamara + 1) % modosCamara.length;
    const modoActual = modosCamara[indiceModoCamara];

    // Ajustamos el campo de visión según la perspectiva activa:
    if (modoActual === 'primeraPersona') {
        referenciaCamara.fov = fovPrimeraPersona;
    } else {
        referenciaCamara.fov = fovTerceraPersona;
    }
    referenciaCamara.updateProjectionMatrix();

    // Activamos los controles del ratón únicamente en el modo orbital:
    referenciaControlesCamara.enabled = (modoActual === 'orbital');

    // Ocultamos el modelo en primera persona para que la cabeza no tape la visión:
    if (jugador !== null) {
        jugador.visible = (modoActual !== 'primeraPersona');
    }

    if (modoActual === 'orbital' && jugador !== null) {
        // Fijamos el centro de rotación en el torso del jugador:
        referenciaControlesCamara.target.copy(posJugador);
        referenciaControlesCamara.target.y += desfaseLookAtY;

        // Separamos la cámara hacia atrás si venimos de la vista subjetiva para no nacer dentro del cráneo:
        referenciaCamara.position.x = posJugador.x + Math.sin(anguloCamara) * distanciaCamara;
        referenciaCamara.position.z = posJugador.z + Math.cos(anguloCamara) * distanciaCamara;
        referenciaCamara.position.y = posJugador.y + alturaCamara;

        referenciaControlesCamara.update();
    } else if (jugador !== null) {
        velCamara.set(0, 0, 0);
        velMiradaCamara.set(0, 0, 0);

        // Si venimos de orbital, sincronizamos la orientación con la dirección que dejó el ratón:
        const vectorCamara = new THREE.Vector3().subVectors(referenciaCamara.position, referenciaControlesCamara.target);
        anguloCamara = Math.atan2(vectorCamara.x, vectorCamara.z);

        camaraSpringIniciada = true;
    }
}

/* Función para integrar el resorte amortiguado de la cámara en tercera persona: */
function actualizarResorte(actual, velActual, objetivo, delta) {
    aceleracionCamara
        .copy(objetivo)
        .sub(actual)
        .multiplyScalar(rigidezCamara)
        .addScaledVector(velActual, -amortiguacionCamara);

    velActual.addScaledVector(aceleracionCamara, delta);
    actual.addScaledVector(velActual, delta);
}

/* Función para actualizar la posición y el punto de mira de la cámara: */
function actualizarCamara(camara, delta) {
    // Calculamos el punto de mira sobre la parte superior del jugador:
    miradaObjetivoCamara.copy(posJugador);
    miradaObjetivoCamara.y += desfaseLookAtY;

    // Calculamos la posición ideal de la cámara empleando su ángulo orbital:
    posicionObjetivoCamara.x = posJugador.x + Math.sin(anguloCamara) * distanciaCamara;
    posicionObjetivoCamara.z = posJugador.z + Math.cos(anguloCamara) * distanciaCamara;
    posicionObjetivoCamara.y = posJugador.y + alturaCamara;

    // Lanzamos un rayo desde el punto de mira hacia la posición ideal de la cámara para detectar muros:
    direccionRayoCamara.subVectors(posicionObjetivoCamara, miradaObjetivoCamara);
    const distanciaIdeal = direccionRayoCamara.length();
    direccionRayoCamara.normalize();

    raycasterCamara.set(miradaObjetivoCamara, direccionRayoCamara);
    raycasterCamara.far = distanciaIdeal;

    var impactosCamara = raycasterCamara.intersectObjects(objectsToCheck, false);

    // Si un obstáculo se interpone en la línea de visión, acercamos la cámara por delante del muro:
    if (impactosCamara.length > 0) {
        const distanciaSegura = Math.max(impactosCamara[0].distance - margenColisionCamara, 1.2);
        posicionObjetivoCamara.copy(miradaObjetivoCamara).addScaledVector(direccionRayoCamara, distanciaSegura);
    }

    // Colocamos los vectores instantáneamente en el primer fotograma para no dar latigazos:
    if (!camaraSpringIniciada) {
        camara.position.copy(posicionObjetivoCamara);
        miradaActualCamara.copy(miradaObjetivoCamara);
        velCamara.set(0, 0, 0);
        velMiradaCamara.set(0, 0, 0);
        camaraSpringIniciada = true;
    } else {
        actualizarResorte(camara.position, velCamara, posicionObjetivoCamara, delta);
        actualizarResorte(miradaActualCamara, velMiradaCamara, miradaObjetivoCamara, delta);
    }

    camara.lookAt(miradaActualCamara);
}

/* Función para actualizar la perspectiva de la cámara según el modo activo: */
function actualizarCamaraActiva(camara, controlesCamara, delta) {
    const modoActual = modosCamara[indiceModoCamara];

    if (modoActual === 'orbital') {
        controlesCamara.update();
    } else if (modoActual === 'primeraPersona') {
        camaraPrimeraPersona(camara);
    } else {
        controlesCamara.target.copy(posJugador);
        actualizarCamara(camara, delta);
    }
}

/* Función para restablecer la orientación y posición inicial de la cámara activa: */
function restablecerCamaraActiva() {
    if (referenciaCamara === null) return;

    // Restablecemos el ángulo de visión orientado hacia el avance de la pista:
    anguloCamara = anguloInicial + Math.PI;

    // Limpiamos las velocidades e inercias del resorte:
    velCamara.set(0, 0, 0);
    velMiradaCamara.set(0, 0, 0);
    camaraSpringIniciada = false;

    const modoActual = modosCamara[indiceModoCamara];

    if (modoActual === 'orbital' && referenciaControlesCamara !== null) {
        // Centramos el objetivo en el torso del jugador y colocamos la cámara a distancia estándar:
        referenciaControlesCamara.target.set(
            posJugador.x,
            posJugador.y + desfaseLookAtY,
            posJugador.z
        );

        referenciaCamara.position.set(
            posJugador.x + Math.sin(anguloCamara) * distanciaCamara,
            posJugador.y + alturaCamara,
            posJugador.z + Math.cos(anguloCamara) * distanciaCamara
        );

        referenciaControlesCamara.update();
    } else if (modoActual === 'primeraPersona') {
        // Actualizamos de inmediato la vista subjetiva mirando al frente:
        camaraPrimeraPersona(referenciaCamara);
    } else {
        // En tercera persona, forzamos la colocación instantánea detrás de la espalda:
        actualizarCamara(referenciaCamara, 0);
    }
}

/* Función principal de actualización del jugador llamada en cada fotograma: */
export function actualizarJugador(delta, camara, controlesCamara) {
    // Si el jugador o el mixer aún no han terminado de cargar, salimos de inmediato:
    if (jugador === null || mixer === null) return;

    referenciaCamara = camara;

    if (juegoPausado) {
        if (modosCamara[indiceModoCamara] === 'orbital') {
            controlesCamara.update();
        }
        return;
    }

    // Actualizamos el mixer:
    mixer.update(delta);

    if (jugador === null) return;

    if (enfriamientoLiana > 0) {
        enfriamientoLiana -= delta;
    }

    // Si estamos sufriendo un golpe, aplicamos el desplazamiento de la inercia:
    if (tiempoEmpuje > 0) {
        tiempoEmpuje -= delta;

        // Desplazamos al jugador por la inercia del golpe:
        posJugador.addScaledVector(velEmpuje, delta);

        // Amortiguamos la velocidad horizontal progresivamente en el aire:
        velEmpuje.multiplyScalar(Math.max(1 - 2.5 * delta, 0));

        // Actualizamos la altura con gravedad normal:
        const sueloActual = detectarSuelo(posJugador);
        actualizarAlturaJugador(delta, sueloActual);

        // Actualizamos mallas y cámara sin procesar la entrada por teclado:
        jugador.position.copy(posJugador);
        if (activarHitbox) {
            cajaHitbox.position.copy(posJugador);
            cajaHitbox.position.y += alturaJugador / 2;
        }

        // Mantenemos la perspectiva de la cámara activa sin cambiar a tercera persona:
        actualizarCamaraActiva(camara, controlesCamara, delta);
        return;
    }

    let inputX = 0;
    let inputZ = 0;

    if (controles.adelante) inputZ -= 1;
    if (controles.atras) inputZ += 1;
    if (controles.izquierda) inputX -= 1;
    if (controles.derecha) inputX += 1;

    // Actualizamos el ángulo de la cámara manualmente si se pulsan Q o E:
    if (controles.rotarCamaraIzq) anguloCamara -= 3.0 * delta;
    if (controles.rotarCamaraDer) anguloCamara += 3.0 * delta;

    // Establecemos el ángulo de referencia de la cámara según el modo activo:
    let anguloReferenciaCamara = anguloCamara;
    if (modosCamara[indiceModoCamara] === 'orbital') {
        const vectorCamara = new THREE.Vector3().subVectors(camara.position, controlesCamara.target);
        anguloReferenciaCamara = Math.atan2(vectorCamara.x, vectorCamara.z);
    }

    // Movimiento pendular del agarre de la liana:
    if (pivoteLianaActual !== null && (colgadoLiana || Math.abs(anguloPendulo) > 0.001 || Math.abs(velAngularPendulo) > 0.001)) {
        // Aceleración natural restauradora del péndulo por la gravedad:
        const acelGravedad = -(Math.abs(gravedad) / longitudPenduloActual) * Math.sin(anguloPendulo);
        velAngularPendulo += acelGravedad * delta;

        // Solo permitimos bombear con W si el jugador sigue colgado:
        if (colgadoLiana && controles.adelante) {
            const dirOscilacion = Math.abs(velAngularPendulo) > 0.01
                ? Math.sign(velAngularPendulo)
                : (anguloPendulo <= 0 ? 1 : -1);

            velAngularPendulo += dirOscilacion * 2.5 * delta;
        }

        // Fricción progresiva (actúa tanto al soltar W como cuando el jugador ya ha saltado de la liana):
        const amortiguacionAire = 0.45;
        velAngularPendulo -= velAngularPendulo * amortiguacionAire * delta;

        // Tope de velocidad física para no superar los 90º o -90º:
        const velMax = Math.sqrt(2 * (Math.abs(gravedad) / longitudPenduloActual) * Math.max(0, Math.cos(anguloPendulo)));
        velAngularPendulo = Math.max(-velMax, Math.min(velMax, velAngularPendulo));

        anguloPendulo += velAngularPendulo * delta;
        const maxAngulo = Math.PI / 2 - 0.02;
        if (anguloPendulo > maxAngulo) {
            anguloPendulo = maxAngulo;
            velAngularPendulo = -velAngularPendulo * 0.5;
        } else if (anguloPendulo < -maxAngulo) {
            anguloPendulo = -maxAngulo;
            velAngularPendulo = -velAngularPendulo * 0.5;
        }

        pivoteLianaActual.rotation.z = anguloPendulo;
        pivoteLianaActual.updateMatrixWorld(true);
    }

    if (colgadoLiana && pivoteLianaActual !== null) {
        const posPivote = pivoteLianaActual.position;
        const distAgarre = longitudPenduloActual + 1.5;
        const agarreX = posPivote.x + Math.sin(anguloPendulo) * distAgarre;
        const agarreY = posPivote.y - Math.cos(anguloPendulo) * distAgarre;

        posJugador.set(agarreX, agarreY - alturaJugador * 1.35, posPivote.z);
        angJugador = Math.PI / 2;

        jugador.position.copy(posJugador);
        jugador.rotation.set(0, angJugador, 0);

        if (activarHitbox) {
            cajaHitbox.position.copy(posJugador);
            cajaHitbox.position.y += alturaJugador / 2;
        }

        actualizarCamaraActiva(camara, controlesCamara, delta);
        return;
    }

    // Comprobamos impactos contra rodillos, guantes y el agarre de la liana:
    if (comprobarImpactosRodeando()) {
        actualizarCamaraActiva(camara, controlesCamara, delta);
        return;
    }

    // Comprobamos el suelo bajo los pies del jugador:
    const sueloActual = detectarSuelo(posJugador);
    enPasarelaMuro = Boolean(enSuelo && sueloActual && sueloActual.objeto && sueloActual.objeto.userData.esPasarelaMuro);

    // Creamos un vector para acumular el desplazamiento combinado de este fotograma:
    const desplazamientoNeto = new THREE.Vector3(0, 0, 0);

    // Si venimos despedidos por la inercia del péndulo de la liana, la sumamos en el aire:
    if (conInerciaLiana && !enSuelo) {
        desplazamientoNeto.addScaledVector(velInerciaLiana, delta);
    }

    // Procesamos el desplazamiento del jugador si se está pulsando alguna dirección:
    const movimiento = inputX !== 0 || inputZ !== 0;

    if (enPasarelaMuro) {
        // Colocamos automáticamente al jugador justo delante del muro para no esquivar los puños por el borde:
        if (sueloActual.objeto.userData.muroZ !== undefined) {
            posJugador.z = sueloActual.objeto.userData.muroZ + (anchoJugador * 0.45);
        }

        let avanceX = 0;
        if (movimiento) {
            const anguloInput = Math.atan2(inputX, inputZ);
            avanceX = Math.sin(anguloReferenciaCamara + anguloInput);
        }

        // Limitamos el movimiento exclusivamente al eje X en la pasarela del muro:
        if (Math.abs(avanceX) > 0.1) {
            const signoX = Math.sign(avanceX);
            desplazamientoNeto.x += signoX * velAvance * 0.65 * delta;
            angJugador = 0;
            cambiarAnimacion('pared', 0.2);
            if (acciones['pared']) {
                acciones['pared'].paused = false;
                acciones['pared'].setEffectiveTimeScale(signoX);
            }
        } else {
            angJugador = 0;
            cambiarAnimacion('pared', 0.2);
            if (acciones['pared']) {
                acciones['pared'].paused = true;
            }
        }
    } else {
        if (acciones['pared']) {
            acciones['pared'].paused = false;
        }

        if (movimiento) {
            const anguloInput = Math.atan2(inputX, inputZ);
            angJugador = anguloReferenciaCamara + anguloInput;

            dirJugador.set(Math.sin(angJugador), 0, Math.cos(angJugador));
            desplazamientoNeto.addScaledVector(dirJugador, (conInerciaLiana ? velAvance * 0.35 : velAvance) * delta);

            // Suavizamos el ángulo de la cámara hacia la espalda del jugador solo en tercera persona:
            if (modosCamara[indiceModoCamara] === 'terceraPersona') {
                const anguloDeseadoCamara = angJugador + Math.PI;
                let dif = anguloDeseadoCamara - anguloCamara;

                while (dif <= -Math.PI) dif += Math.PI * 2;
                while (dif > Math.PI) dif -= Math.PI * 2;

                if (Math.abs(dif) < 2.0) {
                    anguloCamara += dif * 1.8 * delta;
                }
            }
        }

        // Decidimos a qué animación cambiar si estamos en el suelo:
        if (enSuelo) {
            if (movimiento) {
                cambiarAnimacion('correr', 0.2);
            } else {
                cambiarAnimacion('reposo', 0.25);
            }
        }
    }

    // Resolvemos los choques contra los muros:
    const distanciaTotal = desplazamientoNeto.length();

    if (distanciaTotal > 0) {
        const dirTotal = desplazamientoNeto.clone().normalize();
        const normalMuro = obtenerColisionHorizontal(dirTotal, distanciaTotal);

        if (normalMuro === null) {
            posJugador.add(desplazamientoNeto);
        } else {
            const productoEscalar = dirTotal.dot(normalMuro);
            if (productoEscalar < 0) {
                // Restamos la componente frontal:
                const dirDeslizar = dirTotal.clone().sub(normalMuro.clone().multiplyScalar(productoEscalar));
                dirDeslizar.y = 0;

                // Medimos la velocidad lateral que sobrevivió al choque (será menor que 1.0):
                const fraccionVelocidad = dirDeslizar.length();

                if (fraccionVelocidad > 0.001) {
                    // Normalizamos únicamente para orientar el rayo de comprobación:
                    const dirRayo = dirDeslizar.clone().normalize();
                    const distanciaResidual = distanciaTotal * fraccionVelocidad;

                    // Si el camino tangencial está libre, avanzamos solo la distancia residual:
                    if (obtenerColisionHorizontal(dirRayo, distanciaResidual) === null) {
                        posJugador.addScaledVector(dirRayo, distanciaResidual);
                    }
                }
            }
        }
    }

    // Actualizamos la altura del jugador:
    actualizarAlturaJugador(delta, sueloActual);

    // Sincronizamos la malla del jugador con su nueva posición y rotación:
    jugador.position.copy(posJugador);
    jugador.rotation.y = angJugador;

    // Desplazamos la hitbox si está activa:
    if (activarHitbox) {
        cajaHitbox.position.copy(posJugador);
        cajaHitbox.position.y += alturaJugador / 2;
    }

    // Actualizamos la perspectiva de la cámara activa:
    actualizarCamaraActiva(camara, controlesCamara, delta);
}

/* Función para registrar los eventos de pulsación y liberación de teclas: */
function configurarEventosTeclado() {
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                controles.adelante = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                controles.atras = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                controles.izquierda = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                controles.derecha = true;
                break;
            case 'KeyQ':
                controles.rotarCamaraDer = true;
                break;
            case 'KeyE':
                controles.rotarCamaraIzq = true;
                break;
            case 'Space':
                event.preventDefault();
                saltar();
                break;
            case 'KeyP':
                if (!event.repeat) juegoPausado = !juegoPausado;
                break;
            case 'KeyR':
                if (!event.repeat) reiniciarJugador();
                break;
            case 'KeyC':
                if (!event.repeat && !juegoPausado) cambiarCamara();
                break;
            case 'KeyX':
                if (!event.repeat && !juegoPausado) restablecerCamaraActiva();
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                controles.adelante = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                controles.atras = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                controles.izquierda = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                controles.derecha = false;
                break;
            case 'KeyQ':
                controles.rotarCamaraDer = false;
                break;
            case 'KeyE':
                controles.rotarCamaraIzq = false;
                break;
        }
    });

    // Función auxiliar para resetear todas las entradas de golpe:
    function resetearControles() {
        controles.adelante = false;
        controles.atras = false;
        controles.izquierda = false;
        controles.derecha = false;
        controles.rotarCamaraDer = false;
        controles.rotarCamaraIzq = false;
    }

    // Si la ventana pierde el foco (p. ej, clic en otra ventana):
    window.addEventListener('blur', resetearControles);

    // Si se minimiza o cambia la pestaña:
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetearControles();
        }
    });
}

export function pausa() {
    return juegoPausado;
}
