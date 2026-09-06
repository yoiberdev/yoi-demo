import type { Maestro } from './maestro';
import { tramoActual } from './maestro';
import type { Scroller, Proxy } from './scroller';
import type { Relevo } from './escena';

// Overlay con ?debug: tiempo del maestro, tramo, scroll y saltos a cada etiqueta.
export function montarDebug(m: Maestro, scroller: Scroller, proxy: Proxy, escena: Relevo): () => void {
  const caja = document.createElement('div');
  caja.id = 'debug';
  const texto = document.createElement('pre');
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Saltar a etiqueta');
  for (const nombre of Object.keys(m.L)) {
    const o = document.createElement('option');
    o.value = nombre;
    o.textContent = `${nombre} (${m.L[nombre]})`;
    sel.append(o);
  }
  sel.addEventListener('change', () => window.scrollTo({ top: scroller.pxParaTiempo(m.L[sel.value]) }));
  caja.append(texto, sel);
  document.body.append(caja);

  let vivo = true;
  let ultimo = performance.now();
  let fps = 0;
  const pintar = (): void => {
    if (!vivo) return;
    const ahora = performance.now();
    fps = Math.round(1000 / Math.max(1, ahora - ultimo));
    ultimo = ahora;
    const { tramo, progreso } = tramoActual(m, proxy.currentTime);
    texto.textContent = `maestro ${Math.round(proxy.currentTime)} / ${m.total}\n${tramo} ${Math.round(progreso * 100)}%\nscroll ${Math.round(window.scrollY)} / ${scroller.maxScroll}\nfps ~${fps}\nescena ${escena.estado()} · ${escena.capacidad.calidad} (${escena.capacidad.motivo})`;
    requestAnimationFrame(pintar);
  };
  requestAnimationFrame(pintar);
  Object.assign(window, { __yoi: { maestro: m.tl, labels: m.L, proxy, scroller, escena } });
  return () => {
    vivo = false;
    caja.remove();
  };
}
