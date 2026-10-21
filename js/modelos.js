// Almacén en memoria para guardar los modelos ya cargados:
const cacheModelos = new Map();

// Almacén en memoria para guardar las animaciones ya cargadas:
export const cacheAnimaciones = new Map();

/* Función para cargar un modelo (FBX, GLTF o GLB) de manera asíncrona: */
export function cargarModelo(clave, ruta) {

    // Creamos una promesa de carga:
    return new Promise(function (resolve, reject) {

        // Si el modelo ya estaba en la caché, resolvemos con él:
        if (cacheModelos.has(clave)) {
            resolve(cacheModelos.get(clave));
            return;
        }

        // Si no, obtenemos su extensión para configurar el loader:
        const extension = ruta.split('.').pop().toLowerCase();
        let loader;

        if (extension === 'fbx') {
            loader = new THREE.FBXLoader();
        } else if (extension === 'gltf' || extension === 'glb') {
            loader = new THREE.GLTFLoader();
        } else {
            reject(new Error('Formato no soportado: .' + extension));
            return;
        }

        loader.load(
            // ARGUMENTO #1: Ruta del modelo:
            ruta,

            // ARGUMENTO #2: Función para cuando termine de cargarse el modelo:
            function (resultado) {
                // FBX devuelve un THREE.Group directamente, mientras que GLTF devuelve un
                // objeto cuyo atributo 'scene' es dicho grupo:
                const objeto = (extension === 'fbx') ? resultado : resultado.scene;

                // Ajustamos los materiales:
                objeto.traverse(function (child) {
                    if (child.isMesh && child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                });

                // Guardamos el objeto en la caché y los resolvemos:
                cacheModelos.set(clave, objeto);
                resolve(objeto);
            },

            // ARGUMENTO #3: Función que se llama repetidamente durante la carga del modelo:
            // No queremos llamar a ninguna, así que ponemos 'undefined':
            undefined,

            // ARGUMENTO #4: Función a llamar si surge un error:
            function (error) {
                console.error('Error al cargar ' + ruta + ':', error);
                reject(error);
            }
        );
    });
}

/* Función para obtener las dimensiones y el centro de un modelo 3D: */
export function medirModelo(objeto) {
    // Obtenemos su bounding box:
    const box = new THREE.Box3().setFromObject(objeto);

    // Creamos variables para almacenar las dimensiones y el centro, y las
    // recibimos de la bounding box:
    const dim = new THREE.Vector3();
    const c = new THREE.Vector3();

    box.getSize(dim);
    box.getCenter(c);

    // Devolvemos un diccionario con las dimensiones, el centro
    return {
        dim: dim,   // Vector3 con ancho (x), alto (y) y profundidad (z)
        c: c,       // Vector3 con las coordenadas (x, y, z) del centro del modelo
        min: box.min,     // Coordenadas mínimas de la caja contenedora
        max: box.max      // Coordenadas máximas de la caja contenedora
    };
}

/**
 * Coloca un modelo en la escena:
 * - Lo orienta en el espacio (rotX, rotY, rotZ).
 * - Mide la forma ya rotada y escala según el eje resultante deseado ('x', 'y' o 'z').
 * - Alinea el pivote especificado en las coordenadas finales (x, y, z).
 */
export function colocarModelo(
    clave,
    ejeTam = null,
    tam = null,
    pivote = 'cen_cen',
    x = 0,
    y = 0,
    z = 0,
    rotX = 0,
    rotY = 0,
    rotZ = 0,
    material = null
) {
    // Obtenemos el modelo de la caché, si existe:
    const plantilla = cacheModelos.get(clave) || cacheAnimaciones.get(clave);

    // Si no existe, devolvemos un grupo vacío para no arrastrar el error:
    if (!plantilla) {
        console.warn(`El modelo "${clave}" no existe en caché.`);
        return new THREE.Group();
    }

    // Si existe, lo clonamos:
    const clon = plantilla.clone(true);

    // Si hemos especificado un material, se lo aplicamos:
    if (material) {
        clon.traverse(function (child) {
            if (child.isMesh) {
                child.material = material;
            }
        });
    }

    // Centramos el clon en (0, 0, 0) respecto a su propio centro geométrico:
    const infoOrig = medirModelo(clon);
    clon.position.set(
        -infoOrig.c.x,
        -infoOrig.c.y,
        -infoOrig.c.z
    );

    // Creamos un contenedor de rotación para evitar que esta se aplique antes que la traslación,
    // lo que ocurriría si hiciéramos 'rotation.set()' sobre 'clon' directamente:
    const contenedor = new THREE.Group();
    contenedor.add(clon);
    contenedor.rotation.set(rotX, rotY, rotZ);

    // Medimos el modelo ya rotado para saber sus dimensiones respecto de los nuevos ejes:
    const infoRotada = medirModelo(contenedor);

    // Escalamos el modelo (manteniendo sus proporciones) de tal modo que pase a medir 'tam' en su coordenada 'tamEje':
    if (ejeTam && tam) {
        const eje = ejeTam.toLowerCase();
        const factor = tam / infoRotada.dim[eje];
        contenedor.scale.set(factor, factor, factor);
    }

    // Sacamos las medidas definitivas del modelo rotado y escalado:
    const infoFinal = medirModelo(contenedor);

    // Obtenemos las coordenadas del pivote que colocaremos en (0, 0, 0):
    let cx, cy, cz;

    switch (pivote) {
        case 'sup_izq':
            cx = infoFinal.min.x;
            cy = infoFinal.max.y;
            cz = infoFinal.max.z;
            break;

        case 'inf_izq':
            cx = infoFinal.min.x;
            cy = infoFinal.min.y;
            cz = infoFinal.max.z;
            break;

        case 'sup_cen':
            cx = infoFinal.c.x;
            cy = infoFinal.max.y;
            cz = infoFinal.c.z;
            break;

        case 'inf_cen':
            cx = infoFinal.c.x;
            cy = infoFinal.min.y;
            cz = infoFinal.c.z;
            break;

        case 'cen_cen':
        default:
            cx = infoFinal.c.x;
            cy = infoFinal.c.y;
            cz = infoFinal.c.z;
            break;
    }

    // Desplazamos localmente el modelo para que el pivote pase a estar en (x, y, z):
    contenedor.position.set(x - cx, y - cy, z - cz);

    return contenedor;
}

/* Función para cargar en memoria todas las animaciones: */
export function cargarAnimaciones() {
    // Definimos una lista con los archivos de animación a cargar:
    const
        rutaRelativa = 'models/',
        extension = '.fbx',
        animaciones = [
            'aterrizaje',
            'caida',
            'correr',
            'golpe',
            'colgando',
            'pared',
            'reposo',
            'salto'
        ];

    const rutas = animaciones.map(nombre => rutaRelativa + nombre + extension);

    // Cargamos las animaciones y las guardamos en 'cacheAnimaciones':
    const loader = new THREE.FBXLoader();

    return new Promise(function (resolve, reject) {
        let cargadas = 0;

        rutas.forEach(function (ruta, indice) {
            loader.load(
                ruta,
                function (datos) {
                    // Nos aseguramos de que los materiales de la malla sean opacos y visibles:
                    datos.traverse(function (child) {
                        if (child.isMesh && child.material) {
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                        }
                    });

                    cacheAnimaciones.set(animaciones[indice], datos);
                    cargadas++;

                    // Resolvemos cuando la última animación haya terminado de descargarse:
                    if (cargadas === animaciones.length) {
                        resolve();
                    }
                },
                undefined,
                function (error) {
                    console.error('Error al cargar la animación ' + ruta + ':', error);
                    reject(error);
                }
            );
        });
    });
}

/* Función para aplicar las animaciones cargadas a un modelo: */
export function aplicarAnimaciones(modelo) {
    // Definimos un mixer para aplicar las animaciones:
    const mixer = new THREE.AnimationMixer(modelo);
    const acciones = {};

    // Aplicamos cada animación a nuestro modelo, y guardamos la mezcla en 'acciones':
    cacheAnimaciones.forEach((animacion, nombre) => {
        acciones[nombre] = mixer.clipAction(animacion.animations[0]);
    });

    // Devolvemos el mixer y el diccionario de acciones:
    return {
        mixer: mixer,
        acciones: acciones
    }
}