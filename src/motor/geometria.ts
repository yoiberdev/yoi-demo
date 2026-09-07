// Motor de cohete procedimental. Toda la geometria se genera aqui: ni un solo asset.
// Eje del motor = Y. y = 0 en la garganta de la tobera. La campana baja (-Y), la camara sube (+Y).
// Unidades de motor: 1 u ~ 0,5 m reales. Campana: 3,30 u de alto y 4,20 u de boca. Motor entero:
// 6,48 u de alto (y de -3,35 en el labio a +3,13 en el anillo de bancada) y 4,84 u de ancho.

import {
  BackSide, BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide, DynamicDrawUsage,
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
    zunchos: 3,              // aros de refuerzo alrededor del cilindro
    rZuncho: 0.05,
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
  // TORNILLERIA. Lo que hace que una maquina se lea como compleja no son mas piezas grandes, sino
  // detalle pequeno repetido. Cabeza hexagonal (un cilindro de 6 segmentos ES un hexagono) y todas
  // las coronas en UNA InstancedMesh: una sola llamada de dibujo para las tres bridas.
  tornillos: {
    r: 0.045,        // radio de la cabeza
    alto: 0.040,     // lo que sobresale de la brida
    nCamara: 18,     // brida de arriba de la camara, donde monta el inyector
    nBancada: 12,    // uno por tirante del anillo de empuje
    nBomba: 8,       // brida de la turbobomba
  },

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
    // PEGADOS AL CUERPO Y CORTOS. Medido en el grafo: con rInterior 1,12 y largo 1,45 los paneles
    // llegaban a radio 2,57 -mas anchos que la boca de la campana (2,18)- y a y = 3,28, por encima
    // del anillo de bancada (3,13). A 200 px eso no era un motor: era un aspa. Ahora el panel cabe
    // dentro de la silueta que ya manda (la campana) en vez de discutirla.
    rInterior: 1.05,
    largo: 1.00,
    alto: 0.85,
    espesor: 0.055,
    // NEGATIVA: los paneles caen hacia fuera y abajo. Con +16 subian por encima del anillo de
    // bancada y la silueta del tercio superior era un aspa de veleta, no un motor.
    inclinacion: -8,    // grados de caida hacia fuera
    y: 2.00,            // por DEBAJO del anillo de bancada (3,05) y de la cupula (2,94)
    aletas: 4,          // nervios (corrugado) de la cara: con 6 el panel era un garabato de rayas
    amplitud: 0.07,     // altura del corrugado
    sesgo: 60.1,        // grados: el angulo de las aristas largas del logo de Yoiber
  },
  // Placa de identificacion: el monograma de Yoiber como chapa recortada.
  // Contornos precocinados del SVG (yoi-icon.svg), sin SVGLoader: ahorra 11 kB comprimidos.
  placa: {
    // UNA CHAPITA, NO UN CARTEL. Con alto 1,05 la chapa medía 0,86 x 1,39 y llegaba a y = 3,68:
    // era la pieza MÁS ALTA del motor, tapaba la cúpula y, al ser casi negra, sobre fondo negro
    // leía como un agujero recortado en el objeto. A la mitad de tamaño y colgada por debajo del
    // anillo se lee por lo que es: una placa de identificación atornillada.
    alto: 0.52,          // altura del monograma en unidades de motor
    espesor: 0.03,
    azimut: 135,         // hueco entre dos radiadores (55 y 175) y fuera del eje de la turbobomba
    radio: 1.26,         // justo por FUERA del anillo (r 1,15 + tubo 0,075): la chapa se apoya en él
    y: 2.72,             // cuelga DEL anillo: su borde de arriba queda justo en 3,05
    chapa: 0.05,         // espesor de la chapa de soporte que va DETRÁS del monograma
    margen: 0.18,        // margen de la chapa alrededor del monograma, en fracción de `alto`
  },
  // Contornos. `grosor` es el empuje del casco de silueta en unidades de motor. La camara es
  // ortografica con `encuadre` 8,2 sobre el alto del lienzo: a 800 px de alto, 1 u = 97,6 px, asi
  // que 0,028 u son 2,7 px de tinta en el reposo y 1,6 px en el despiece, que va a escala 0,58.
  // Se probo con 0,022 (2,1 px): en el despiece del capitulo claro bajaba a 1,25 px y el borde de
  // la campana contra el crema se perdia a ratos (a2-z3.png contra a3-z3.png). Por arriba, mas de
  // 3,5 px engorda las piezas finas -el conducto mide 0,115 de radio- en vez de perfilarlas.
  aristas: { umbral: 24, ancho: 1, grosor: 0.028 },
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
    // LOS DOS COLORES DE TINTA, UNO POR TEMA. Se probaron los cuatro pares mirando la captura:
    //
    //   · Tema oscuro, fondo #000. La tinta CLARA (0xc8c8c2, el "contorno de pegatina") se probo y
    //     se descarto: dibuja el borde exterior contra el fondo, pero ahi el objeto ya destaca
    //     solo, y a cambio BORRA lo unico que hacia falta -la separacion entre una pieza y la de
    //     detras-, porque pieza y pieza son las dos claras (v-osc-claro.png: los radiadores se
    //     funden con la camara y el conducto pierde su borde). Asi que tinta oscura tambien aqui,
    //     y lo mas pegada al fondo que se pueda: con 0x141412 el casco deja un halo gris de 2 px
    //     alrededor de la silueta sobre el negro puro.
    //   · Tema claro, fondo crema #efe9df, que es el capitulo "como esta hecho". Aqui pasa lo
    //     contrario: el gris `blanco` del motor (0xf4f4f2) ES el fondo -la campana y la cupula se
    //     comen con el papel (a0-z4.png: el labio blanco se derrama sobre el crema sin ningun
    //     borde)- y la tinta pasa de adorno a ser lo unico que dibuja el objeto. Aqui interesa que
    //     sea la MISMA tinta que la letra de la pagina (--fg #141414), no el negro del otro tema.
    //
    // O sea: la tinta es oscura en los dos temas, pero por razones opuestas y con valores
    // distintos. `aplicarTema()` las cambia cuando el demo cambia de capitulo.
    lineaClaro: 0x141412,
    // CASCO DE SILUETA. Copia de las piezas grandes en BackSide con los vertices empujados por su
    // normal suavizada: es la linea que WebGL no sabe dibujar con `linewidth` y la que separa el
    // objeto del fondo y una pieza de la de detras.
    silueta: 0x050504,
    siluetaClaro: 0x141412,
    // La chapa de la placa de identificacion. Casi negra NO: sobre fondo negro la chapa desaparecia
    // y el recorte se leia como un agujero en el motor. Este gris es mas oscuro que el `oscuro` del
    // logo (0x3d3d3a) pero sigue teniendo cuerpo sobre negro, y los tres brazos del monograma
    // (oscuro, medio, blanco) se separan de el.
    chapa: 0x2a2a27,
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
  tornillos: { r: number; alto: number; nCamara: number; nBancada: number; nBomba: number };
  conductos: { radios: number[]; segmentosU: number; segmentosV: number };
  bancada: { rAnillo: number; rTuboAnillo: number; altura: number; tirantes: number; rTirante: number;
    anclaje: number; yAnclaje: number };
  radiadores: { n: number; azimut0: number; rInterior: number; largo: number; alto: number; espesor: number;
    inclinacion: number; y: number; aletas: number; amplitud: number; sesgo: number };
  placa: { alto: number; espesor: number; azimut: number; radio: number; y: number; chapa: number; margen: number };
  aristas: { umbral: number; ancho: number; grosor: number };
  paleta: { blanco: number; medio: number; oscuro: number; acento: number; linea: number;
    lineaClaro: number; silueta: number; siluetaClaro: number; chapa: number };
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
  /** Aristas de pliegue. `aplicarTema()` repinta su color al cambiar de fondo. */
  linea: LineBasicMaterial;
  /** Casco de silueta: BackSide, sin iluminar. Es tinta, no un material del objeto. */
  silueta: MeshBasicMaterial;
  /** Sin iluminar: el unico truco para que la garganta "arda" sin postprocesado. */
  caliente: Material;
  /** La chapa de la placa de identificacion (casi negra: separa los tres grises del monograma). */
  chapa: Material;
}

export function crearMateriales(): Materiales {
  // POLYGON OFFSET en todas las caras iluminadas. Las aristas de pliegue son LineSegments que
  // pasan EXACTAMENTE por la superficie de la cara: en el z-test empatan y gana uno u otro según
  // el redondeo de cada píxel, y en la campana salían puntos negros sueltos y crestas punteadas
  // (informe BRECHA, fila 5, render/zoom-aristas y zoom-curva). Con factor 1 / units 1 las caras
  // se empujan un pelín hacia el fondo y la línea gana siempre donde coinciden. Los cascos de
  // silueta (BackSide, MeshBasic) y la propia línea no lo necesitan: no compiten con nadie.
  // Medido a 1440x900 y 2x: los píxeles oscuros aislados de la mitad inferior del motor bajan
  // (cifras en el json del carril "motor" de la vuelta 1).
  const plano = (color: number, extra: object = {}) =>
    new MeshLambertMaterial({
      color: new Color(color), flatShading: true,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      ...extra,
    });
  return {
    blanco: plano(M.paleta.blanco, { side: DoubleSide }),
    medio: plano(M.paleta.medio),
    oscuro: plano(M.paleta.oscuro),
    // EL EMISIVO DEL ACENTO NO ES SU PROPIO COLOR, es un ámbar mucho más saturado. Motivo medido:
    // el renderizador no tiene mapeo de tonos, así que "emisivo x N" recorta cada canal a 1 y con
    // un ámbar claro (0xffd166 = 1 / 0,82 / 0,40) basta N = 1,3 para que los TRES canales lleguen
    // al tope: los aros salían BLANCOS justo en el latido de la galería y en el encendido, o sea
    // que el único acento de marca del demo se apagaba en los dos instantes que más se miran
    // (esc-06, esc-21, esc-22). Con 0xff7a10 (1 / 0,48 / 0,06) el rojo satura primero y el azul
    // se queda abajo: por brillante que se ponga, el aro sigue siendo ámbar.
    acento: plano(M.paleta.acento, { emissive: new Color(0xff7a10), emissiveIntensity: 0.35 }),
    // opaco: la linea es tinta, no un velo. (WebGL ignora linewidth: el grosor es siempre 1 px.)
    linea: new LineBasicMaterial({ color: new Color(M.paleta.linea) }),
    // El casco NO se ilumina: si respondiera a las luces seria una pieza mas del motor, con su
    // cara clara y su cara oscura, en vez de una linea de tinta de grosor constante.
    silueta: new MeshBasicMaterial({ color: new Color(M.paleta.silueta), side: BackSide }),
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
  // EL COLECTOR DE ARRIBA VA EN AMBAR. Es el anillo de la garganta: el punto mas estrecho, el que
  // se ve desde CUALQUIER azimut y a cualquier tamano, y el sitio donde el acento significa algo
  // (ahi es donde arde). Los zunchos de la camara ya daban color, pero quedan tapados por los
  // paneles desde media vuelta; este no lo tapa nada. El de abajo sigue oscuro: hace de zocalo.
  for (const [nombre, p, rt, m] of [
    ['colector-alto', pIni, rPared(0), mat.acento],
    ['colector-bajo', pFin, rPared(1), mat.oscuro],
  ] as [string, Vector3, number, Material][]) {
    const rad = Math.hypot(p.x, p.z) + rt * 0.35;
    const t = new TorusGeometry(rad, Math.max(r.rColector, rt * 0.55), 6, M.tobera.segmentos);
    t.rotateX(Math.PI / 2);
    t.translate(0, p.y, 0);
    g.add(nombrar(new Mesh(t, m), nombre));
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

  // ESCAPE TRUNCADO, NO UN CONO EN PUNTA. Era un ConeGeometry con la punta hacia abajo y a 6x el
  // conjunto (tuerca + cilindro + corona dentada + punta negra) no leia como una turbobomba: leia
  // como una PEONZA o como la punta de un dardo (recorte zoom-despiece-rotulos-derecha). Un escape
  // de turbina termina en una boquilla, que es un tronco de cono cerrado y un anillo de labio.
  const escape = new CylinderGeometry(t.rTurbina * 0.86, t.rTurbina * 0.40, t.largoTurbina * 0.7, t.segmentos, 1);
  escape.translate(0, yT - t.largoTurbina * 0.85, 0);
  g.add(nombrar(new Mesh(escape, mat.medio), 'turbobomba-escape'));
  const boquilla = new CylinderGeometry(t.rTurbina * 0.46, t.rTurbina * 0.46, t.largoTurbina * 0.16, t.segmentos, 1);
  boquilla.translate(0, yT - t.largoTurbina * 1.28, 0);
  g.add(nombrar(new Mesh(boquilla, mat.oscuro), 'turbobomba-boquilla'));

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
  // TAPAS. `TubeGeometry` con `closed = false` deja los dos extremos ABIERTOS, y un tubo abierto
  // visto de frente es un AGUJERO NEGRO ELIPTICO: se veia en el despiece al final del conducto de
  // escape y otra vez abajo a la izquierda en el reposo. Cada extremo se tapa con una bolita del
  // radio del tubo. Van en InstancedMesh agrupadas POR MATERIAL, asi que las seis tapas cuestan
  // dos llamadas de dibujo, no seis.
  const perfilBola: Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI;
    perfilBola.push(new Vector2(Math.max(0.0001, Math.cos(a)), Math.sin(a)));
  }
  const bola = new LatheGeometry(perfilBola, 10);
  const porMat = new Map<Material, { p: Vector3; r: number }[]>();
  rutas.forEach((pts, k) => {
    const curva = new CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const geo = new TubeGeometry(curva, c.segmentosU, c.radios[k], c.segmentosV, false);
    g.add(nombrar(new Mesh(geo, materiales[k]), `conducto-${k}`));
    const lista = porMat.get(materiales[k]) ?? [];
    lista.push({ p: curva.getPointAt(0), r: c.radios[k] }, { p: curva.getPointAt(1), r: c.radios[k] });
    porMat.set(materiales[k], lista);
  });
  let nTapa = 0;
  const mTapa = new Matrix4();
  for (const [material, lista] of porMat) {
    const malla = new InstancedMesh(bola, material, lista.length);
    lista.forEach((e, j) => malla.setMatrixAt(j, mTapa.makeScale(e.r, e.r, e.r).setPosition(e.p)));
    malla.instanceMatrix.needsUpdate = true;
    g.add(nombrar(malla, `conducto-tapas-${nTapa++}`));
  }
  g.userData.radial = new Vector3(Math.cos(th), 0, Math.sin(th));
  return g;
}

// Tres coronas de tornillos en las bridas reales del motor. Van juntas en una sola InstancedMesh
// porque comparten material: 3 anillos, 38 tornillos, 1 llamada de dibujo.
function construirTornillos(mat: Materiales): Group {
  const t = M.tornillos;
  const g = nombrar(new Group(), 'tornillos');
  const perfil = perfilCamara();
  const yAlto = perfil[perfil.length - 1].y;   // el mismo anclaje que usan los zunchos

  // Las cabezas tienen que SOBRESALIR de una superficie visible. Puestas en el eje de la pieza
  // quedan enterradas dentro de ella y no se ven: pasó con el anillo de empuje, donde el eje del
  // toro está a rTuboAnillo de la superficie.
  const anillos: { y: number; radio: number; n: number }[] = [
    // brida de arriba de la cámara: las cabezas asoman por el canto del cilindro
    { y: yAlto + t.alto * 0.5, radio: M.camara.rCamara + M.camara.espesor * 0.5, n: t.nCamara },
    // anillo de empuje: encima del tubo, no dentro
    { y: M.bancada.altura + M.bancada.rTuboAnillo + t.alto * 0.4, radio: M.bancada.rAnillo, n: t.nBancada },
    // brida de la turbobomba: por fuera del cuerpo
    { y: M.turbobomba.altura, radio: M.turbobomba.rCuerpo + t.r * 0.8, n: t.nBomba },
  ];

  const total = anillos.reduce((a, x) => a + x.n, 0);
  const cabeza = new CylinderGeometry(t.r, t.r, t.alto, 6);
  const tornillos = new InstancedMesh(cabeza, mat.oscuro, total);
  const m = new Matrix4();
  let k = 0;
  for (const a of anillos) {
    for (let i = 0; i < a.n; i++) {
      const th = (i / a.n) * Math.PI * 2;
      tornillos.setMatrixAt(k++, m.makeTranslation(a.radio * Math.cos(th), a.y, a.radio * Math.sin(th)));
    }
  }
  tornillos.instanceMatrix.needsUpdate = true;
  g.add(nombrar(tornillos, 'tornillos-cabezas'));
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
  // CHAPA CORRUGADA DE VERDAD: la onda va en las DOS caras (ida por delante, vuelta por detras
  // desplazada el espesor), no una cara ondulada sobre un dorso plano. Con el dorso plano, el panel
  // que daba la espalda a la camara era una losa gris lisa -la "hoja de papel"- y de canto era una
  // cuchilla; asi el relieve se ve venga de donde venga y el canto es un peine, no un filo.
  // CANTO LISO EN LOS DOS EXTREMOS. El corrugado llegaba hasta el borde, asi que la SILUETA del
  // panel era el propio zigzag: de canto se veia un dentado escalonado (recorte zoom-placa-reposo)
  // y en el despiece los tres paneles eran dos parches de rayado que no se leian como nada. Con un
  // marco liso el contorno del panel es recto y el relieve queda DENTRO, que es como se lee una
  // chapa corrugada de verdad.
  const s = new Shape();
  const pasos = r.aletas * 2;
  const borde = r.alto * 0.14;
  const util = r.alto - borde * 2;
  const px = (k: number): number => -r.alto / 2 + borde + (k * util) / pasos;
  const onda = (k: number): number => (k % 2) * r.amplitud;
  s.moveTo(-r.alto / 2, 0);
  for (let k = 0; k <= pasos; k++) s.lineTo(px(k), onda(k));
  s.lineTo(r.alto / 2, 0);
  s.lineTo(r.alto / 2, -r.espesor);
  for (let k = pasos; k >= 0; k--) s.lineTo(px(k), onda(k) - r.espesor);
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
 * Monograma de Yoiber, sacado del SVG (yoi-icon.svg, viewBox 439x523) y APLANADO AQUI.
 *
 * La version anterior era el mismo SVG con las curvas TIRADAS A LA BASURA: se quedaba solo con
 * los extremos de cada `C`, o sea puntas afiladas donde el logo tiene esquinas redondeadas y, lo
 * que se veia de verdad, un ESCALON en la junta -el brazo blanco baja mas que el oscuro y los dos
 * se cierran con la misma curva; en recta eso deja un diente-. A 13x en pantalla no leia como
 * logotipo sino como malla rota (captura esc-17 del turno anterior, recorte z-seam).
 *
 * Ahora las cubicas van aplanadas a segmentos de ~14 unidades de viewBox: 27/19/27 puntos, que a
 * la escala a la que se ve (media pantalla de alto) es menos de 1 px de error. Son poligonos
 * rectos: sigue sin hacer falta SVGLoader.
 */
export const MONOGRAMA: [number, number][][] = [
  // gris oscuro (brazo que baja a la izquierda)
  [[218.56, 324.16], [225.89, 331.20], [234.32, 335.98], [243.44, 338.53], [252.82, 338.87], [262.02, 337.05],
   [270.63, 333.10], [278.21, 327.05], [284.33, 318.94], [287.17, 314.00], [287.25, 314.00], [178.51, 502.84],
   [173.53, 509.69], [167.34, 515.25], [160.17, 519.40], [152.26, 521.99], [143.84, 522.88], [41.93, 522.88],
   [30.97, 521.40], [21.37, 517.26], [13.39, 510.94], [7.30, 502.90], [3.37, 493.61], [1.87, 483.53], [3.08,
   473.15], [7.27, 462.91], [141.84, 229.35]],
  // gris medio (brazo que sube a la izquierda)
  [[204.77, 0.00], [215.72, 1.48], [225.33, 5.62], [233.31, 11.94], [239.40, 19.98], [243.33, 29.27], [244.82,
   39.34], [243.62, 49.72], [239.44, 59.96], [141.89, 229.41], [8.98, 65.16], [2.86, 54.85], [0.18, 43.95],
   [0.65, 33.05], [3.98, 22.77], [9.87, 13.72], [18.05, 6.50], [28.21, 1.73], [40.08, 0.00]],
  // blanco (brazo que sube a la derecha)
  [[398.85, 0.04], [402.03, 0.16], [405.12, 0.51], [414.62, 3.28], [422.85, 8.13], [429.58, 14.68], [434.60,
   22.56], [437.70, 31.40], [438.66, 40.83], [437.25, 50.46], [433.28, 59.94], [284.33, 318.94], [278.21,
   327.05], [270.63, 333.10], [262.03, 337.05], [252.82, 338.87], [243.44, 338.53], [234.32, 335.98], [225.89,
   331.20], [218.56, 324.16], [141.84, 229.35], [262.42, 20.07], [267.39, 13.23], [273.58, 7.66], [280.75,
   3.52], [288.67, 0.93], [297.08, 0.04]],
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

// CASCO DE SILUETA (el contorno de verdad).
//
// Las aristas de arriba son LineSegments y WebGL dibuja TODAS las lineas de 1 px: `linewidth` no
// hace nada en ningun navegador de escritorio. Un contorno de 1 px sobre un objeto de 500 px es
// justo lo que no se ve. La tecnica clasica que si funciona sin postprocesado es el casco
// invertido: una COPIA de la malla con `side: BackSide` -o sea, solo se dibujan sus caras
// traseras- y los vertices empujados hacia fuera por su normal. Como las caras delanteras del
// casco no se dibujan, el objeto de verdad lo tapa entero salvo en el borde, donde asoma el
// empuje: un reborde de tinta de grosor constante alrededor de la silueta y de cada pieza contra
// la de detras.
//
// El detalle que lo hace o lo rompe: NO se puede empujar por la normal que trae la geometria.
// Una caja, un cilindro o un ExtrudeGeometry repiten cada vertice de esquina una vez por cara,
// cada copia con la normal de SU cara; al empujarlas cada una por su lado el casco se abre por
// las esquinas y aparecen grietas por las que se ve el fondo. Hay que soldar por posicion y
// empujar por la normal PROMEDIO de las caras que comparten esa posicion, que es lo que hace
// `normalesSoldadas()`. Se conserva el indice y el numero de vertices del original: la copia no
// lleva ni normales ni uv (el material es basico y no las mira), asi que son 12 bytes por vertice.

function normalesSoldadas(geo: BufferGeometry): { nor: Float32Array; borde: Uint8Array } {
  const pos = geo.attributes.position;
  const n = pos.count;
  const idx = geo.index;
  const cuenta = idx ? idx.count : n;
  const nor = new Float32Array(n * 3);
  const borde = new Uint8Array(n);
  // Clave = posicion redondeada a 1e-4 u (0,05 mm reales): junta las copias exactas de una esquina
  // sin juntar dos vertices que de verdad son distintos (el detalle mas fino del motor es el
  // espesor del panel radiador, 0,055 u, o sea 550 veces esta tolerancia).
  const clave = new Map<string, number>();
  const soldado = new Int32Array(n);       // vertice -> id soldado
  const acum: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let id = clave.get(k);
    if (id === undefined) { id = acum.length; clave.set(k, id); acum.push(new Vector3()); }
    soldado[i] = id;   // varias copias de una esquina comparten acumulador
  }
  // Suma de normales de cara SIN normalizar: el producto vectorial pesa por el area del
  // triangulo, que es exactamente el promedio que quiere un casco (las caras grandes mandan).
  const a = new Vector3(); const b = new Vector3(); const c = new Vector3();
  const ab = new Vector3(); const ac = new Vector3(); const cr = new Vector3();
  // Cuenta de caras por arista soldada: la que solo tiene UNA es un borde abierto (ver abajo).
  const aristas = new Map<number, number>();
  const cuentaArista = (u: number, v: number): void => {
    const k = u < v ? u * acum.length + v : v * acum.length + u;
    aristas.set(k, (aristas.get(k) ?? 0) + 1);
  };
  for (let f = 0; f < cuenta; f += 3) {
    const i0 = idx ? idx.getX(f) : f;
    const i1 = idx ? idx.getX(f + 1) : f + 1;
    const i2 = idx ? idx.getX(f + 2) : f + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    cr.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    acum[soldado[i0]].add(cr); acum[soldado[i1]].add(cr); acum[soldado[i2]].add(cr);
    cuentaArista(soldado[i0], soldado[i1]);
    cuentaArista(soldado[i1], soldado[i2]);
    cuentaArista(soldado[i2], soldado[i0]);
  }
  const abierto = new Uint8Array(acum.length);
  for (const [k, veces] of aristas) {
    if (veces !== 1) continue;
    abierto[Math.floor(k / acum.length)] = 1;
    abierto[k % acum.length] = 1;
  }
  for (let i = 0; i < n; i++) {
    const g = acum[soldado[i]];
    const l = g.length();
    if (l > 1e-12) { nor[i * 3] = g.x / l; nor[i * 3 + 1] = g.y / l; nor[i * 3 + 2] = g.z / l; }
    borde[i] = abierto[soldado[i]];
  }
  return { nor, borde };
}

/**
 * Copia de una geometria con los vertices empujados por su normal soldada.
 *
 * Los vertices de BORDE ABIERTO no se empujan. Casi todas las piezas son solidos cerrados, pero la
 * campana y la cupula son revoluciones de perfil abierto (la campana termina en un anillo en el
 * plano de la garganta) y un conducto es un tubo sin tapas. En un borde abierto la normal promedio
 * solo tiene caras de UN lado, asi que apunta hacia fuera Y hacia el borde: el casco se abria como
 * una trompeta por el filo y asomaba por delante de su propia pieza. Se veia en la captura como
 * dientes negros mordiendo el anillo ambar de la garganta (con-z5.png contra sin-z5.png). Dejando
 * el borde quieto, el casco termina EXACTAMENTE donde termina la pieza y la tinta se desvanece en
 * la ultima fila de triangulos, que es donde de todas formas la tapa otra pieza.
 */
export function geometriaSilueta(geo: BufferGeometry, grosor: number): BufferGeometry {
  const pos = geo.attributes.position;
  const { nor, borde } = normalesSoldadas(geo);
  const n = pos.count;
  const fuera = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const d = borde[i] ? 0 : grosor;
    fuera[i * 3] = pos.getX(i) + nor[i * 3] * d;
    fuera[i * 3 + 1] = pos.getY(i) + nor[i * 3 + 1] * d;
    fuera[i * 3 + 2] = pos.getZ(i) + nor[i * 3 + 2] * d;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(fuera, 3));
  if (geo.index) g.setIndex(Array.from(geo.index.array as ArrayLike<number>));
  return g;
}

// SOLO LAS PIEZAS GRANDES, Y LA CORONA DE TUBOS NO ES UNA DE ELLAS.
//
// Cada casco es una llamada de dibujo mas y repite los triangulos de su pieza. Las piezas
// pequenas (labio, cuello, zunchos, orificios, alabes, tirantes, anillo de bancada, placa) se
// quedan fuera: son mas finas o casi tan finas como el propio grosor del casco, asi que el casco
// se las comeria en vez de perfilarlas, y sumarian 12 llamadas mas para nada.
//
// LA CORONA SE PROBO Y SE DESHIZO (mirando la captura, no el codigo). Es la pieza mas grande que
// hay, y su casco se hacia con UNA InstancedMesh que compartia `instanceMatrix` con los tubos: una
// sola llamada para los 36. Pero los tubos van a `holgura` 0,88, o sea que el hueco entre dos
// tubos vecinos mide ~0,02 u -el mismo numero que el grosor del casco-, asi que cada casco se
// metia dentro de los dos tubos de al lado: en la captura la corona salia con la tinta rota a
// trozos, como una pantalla mal impresa, y en la garganta, donde los tubos se juntan, los 36
// cascos se sumaban en un borron negro ENCIMA del anillo ambar, que es justo el acento que la
// paleta acababa de ganar. Deshecho: son 23 040 triangulos y 1 llamada que ademas estropeaban.
// La corona ya se lee tubo a tubo por su propio sombreado (se ve en a0-z1.png).
const CON_SILUETA = [
  'campana-pared', 'camara-pared', 'cupula-domo', 'inyector-placa',
  'radiador-0', 'radiador-1', 'radiador-2',
  'turbobomba-cuerpo', 'conducto-0', 'conducto-1',
];

/** Cuelga el casco de cada pieza grande. Va como HIJO de la pieza y sin transformacion propia:
 *  asi viaja con ella en el despiece, en el abanico de los radiadores y en el momento de la marca
 *  sin que la coreografia se entere de que existe. */
function anadirSiluetas(raiz: Group, mat: Materiales): void {
  const objetivo: Mesh[] = [];
  raiz.traverse((o) => { if (o instanceof Mesh && !(o instanceof InstancedMesh) && CON_SILUETA.includes(o.name)) objetivo.push(o); });
  for (const o of objetivo) {
    const casco = new Mesh(geometriaSilueta(o.geometry, M.aristas.grosor), mat.silueta);
    // El casco se dibuja ANTES que su pieza (renderOrder mas bajo dentro de la lista opaca) para
    // que el rechazo temprano por profundidad de la pieza tenga algo que rechazar.
    casco.renderOrder = -1;
    o.add(nombrar(casco, `silueta-${o.name}`));
  }
}

/**
 * Cambia los dos colores de tinta al cambiar de tema. Medido sobre las capturas: sobre negro la
 * tinta casi negra separa una pieza de otra pero contra el FONDO no dibuja nada (negro sobre
 * negro), y sobre el crema del capitulo "como esta hecho" pasa justo lo contrario -ahi la tinta es
 * lo unico que separa la campana blanca (0xf4f4f2) del papel (#efe9df), que son el mismo color.
 * Por eso los dos pares viven en la paleta y no hay un solo color "de contorno".
 */
export function aplicarTema(mat: Materiales, claro: boolean): void {
  mat.linea.color.setHex(claro ? M.paleta.lineaClaro : M.paleta.linea);
  mat.silueta.color.setHex(claro ? M.paleta.siluetaClaro : M.paleta.silueta);
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
  bancada.add(construirTornillos(materiales));
  grupo.add(propulsor, periferia, bancada);
  anadirAristas(grupo, materiales);
  anadirSiluetas(grupo, materiales);

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
