import { createTimeline, onScroll, utils, type Timeline, type ScrollObserver } from 'animejs';
import { P } from '../params';
import type { Maestro } from './maestro';

// Cada <section data-label="X"> anima proxy.currentTime de L[X] a L[X_END] mientras la sección "pasa" por el
// viewport: desde que su borde superior asoma por abajo hasta que su borde inferior toca el borde inferior.
// Así 1 px de scroll = 1 ms del scroller, los tramos son contiguos y el último también se recorre entero.
export interface Proxy { currentTime: number }
export interface TramoPx { X: string; ini: number; fin: number }

export interface Scroller {
  tramos: TramoPx[];
  maxScroll: number;
  refrescar(): void;
  revertir(): void;
  pxParaTiempo(t: number): number;
  progreso(): number;
}

export function crearScroller(m: Maestro, proxy: Proxy, alActualizar: () => void): Scroller {
  const secciones = Array.from(document.querySelectorAll<HTMLElement>('section[data-label]'));
  let tl: Timeline | null = null;
  let observador: ScrollObserver | null = null;
  const estado: Scroller = {
    tramos: [],
    maxScroll: 1,
    refrescar,
    revertir,
    pxParaTiempo,
    progreso: () => (observador ? observador.progress : 0),
  };

  function construir(): void {
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    estado.maxScroll = max;
    estado.tramos = [];
    observador = onScroll({
      target: '#capitulos',
      enter: 'top top',
      leave: 'bottom bottom',
      sync: P.scroll.sync,
      onUpdate: alActualizar,
    });
    tl = createTimeline({ autoplay: observador, defaults: { ease: 'linear', composition: 'none' } });
    for (const s of secciones) {
      const X = s.dataset.label ?? '';
      if (!(X in m.L)) continue;
      const ini = utils.clamp(s.offsetTop - vh, 0, max);
      const fin = utils.clamp(s.offsetTop + s.offsetHeight - vh, 0, max);
      if (fin <= ini) continue;
      tl.add(proxy, { currentTime: [m.L[X], m.L[`${X}_END`]], duration: fin - ini }, ini);
      estado.tramos.push({ X, ini, fin });
    }
    tl.init();
  }

  function revertir(): void {
    tl?.revert();
    observador?.revert();
    tl = null;
    observador = null;
  }

  function refrescar(): void {
    revertir();
    construir();
  }

  function pxParaTiempo(t: number): number {
    for (const { X, ini, fin } of estado.tramos) {
      const a = m.L[X];
      const b = m.L[`${X}_END`];
      if (t >= a && t <= b) return ini + ((t - a) / (b - a)) * (fin - ini);
    }
    return t < m.L.INTRO_END ? 0 : estado.maxScroll;
  }

  construir();
  return estado;
}
