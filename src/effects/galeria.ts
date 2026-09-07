import { utils } from 'animejs';
import { P } from '../params';
import type { Maestro } from '../core/maestro';

// LA GALERÍA. Cinco proyectos con demo viva, uno por tramo de GALERIA.
//
// Las tarjetas se animan DENTRO del maestro, igual que el motor: el scroll mueve el reloj y ellas
// hacen seek. Así al subir se deshacen exactas, sin estados que solo vayan hacia delante.
//
// Lo único que no puede vivir en la timeline es `pointer-events`: los enlaces tienen que ser
// pinchables solo mientras su tarjeta está delante, y eso se decide mirando el reloj cada
// fotograma. De ahí `actualizar()`, que main.ts llama junto al rótulo de capítulo.

export interface Galeria {
  actualizar(tiempo: number): void;
  revertir(): void;
  total: number;
}

export function montarGaleria(m: Maestro, reduce: boolean): Galeria {
  const { tl } = m;
  const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('#galeria-tarjetas .tarjeta'));
  if (!tarjetas.length) return { actualizar: () => undefined, revertir: () => undefined, total: 0 };

  // El motor necesita apartarse antes de que entre nada: ese margen es `arranque`.
  const margen = m.duracion('GALERIA') * P.galeria.arranque;
  const ini = m.L.GALERIA + margen;
  const dur = m.duracion('GALERIA') - margen;
  const paso = dur / tarjetas.length;
  // La tarjeta ocupa su tramo entero menos los cruces: entra, se queda quieta y se va.
  // Cruce corto respecto al tramo: la tarjeta entra, se queda MUCHO rato quieta y se va.
  // Con un cruce largo el texto pasa media vida a media opacidad y no se puede leer.
  const cruce = Math.min(500, paso * 0.14);

  tl.set(tarjetas, { opacity: 0, y: reduce ? 0 : 26 }, 0);
  tarjetas.forEach((el, i) => {
    const desde = ini + paso * i;
    tl.add(el, { opacity: 1, y: 0, duration: cruce, ease: 'out(3)' }, desde)
      .add(el, { opacity: 0, y: reduce ? 0 : -26, duration: cruce, ease: 'in(2)' }, desde + paso - cruce);
  });

  let viva = -1;
  return {
    total: tarjetas.length,
    actualizar(tiempo: number): void {
      // Qué tarjeta manda ahora. Fuera del capítulo, ninguna.
      // La ventana de `viva` es la de VISIBILIDAD, no la del tramo: durante el cruce de salida la
      // tarjeta ya se ha desvanecido y sus enlaces no deben seguir siendo pinchables.
      const rel = tiempo - ini;
      const k = rel < 0 || rel >= dur ? -1
        : (rel % paso) >= paso - cruce ? -1
        : Math.min(tarjetas.length - 1, Math.floor(rel / paso));
      if (k === viva) return;
      if (viva >= 0) tarjetas[viva].classList.remove('viva');
      if (k >= 0) tarjetas[k].classList.add('viva');
      viva = k;
    },
    revertir(): void {
      for (const el of tarjetas) el.classList.remove('viva');
      utils.set(tarjetas, { opacity: 0, y: 0 });
    },
  };
}
