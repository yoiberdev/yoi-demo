// Motor de cohete procedimental. Toda la geometria se genera aqui: ni un solo asset.
// Eje del motor = Y. y = 0 en la garganta de la tobera. La campana baja (-Y), la camara sube (+Y).
// Unidades de motor: 1 u ~ 0,5 m reales. Campana: 3,30 u de alto y 4,20 u de boca. Motor entero: 7,0 u.

import {
  BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage,
  EdgesGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry,
  LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Quaternion,
  Shape, TorusGeometry, TubeGeometry, Vector2, Vector3, CatmullRomCurve3, type Curve, type Material,
} from 'three';

// ---------------------------------------------------------------------------
// 1. NUMEROS. Unica fuente. Nada de constantes sueltas mas abajo.
// ---------------------------------------------------------------------------

export const M: Ajustes = {
  // Tobera (perfil de Rao aproximado: arco de garganta + parabola de dos angulos).
  tobera: {
    rGarganta: 0.50,     // Rt
    rSalida: 2.10,       // Re  -> relacion de expansion (Re/Rt)^2 = 17,6
    largo: 3.30,         // Ln, del plano de garganta al plano de salida
    anguloEntrada: 38,   // grados; inclinacion de la pared justo tras la garganta
    anguloSalida: 11,    // grados; inclinacion de la pared en el labio
    arcoGarganta: 0.382, // radio del arco aguas abajo, en multiplos de Rt (valor clasico)
    pasosArco: 6,        // puntos del arco de garganta
    pasosParabola: 22,   // puntos de la parabola
    espesor: 0.05,       // pared
    labio: 0.055,        // radio del toro del borde de salida
    margenSalida: 0.16,  // los tubos paran antes del labio: asi se ve el liner blanco
    puntosGarganta: 13,  // puntos del perfil que forman el inserto de garganta (acento)
    segmentos: 96,       // segmentos de revolucion
  },
  // Camara de combustion: cilindro + convergente + arco de garganta aguas arriba.
  camara: {
    rCamara: 0.90,           // Rc -> relacion de contraccion (Rc/Rt)^2 = 3,24
    largoCilindro: 1.35,     // parte recta
    anguloConvergente: 35,   // grados
    arcoGarganta: 1.5,       // radio del arco aguas arriba, en multiplos de Rt
    pasosArco: 6,
    espesor: 0.07,
    segmentos: 96,
    zunchos: 5,              // aros de refuerzo alrededor del cilindro
    rZuncho: 0.035,
  },
  // Corona de tubos de refrigeracion: N tubos que abrazan la campana con giro helicoidal.
  refrigeracion: {
    n: 36,               // numero de tubos (ver tabla de coste)
    holgura: 0.88,       // fraccion del radio de contacto: 1 = tubos tocandose
    torsion: 22,         // grados de giro helicoidal de la garganta a la salida
    subeGarganta: 0.42,  // cuanto suben los tubos por encima de la garganta
    segmentosU: 40,      // pasos a lo largo del tubo
    segmentosV: 8,       // lados de la seccion del tubo
    rColector: 0.06,     // toros colectores arriba y abajo
  },
  // Placa de inyectores: reticula radial de orificios.
  inyector: {
    espesorPlaca: 0.16,
    rebaje: 0.055,        // cuanto sobresale el reborde
    anillos: [0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.84] as number[],
    porAnillo: [1, 6, 12, 18, 24, 30, 36] as number[],
    rOrificio: 0.042,
    hOrificio: 0.10,
    ladosOrificio: 8,
    rCupula: 0.90,        // domo del colector, encima de la placa
    altoCupula: 0.62,
    pasosCupula: 12,
  },
  // Turbobomba, colgada al costado de la camara.
  turbobomba: {
    azimut: 20,         // grados alrededor del eje
    radio: 1.78,        // distancia del eje al centro de la bomba
    altura: 1.50,       // y del centro
    rVoluta: 0.46,      // toro de la voluta
    rTuboVoluta: 0.19,
    rCuerpo: 0.33,
    largoCuerpo: 0.80,
    rTurbina: 0.38,
    largoTurbina: 0.52,
    rEntrada: 0.19,
    largoEntrada: 0.66,
    segmentos: 24,
  },
  // Conductos: tubos sobre curvas suaves de la bomba al colector de la campana.
  conductos: {
    radios: [0.115, 0.095, 0.07] as number[],
    segmentosU: 56,
    segmentosV: 8,
  },
  // Estructura de empuje: anillo + tirantes en A.
  bancada: {
    rAnillo: 1.15,
    rTuboAnillo: 0.075,
    altura: 3.05,        // y del anillo, por encima del inyector
    tirantes: 12,
    rTirante: 0.045,
    anclaje: 0.86,       // radio donde los tirantes tocan la camara
    yAnclaje: 1.95,
  },
  // Paneles radiadores en corona.
  radiadores: {
    n: 3,
    // 55 grados: con 30 uno de los tres paneles caia casi de canto desde la camara de reposo y se
    // leia como un cuchillo. Ninguno queda ahora a menos de 25 grados del plano de vista.
    azimut0: 55,        // grados del primer panel
    rInterior: 1.12,
    largo: 1.45,
    alto: 1.05,
    espesor: 0.05,
    // NEGATIVA: los paneles caen hacia fuera y abajo. Con +16 subian por encima del anillo de
    // bancada y la silueta del tercio superior era un aspa de veleta, no un motor.
    inclinacion: -8,    // grados de caida hacia fuera
    y: 2.35,            // por DEBAJO del anillo de bancada (3,05)
    aletas: 8,          // nervios (corrugado) de la cara
    amplitud: 0.07,     // altura del corrugado
    sesgo: 60.1,        // grados: el angulo de las aristas largas del logo de Yoiber
  },
  // Placa de identificacion: el monograma de Yoiber como chapa recortada.
  // Contornos precocinados del SVG (yoi-icon.svg), sin SVGLoader: ahorra 11 kB comprimidos.
  placa: {
    alto: 1.05,          // altura del monograma en unidades de motor
    espesor: 0.035,
    azimut: 135,         // hueco entre dos radiadores (55 y 175) y fuera del eje de la turbobomba
    radio: 1.28,         // justo por FUERA del anillo (r 1,15): la chapa se apoya en él
    y: 3.05,             // a la altura del anillo: atornillada, no flotando
    chapa: 0.06,         // espesor de la chapa de soporte que va DETRÁS del monograma
    margen: 0.16,        // margen de la chapa alrededor del monograma, en fracción de `alto`
  },
  // Contornos.
  aristas: { umbral: 24, ancho: 1 },
  // Paleta: los tres grises del logo de Yoiber + el acento del demo.
  paleta: {
    blanco: 0xf4f4f2,   // --fg del demo
    medio: 0x9a9a95,    // gris medio del logo, subido: con 0x8f no se separaba del oscuro
    oscuro: 0x3d3d3a,   // gris oscuro del logo, bajado: tres tonos que se distinguen a 200 px
    acento: 0xffd166,   // --acento del demo
    // CASI NEGRO, no gris. Con 0x8a8a86 (gris medio sobre cuerpos grises medios) los contornos
    // existian en el grafo y NO SE VEIAN en ninguna captura: el objeto se leia como arcilla. Un
    // contorno oscuro sobre el cuerpo es lo que separa "render por defecto" de "ilustracion".
    linea: 0x141412,
    // La chapa de la placa de identificacion: casi negra, como la linea. Con cualquiera de los tres
    // grises del logo, uno de los tres brazos del monograma se le fundia encima.
    chapa: 0x141412,
  },
};

/** Tipo mutable: `calidad()` reescribe unos pocos numeros antes de construir. */
type Ajustes = {
  tobera: { rGarganta: number; rSalida: number; largo: number; anguloEntrada: number; anguloSalida: number;
    arcoGarganta: number; pasosArco: number; pasosParabola: number; espesor: number; labio: number;
    margenSalida: number; puntosGarganta: number; segmentos: number };
  camara: { rCamara: number; largoCilindro: number; anguloConvergente: number; arcoGarganta: number;
    pasosArco: number; espesor: number; segmentos: number; zunchos: number; rZuncho: number };
  refrigeracion: { n: number; holgura: number; torsion: number; subeGarganta: number;
    segmentosU: number; segmentosV: number; rColector: number };
  inyector: { espesorPlaca: number; rebaje: number; anillos: number[]; porAnillo: number[];
    rOrificio: number; hOrificio: number; ladosOrificio: number; rCupula: number; altoCupula: number; pasosCupula: number };
  turbobomba: { azimut: number; radio: number; altura: number; rVoluta: number; rTuboVoluta: number;
    rCuerpo: number; largoCuerpo: number; rTurbina: number; largoTurbina: number; rEntrada: number;
    largoEntrada: number; segmentos: number };
  conductos: { radios: number[]; segmentosU: number; segmentosV: number };
  bancada: { rAnillo: number; rTuboAnillo: number; altura: number; tirantes: number; rTirante: number;
    anclaje: number; yAnclaje: number };
  radiadores: { n: number; azimut0: number; rInterior: number; largo: number; alto: number; espesor: number;
    inclinacion: number; y: number; aletas: number; amplitud: number; sesgo: number };
  placa: { alto: number; espesor: number; azimut: number; radio: number; y: number; chapa: number; margen: number };
  aristas: { umbral: number; ancho: number };
  paleta: { blanco: number; medio: number; oscuro: number; acento: number; linea: number; chapa: number };
};

/** Tres niveles. 'baja' es el que va al movil; 'alta' solo si hay sitio de sobra. */
export type Calidad = 'baja' | 'media' | 'alta';
const NIVELES: Record<Calidad, { tubos: number; segmentos: number; segmentosU: number; conductoU: number }> = {
  baja:  { tubos: 24, segmentos: 48, segmentosU: 26, conductoU: 32 },
  media: { tubos: 36, segmentos: 96, segmentosU: 40, conductoU: 56 },
  alta:  { tubos: 48, segmentos: 128, segmentosU: 52, conductoU: 72 },
};

export function calidad(nivel: Calidad): void {
  const n = NIVELES[nivel];
  M.refrigeracion.n = n.tubos;
  M.refrigeracion.segmentosU = n.segmentosU;
  M.tobera.segmentos = n.segmentos;
  M.camara.segmentos = n.segmentos;
  M.turbobomba.segmentos = Math.max(12, Math.round(n.segmentos / 4));
  M.conductos.segmentosU = n.conductoU;
}

const GRA = Math.PI / 180;

// ---------------------------------------------------------------------------
// 2. PERFILES. Listas de Vector2 (x = radio, y = eje) que luego revolucionan.
// ---------------------------------------------------------------------------

/** Pared interior de la campana, de la garganta al labio. Rao aproximado. */
export function perfilCampana(): Vector2[] {
  const t = M.tobera;
  const Rd = t.arcoGarganta * t.rGarganta;
  const cx = t.rGarganta + Rd;
  const pts: Vector2[] = [];

  // (a) arco de garganta aguas abajo: de 180 grados a 180 + anguloEntrada.
  for (let i = 0; i <= t.pasosArco; i++) {
    const f = (180 + (t.anguloEntrada * i) / t.pasosArco) * GRA;
    pts.push(new Vector2(cx + Rd * Math.cos(f), Rd * Math.sin(f)));
  }

  // (b) parabola (Bezier cuadratica) del final del arco al labio, tangente en ambos extremos.
  const N = pts[pts.length - 1];
  const E = new Vector2(t.rSalida, -t.largo);
  const d1 = new Vector2(Math.sin(t.anguloEntrada * GRA), -Math.cos(t.anguloEntrada * GRA));
  const d2 = new Vector2(Math.sin(t.anguloSalida * GRA), -Math.cos(t.anguloSalida * GRA));
  // N + a*d1 = E - b*d2  ->  sistema 2x2
  const det = d1.x * d2.y - d1.y * d2.x;
  const ex = E.x - N.x;
  const ey = E.y - N.y;
  const a = (ex * d2.y - ey * d2.x) / det;
  const Q = new Vector2(N.x + a * d1.x, N.y + a * d1.y);
  for (let i = 1; i <= t.pasosParabola; i++) {
    const u = i / t.pasosParabola;
    const w = 1 - u;
    pts.push(new Vector2(w * w * N.x + 2 * w * u * Q.x + u * u * E.x, w * w * N.y + 2 * w * u * Q.y + u * u * E.y));
  }
  return pts;
}

/** Pared interior de la camara: del arco de garganta aguas arriba al borde del inyector. */
export function perfilCamara(): Vector2[] {
  const c = M.camara;
  const t = M.tobera;
  const R1 = c.arcoGarganta * t.rGarganta;
  const cx = t.rGarganta + R1;
  const pts: Vector2[] = [];
  // arco de garganta aguas arriba: de 180 grados a 180 - anguloConvergente.
  for (let i = 0; i <= c.pasosArco; i++) {
    const f = (180 - (c.anguloConvergente * i) / c.pasosArco) * GRA;
    pts.push(new Vector2(cx + R1 * Math.cos(f), R1 * Math.sin(f)));
  }
  // tramo conico recto hasta el radio de camara.
  const p = pts[pts.length - 1];
  const dx = c.rCamara - p.x;
  pts.push(new Vector2(c.rCamara, p.y + dx / Math.tan(c.anguloConvergente * GRA)));
  // cilindro.
  pts.push(new Vector2(c.rCamara, pts[pts.length - 1].y + c.largoCilindro));
  return pts;
}

/** Cierra un perfil abierto en una pared con espesor: baja por dentro y sube por fuera. */
function conEspesor(perfil: Vector2[], espesor: number): Vector2[] {
  const fuera: Vector2[] = [];
  for (let i = perfil.length - 1; i >= 0; i--) {
    const a = perfil[Math.max(0, i - 1)];
    const b = perfil[Math.min(perfil.length - 1, i + 1)];
    const n = new Vector2(b.y - a.y, -(b.x - a.x)).normalize();
    if (n.x < 0) n.negate(); // normal siempre alejandose del eje
    fuera.push(new Vector2(perfil[i].x + n.x * espesor, perfil[i].y + n.y * espesor));
  }
  return perfil.concat(fuera);
}

// ---------------------------------------------------------------------------
// 3. TUBO DE RADIO VARIABLE. TubeGeometry no lo permite: se genera a mano
//    con los mismos marcos de Frenet, para que los tubos toquen en la garganta
//    y se abran con la campana igual que en un motor de pared tubular real.
// ---------------------------------------------------------------------------

export function tuboVariable(curva: Curve<Vector3>, radio: (u: number) => number, segU: number, segV: number): BufferGeometry {
  const marcos = curva.computeFrenetFrames(segU, false);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  const v = new Vector3();
  const nn = new Vector3();
  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    curva.getPointAt(u, P);
    N.copy(marcos.normals[i]);
    B.copy(marcos.binormals[i]);
    const r = radio(u);
    for (let j = 0; j <= segV; j++) {
      const w = (j / segV) * Math.PI * 2;
      const s = Math.sin(w);
      const c = -Math.cos(w);
      nn.set(N.x * c + B.x * s, N.y * c + B.y * s, N.z * c + B.z * s).normalize();
      v.copy(P).addScaledVector(nn, r);
      pos.push(v.x, v.y, v.z);
      nor.push(nn.x, nn.y, nn.z);
      uv.push(u, j / segV);
    }
  }
  for (let i = 1; i <= segU; i++) {
    for (let j = 1; j <= segV; j++) {
      const a = (segV + 1) * (i - 1) + (j - 1);
      const b = (segV + 1) * i + (j - 1);
      const c = (segV + 1) * i + j;
      const d = (segV + 1) * (i - 1) + j;
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/** Radio de contacto de N tubos apoyados sobre una pared de radio local rPared. */
export function radioTubo(rPared: number, n: number, holgura: number): number {
  const s = Math.sin(Math.PI / n);
  return ((rPared * s) / (1 - s)) * holgura;
}

// ---------------------------------------------------------------------------
// 4. MATERIALES
// ---------------------------------------------------------------------------

export interface Materiales {
  blanco: Material; medio: Material; oscuro: Material; acento: Material;
  /** El demo repinta este color segun el tema: claro sobre fondo negro, oscuro sobre fondo crema. */
  linea: LineBasicMaterial;
  /** Sin iluminar: el unico truco para que la garganta "arda" sin postprocesado. */
  caliente: Material;
  /** La chapa de la placa de identificacion (casi negra: separa los tres grises del monograma). */
  chapa: Material;
}

export function crearMateriales(): Materiales {
  const plano = (color: number, extra: object = {}) =>
    new MeshLambertMaterial({ color: new Color(color), flatShading: true, ...extra });
  return {
    blanco: plano(M.paleta.blanco, { side: DoubleSide }),
    medio: plano(M.paleta.medio),
    oscuro: plano(M.paleta.oscuro),
    acento: plano(M.paleta.acento, { emissive: new Color(M.paleta.acento), emissiveIntensity: 0.35 }),
    // opaco: la linea es tinta, no un velo. (WebGL ignora linewidth: el grosor es siempre 1 px.)
    linea: new LineBasicMaterial({ color: new Color(M.paleta.linea) }),
    caliente: new MeshBasicMaterial({ color: new Color(M.paleta.acento), side: DoubleSide }),
    chapa: plano(M.paleta.chapa),
  };
}

// ---------------------------------------------------------------------------
// 5. PIEZAS
// ---------------------------------------------------------------------------

function nombrar<T extends Object3D>(o: T, nombre: string): T {
  o.name = nombre;
  return o;
}

/** Curva 3D de un tubo de refrigeracion: sigue la campana por fuera, con giro helicoidal. */
export function curvaTubo(): { curva: CatmullRomCurve3; rPared: (u: number) => number } {
  const r = M.refrigeracion;
  const campana = perfilCampana();
  const camara = perfilCamara();
  // Tramo de perfil que abrazan los tubos: un poco de convergente + toda la campana.
  const arriba = camara.filter((p) => p.y <= r.subeGarganta).reverse().slice(0, -1);
  const abajo = campana.filter((p) => p.y >= -M.tobera.largo + M.tobera.margenSalida);
  const perfil = arriba.concat(abajo);
  const yIni = perfil[0].y;
  const yFin = perfil[perfil.length - 1].y;
  const pts: Vector3[] = [];
  const radios: number[] = [];
  for (const p of perfil) {
    const u = (p.y - yIni) / (yFin - yIni);
    const rPared = p.x + M.tobera.espesor;
    const rt = radioTubo(rPared, r.n, r.holgura);
    const rc = rPared + rt;
    const th = r.torsion * GRA * u;
    pts.push(new Vector3(rc * Math.cos(th), p.y, rc * Math.sin(th)));
    radios.push(rt);
  }
  const curva = new CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  // radio del tubo en funcion de u, interpolado sobre la misma lista.
  const rPared = (u: number): number => {
    const f = u * (radios.length - 1);
    const i = Math.min(radios.length - 2, Math.floor(f));
    return radios[i] + (radios[i + 1] - radios[i]) * (f - i);
  };
  return { curva, rPared };
}

function construirCampana(mat: Materiales): Group {
  const g = nombrar(new Group(), 'campana');
  const perfil = conEspesor(perfilCampana(), M.tobera.espesor);
  const pared = new LatheGeometry(perfil, M.tobera.segmentos);
  pared.computeVertexNormals();
  g.add(nombrar(new Mesh(pared, mat.blanco), 'campana-pared'));

  // Inserto de garganta: se ve al mirar dentro de la campana. Es el unico acento grande.
  const gar = perfilCampana().slice(0, M.tobera.puntosGarganta).map((p) => new Vector2(p.x - 0.006, p.y));
  const garganta = new LatheGeometry(gar, M.tobera.segmentos);
  garganta.computeVertexNormals();
  g.add(nombrar(new Mesh(garganta, mat.caliente), 'campana-garganta'));

  const labio = new TorusGeometry(M.tobera.rSalida + M.tobera.espesor / 2, M.tobera.labio, 6, M.tobera.segmentos);
  labio.rotateX(Math.PI / 2);
  labio.translate(0, -M.tobera.largo, 0);
  g.add(nombrar(new Mesh(labio, mat.medio), 'campana-labio'));
  return g;
}

function construirRefrigeracion(mat: Materiales): Group {
  const r = M.refrigeracion;
  const g = nombrar(new Group(), 'refrigeracion');
  const { curva, rPared } = curvaTubo();
  const geo = tuboVariable(curva, rPared, r.segmentosU, r.segmentosV);
  const tubos = new InstancedMesh(geo, mat.medio, r.n);
  tubos.instanceMatrix.setUsage(DynamicDrawUsage);
  const m = new Matrix4();
  const q = new Quaternion();
  const eje = new Vector3(0, 1, 0);
  for (let i = 0; i < r.n; i++) {
    q.setFromAxisAngle(eje, (i * Math.PI * 2) / r.n);
    tubos.setMatrixAt(i, m.makeRotationFromQuaternion(q));
  }
  tubos.instanceMatrix.needsUpdate = true;
  g.add(nombrar(tubos, 'tubos'));

  // Colectores: toros que atan la corona arriba (garganta) y abajo (salida).
  const pIni = curva.getPointAt(0);
  const pFin = curva.getPointAt(1);
  for (const [nombre, p, rt] of [
    ['colector-alto', pIni, rPared(0)],
    ['colector-bajo', pFin, rPared(1)],
  ] as [string, Vector3, number][]) {
    const rad = Math.hypot(p.x, p.z) + rt * 0.35;
    const t = new TorusGeometry(rad, Math.max(r.rColector, rt * 0.55), 6, M.tobera.segmentos);
    t.rotateX(Math.PI / 2);
    t.translate(0, p.y, 0);
    g.add(nombrar(new Mesh(t, mat.oscuro), nombre));
  }
  return g;
}

function construirCamara(mat: Materiales): Group {
  const c = M.camara;
  const g = nombrar(new Group(), 'camara');
  const pared = new LatheGeometry(conEspesor(perfilCamara(), c.espesor), c.segmentos);
  pared.computeVertexNormals();
  g.add(nombrar(new Mesh(pared, mat.blanco), 'camara-pared'));

  // Zunchos de refuerzo, instanciados a lo largo del cilindro.
  const perfil = perfilCamara();
  const yA = perfil[perfil.length - 2].y;
  const yB = perfil[perfil.length - 1].y;
  const aro = new TorusGeometry(c.rCamara + c.espesor + c.rZuncho * 0.6, c.rZuncho, 6, 48);
  aro.rotateX(Math.PI / 2);
  // En ambar: en el estado ensamblado no habia un solo pixel de acento y el conjunto era
  // monocromo. Cinco aros pequenos y fijos bastan para que el objeto tenga color propio.
  const zunchos = new InstancedMesh(aro, mat.acento, c.zunchos);
  const m = new Matrix4();
  for (let i = 0; i < c.zunchos; i++) {
    const u = (i + 0.5) / c.zunchos;
    zunchos.setMatrixAt(i, m.makeTranslation(0, yA + (yB - yA) * u, 0));
  }
  zunchos.instanceMatrix.needsUpdate = true;
  g.add(nombrar(zunchos, 'camara-zunchos'));
  return g;
}

function construirInyector(mat: Materiales): Group {
  const i = M.inyector;
  const c = M.camara;
  const g = nombrar(new Group(), 'inyector');
  const yPlaca = perfilCamara()[perfilCamara().length - 1].y;

  const placa = new CylinderGeometry(c.rCamara + i.rebaje, c.rCamara + i.rebaje, i.espesorPlaca, c.segmentos, 1);
  placa.translate(0, yPlaca + i.espesorPlaca / 2, 0);
  g.add(nombrar(new Mesh(placa, mat.medio), 'inyector-placa'));

  // Reticula radial de orificios: anillos concentricos, todos en una InstancedMesh.
  const total = i.porAnillo.reduce((a, b) => a + b, 0);
  const orif = new CylinderGeometry(i.rOrificio, i.rOrificio, i.hOrificio, i.ladosOrificio, 1);
  const orificios = new InstancedMesh(orif, mat.acento, total);
  const m = new Matrix4();
  let k = 0;
  for (let a = 0; a < i.anillos.length; a++) {
    const rad = i.anillos[a];
    const n = i.porAnillo[a];
    for (let j = 0; j < n; j++) {
      const th = (j / n) * Math.PI * 2 + (a % 2) * (Math.PI / n);
      orificios.setMatrixAt(k++, m.makeTranslation(rad * Math.cos(th), yPlaca + i.espesorPlaca / 2, rad * Math.sin(th)));
    }
  }
  orificios.instanceMatrix.needsUpdate = true;
  g.add(nombrar(orificios, 'inyector-orificios'));

  return g;
}

/** Cupula del colector, encima de la placa. Pieza propia: al levantarla se ve la reticula. */
function construirCupula(mat: Materiales): Group {
  const i = M.inyector;
  const g = nombrar(new Group(), 'cupula');
  const yBase = perfilCamara()[perfilCamara().length - 1].y + i.espesorPlaca;
  const cup: Vector2[] = [];
  for (let s = 0; s <= i.pasosCupula; s++) {
    const a = (s / i.pasosCupula) * (Math.PI / 2);
    cup.push(new Vector2(i.rCupula * Math.cos(a), yBase + i.altoCupula * Math.sin(a)));
  }
  const cupula = new LatheGeometry(cup, M.camara.segmentos);
  cupula.computeVertexNormals();
  g.add(nombrar(new Mesh(cupula, mat.blanco), 'cupula-domo'));
  const cuello = new TorusGeometry(i.rCupula, 0.05, 6, M.camara.segmentos);
  cuello.rotateX(Math.PI / 2);
  cuello.translate(0, yBase, 0);
  g.add(nombrar(new Mesh(cuello, mat.oscuro), 'cupula-cuello'));
  return g;
}

function construirTurbobomba(mat: Materiales): Group {
  const t = M.turbobomba;
  const g = nombrar(new Group(), 'turbobomba');
  const yV = t.largoCuerpo * 0.22;

  // Voluta: una ESPIRAL de seccion creciente, no un toro. Un toro es simetrico y se lee como el
  // grifo de un lavabo; una voluta de bomba crece de la lengueta a la descarga, y ese crecimiento
  // es justo lo que la hace reconocible. Se genera con tuboVariable(), el mismo generador de los
  // tubos de refrigeracion (radio variable, que TubeGeometry no permite).
  const vueltas = 1.35;
  const puntosVoluta: Vector3[] = [];
  const pasosVoluta = 26;
  for (let i = 0; i <= pasosVoluta; i++) {
    const u = i / pasosVoluta;
    const a = u * vueltas * Math.PI * 2;
    const rad = t.rVoluta * (0.52 + 0.48 * u);
    puntosVoluta.push(new Vector3(rad * Math.cos(a), yV + u * t.rTuboVoluta * 0.55, rad * Math.sin(a)));
  }
  const curvaVoluta = new CatmullRomCurve3(puntosVoluta, false, 'centripetal', 0.5);
  const voluta = tuboVariable(curvaVoluta, (u) => t.rTuboVoluta * (0.55 + 0.45 * u), 44, 8);
  g.add(nombrar(new Mesh(voluta, mat.medio), 'turbobomba-voluta'));

  const cuerpo = new CylinderGeometry(t.rCuerpo, t.rCuerpo, t.largoCuerpo, t.segmentos, 1);
  g.add(nombrar(new Mesh(cuerpo, mat.blanco), 'turbobomba-cuerpo'));

  const yT = -(t.largoCuerpo / 2 + t.largoTurbina / 2);
  const turbina = new CylinderGeometry(t.rTurbina * 0.62, t.rTurbina * 0.62, t.largoTurbina, t.segmentos, 1);
  turbina.translate(0, yT, 0);
  const rotor = nombrar(new Mesh(turbina, mat.oscuro), 'turbobomba-turbina');
  // ALABES. El rotor gira en el encendido (coreografia: turbina.rotation.y = f(rpm, tiempo)) y con
  // un cilindro liso el giro NO SE VE. Son hijos del rotor, asi que giran con el, y van en una
  // InstancedMesh: 18 alabes, una sola llamada de dibujo.
  const alabe = new BoxGeometry(t.rTurbina * 0.72, t.largoTurbina * 0.78, 0.022);
  alabe.translate(t.rTurbina * 0.66, 0, 0);
  const alabes = new InstancedMesh(alabe, mat.medio, 18);
  const mAl = new Matrix4();
  const qAl = new Quaternion();
  const ejeAl = new Vector3(0, 1, 0);
  const pAl = new Vector3();
  const eAl = new Vector3(1, 1, 1);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    qAl.setFromAxisAngle(ejeAl, a);
    // no radiales del todo: inclinados 24 grados, que es lo que hace que se lea el sentido de giro
    const qPaso = new Quaternion().setFromAxisAngle(new Vector3(Math.cos(a), 0, Math.sin(a)), 24 * GRA);
    alabes.setMatrixAt(i, mAl.compose(pAl.set(0, yT, 0), qAl.multiply(qPaso), eAl));
  }
  alabes.instanceMatrix.needsUpdate = true;
  rotor.add(nombrar(alabes, 'turbobomba-alabes'));
  g.add(rotor);

  const escape = new ConeGeometry(t.rTurbina * 0.86, t.largoTurbina * 0.7, t.segmentos, 1, true);
  escape.rotateX(Math.PI);
  escape.translate(0, yT - t.largoTurbina * 0.85, 0);
  g.add(nombrar(new Mesh(escape, mat.medio), 'turbobomba-escape'));

  const entrada = new CylinderGeometry(t.rEntrada, t.rEntrada, t.largoEntrada, 16, 1);
  entrada.translate(0, t.largoCuerpo / 2 + t.largoEntrada / 2, 0);
  g.add(nombrar(new Mesh(entrada, mat.medio), 'turbobomba-entrada'));

  const th = t.azimut * GRA;
  g.position.set(t.radio * Math.cos(th), t.altura, t.radio * Math.sin(th));
  g.rotation.y = -th;
  g.userData.radial = new Vector3(Math.cos(th), 0, Math.sin(th));
  return g;
}

function construirConductos(mat: Materiales): Group {
  const g = nombrar(new Group(), 'conductos');
  const t = M.turbobomba;
  const c = M.conductos;
  const i = M.inyector;
  const th = t.azimut * GRA;
  const rC = M.camara.rCamara + M.camara.espesor;
  const yCol = curvaTubo().curva.getPointAt(0).y;
  const pol = (rad: number, ang: number, y: number) => new Vector3(rad * Math.cos(ang), y, rad * Math.sin(ang));

  // 0 - descarga principal: rodea la camara y baja al colector de la corona de tubos.
  const c0 = [
    pol(t.radio, th, t.altura - t.largoCuerpo * 0.2),
    pol(rC + 0.34, th - 0.85, t.altura - 0.15),
    pol(rC + 0.26, th - 2.10, t.altura - 0.75),
    pol(rC + 0.14, th - 3.05, 0.85),
    pol(M.tobera.rGarganta + 0.55, th - 3.55, yCol + 0.05),
  ];
  // 1 - linea al domo del inyector: sube por el otro lado y entra por el costado de la cupula.
  const c1 = [
    pol(t.radio, th, t.altura + t.largoCuerpo * 0.35),
    pol(rC + 0.30, th + 0.75, t.altura + 0.55),
    pol(rC + 0.22, th + 1.75, t.altura + 1.15),
    pol(i.rCupula * 0.92, th + 2.35, M.bancada.yAnclaje + 0.55),
  ];
  // 2 - escape de la turbina: baja pegado a la campana y sale por fuera de los tubos.
  const c2 = [
    pol(t.radio, th, t.altura - t.largoCuerpo / 2 - t.largoTurbina * 0.7),
    pol(rC + 0.30, th - 0.35, 0.55),
    pol(rC + 0.55, th - 0.75, -0.70),
    pol(rC + 1.05, th - 1.05, -1.85),
  ];
  const rutas = [c0, c1, c2];
  // el tercero era `oscuro` y sobre fondo negro desaparecia: los tres van en tonos que se ven
  const materiales = [mat.medio, mat.blanco, mat.medio];
  rutas.forEach((pts, k) => {
    const curva = new CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const geo = new TubeGeometry(curva, c.segmentosU, c.radios[k], c.segmentosV, false);
    g.add(nombrar(new Mesh(geo, materiales[k]), `conducto-${k}`));
  });
  g.userData.radial = new Vector3(Math.cos(th), 0, Math.sin(th));
  return g;
}

function construirBancada(mat: Materiales): Group {
  const b = M.bancada;
  const g = nombrar(new Group(), 'bancada');
  const anillo = new TorusGeometry(b.rAnillo, b.rTuboAnillo, 8, 72);
  anillo.rotateX(Math.PI / 2);
  anillo.translate(0, b.altura, 0);
  g.add(nombrar(new Mesh(anillo, mat.medio), 'bancada-anillo'));

  // Tirantes en A: pares que suben del anclaje al anillo abriendose.
  const tir = new CylinderGeometry(b.rTirante, b.rTirante, 1, 6, 1);
  tir.translate(0, 0.5, 0); // origen en la base, para escalar por la longitud
  const tirantes = new InstancedMesh(tir, mat.oscuro, b.tirantes);
  const m = new Matrix4();
  const q = new Quaternion();
  const eje = new Vector3(0, 1, 0);
  const esc = new Vector3();
  const dir = new Vector3();
  const pos = new Vector3();
  for (let i = 0; i < b.tirantes; i++) {
    const par = Math.floor(i / 2);
    const sgn = i % 2 === 0 ? 1 : -1;
    const base = ((par + 0.5) / (b.tirantes / 2)) * Math.PI * 2;
    const arriba = base + sgn * (Math.PI / (b.tirantes / 2)) * 0.85;
    const a = new Vector3(b.anclaje * Math.cos(base), b.yAnclaje, b.anclaje * Math.sin(base));
    const z = new Vector3(b.rAnillo * Math.cos(arriba), b.altura, b.rAnillo * Math.sin(arriba));
    dir.subVectors(z, a);
    const L = dir.length();
    q.setFromUnitVectors(eje, dir.normalize());
    tirantes.setMatrixAt(i, m.compose(pos.copy(a), q, esc.set(1, L, 1)));
  }
  tirantes.instanceMatrix.needsUpdate = true;
  g.add(nombrar(tirantes, 'bancada-tirantes'));
  return g;
}

function construirRadiadores(mat: Materiales): Group {
  const r = M.radiadores;
  const g = nombrar(new Group(), 'radiadores');
  // Seccion corrugada del panel (plano alto x espesor); se extruye a lo largo del panel.
  // Luego se cizalla para que las aristas largas queden a 60,1 grados del corte del extremo:
  // es la familia de aristas dominante del logo de Yoiber, metida en la propia chapa.
  const s = new Shape();
  const pasos = r.aletas * 2;
  s.moveTo(-r.alto / 2, 0);
  for (let k = 1; k <= pasos; k++) s.lineTo(-r.alto / 2 + (k * r.alto) / pasos, (k % 2) * r.amplitud);
  s.lineTo(r.alto / 2, -r.espesor);
  s.lineTo(-r.alto / 2, -r.espesor);
  s.closePath();
  const geo = new ExtrudeGeometry(s, { depth: r.largo, bevelEnabled: false, curveSegments: 1 });
  // Cizalla: x' = x + z / tan(sesgo). La extrusion va en +Z y el alto del panel en X.
  const d = r.largo / Math.tan(r.sesgo * GRA);
  const cz = new Matrix4().set(1, 0, d / r.largo, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  geo.applyMatrix4(cz);
  geo.translate(-d / 2, 0, -r.largo / 2);
  geo.rotateY(Math.PI / 2); // el panel sale hacia +X
  geo.rotateX(-Math.PI / 2);
  geo.translate(r.largo / 2, 0, 0);

  for (let i = 0; i < r.n; i++) {
    const th = (r.azimut0 + (i * 360) / r.n) * GRA;
    // LOS TRES CON EL MISMO MATERIAL. Repartir los tres grises del logo entre ellos era bonito
    // sobre el papel: en pantalla el panel blanco, liso desde ese angulo, se leia como una hoja en
    // blanco pegada al motor -o sea, como un fallo de carga- en cinco de las nueve capturas.
    const p = nombrar(new Mesh(geo, mat.medio), `radiador-${i}`);
    p.position.set(r.rInterior * Math.cos(th), r.y, r.rInterior * Math.sin(th));
    p.rotation.set(0, -th, r.inclinacion * GRA);
    p.userData.radial = new Vector3(Math.cos(th), 0, Math.sin(th));
    g.add(p);
  }
  return g;
}

/**
 * Monograma de Yoiber, copiado del SVG en coordenadas del viewBox 439x523 y
 * normalizado: origen en la junta de las tres formas (141,84 / 229,35), Y hacia arriba,
 * altura total = 1. Son poligonos rectos: no hace falta SVGLoader ni curvas.
 */
export const MONOGRAMA: [number, number][][] = [
  // gris oscuro (brazo que baja a la izquierda)
  [[218.560, 324.158], [284.330, 318.938], [287.248, 314.000], [178.507, 502.841],
   [41.928, 522.881], [7.268, 462.912], [141.839, 229.348]],
  // gris medio (brazo que sube a la izquierda)
  [[204.770, 0.000], [239.437, 59.955], [141.891, 229.411], [8.981, 65.162], [40.076, 0.000]],
  // blanco (brazo que sube a la derecha)
  [[398.846, 0.038], [433.279, 59.941], [284.330, 318.938], [218.561, 324.158],
   [141.840, 229.347], [262.418, 20.069], [297.077, 0.039]],
];

function construirPlaca(mat: Materiales): Group {
  const pl = M.placa;
  const g = nombrar(new Group(), 'placa');
  const k = pl.alto / 523;
  const mats = [mat.oscuro, mat.medio, mat.blanco];
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  MONOGRAMA.forEach((poli, i) => {
    const sh = new Shape();
    poli.forEach(([x, y], j) => {
      const px = (x - 141.84) * k;
      const py = -(y - 229.35) * k;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px);
      y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      if (j === 0) sh.moveTo(px, py); else sh.lineTo(px, py);
    });
    sh.closePath();
    const geo = new ExtrudeGeometry(sh, { depth: pl.espesor, bevelEnabled: false, curveSegments: 1 });
    g.add(nombrar(new Mesh(geo, mats[i]), `placa-${i}`));
  });
  // LA CHAPA. Sin ella el monograma era una pieza pequena SUELTA flotando dentro del anillo de
  // bancada y cruzandose con los tirantes: leia como basura poligonal, y una marca mal puesta hace
  // mas dano que ninguna marca. Ahora es lo que promete su nombre: una placa de identificacion,
  // con su borde (lleva contorno) y el monograma en relieve encima.
  const mg = pl.alto * pl.margen;
  const chapa = new BoxGeometry(x1 - x0 + mg * 2, y1 - y0 + mg * 2, pl.chapa);
  chapa.translate((x0 + x1) / 2, (y0 + y1) / 2, -pl.chapa / 2);
  g.add(nombrar(new Mesh(chapa, mat.chapa), 'placa-chapa'));
  const th = pl.azimut * GRA;
  g.position.set(pl.radio * Math.cos(th), pl.y, pl.radio * Math.sin(th));
  g.rotation.y = Math.PI / 2 - th;   // la chapa mira hacia fuera, en su propio plano
  g.userData.radial = new Vector3(Math.cos(th), 0, Math.sin(th));
  return g;
}

// ---------------------------------------------------------------------------
// 6. CONTORNOS. Solo sobre las piezas con aristas de verdad.
// ---------------------------------------------------------------------------

// Solo las piezas con aristas de verdad. Sobre una superficie de revolucion suave
// EdgesGeometry con umbral bajo dibuja cada faceta (miles de lineas de ruido); con
// umbral alto deja exactamente los pliegues: labio, borde de placa, corte del panel.
const CON_ARISTAS = [
  'campana-pared', 'campana-labio', 'camara-pared', 'inyector-placa',
  'turbobomba-cuerpo', 'turbobomba-turbina', 'turbobomba-entrada', 'turbobomba-escape', 'cupula-domo',
  'radiador-0', 'radiador-1', 'radiador-2', 'placa-0', 'placa-1', 'placa-2', 'placa-chapa',
  'turbobomba-voluta',
];

/** Anade el contorno como HIJO de cada pieza: asi viaja con ella durante el despiece. */
function anadirAristas(raiz: Group, mat: Materiales): void {
  const objetivo: Mesh[] = [];
  raiz.traverse((o) => { if (o instanceof Mesh && !(o instanceof InstancedMesh) && CON_ARISTAS.includes(o.name)) objetivo.push(o); });
  for (const o of objetivo) {
    const e = new EdgesGeometry(o.geometry, M.aristas.umbral);
    o.add(nombrar(new LineSegments(e, mat.linea), `aristas-${o.name}`));
  }
}

// ---------------------------------------------------------------------------
// 7. MONTAJE
// ---------------------------------------------------------------------------

export interface Motor {
  grupo: Group;
  piezas: Record<string, Object3D>;
  materiales: Materiales;
  /** Orden de las piezas a lo largo del eje, de abajo a arriba: sirve para el despiece axial. */
  ordenAxial: string[];
  /** Piezas que se abren radialmente; cada una lleva userData.radial. */ 
  ordenRadial: string[];
  dispose(): void;
}

export function crearMotor(): Motor {
  const materiales = crearMateriales();
  const grupo = nombrar(new Group(), 'motor');

  const propulsor = nombrar(new Group(), 'propulsor');
  propulsor.add(
    construirCampana(materiales), construirRefrigeracion(materiales),
    construirCamara(materiales), construirInyector(materiales), construirCupula(materiales),
  );

  const periferia = nombrar(new Group(), 'periferia');
  periferia.add(construirTurbobomba(materiales), construirConductos(materiales), construirRadiadores(materiales), construirPlaca(materiales));

  const bancada = construirBancada(materiales);
  grupo.add(propulsor, periferia, bancada);
  anadirAristas(grupo, materiales);

  const piezas: Record<string, Object3D> = {};
  grupo.traverse((o) => { if (o.name) piezas[o.name] = o; });
  grupo.traverse((o) => { o.userData.reposo = o.position.clone(); });

  return {
    grupo,
    piezas,
    materiales,
    ordenAxial: ['campana', 'refrigeracion', 'camara', 'inyector', 'cupula', 'bancada'],
    ordenRadial: ['turbobomba', 'conductos', 'radiador-0', 'radiador-1', 'radiador-2', 'placa'],
    dispose() {
      grupo.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const k of Object.keys(materiales)) (materiales as unknown as Record<string, Material>)[k].dispose();
    },
  };
}
