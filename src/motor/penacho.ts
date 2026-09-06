import {
  AdditiveBlending, BufferAttribute, Color, DoubleSide, FrontSide, Group, LatheGeometry, MathUtils, Mesh,
  MeshBasicMaterial, OctahedronGeometry, Vector2, Vector3, type BufferGeometry, type Material,
} from 'three';
import { PM } from '../params-motor';
import type { Estado } from './coreografia';

// EL PENACHO DEL ENCENDIDO
// ===============================================================================================
// Sin postprocesado (ni EffectComposer, ni bloom, ni un solo shader nuestro) y sin partículas (que
// habría que sembrar con azar, que es lo contrario de un scrub reversible).
//
// TÉCNICA: GEOMETRÍA. Cuatro campanas de revolución encajadas (LatheGeometry) pintadas con color
// por vértice del blanco al negro y dibujadas con mezcla ADITIVA y sin escribir en el z-buffer.
// Más cinco octaedros en el eje que hacen de diamantes de Mach.
//
// Se probó también con "cortinas" (planos girados con una textura de degradado) y FALLA POR
// GEOMETRÍA, no por gusto: los planos son cuadriláteros que salen de la garganta, que está DENTRO
// de la campana, así que atraviesan la pared de la tobera y se ven como bandas rectangulares
// luminosas cruzándola. Una pluma de tobera acampanada es un sólido de revolución; hecha con un
// sólido de revolución, nunca cruza la pared.
//
// Es función pura de (estado, tiempo): el parpadeo son senos del reloj del maestro, no ruido.

export interface Penacho {
  obj: Group;
  aplicar(estado: Estado, tiempo: number): void;
  /** Deja solo las dos capas del núcleo. Es el primer peldaño del vigilante de fotogramas: el
   *  penacho ocupa la pantalla entera y son varias pasadas mezcladas a pantalla completa. */
  ligero(on: boolean): void;
  liberar(): void;
}

const CALIENTE = new Color(0xfff3d6);
const MEDIO = new Color(0xff9a3c);
// El FRIO era 0x8a3410 y con mezcla aditiva sobre negro la capa exterior salia MARRON SUCIO.
// Naranja vivo: al sumarse capa sobre capa da fuego, no barro.
const FRIO = new Color(0xd2510e);
const NEGRO = new Color(0x000000);

/**
 * Perfil de media pluma de gases, MEDIDO DESDE EL LABIO DE LA CAMPANA (no desde la garganta).
 *
 * Tres cosas comprobadas en captura, cada una con su corrección:
 *   · naciendo en la garganta y con el perfil abriéndose despacio, el chorro salía MÁS ESTRECHO
 *     que la boca y quedaba un anillo negro bajo el labio: el objeto entero se leía como una
 *     lámpara de sobremesa encendida;
 *   · abriéndolo desde la garganta para taparlo, la pluma se comía la campana por fuera (el cono
 *     naranja envolvía la tobera) porque a media altura ya era más ancha que ella;
 *   · con el perfil abriéndose hasta el final, la silueta acaba en un corte recto (un trapecio).
 * Solución: el penacho EMPIEZA en el plano de salida, con el radio de la boca, y a partir de ahí
 * no para de estrecharse. Nace pegado al labio y no toca la campana en ningún punto.
 */
function perfil(radio: number, largo: number, ondas: number): Vector2[] {
  const p: Vector2[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const cierra = 1 - 0.86 * Math.max(0, (u - 0.12) / 0.88) ** 1.25;
    const abre = 0.82 + 0.18 * (1 - (1 - u) ** 2);
    const r = radio * abre * cierra * (1 - ondas * Math.sin(u * Math.PI * 2.5) * 0.10);
    p.push(new Vector2(Math.max(0.004, r), -u * largo));
  }
  return p;
}

function pintaColores(geo: BufferGeometry, largo: number): void {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const u = MathUtils.clamp(-pos.getY(i) / largo, 0, 1);
    // La cola tiene que llegar a NEGRO: con mezcla aditiva, negro = invisible. Si el último anillo
    // conserva color, la pluma acaba en un borde duro por muy oscuro que sea.
    // El tramo caliente es LARGO y el frío corto: con el reparto anterior la capa exterior pasaba
    // media pluma en el naranja apagado y, sumada sobre negro a baja opacidad, se leía marrón.
    if (u < 0.32) c.copy(CALIENTE).lerp(MEDIO, u / 0.32);
    else if (u < 0.74) c.copy(MEDIO).lerp(FRIO, (u - 0.32) / 0.42);
    else c.copy(FRIO).lerp(NEGRO, ((u - 0.74) / 0.26) ** 0.7);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
}

/**
 * @param yLabio     altura del plano de salida de la campana (el penacho cuelga de ahí)
 * @param pocasCapas movil: la mitad de capas y una sola cara. El penacho mide 9,5 u en un encuadre
 *                   de 8,8: OCUPA LA PANTALLA ENTERA, y son hasta 8 pasadas mezcladas a pantalla
 *                   completa. En una GPU por baldosas el relleno es lo que decide, no los
 *                   triangulos, asi que es lo PRIMERO que hay que degradar.
 */
export function crearPenacho(yLabio: number, pocasCapas = false): Penacho {
  const obj = new Group();
  obj.name = 'penacho';
  obj.position.y = yLabio;
  obj.visible = false;
  const materiales: Material[] = [];
  const geometrias: BufferGeometry[] = [];
  const capas: Mesh[] = [];
  const opacidadBase: number[] = [];
  const escalaBase: Vector3[] = [];
  const diamantes: Mesh[] = [];

  const nCapas = pocasCapas ? Math.max(2, Math.round(PM.penacho.capas / 2)) : PM.penacho.capas;
  for (let i = 0; i < nCapas; i++) {
    const k = 1 - i * 0.19;   // capas más juntas: con 0,26 se veían las cuatro como bandas duras
    const largo = PM.penacho.largo * (0.7 + 0.3 * k);
    const geo = new LatheGeometry(perfil(PM.penacho.radio * k, largo, i === 0 ? 0 : 1), 24);
    pintaColores(geo, largo);
    // La capa MÁS ANCHA es la más tenue y la del núcleo la más intensa: al revés se ve un trapecio
    // recortado, no un chorro.
    // la capa MÁS ANCHA es la más tenue (al revés se ve un trapecio recortado, no un chorro)
    const op = 0.18 + i * (0.72 / Math.max(1, nCapas - 1));
    const mat = new MeshBasicMaterial({
      vertexColors: true, blending: AdditiveBlending, depthWrite: false,
      transparent: true, side: pocasCapas && i > 0 ? FrontSide : DoubleSide, opacity: op,
    });
    const malla = new Mesh(geo, mat);
    malla.frustumCulled = false;
    obj.add(malla);
    capas.push(malla);
    opacidadBase.push(op);
    escalaBase.push(malla.scale.clone());
    materiales.push(mat);
    geometrias.push(geo);
  }

  const geoD = new OctahedronGeometry(1, 0);
  geometrias.push(geoD);
  // Los diamantes de Mach son un DETALLE dentro del chorro, no una figura.
  const matDiamante = new MeshBasicMaterial({
    color: 0xffe9c4, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3,
  });
  materiales.push(matDiamante);
  for (let i = 0; i < PM.penacho.diamantes; i++) {
    const d = new Mesh(geoD, matDiamante);
    const u = ((i + 0.7) / PM.penacho.diamantes) * 0.62;
    // Mas pequenos, mas numerosos y DECRECIENTES: con dos rombos grandes parecian dos artefactos
    // blancos macizos dentro del chorro, no diamantes de Mach.
    const s = PM.penacho.radio * (1 - u * 1.15) ** 1.3;
    d.position.y = -u * PM.penacho.largo;
    d.scale.set(s * 0.075, s * 0.15, s * 0.075);
    d.frustumCulled = false;
    obj.add(d);
    diamantes.push(d);
  }

  const [hz1, hz2] = PM.penacho.parpadeoHz;
  const [a1, a2] = PM.penacho.parpadeo;

  function aplicar(estado: Estado, tiempo: number): void {
    const a = estado.penacho * (1 - estado.salida * 0.7);
    obj.visible = a > 0.002;
    if (!obj.visible) {
      // Apagado NO es "dejar de mirar": si se sale sin escribir, la escala se queda con el valor
      // del fotograma anterior y el objeto conserva estado entre pasadas. Medido con la prueba de
      // reversibilidad: con el `return` a secas, 386 de 421 paradas daban un grafo distinto al
      // volver aunque en pantalla no se viera nada.
      obj.scale.set(0, 0, 0);
      return;
    }
    const largo = a * (1 + estado.estira * PM.penacho.estira);
    const grueso = Math.pow(a, 0.55);
    // parpadeo: dos senos del RELOJ DEL MAESTRO (no de performance.now())
    const p = 1 + a1 * Math.sin(tiempo * hz1) + a2 * Math.sin(tiempo * hz2 + 2.1);
    obj.scale.set(grueso * p, largo, grueso * p);
    for (let i = 0; i < capas.length; i++) {
      const d = 1 + 0.05 * Math.sin(tiempo * (0.17 + i * 0.06) + i);
      const b = escalaBase[i];
      capas[i].scale.set(b.x * d, b.y * (1 + (1 - d) * 0.4), b.z * d);
      (capas[i].material as MeshBasicMaterial).opacity = opacidadBase[i] * a;
    }
    const vis = Math.max(0, (a - 0.45) / 0.55);   // los diamantes solo con el chorro ya formado
    matDiamante.opacity = 0.22 * vis;
    for (let i = 0; i < diamantes.length; i++) diamantes[i].visible = vis > 0.01;
  }

  function ligero(on: boolean): void {
    for (let i = 0; i < capas.length; i++) capas[i].visible = !on || i >= capas.length - 2;
  }

  function liberar(): void {
    for (const g of geometrias) g.dispose();
    for (const m of materiales) m.dispose();
  }

  return { obj, aplicar, ligero, liberar };
}
