import * as THREE from 'three';
import { PM } from '../params-motor';
import type { Rig } from './rig';
import type { Estado } from './coreografia';

// RÓTULOS Y GUÍAS DEL DESPIECE
// ===============================================================================================
// Cada rótulo es HTML normal (un <div> con título y nota) anclado a un punto 3D de su pieza.
// El punto se proyecta a mano con `camera.project()`; NO se usa CSS2DRenderer. El porqué, medido:
//   · CSS2DRenderer coloca el elemento EN el punto proyectado. Aquí los rótulos no van sobre la
//     pieza: van en dos columnas fijas, a izquierda y derecha, con una guía en codo que los une.
//     O sea, de CSS2DRenderer solo aprovecharíamos la proyección.
//   · Y la proyección hace falta igual para dibujar la guía, porque el extremo de la línea es el
//     píxel del ancla. CSS2DRenderer la calcula por dentro y no la devuelve: habría que proyectar
//     otra vez. Serían los dos cálculos, más un `render()` extra por frame, más el peso del addon.
//   · Peso medido en este servidor (ver el informe): el addon suma al trozo 3D lo que suma, y este
//     fichero entero cuesta menos.
// El precio: colocar los rótulos es cosa nuestra. Se resuelve con ranuras fijas, que además evita
// el problema de verdad de los rótulos 3D: que se solapen al girar.
//
// REVERSIBILIDAD: este módulo no tiene memoria. Cada frame lee `estado.rotulos[i].t` (0..1, lo mueve
// la timeline maestra) y repinta. No hay transiciones CSS ni clases que se peguen: al arrastrar
// hacia atrás la guía se "des-dibuja" por el mismo camino.

export interface Rotulos {
  aplicar(): void;
  medir(): void;
  revertir(): void;
}

const NS = 'http://www.w3.org/2000/svg';

export function montarRotulos(rig: Rig, estado: Estado, host: HTMLElement): Rotulos {
  const capa = document.createElement('div');
  capa.className = 'motor-rotulos';
  capa.setAttribute('aria-hidden', 'true');
  capa.hidden = true;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'motor-guias');
  svg.setAttribute('preserveAspectRatio', 'none');
  capa.append(svg);

  const cajas: HTMLElement[] = [];
  const lineas: SVGPolylineElement[] = [];
  const puntos: SVGCircleElement[] = [];
  // Dos repartos de ranuras: el completo (nueve rótulos) y el compacto (seis). En una pantalla
  // estrecha nueve títulos en dos columnas se comen el objeto — comprobado en captura de 390 px.
  const ranura: number[] = [];
  const ranuraCompacta: number[] = [];
  let nIzq = 0;
  let nDer = 0;
  let nCompacto = 0;
  let compacto = false;

  for (const pieza of rig.piezas) {
    const caja = document.createElement('div');
    caja.className = `motor-rotulo lado-${pieza.lado < 0 ? 'izq' : 'der'}`;
    const t = document.createElement('b');
    t.textContent = pieza.titulo;
    const n = document.createElement('span');
    n.textContent = pieza.nota;
    caja.append(t, n);
    capa.append(caja);
    cajas.push(caja);

    const linea = document.createElementNS(NS, 'polyline');
    const punto = document.createElementNS(NS, 'circle');
    punto.setAttribute('r', '0');
    svg.append(linea, punto);
    lineas.push(linea);
    puntos.push(punto);
    ranura.push(pieza.lado < 0 ? nIzq++ : nDer++);
    // en compacto es UNA sola secuencia: las tres primeras a la banda de arriba, las otras tres
    // a la de abajo. El lado deja de importar porque no hay columnas laterales.
    ranuraCompacta.push(pieza.movil ? nCompacto++ : -1);
  }
  host.append(capa);

  const v = new THREE.Vector3();
  let ancho = 1;
  let alto = 1;
  let visible = false;
  // Cachés: escribir en el DOM solo cuando el valor cambia de verdad ahorra la mitad de las
  // escrituras durante el parallax, donde muchos rótulos están quietos en su ranura.
  const ultimo = rig.piezas.map(() => ({ pts: '', tr: '', op: '', r: '', og: '' }));

  // Única lectura de layout de todo el módulo, y solo al redimensionar.
  function medir(): void {
    const r = host.getBoundingClientRect();
    ancho = Math.max(1, r.width);
    alto = Math.max(1, r.height);
    compacto = ancho < PM.rotulos.anchoCompacto;
    capa.classList.toggle('compacto', compacto);
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  }
  medir();

  function aplicar(): void {
    let algo = false;
    for (let i = 0; i < estado.rotulos.length; i++) {
      if (estado.rotulos[i].t > 0.001) { algo = true; break; }
    }
    if (!algo) {
      if (visible) { capa.hidden = true; visible = false; }
      return;
    }
    if (!visible) { capa.hidden = false; visible = true; }

    const porLado = Math.max(nIzq, nDer);
    const mitad = Math.min(PM.rotulos.enBandaAlta, nCompacto);
    for (let i = 0; i < rig.piezas.length; i++) {
      const pieza = rig.piezas[i];
      const ranuraI = compacto ? ranuraCompacta[i] : ranura[i];
      const t = ranuraI < 0 ? 0 : estado.rotulos[i].t;
      const u = ultimo[i];
      if (t <= 0.001) {
        if (u.op !== '0') { cajas[i].style.opacity = u.op = '0'; }
        if (u.pts !== '') { lineas[i].setAttribute('points', u.pts = ''); }
        if (u.r !== '0') { puntos[i].setAttribute('r', u.r = '0'); }
        if (u.og !== '0.00') { lineas[i].style.opacity = u.og = '0.00'; puntos[i].style.opacity = '0.00'; }
        continue;
      }

      // 1) el ancla de la pieza: local -> mundo -> clip -> píxel.
      //    localToWorld() usa la matriz del objeto, que Three actualiza en el render anterior;
      //    como este módulo corre justo ANTES de render(), la matriz es la del frame actual
      //    salvo el primer frame. Para no arrastrar un frame de retraso, se fuerza la matriz
      //    de la rama que nos interesa (8 piezas, no la escena entera).
      pieza.obj.updateWorldMatrix(true, false);
      v.copy(pieza.ancla).applyMatrix4(pieza.obj.matrixWorld).project(rig.camara);
      const ax = (v.x * 0.5 + 0.5) * ancho;
      const ay = (-v.y * 0.5 + 0.5) * alto;

      // 2) la ranura fija. En ancho normal, columna izquierda o derecha repartidas alrededor del
      //    centro; en compacto, dos bandas (arriba y abajo) con todo el texto pegado a la izquierda.
      // En compacto el LADO lo pone la banda, no la pieza: la de arriba a la izquierda y la de
      // abajo a la derecha. Abajo a la izquierda ya vive el rótulo de capítulo (#rotulo, a 4,5 rem
      // del borde en compacto) y el último rótulo se le escribía encima.
      const lado = compacto ? (ranuraI < mitad ? -1 : 1) : pieza.lado;
      const bx = compacto
        ? (lado < 0 ? ancho * PM.rotulos.margen : ancho * (1 - PM.rotulos.margen))
        : (pieza.lado < 0 ? ancho * PM.rotulos.columna : ancho * (1 - PM.rotulos.columna));
      const by = compacto
        ? alto * (ranuraI < mitad
          ? PM.rotulos.bandaAlta + ranuraI * PM.rotulos.pasoCompacto
          : PM.rotulos.bandaBaja + (ranuraI - mitad) * PM.rotulos.pasoCompacto)
        : alto * (0.5 + (ranuraI - (porLado - 1) / 2) * PM.rotulos.alto);
      // EL CODO VA EN EL EXTREMO CERCANO AL OBJETO (por eso el signo es `-lado`). Con el codo en
      // el extremo lejano, la diagonal salía por detrás del rótulo y cruzaba por delante del
      // bloque de texto entero: se veía la diagonal de "Paneles radiadores" rozando la nota de
      // "Estructura de empuje".
      const cx = bx - lado * ancho * PM.rotulos.codo;

      // 3) la guía se dibuja recortándola por longitud de arco con el mismo escalar.
      //    Nada de stroke-dasharray: el trazado cambia de forma cada frame (la pieza gira), así que
      //    habría que recalcular getTotalLength() en cada uno. Recortar los puntos es exacto y gratis.
      const d = Math.min(1, t / PM.rotulos.dibujo);
      const l1 = Math.hypot(cx - ax, by - ay);
      const l2 = Math.abs(bx - cx);
      const hasta = d * (l1 + l2);
      let pts: string;
      if (hasta <= l1) {
        const k = l1 > 0.001 ? hasta / l1 : 0;
        pts = `${ax.toFixed(1)},${ay.toFixed(1)} ${(ax + (cx - ax) * k).toFixed(1)},${(ay + (by - ay) * k).toFixed(1)}`;
      } else {
        const k = l2 > 0.001 ? (hasta - l1) / l2 : 1;
        pts = `${ax.toFixed(1)},${ay.toFixed(1)} ${cx.toFixed(1)},${by.toFixed(1)} ${(cx + (bx - cx) * k).toFixed(1)},${by.toFixed(1)}`;
      }
      if (pts !== u.pts) lineas[i].setAttribute('points', u.pts = pts);
      // La guía se ATENÚA con el mismo escalar. Sin esto, al recogerse el rótulo el texto ya era
      // invisible (se apaga por debajo de t = 0,62) y la guía seguía dibujada entera: en el crema
      // quedaban líneas colgando de ningún sitio (esc-16a). Por arriba de t = 0,5 no cambia nada,
      // así que el trazado de entrada se sigue viendo a plena tinta.
      const opg = Math.min(1, t * 2).toFixed(2);
      if (opg !== u.og) { lineas[i].style.opacity = u.og = opg; puntos[i].style.opacity = opg; }

      // 4) el punto sobre la pieza aparece de golpe al principio del trazo
      const r = (PM.rotulos.radioPunto * Math.min(1, t * 5)).toFixed(2);
      if (r !== u.r) {
        puntos[i].setAttribute('cx', ax.toFixed(1));
        puntos[i].setAttribute('cy', ay.toFixed(1));
        puntos[i].setAttribute('r', u.r = r);
      } else {
        puntos[i].setAttribute('cx', ax.toFixed(1));
        puntos[i].setAttribute('cy', ay.toFixed(1));
      }

      // 5) el texto entra cuando la guía ya ha llegado a la columna
      const op = Math.max(0, (t - PM.rotulos.dibujo) / (1 - PM.rotulos.dibujo)).toFixed(3);
      if (op !== u.op) cajas[i].style.opacity = u.op = op;
      const tr = `translate(${lado < 0 ? '0' : '-100'}%, -50%) translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
      if (tr !== u.tr) cajas[i].style.transform = u.tr = tr;
    }
  }

  return {
    aplicar,
    medir,
    revertir(): void { capa.remove(); },
  };
}
