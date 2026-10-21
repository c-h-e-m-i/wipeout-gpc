/* Función para crear una única geometría de rampa: */
function rampaGlobal(g) {
    let geometry = new THREE.BufferGeometry();

    // Rampa estándar: desciende hacia +X y ocupa -Z. El vértice más alto está en el origen (0,0,0).
    const vertices = new Float32Array([
        // Superiores (la rampa que se pisa):
        0, 0, 0,
        1, -1 + g, 0,
        1, -1 + g, -1,
        0, 0, -1,

        // Inferiores (la base inferior inclinada paralela a la de arriba):
        0, -g, 0,
        1, -1, 0,
        1, -1, -1,
        0, -g, -1
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const indices = new Uint16Array([
        // Cara superior:
        0, 1, 2, /**/ 2, 3, 0,

        // Cara inferior:
        4, 7, 6, /**/ 6, 5, 4,

        // Cara lateral (Z=0):
        0, 4, 5, /**/ 5, 1, 0,

        // Cara lateral (Z=-1):
        2, 6, 7, /**/ 7, 3, 2,

        // Cara vertical de corte (X=0):
        3, 7, 4, /**/ 4, 0, 3,

        // Cara vertical de corte (X=1):
        1, 5, 6, /**/ 6, 2, 1
    ]);

    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry = geometry.toNonIndexed();

    // Generamos las coordenadas UV para cada vértice de cada triángulo:
    const numVertices = geometry.attributes.position.count;
    const uvs = new Float32Array(numVertices * 2);
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < numVertices; i++) {
        // Mapeamos X y Z como coordenadas U y V para que cuadren con el suelo:
        uvs[i * 2] = pos[i * 3];       // U <- X
        uvs[i * 2 + 1] = pos[i * 3 + 2];   // V <- Z
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Calculamos las normales a los vértices:
    geometry.computeVertexNormals();

    return geometry;
}

/* Función para crear una única geometría de cuña
 * compartida por todas las del circuito: */
/* Función para crear una única geometría de cuña: */
function cunyaGlobal() {
    let geometry = new THREE.BufferGeometry();

    // Cuña estándar: desciende hacia +X y ocupa -Z. El vértice más alto está en el origen (0,0,0).
    const vertices = new Float32Array([
        // Cara superior inclinada:
        0, 0, 0,
        1, -1, 0,
        1, -1, -1,
        0, 0, -1,

        // Base inferior plana:
        0, -1, 0,
        0, -1, -1
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const indices = new Uint16Array([
        0, 1, 2, /**/ 2, 3, 0, // Cara superior
        1, 4, 5, /**/ 5, 2, 1, // Base
        0, 3, 5, /**/ 5, 4, 0, // Pared vertical trasera (X=0)
        2, 5, 3,                // Triángulo lateral (Z=-1)
        0, 4, 1                 // Triángulo lateral (Z=0)
    ]);

    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry = geometry.toNonIndexed();

    // Generamos las coordenadas UV para cada vértice de cada triángulo:
    const numVertices = geometry.attributes.position.count;
    const uvs = new Float32Array(numVertices * 2);
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < numVertices; i++) {
        // Mapeamos X y Z como coordenadas U y V para que cuadren con el suelo:
        uvs[i * 2] = pos[i * 3];
        uvs[i * 2 + 1] = pos[i * 3 + 2];
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Calculamos las normales a los vértices:
    geometry.computeVertexNormals();

    return geometry;
}

/* Función para escalar y reposicionar una malla: */
function malla(largo, alto, ancho, x, y, z, geom, material = null) {
    // Si no se ha especificado un material, usamos el básico de Three.js:
    const mat = material || new THREE.MeshNormalMaterial();

    // Creamos una malla con la geometría y el material especificados:
    const mesh = new THREE.Mesh(geom, mat);

    // La escalamos y reposicionamos:
    mesh.scale.set(largo, alto, ancho);
    mesh.position.set(x, y, z);

    // Configuramos la malla para que reciba sombras:
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
}

/* Creamos un mapa de geometrías en memoria para no crearlas
 * cada vez que llamamos a sus funciones correspondientes: */
const cacheGeom = new Map();

/* Creamos también una función para obtener la geometría de ese mapa: */
function obtenerGeom(clave, factoria) {
    if (!cacheGeom.has(clave)) {
        cacheGeom.set(clave, factoria());
    }
    return cacheGeom.get(clave);
}

/* Función para crear una cuña orientable con densidad de textura ajustable: */
export function cunya(largo, alto, ancho, x, y, z, orientacion = 'tras', material = null, densidadTex_1 = 30) {
    const geomBase = obtenerGeom('cunya', () => cunyaGlobal());
    const geom = geomBase.clone();

    // Escalamos la geometría a sus dimensiones reales:
    if (orientacion == 'der' || orientacion == 'izq') geom.scale(ancho, alto, largo);
    else geom.scale(largo, alto, ancho);

    const densidadTextura = 1 / densidadTex_1

    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    const normals = geom.attributes.normal;

    for (let i = 0; i < uvs.count; i++) {
        const xCoord = pos.getX(i) * densidadTextura;
        const yCoord = pos.getY(i) * densidadTextura;
        const zCoord = pos.getZ(i) * densidadTextura;
        const nx = Math.abs(normals.getX(i));
        const ny = Math.abs(normals.getY(i));

        if (nx > 0.5) {
            uvs.setXY(i, zCoord, yCoord);
        } else if (ny > 0.5) {
            uvs.setXY(i, xCoord, zCoord);
        } else {
            uvs.setXY(i, xCoord, yCoord);
        }
    }
    uvs.needsUpdate = true;

    const mat = material || new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    switch (orientacion) {
        case 'der':
            mesh.rotation.y = -Math.PI / 2;
            mesh.position.set(x, y, z);
            break;
        case 'izq':
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(x + largo, y, z);
            break;
        case 'del':
            mesh.rotation.y = Math.PI;
            mesh.position.set(x + largo, y, z - ancho);
            break;
        case 'tras':
            mesh.position.set(x, y, z);
            break;
    }

    return mesh;
}

/* Función para crear una rampa orientable con densidad de textura ajustable: */
export function rampa(largo, alto, ancho, x, y, z, grosor = 0.2, orientacion = 'tras', material = null, densidadTex_1 = 30) {
    const g = Math.min(Math.max(grosor, 0.01), 1);
    const geomBase = obtenerGeom(`rampa_${g}`, () => rampaGlobal(g));
    const geom = geomBase.clone();

    // Escalamos la geometría a sus dimensiones reales:
    geom.scale(largo, alto, ancho);

    const densidadTextura = 1 / densidadTex_1;

    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    const normals = geom.attributes.normal;

    for (let i = 0; i < uvs.count; i++) {
        const xCoord = pos.getX(i) * densidadTextura;
        const yCoord = pos.getY(i) * densidadTextura;
        const zCoord = pos.getZ(i) * densidadTextura;
        const nx = Math.abs(normals.getX(i));
        const ny = Math.abs(normals.getY(i));

        if (nx > 0.5) {
            uvs.setXY(i, zCoord, yCoord);
        } else if (ny > 0.5) {
            uvs.setXY(i, xCoord, zCoord);
        } else {
            uvs.setXY(i, xCoord, yCoord);
        }
    }
    uvs.needsUpdate = true;

    const mat = material || new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    switch (orientacion) {
        case 'der':
            mesh.rotation.y = -Math.PI / 2;
            mesh.position.set(x, y, z);
            break;
        case 'izq':
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(x + largo, y, z);
            break;
        case 'del':
            mesh.rotation.y = Math.PI;
            mesh.position.set(x + largo, y, z - ancho);
            break;
        case 'tras':
            mesh.position.set(x, y, z);
            break;
    }

    return mesh;
}

/* Función para crear cubos (ortoedros): */
export function cubo(largo, alto, ancho, x, y, z, material = null, densidadTex_1 = 30) {
    // Si no se ha especificado un material, usamos el básico de Three.js:
    const mat = material || new THREE.MeshNormalMaterial();

    // Definimos la geometría del cubo:
    const geom = new THREE.BoxGeometry(largo, alto, ancho);

    /* Desplazamos los vértices para que la esquina superior izquierda
     * se coloque en el origen: */
    geom.translate(largo / 2, -alto / 2, -ancho / 2);

    const uvs = geom.attributes.uv;
    const normals = geom.attributes.normal;
    const densidad = 1 / densidadTex_1;

    for (let i = 0; i < uvs.count; i++) {
        const nx = Math.abs(normals.getX(i));
        const ny = Math.abs(normals.getY(i));
        const nz = Math.abs(normals.getZ(i));

        // Caras laterales perpendiculares al eje X (ancho x alto):
        if (nx > 0.5) {
            uvs.setXY(i, uvs.getX(i) * ancho * densidad, uvs.getY(i) * alto * densidad);
        }
        // Caras superior / inferior perpendiculares al eje Y (largo x ancho):
        else if (ny > 0.5) {
            uvs.setXY(i, uvs.getX(i) * largo * densidad, uvs.getY(i) * ancho * densidad);
        }
        // Caras frontal / trasera perpendiculares al eje Z (largo x alto):
        else if (nz > 0.5) {
            uvs.setXY(i, uvs.getX(i) * largo * densidad, uvs.getY(i) * alto * densidad);
        }
    }
    uvs.needsUpdate = true;

    // Creamos una malla con la geometría y el material especificados:
    const mesh = new THREE.Mesh(geom, mat);

    // La reposicionamos:
    mesh.position.set(x, y, z);

    // Configuramos la malla para que reciba sombras:
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
}

/* Función para crear cilindros: */
export function cilindro(radio, altura, x, y, z, material = null) {
    const geom = obtenerGeom('cilindro', () => {
        // Radios de 0.5 (diámetro 1) y altura 1,
        // radialSegments: 16, heightSegments: 1:
        const base = new THREE.CylinderGeometry(1, 1, 1, 16, 1);

        // Desplazamos la base para que el origen esté en la tapa inferior:
        base.translate(0, 0.5, 0);

        return base;
    });

    return malla(radio, altura, radio, x, y, z, geom, material);
}

/* Función para crear troncos de cono: */
export function troncoCono(r1, r2, altura, x, y, z, material = null) {
    const geom = obtenerGeom(`troncoCono_${r1}_${r2}`, () => {
        const base = new THREE.CylinderGeometry(r1, r2, 1, 6, 1);

        // Desplazamos la base para que el origen esté en la tapa inferior:
        base.translate(0, 0.5, 0);

        return base;
    });

    return malla(1, altura, 1, x, y, z, geom, material);
}

/* Función para crear esferas: */
export function esfera(radio, x, y, z, material = null) {
    const geom = obtenerGeom('esfera', () => {
        const base = new THREE.SphereGeometry(1, 32, 16);

        // Desplazamos el centro de la base de la esfera para que se coloque en el origen:
        base.translate(0, 1, 0);

        return base;
    });

    return malla(radio, radio, radio, x, y, z, geom, material)
}

/* Función para crear donuts: */
export function donut(radioDonut, radioTubo, x, y, z, material = null) {
    const geom = obtenerGeom(`donut_${radioDonut}_${radioTubo}`, () => {
        const base = new THREE.TorusGeometry(radioDonut, radioTubo, 16, 32);

        // Lo acostamos de lado:
        base.rotateX(Math.PI / 2);

        // Desplazamos el centro de la base del donut para que se coloque en el origen:
        base.translate(0, radioTubo, 0);

        return base;
    });

    return malla(1, 1, 1, x, y, z, geom, material);
}

/* Función para crear escaleras: */
export function escalera(largo, alto, ancho, x, y, z, escalones, orientacion, material = null) {
    // Creamos una escalera de (largo, alto, ancho) = (1, 1, 1):
    const base = new THREE.Group();

    // Definimos un cubo incrementalmente más largo por escalón:
    for (let i = 0; i < escalones; i++) {
        const escalon = cubo(i + 1, 1, 1, 0, -i, 0, material);

        // Lo marcamos como traspasable:
        escalon.userData.traspasable = true;

        // Evitamos que proyecte sombras sobre el resto de escalones:
        escalon.castShadow = false;

        base.add(escalon)
    }

    // La reposicionamos y reescalamos según la orientación:
    switch (orientacion) {
        case 'der':
            base.rotation.y = -Math.PI / 2;
            base.position.set(x, y, z);
            base.scale.set(ancho / escalones, alto / escalones, largo);
            break;
        case 'izq':
            base.rotation.y = Math.PI / 2;
            base.position.set(x + largo, y, z);
            base.scale.set(ancho / escalones, alto / escalones, largo);
            break;
        case 'del':
            base.rotation.y = Math.PI;
            base.position.set(x, y, z - ancho);
            base.scale.set(largo / escalones, alto / escalones, ancho);
            break;
        case 'tras':
            base.position.set(x, y, z);
            base.scale.set(largo / escalones, alto / escalones, ancho);
            break;
    }

    return base;
}

/* Función para crear piscinas: */
export function piscina(largo, alto, ancho, grosorPared, x, y, z, materialPared, materialSuelo, materialAgua, profundidad = 0.75) {
    // Acotamos la profundidad entre 0 y 1:
    const prof = Math.min(Math.max(profundidad, 0), 1);

    // Creamos un grupo para la piscina:
    const piscina = new THREE.Group();

    // Paredes laterales:
    const paredPiscinaIzq = cubo(
        largo + grosorPared * 2,
        alto + grosorPared,
        grosorPared,
        x - grosorPared,
        y,
        z - ancho,
        materialPared
    )

    const paredPiscinaDer = cubo(
        largo + grosorPared * 2,
        alto + grosorPared,
        grosorPared,
        x - grosorPared,
        y,
        z + grosorPared,
        materialPared
    )

    // Paredes trasera y delantera:
    const paredPiscinaDel = cubo(
        grosorPared,
        alto + grosorPared,
        ancho,
        x - grosorPared,
        y,
        z,
        materialPared
    )

    const paredPiscinaTras = cubo(
        grosorPared,
        alto + grosorPared,
        ancho,
        x + largo,
        y,
        z,
        materialPared
    )

    // Suelo:
    const sueloPiscina = cubo(
        largo,
        grosorPared,
        ancho,
        x,
        y - alto,
        z,
        materialSuelo
    )

    // Agua:
    const aguaPiscina = cubo(
        largo,
        alto * prof,
        ancho,
        x,
        y - alto * (1 - prof),
        z,
        materialAgua
    )

    // Marcamos el agua de la piscina como líquido:
    aguaPiscina.userData.liquido = true;

    piscina.add(paredPiscinaIzq, paredPiscinaDer, paredPiscinaTras, paredPiscinaDel, sueloPiscina, aguaPiscina);

    // Deshabilitamos las sombras de la piscina:
    piscina.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
        }
    });

    return piscina
}