import {
  AmbientLight, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, InstancedMesh, Matrix4,
  MeshBasicMaterial, MeshLambertMaterial, Object3D, OrthographicCamera, PointLight,
  Quaternion, Scene, Vector3, type Material,
} from 'three';
import { PM } from '../params-motor';
import { crearMotor, calidad as calidadGeometria, M, type Calidad, type Motor } from './geometria';

// EL CONTRATO ENTRE LA GEOMETRÍA Y LA COREOGRAFÍA
// ===============================================================================================
// La coreografía no sabe cómo está hecha ninguna pieza: solo conoce este Rig. Aquí se construye el
// motor de verdad (geometria.ts, geometría procedimental pura) y se envuelve en la forma que la
// coreografía necesita.
//
// Jerarquía, y el porqué de cada nivel:
//   escena
//     └ raiz        <- lo ÚNICO que anima la timeline maestra (x, y, rotateX, rotateY, scale)
//         └ sacudida <- SOLO el temblor del encendido, escrito en absoluto desde aplicar()
//             └ centrado <- offset fijo: el motor está construido con la garganta en y=0 y su
//                           centro geométrico en y=+0,78; esto lo baja para que quede encuadrado
//                 └ motor.grupo  (las piezas, tal cual las deja geometria.ts)
// Separar `sacudida` de `raiz` es lo que hace el temblor reversible: sumado a `raiz.position` se
// acumularía en los fotogramas en que la timeline no reescribe esa propiedad, y al arrastrar hacia
// atrás el motor no volvería a su sitio.

export interface PiezaRig {
  id: string;
  obj: Object3D;      // el grupo que se aparta en el despiece
  abierto: Vector3;   // desplazamiento del despiece, en el espacio del padre
  ancla: Vector3;     // punto LOCAL de la pieza donde engancha el rótulo
  lado: -1 | 1;
  /** Conserva rótulo en pantalla estrecha. */
  movil: boolean;
  titulo: string;
  nota: string;
}

/** Un tubo de la corona. NO es un Object3D: la corona entera es UNA InstancedMesh (1 llamada de
 *  dibujo para 36 tubos). La timeline anima `z` (desplazamiento RADIAL) de estos objetos planos y
 *  `escribirTubos()` compone las matrices. Anime.js anima cualquier objeto plano, así que el
 *  escalonado `stagger(..., { from: 'center' })` funciona igual. */
export interface TuboRig { z: number }

export interface Rig {
  escena: Scene;
  camara: OrthographicCamera;
  raiz: Group;
  sacudida: Group;
  motor: Motor;
  /** Las piezas con rótulo. Su orden es el de las ranuras de cada columna. */
  piezas: PiezaRig[];
  /** Piezas que se despiezan sin rótulo (la placa de identificación). */
  sueltas: PiezaRig[];
  tubos: TuboRig[];
  /** Los tres paneles radiadores: se abren en abanico dentro de su grupo. */
  aspas: Object3D[];
  /** La marca: la placa de identificación con el monograma. Ver PM.marca. */
  marca: Object3D;
  /** Materiales PROPIOS de la marca (clones): así el apagado del resto no la toca. */
  materialesMarca: Material[];
  /** Los tres del monograma, que además se auto-iluminan cuando la marca manda. */
  emisivosMarca: MeshLambertMaterial[];
  /** La chapa de soporte del monograma: se desvanece cuando la marca viene al frente (si no, al
   *  escalarse ocupa media pantalla y tapa el motor: sería una marca de agua). */
  chapaMarca: Material[];
  /** Rotor de la turbobomba: coge vueltas en el encendido. */
  turbina: Object3D;
  luzClave: DirectionalLight;
  luzCamara: PointLight;
  /** Materiales que laten en la galería y se ponen al rojo en el encendido. */
  emisivos: MeshLambertMaterial[];
  /** El inserto de garganta, sin iluminar: es el único modo de que la garganta "arda" sin postpro. */
  caliente: MeshBasicMaterial;
  /** Plano de salida de la campana, en unidades de motor: de ahí cuelga el penacho. */
  yLabio: number;
  /** Todo lo que se atenúa (apagado de la marca y fundido final). */
  cuerpos: Material[];
  /** Escribe las matrices de la corona a partir de `tubos[i].z`. Función pura de esos valores. */
  escribirTubos(): void;
  disponer(ancho: number, alto: number): void;
  liberar(): void;
}

export function construirRig(nivel: Calidad): Rig {
  calidadGeometria(nivel);   // menos tubos y menos segmentos de revolución en móvil

  const escena = new Scene();
  const camara = new OrthographicCamera(-1, 1, 1, -1, PM.motor.cerca, PM.motor.lejos);
  camara.position.set(...PM.motor.camara);
  camara.lookAt(0, 0, 0);

  const raiz = new Group();
  raiz.name = 'raiz';
  const sacudida = new Group();
  sacudida.name = 'sacudida';
  const centrado = new Group();
  centrado.name = 'centrado';
  centrado.position.y = PM.motor.centro;
  raiz.add(sacudida);
  sacudida.add(centrado);
  escena.add(raiz);

  const motor = crearMotor();
  centrado.add(motor.grupo);

  // -------------------------------------------------------------------------------------------
  // MATERIALES. La geometría los crea opacos; la coreografía necesita atenuarlos (el apagado de la
  // marca y el fundido final), así que aquí se marcan transparentes UNA vez. Es el único cambio
  // que este adaptador hace sobre lo que devuelve geometria.ts.
  // -------------------------------------------------------------------------------------------
  const cuerpos: Material[] = [];
  for (const clave of ['blanco', 'medio', 'oscuro', 'acento', 'linea', 'caliente'] as const) {
    cuerpos.push(transparentar(motor.materiales[clave] as Material));
  }
  const emisivos = [motor.materiales.acento as MeshLambertMaterial];
  const caliente = motor.materiales.caliente as MeshBasicMaterial;

  // -------------------------------------------------------------------------------------------
  // LUCES. No van dentro de `raiz`: si giraran con el motor, el sombreado plano no cambiaría al
  // girar y el objeto se leería como un dibujo, no como un volumen.
  // -------------------------------------------------------------------------------------------
  const luzClave = new DirectionalLight(0xffffff, PM.motor.luzClave);
  luzClave.position.set(5, 8, 6);
  const luzBorde = new DirectionalLight(0xffe6bd, PM.motor.luzBorde);
  luzBorde.position.set(-6, 1, -5);
  const hemisferio = new HemisphereLight(0xbcd2ff, 0x1a1a18, PM.motor.hemisferio);
  const ambiente = new AmbientLight(0xffffff, PM.motor.ambiente);
  escena.add(luzClave, luzBorde, hemisferio, ambiente);

  // La luz del encendido va DENTRO de sacudida: tiembla y sube con el motor.
  const luzCamara = new PointLight(new Color(M.paleta.acento), 0, 14, 2);
  luzCamara.position.set(0, -0.4, 0);
  centrado.add(luzCamara);

  // -------------------------------------------------------------------------------------------
  // PIEZAS DEL DESPIECE. Los números están en params-motor.ts; aquí solo se resuelven contra el
  // grafo real y se calcula el vector radial de cada una a partir de dónde está de verdad.
  // -------------------------------------------------------------------------------------------
  const resolver = (lista: typeof PM.piezas): PiezaRig[] => {
    const salida: PiezaRig[] = [];
    for (const p of lista) {
      const obj = motor.piezas[p.id];
      if (!obj) continue;   // si la geometría cambia de nombres, la pieza desaparece y nada revienta
      const radial = radialDe(obj);
      salida.push({
        id: p.id,
        obj,
        abierto: new Vector3(radial.x * p.r, p.y, radial.z * p.r),
        ancla: new Vector3(...p.ancla),
        lado: p.lado,
        movil: p.movil === true,
        titulo: p.titulo,
        nota: p.nota,
      });
    }
    return salida;
  };
  const piezas = resolver(PM.piezas);
  const sueltas = resolver(PM.sueltas);

  const aspas = ['radiador-0', 'radiador-1', 'radiador-2']
    .map((n) => motor.piezas[n])
    .filter((o): o is Object3D => !!o);

  // -------------------------------------------------------------------------------------------
  // LA CORONA. Una InstancedMesh, un objeto plano por tubo, y una función que compone matrices.
  // -------------------------------------------------------------------------------------------
  const malla = motor.piezas.tubos as InstancedMesh;
  // La esfera envolvente se calculó con los tubos en su sitio; al florecer se saldrían de ella y
  // el recorte por frustum los haría desaparecer de golpe.
  malla.frustumCulled = false;
  const n = malla.count;
  const tubos: TuboRig[] = Array.from({ length: n }, () => ({ z: 0 }));
  const mTubo = new Matrix4();
  const qTubo = new Quaternion();
  const pTubo = new Vector3();
  const eTubo = new Vector3(1, 1, 1);
  const ejeY = new Vector3(0, 1, 0);
  function escribirTubos(): void {
    for (let i = 0; i < n; i++) {
      const th = (i * Math.PI * 2) / n;
      const d = tubos[i].z;
      qTubo.setFromAxisAngle(ejeY, th);
      pTubo.set(Math.cos(th) * d, 0, Math.sin(th) * d);
      malla.setMatrixAt(i, mTubo.compose(pTubo, qTubo, eTubo));
    }
    malla.instanceMatrix.needsUpdate = true;
  }
  escribirTubos();

  // -------------------------------------------------------------------------------------------
  // LA MARCA. La placa comparte materiales con el resto del motor (blanco, medio, oscuro, linea),
  // así que bajarle la opacidad al motor se la bajaba también a ella y el momento de la marca no
  // se leía: en la captura el brazo blanco salía gris. Se le CLONAN sus materiales. Además se les
  // pone `emissive` = su propio color, apagado, para que la coreografía pueda auto-iluminarla:
  // un logotipo no se sombrea.
  const marca = motor.piezas.placa ?? new Group();
  const materialesMarca: Material[] = [];
  const emisivosMarca: MeshLambertMaterial[] = [];
  const chapaMarca: Material[] = [];
  marca.traverse((o) => {
    const con = o as { material?: Material };
    if (!con.material) return;
    const clon = transparentar(con.material.clone());
    if (o.name === 'placa-chapa' || o.name === 'aristas-placa-chapa') chapaMarca.push(clon);
    const lam = clon as MeshLambertMaterial;
    if (lam.isMeshLambertMaterial) {
      lam.emissive = lam.color.clone();
      lam.emissiveIntensity = 0;
      emisivosMarca.push(lam);
    }
    con.material = clon;
    materialesMarca.push(clon);
    cuerpos.push(clon);
  });

  const turbina = motor.piezas['turbobomba-turbina'] ?? new Group();

  function disponer(ancho: number, alto: number): void {
    let h = PM.motor.encuadre / 2;
    let w = h * (ancho / Math.max(1, alto));
    // Una ortográfica fija el ALTO; en un móvil de pie el ancho resultante no da para el motor.
    if (w < PM.motor.anchoMin / 2) {
      h *= (PM.motor.anchoMin / 2) / w;
      w = PM.motor.anchoMin / 2;
    }
    camara.left = -w;
    camara.right = w;
    camara.top = h;
    camara.bottom = -h;
    camara.updateProjectionMatrix();
  }

  function liberar(): void {
    motor.dispose();
    for (const mat of materialesMarca) mat.dispose();
  }

  return {
    escena, camara, raiz, sacudida, motor, piezas, sueltas, tubos, aspas, marca, materialesMarca,
    emisivosMarca, chapaMarca, turbina, luzClave, luzCamara, emisivos, caliente, cuerpos,
    yLabio: -M.tobera.largo,
    escribirTubos, disponer, liberar,
  };
}

/**
 * Prepara un material para que la coreografía pueda atenuarlo, SIN encender `transparent` aquí.
 *
 * Marcarlo transparente de por vida mueve las 43 llamadas de la lista opaca a la transparente, y
 * las dos listas se ordenan al revés: la opaca de delante a atrás (rechazo temprano por
 * profundidad) y la transparente de atrás a delante (sobredibujo máximo, cada fragmento se sombrea
 * y se mezcla). En un motor donde la campana, los 36 tubos y la cámara se solapan casi por
 * completo, eso multiplica el relleno por el número de capas que hay en cada píxel, y el relleno
 * —no los triángulos— es lo que decide el rendimiento en un móvil. La coreografía enciende
 * `transparent` en los dos únicos momentos que lo necesitan (el apagado de la marca y el fundido
 * final) y lo vuelve a apagar; son dos recompilaciones en toda la línea de tiempo, no una por
 * fotograma.
 *
 * `forceSinglePass` sí se deja puesto: con `transparent` encendido y `side: DoubleSide` el
 * renderizador dibuja la malla DOS VECES (traseras y luego delanteras, para ordenarlas). Las cinco
 * piezas DoubleSide se llevaban 18 840 triángulos y 5 llamadas de más por fotograma. Con sombreado
 * plano y opacidad uniforme la pasada doble no aporta nada.
 */
function transparentar(mat: Material): Material {
  if (mat.side === DoubleSide) mat.forceSinglePass = true;
  return mat;
}

/** Vector unitario radial de una pieza: por dónde sale en el despiece. Si la pieza está en el eje
 *  (todo el propulsor lo está) el vector no se usa, porque su `r` vale 0. */
function radialDe(obj: Object3D): Vector3 {
  const guardado = obj.userData.radial as Vector3 | undefined;
  if (guardado) return guardado.clone().normalize();
  const p = obj.position;
  const l = Math.hypot(p.x, p.z);
  return l > 1e-4 ? new Vector3(p.x / l, 0, p.z / l) : new Vector3(1, 0, 0);
}
