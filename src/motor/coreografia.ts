import { stagger } from 'animejs';
import { Color, MathUtils, Quaternion, Vector3, type Material, type MeshLambertMaterial, type Object3D } from 'three';
import { PM } from '../params-motor';
import { M } from './geometria';

import type { Maestro, Tramo } from '../core/maestro';
import type { Rig } from './rig';

// COREOGRAFÍA DEL MOTOR
// ===============================================================================================
// El reloj lo mueve el scroll; aquí no se reproduce nada. Todo lo que se ve es una función del
// tiempo del maestro, y por eso todo es reversible al arrastrar hacia atrás.
//
// DOS CANALES, y una regla: cada propiedad tiene UN SOLO escritor.
//
//   1) CANAL DIRECTO — la timeline maestra escribe en el grafo de Three con el adaptador.
//      Solo geometría: raiz(x, y, rotateX, rotateY, scale), camara(zoom), la posición de cada
//      pieza, el abanico de los tres radiadores y la `z` (radial) de cada tubo de la corona.
//
//   2) CANAL DERIVADO — la timeline escribe escalares 0..1 en `estado`; `aplicar(tiempo)` los
//      convierte en matrices de la corona, cuaterniones de la marca, temblor, vueltas de turbina,
//      luces, emisivos y opacidades.
//      Va aquí todo lo que (a) no se puede expresar como un tween independiente por eje (las
//      matrices de la InstancedMesh, el cuaternión de la marca), (b) necesita varios factores
//      multiplicándose sobre la misma propiedad (la luz clave la bajan la galería Y el apagado de
//      la marca), o (c) es función del reloj y no un recorrido (temblor, parpadeo, rpm).
//
// TRAMPAS MEDIDAS EN ESTE SERVIDOR QUE CONDICIONAN ESTE FICHERO
//   · El `from` implícito de un tween se captura EN EL `.add()`, leyendo el objeto vivo; ni en
//     `init()` ni del `.set()` que haya en t=0. Como este módulo se engancha al maestro TARDE
//     (llega en un trozo diferido, con el reloj ya en marcha), TODOS los tweens llevan
//     `[desde, hasta]` explícito. Sin excepción.
//   · El ease por defecto de un hijo de timeline es `out(2)`; el maestro impone `inOut(3)` y
//     `composition: 'none'`. Cuando la curva importa, va escrita.
//   · Nada de `onComplete` / `onBegin` para cambiar de estado: con scrub no son simétricos.

export interface Estado {
  luz: number;      // 0..1  factor sobre la intensidad de la luz clave
  apagado: number;  // 0..1  el resto del motor se apaga mientras manda la marca
  pulso: number;    // 0..1  latido del inyector (ocho veces, uno por demo de la galería)
  brillo: number;   // 0..1  la garganta al rojo en el encendido
  rpm: number;      // 0..1  vueltas de la turbobomba
  logo: number;     // 0..1  la placa del monograma viene al frente
  vibra: number;    // 0..1  amplitud del temblor previo al despegue
  penacho: number;  // 0..1  crecimiento del penacho
  estira: number;   // 0..1  estirado del penacho al salir
  salida: number;   // 0..1  fundido final
  rotulos: { t: number }[];
}

export interface Coreografia {
  estado: Estado;
  aplicar(tiempo: number): void;
  revertir(): void;
  /** Todo lo que la timeline ha tocado: la limpieza lo saca de Anime.js con utils.remove(). */
  objetivos: object[];
}

// Orden de MONTAJE (INTRO): primero el esqueleto y el propulsor, y la corona de tubos la última
// porque es la imagen que vende.
const ORDEN_MONTAJE = ['bancada', 'camara', 'inyector', 'cupula', 'turbobomba', 'conductos', 'radiadores', 'placa', 'campana'] as const;

// De dónde entra cada pieza, en unidades de motor (el encuadre son 11,2 de alto).
const ENTRADA: Record<string, [number, number, number]> = {
  bancada: [0, 8.5, -4],
  camara: [0, 0, 11],
  inyector: [-11, 0.6, 0],
  cupula: [0, 9, 0],
  turbobomba: [7, 3, 0],
  conductos: [8, 0.8, 0],
  radiadores: [-6, -7, 0],
  placa: [4, 7, 0],
  campana: [0, -10, 0],
  refrigeracion: [0, 0, 0],   // la corona no viaja: entran los tubos, uno a uno
};

// El origen local de la placa es la JUNTA donde se tocan las tres formas del monograma, no el
// centro de su caja: al traerla al centro de la pantalla hay que corregir ese desvío. Las dos
// constantes salen de los extremos del propio SVG precocinado (viewBox 439x523, junta en
// 141,84 / 229,35) y se escalan con el alto que fije la geometría.
const K_MARCA = M.placa.alto / 523;
const CENTRO_MARCA = new Vector3(78.4335 * K_MARCA, -32.0905 * K_MARCA, M.placa.espesor / 2);
const ALTO_MARCA = 522.881 * K_MARCA;

export function montarCoreografia(m: Maestro, rig: Rig): Coreografia {
  const { tl } = m;
  const C = PM.coreo;
  const { raiz, camara: cam } = rig;

  // Posición absoluta en el maestro a partir de una fracción del tramo. Devuelve un número: así se
  // puede sumar el escalonado sin pelearse con las cadenas 'COMO+=1234'.
  const en = (X: Tramo, f: number, mas = 0): number => Math.round(m.L[X] + m.duracion(X) * f + mas);
  const dur = (X: Tramo, a: number, b: number): number => Math.max(1, Math.round(m.duracion(X) * (b - a)));

  const estado: Estado = {
    luz: C.heroOut.luz[0], apagado: 0, pulso: 0, brillo: 0, rpm: 0,
    logo: 0, vibra: 0, penacho: 0, estira: 0, salida: 0,
    rotulos: rig.piezas.map(() => ({ t: 0 })),
  };

  // Cada pieza tiene tres sitios: de dónde entra, dónde vive y dónde se aparta en el despiece.
  // `reposo` se lee del objeto UNA vez, al montar: es la que fija el módulo de geometría.
  // `sitios` incluye las piezas rotuladas Y las sueltas, en ese orden: los rótulos indexan sobre
  // las primeras, así que rig.piezas[i] y estado.rotulos[i] siguen alineados.
  const sitios = [...rig.piezas, ...rig.sueltas].map((p) => {
    const reposo = p.obj.position.clone();
    const e = ENTRADA[p.id] ?? [0, 9, 0];
    return {
      p,
      reposo,
      entrada: reposo.clone().add(new Vector3(e[0], e[1], e[2])),
      abierta: reposo.clone().add(p.abierto),
    };
  });
  const porId = new Map(sitios.map((s) => [s.p.id, s]));
  const montaje = ORDEN_MONTAJE.map((id) => porId.get(id)).filter((s): s is (typeof sitios)[number] => !!s);

  // Los tres paneles radiadores, además de subir con su grupo, se abren en abanico: cada uno por
  // su propio radio. Se guarda reposo y destino aquí para poder escribir [desde, hasta].
  const abanico = rig.aspas.map((o) => {
    const reposo = o.position.clone();
    const r = Math.hypot(reposo.x, reposo.z) || 1;
    const fuera = reposo.clone().add(new Vector3((reposo.x / r) * PM.abanicoRadiador, 0, (reposo.z / r) * PM.abanicoRadiador));
    return { o, reposo, fuera };
  });

  // ============================================================ t = 0: el estado de partida
  // Con scrub, "el principio" es un sitio al que se vuelve, no un sitio del que se sale.
  const I = C.intro;
  tl.set(raiz, { x: 0, y: 0, rotateX: 0, rotateY: I.rotY[0], rotateZ: 0, scale: I.escala[0] }, 0)
    .set(cam, { zoom: I.zoom }, 0)
    .set(estado, { luz: C.heroOut.luz[0], apagado: 0, pulso: 0, brillo: 0, rpm: 0, logo: 0, vibra: 0, penacho: 0, estira: 0, salida: 0 }, 0)
    .set(estado.rotulos, { t: 0 }, 0);
  for (const s of sitios) tl.set(s.p.obj, { x: s.entrada.x, y: s.entrada.y, z: s.entrada.z }, 0);
  for (const a of abanico) tl.set(a.o, { x: a.reposo.x, z: a.reposo.z }, 0);
  tl.set(rig.tubos, { z: I.coronaFuera }, 0);

  // ============================================================ HERO_OUT: montaje y centro
  // Se ensambla pieza a pieza desde fuera de cuadro MIENTRAS el título se va hacia arriba. En INTRO
  // el motor no está: el escenario CSS hace de telón hasta que llega el trozo 3D, que se pide
  // después de la intro para no meter el análisis de 610 kB encima de la animación del título.
  montaje.forEach((s, i) => {
    tl.add(s.p.obj, {
      x: [s.entrada.x, s.reposo.x], y: [s.entrada.y, s.reposo.y], z: [s.entrada.z, s.reposo.z],
      duration: I.dur, ease: I.ease,
    }, m.L.HERO_OUT + I.base + i * I.paso);
  });
  // La corona entra la última y tubo a tubo, desde el centro hacia los lados, cerrándose sobre la
  // campana con un pellizco de rebote. Es el gesto que hay que mirar.
  // El rebote sale del EASE (`outBack` se pasa de largo y vuelve), no de dos tramos encadenados:
  // en el instante exacto en que se tocan dos tramos el valor no es idéntico de ida y de vuelta.
  // `from: 'first'`, NO `from: 'center'`. El índice del tubo ES su ángulo (th = i·2π/36), así que
  // 'center' arranca por el índice 18 —o sea, θ=180°, la parte de ATRÁS— y termina por los índices
  // 0 y 35, que son el frente: durante todo el gesto la corona está desequilibrada y en la captura
  // de referencia todos los tubos se amontonaban a un lado. Con 'first' la ola recorre el anillo
  // una vuelta entera y se lee como una cremallera cerrándose, que es justo lo que se quiere.
  const tCorona = m.L.HERO_OUT + I.base + montaje.length * I.paso;
  tl.add(rig.tubos, {
    z: [I.coronaFuera, 0], duration: I.coronaDur, ease: `outBack(${I.coronaRebote})`,
    delay: stagger(I.coronaPaso, { from: 'first' }),
  }, tCorona);

  // ============================================================ HERO_OUT: toma el centro
  const H = C.heroOut;
  const dH = m.duracion('HERO_OUT');
  tl.add(raiz, {
    rotateY: [I.rotY[0], H.rotY[1]], rotateX: [H.rotX[0], H.rotX[1]],
    scale: [I.escala[0], H.escala[1]], duration: dH, ease: H.ease,
  }, 'HERO_OUT')
    .add(cam, { zoom: [H.zoom[0], H.zoom[1]], duration: dH, ease: 'out(2)' }, 'HERO_OUT')
    .add(estado, { luz: [H.luz[0], H.luz[1]], duration: dH, ease: 'linear' }, 'HERO_OUT');

  // ============================================================ GALERIA: plato giratorio de fondo
  // Velocidad angular CONSTANTE (linear) durante todo el tramo. Cualquier otra curva se lee como
  // que el objeto frena, y aquí no frena: gira mientras hablan otros.
  const G = C.galeria;
  const dG = m.duracion('GALERIA');
  const yGal = H.rotY[1] + G.giro;
  tl.add(raiz, { rotateY: [H.rotY[1], yGal], duration: dG, ease: 'linear' }, 'GALERIA')
    .add(raiz, { x: [0, G.apartar], scale: [H.escala[1], G.escala], duration: dur('GALERIA', 0, G.entra), ease: 'inOut(2)' }, 'GALERIA')
    .add(estado, { luz: [H.luz[1], G.luz], duration: dur('GALERIA', 0, G.entra), ease: 'linear' }, 'GALERIA')
    .add(raiz, { x: [G.apartar, 0], scale: [G.escala, H.escala[1]], duration: dur('GALERIA', 0, G.vuelve), ease: 'inOut(2)' }, en('GALERIA', 1 - G.vuelve))
    .add(estado, { luz: [G.luz, H.luz[1]], duration: dur('GALERIA', 0, G.vuelve), ease: 'linear' }, en('GALERIA', 1 - G.vuelve));
  // Ocho latidos del inyector, uno por demo, alineados con el contador "n / 8" del rótulo.
  // Cada latido son DOS tweens seguidos y no dos fotogramas clave dentro de uno: medido, con
  // keyframes el valor no era idéntico de ida y de vuelta justo en la junta.
  for (let i = 0; i < G.pulsos; i++) {
    tl.add(estado, { pulso: [0, 1], duration: G.pulsoSube, ease: 'out(3)' }, en('GALERIA', (i + 0.5) / G.pulsos))
      .add(estado, { pulso: [1, 0], duration: G.pulsoBaja, ease: 'in(2)' }, en('GALERIA', (i + 0.5) / G.pulsos, G.pulsoSube));
  }

  // ============================================================ COMO: el despiece
  const K = C.como;
  const yAbre = yGal + K.giroAbre;
  const yPar = yAbre + K.giroParallax;
  const yFin = yPar + K.giroFinal;

  // 1. abrir el plano: se inclina y la cámara retrocede para que quepa el despiece
  tl.add(raiz, {
    rotateY: [yGal, yAbre], rotateX: [H.rotX[1], K.rotX], y: [0, K.bajar], x: [0, K.desplazar],
    duration: dur('COMO', K.abrir[0], K.abrir[1]), ease: 'inOut(2)',
  }, en('COMO', K.abrir[0]))
    .add(cam, { zoom: [H.zoom[1], K.zoom], duration: dur('COMO', K.abrir[0], K.abrir[1]), ease: 'inOut(2)' }, en('COMO', K.abrir[0]));

  // 2. separar: de arriba abajo, 70 ms entre pieza y pieza. `outQuint` sale disparada y aterriza
  //    sin rebote: es el gesto de "esto se desmonta", no el de "esto salta".
  sitios.forEach((s, i) => {
    tl.add(s.p.obj, {
      x: [s.reposo.x, s.abierta.x], y: [s.reposo.y, s.abierta.y], z: [s.reposo.z, s.abierta.z],
      duration: K.dur, ease: 'outQuint',
    }, en('COMO', K.separar[0], i * K.paso));
  });
  // los tres paneles se abren en abanico, además de subir con su grupo
  abanico.forEach((a, i) => {
    tl.add(a.o, {
      x: [a.reposo.x, a.fuera.x], z: [a.reposo.z, a.fuera.z],
      duration: K.dur, ease: 'outQuint',
    }, en('COMO', K.separar[0], (2 + i) * K.paso));
  });
  // y la corona florece: cada tubo se separa de la campana hacia fuera, desde el centro
  tl.add(rig.tubos, {
    z: [0, K.tuboFuera], duration: K.dur, ease: 'outQuint', delay: stagger(K.pasoTubo, { from: 'center' }),
  }, en('COMO', K.separar[0], 8 * K.paso));

  // 3. rótulos y guías: un escalar por pieza. El DOM lo pinta rotulos.ts leyendo estos escalares.
  rig.piezas.forEach((_, i) => {
    tl.add(estado.rotulos[i], { t: [0, 1], duration: K.durRotulo, ease: 'out(3)' }, en('COMO', K.rotulos[0], i * K.pasoRotulo));
  });

  // 4. parallax: gira con todo abierto. Es lo que hace que el despiece se lea en profundidad y no
  //    como una lista. Los rótulos siguen a sus piezas solos, porque se proyectan cada fotograma.
  tl.add(raiz, { rotateY: [yAbre, yPar], duration: dur('COMO', K.parallax[0], K.parallax[1]), ease: 'inOut(2)' }, en('COMO', K.parallax[0]));

  // 5. la marca: los rótulos se recogen (del último al primero), el motor se apaga y la placa de
  //    identificación viene al frente. El conjunto se queda QUIETO mientras se lee: girando, la
  //    marca deja de reconocerse (es el hallazgo del análisis del logo).
  rig.piezas.forEach((_, i) => {
    const j = rig.piezas.length - 1 - i;
    tl.add(estado.rotulos[j], { t: [1, 0], duration: K.durCierraRotulo, ease: 'in(2)' }, en('COMO', K.cerrar, i * K.pasoCierraRotulo));
  });
  tl.add(estado, { apagado: [0, 1], duration: dur('COMO', K.logo[0], K.quieto[0]), ease: 'inOut(2)' }, en('COMO', K.logo[0]))
    .add(estado, { logo: [0, 1], duration: dur('COMO', K.logo[0], K.quieto[0]), ease: 'inOut(3)' }, en('COMO', K.logo[0]))
    // entre quieto[0] y quieto[1] no hay ni un tween sobre `raiz`: eso ES la pausa.
    .add(estado, { logo: [1, 0], duration: dur('COMO', K.quieto[1], K.recomponer[0] + 0.08), ease: 'inOut(3)' }, en('COMO', K.quieto[1]))
    .add(estado, { apagado: [1, 0], duration: dur('COMO', K.quieto[1], K.recomponer[0] + 0.06), ease: 'out(2)' }, en('COMO', K.quieto[1]));

  // 6. recomponer: vuelve a estar montado, de pie y a tamaño, listo para el cierre.
  sitios.forEach((s, i) => {
    tl.add(s.p.obj, {
      x: [s.abierta.x, s.reposo.x], y: [s.abierta.y, s.reposo.y], z: [s.abierta.z, s.reposo.z],
      // 0,93 y no 0,97: con el escalonado de 40 ms la última pieza aterrizaba 210 unidades
      // DESPUÉS de COMO_END, o sea con CIERRE ya empezado y el motor levantándose.
      duration: dur('COMO', K.recomponer[0], 0.93), ease: 'inOut(3)',
    }, en('COMO', K.recomponer[0], (sitios.length - 1 - i) * 40));
  });
  abanico.forEach((a) => {
    tl.add(a.o, {
      x: [a.fuera.x, a.reposo.x], z: [a.fuera.z, a.reposo.z],
      duration: dur('COMO', K.recomponer[0], 0.93), ease: 'inOut(3)',
    }, en('COMO', K.recomponer[0]));
  });
  tl.add(rig.tubos, { z: [K.tuboFuera, 0], duration: dur('COMO', K.recomponer[0], 0.93), ease: 'inOut(3)', delay: stagger(4, { from: 'center' }) }, en('COMO', K.recomponer[0]))
    .add(raiz, { rotateY: [yPar, yFin], rotateX: [K.rotX, 0], y: [K.bajar, 0], x: [K.desplazar, 0], duration: dur('COMO', K.recomponer[0], 1), ease: 'inOut(2)' }, en('COMO', K.recomponer[0]))
    .add(cam, { zoom: [K.zoom, H.zoom[1]], duration: dur('COMO', K.recomponer[0], 1), ease: 'inOut(2)' }, en('COMO', K.recomponer[0]));

  // ============================================================ CIERRE: encendido y salida
  const Z = C.cierre;
  tl.add(estado, { rpm: [0, 1], duration: dur('CIERRE', Z.previo[0], Z.previo[1]), ease: 'in(2)' }, en('CIERRE', Z.previo[0]))
    .add(estado, { vibra: [0, 1], duration: dur('CIERRE', Z.previo[0], Z.previo[1]), ease: 'in(2)' }, en('CIERRE', Z.previo[0]))
    .add(estado, { brillo: [0, 1], duration: dur('CIERRE', Z.brillo[0], Z.brillo[1]), ease: 'in(2)' }, en('CIERRE', Z.brillo[0]))
    .add(estado, { penacho: [0, 1], duration: dur('CIERRE', Z.penacho[0], Z.penacho[1]), ease: 'out(2)' }, en('CIERRE', Z.penacho[0]))
    // se levanta ANTES de encender: el penacho mide 9,5 u y sin este hueco sale cortado por abajo
    // (comprobado en captura: el chorro se salía del cuadro y se leía como una bombilla)
    .add(raiz, { y: [0, Z.subir], duration: dur('CIERRE', 0, Z.salida[0]), ease: 'inOut(2)' }, 'CIERRE')
    // sube: `in(3)` es una aceleración de verdad, que es justo lo que tiene que parecer
    .add(raiz, { y: [Z.subir, Z.alturaSalida], scale: [H.escala[1], Z.escalaSalida], duration: dur('CIERRE', Z.salida[0], Z.salida[1]), ease: 'in(3)' }, en('CIERRE', Z.salida[0]))
    .add(estado, { estira: [0, 1], duration: dur('CIERRE', Z.salida[0], Z.salida[1]), ease: 'in(2)' }, en('CIERRE', Z.salida[0]))
    // ya en el aire, el temblor desaparece: lo que temblaba era el amarre
    .add(estado, { vibra: [1, 0], duration: dur('CIERRE', Z.salida[0], Z.salida[0] + 0.12), ease: 'out(2)' }, en('CIERRE', Z.salida[0]))
    .add(raiz, { rotateY: [yFin, yFin + 8], duration: dur('CIERRE', 0, Z.salida[1]), ease: 'inOut(2)' }, 'CIERRE')
    .add(cam, { zoom: [H.zoom[1], Z.zoom[1]], duration: dur('CIERRE', 0, Z.salida[1]), ease: 'out(2)' }, 'CIERRE')
    .add(estado, { salida: [0, 1], duration: dur('CIERRE', Z.fundido[0], Z.fundido[1]), ease: 'in(2)' }, en('CIERRE', Z.fundido[0]));

  // ============================================================ CANAL DERIVADO
  // Todo lo de aquí abajo es función pura de (`estado`, `tiempo`). Ni un `+=`, ni un `Math.random`,
  // ni un `performance.now()`: si el visitante arrastra hacia atrás, el mismo tiempo da el mismo
  // fotograma.
  const qPadre = new Quaternion();
  const qDestino = new Quaternion();
  const dirCam = new Vector3();
  const nodoW = new Vector3();
  const desvio = new Vector3();
  const qMarca = rig.marca.quaternion.clone();
  const pMarca = rig.marca.position.clone();
  const eMarca = rig.marca.scale.clone();
  // El tamaño se calcula cada fotograma porque depende del ZOOM: el encuadre efectivo es
  // encuadre/zoom, y en COMO el zoom vale 0,62. Con el encuadre a secas la marca salía a dos
  // tercios del tamaño que le tocaba (comprobado en captura).
  const marcaAlta = (): number => (PM.marca.alto * PM.motor.encuadre) / (cam.zoom * ALTO_MARCA);
  const opacidad = new Map<Material, number>();
  for (const mat of rig.cuerpos) opacidad.set(mat, (mat as MeshLambertMaterial).opacity ?? 1);
  const emisivoBase = rig.emisivos.map((mat) => mat.emissiveIntensity);
  const colorFrio = rig.caliente.color.clone();
  const colorCaliente = new Color(0xfff3d6);
  // El rig le clona los materiales a la placa, así que este conjunto NO contiene los del resto
  // del motor y el apagado puede ser total sin tocar a la marca.
  const materialesMarca = new Set<Material>(rig.materialesMarca);
  const chapaMarca = new Set<Material>(rig.chapaMarca);
  let alfa = false;   // ¿están los cuerpos en la pasada transparente ahora mismo?

  function aplicar(tiempo: number): void {
    // 1. La corona. Las 36 matrices salen de los 36 escalares que mueve la timeline.
    rig.escribirTubos();

    // 2. Temblor. Va en `sacudida`, un grupo que NINGÚN tween toca, y se escribe en absoluto.
    const v = estado.vibra * PM.coreo.cierre.vibra;
    rig.sacudida.position.set(
      v * Math.sin(tiempo * PM.coreo.cierre.vibraHz),
      v * 0.7 * Math.sin(tiempo * PM.coreo.cierre.vibraHz * 1.7 + 1.1),
      0,
    );
    rig.sacudida.rotation.z = v * 0.35 * Math.sin(tiempo * PM.coreo.cierre.vibraHz * 2.3);

    // 3. La turbobomba coge vueltas. Ángulo = f(tiempo), no un contador que se incrementa.
    rig.turbina.rotation.y = estado.rpm * tiempo * PM.coreo.cierre.rpm;

    // 4. La marca. Se lleva al espacio de la cámara: se toma el centro del conjunto en MUNDO, se
    //    adelanta hacia la cámara y se trae al espacio del padre de la placa. Definida en el
    //    espacio de la placa se descentraba al girar el motor.
    const L = estado.logo;
    if (L > 0.0005) {
      const padre = rig.marca.parent;
      if (padre) {
        padre.updateWorldMatrix(true, false);
        padre.getWorldQuaternion(qPadre).invert();
        const escalaMarca = marcaAlta();
        qDestino.copy(qPadre).multiply(cam.quaternion);
        rig.marca.quaternion.slerpQuaternions(qMarca, qDestino, L);
        rig.marca.scale.set(
          eMarca.x + (escalaMarca - eMarca.x) * L,
          eMarca.y + (escalaMarca - eMarca.y) * L,
          eMarca.z + (escalaMarca - eMarca.z) * L,
        );
        // El nodo es el CENTRO DEL CUADRO, no el del motor. La cámara ortográfica mira al origen
        // del mundo, así que ese es el punto que cae en el centro de la pantalla. Tomándolo de
        // `raiz` la marca salía descentrada a la izquierda, porque en COMO `raiz.x` vale -0,6.
        nodoW.set(0, 0, 0);
        cam.getWorldDirection(dirCam);
        nodoW.addScaledVector(dirCam, -PM.marca.adelante);
        // el origen local de la placa es la junta de las tres formas, no su centro: se corrige
        desvio.copy(CENTRO_MARCA).multiplyScalar(escalaMarca).applyQuaternion(cam.quaternion);
        nodoW.sub(desvio);
        padre.worldToLocal(nodoW);
        rig.marca.position.lerpVectors(pMarca, nodoW, L);
      }
    } else {
      rig.marca.quaternion.copy(qMarca);
      rig.marca.position.copy(pMarca);
      rig.marca.scale.copy(eMarca);
    }

    // 5. Luces. Un solo escritor por propiedad: el producto se hace aquí, no con tweens que se pisan.
    const apaga = 1 - estado.apagado * (1 - PM.coreo.como.apagado);
    const fuera = 1 - estado.salida;
    rig.luzClave.intensity = PM.motor.luzClave * estado.luz * apaga * fuera;
    rig.luzCamara.intensity = estado.brillo * PM.coreo.cierre.luzCamara * fuera;

    // 6. Emisivos: el latido de la galería y el rojo del encendido, sobre la misma propiedad.
    for (let i = 0; i < rig.emisivos.length; i++) {
      const base = emisivoBase[i];
      rig.emisivos[i].emissiveIntensity =
        (base + estado.pulso * (PM.coreo.galeria.emisivo - base) + estado.brillo * (PM.coreo.cierre.emisiva - base)) * fuera;
    }
    // el inserto de garganta es MeshBasicMaterial (sin iluminar): en el encendido se pone al blanco
    rig.caliente.color.lerpColors(colorFrio, colorCaliente, MathUtils.clamp(estado.brillo, 0, 1));
    // La marca se AUTO-ILUMINA a medida que viene al frente: un logotipo no se sombrea, y además
    // en ese momento la luz clave está al 18 % para apagar el resto del motor.
    for (const mat of rig.emisivosMarca) mat.emissiveIntensity = L * PM.marca.emisiva;

    // 7. Opacidades. `transparent` se enciende SOLO en los dos momentos que lo necesitan: fuera de
    //    ellos los cuerpos vuelven a la pasada opaca, que se ordena de delante a atrás y sí tiene
    //    rechazo temprano por profundidad (ver rig.ts, transparentar()). Son dos conmutaciones en
    //    toda la línea de tiempo, y la segunda ya encuentra el programa en caché.
    const quiereAlfa = estado.apagado > 0.001 || estado.salida > 0.001 || L > 0.001;
    if (quiereAlfa !== alfa) {
      alfa = quiereAlfa;
      for (const mat of rig.cuerpos) { mat.transparent = quiereAlfa; mat.needsUpdate = true; }
    }
    for (const mat of rig.cuerpos) {
      const base = opacidad.get(mat) ?? 1;
      // El apagado se hace con OPACIDAD, no solo con luz: bajando la luz clave el resto del motor
      // seguía tapando la marca, y en COMO el tema es CLARO, donde "quitar luz" se lee como
      // "todo un poco más gris".
      // La CHAPA de soporte se desvanece con `logo`: en el motor da al monograma el sitio que
      // necesita para no leerse como una pieza suelta, pero al venir al frente crece con él y se
      // convertiría en un rectángulo gris tapando el motor entero.
      mat.opacity = chapaMarca.has(mat)
        ? base * (1 - L) * fuera
        : materialesMarca.has(mat)
          ? base * fuera
          : base * (1 - PM.coreo.como.borrado * estado.apagado) * fuera;
    }
  }

  function revertir(): void {
    if (alfa) {
      alfa = false;
      for (const mat of rig.cuerpos) { mat.transparent = false; mat.needsUpdate = true; }
    }
    rig.marca.quaternion.copy(qMarca);
    rig.marca.position.copy(pMarca);
    rig.marca.scale.copy(eMarca);
    for (const mat of rig.cuerpos) mat.opacity = opacidad.get(mat) ?? 1;
    for (let i = 0; i < rig.emisivos.length; i++) rig.emisivos[i].emissiveIntensity = emisivoBase[i];
    rig.caliente.color.copy(colorFrio);
    rig.sacudida.position.set(0, 0, 0);
    rig.sacudida.rotation.set(0, 0, 0);
  }

  const objetivos: object[] = [
    raiz, cam, estado, ...estado.rotulos, ...rig.tubos,
    ...sitios.map((s) => s.p.obj as Object3D), ...abanico.map((a) => a.o),
  ];

  return { estado, aplicar, revertir, objetivos };
}

