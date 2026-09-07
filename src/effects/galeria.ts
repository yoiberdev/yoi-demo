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
// fotograma. De ahí `actualizar()`, que main.ts llama junto al titular de capítulo.

export interface Galeria {
  actualizar(tiempo: number): void;
  /** Tarjeta cuyo tramo toca en ese instante (0..total-1), o -1 antes de la primera y fuera del capítulo. */
  indice(tiempo: number): number;
  revertir(): void;
  total: number;
}

export function montarGaleria(m: Maestro, reduce: boolean): Galeria {
  const { tl } = m;
  const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('#galeria-tarjetas .tarjeta'));
  if (!tarjetas.length) return { actualizar: () => undefined, indice: () => -1, revertir: () => undefined, total: 0 };

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
  // FROM EXPLÍCITO en las dos puntas. Con `composition: 'none'` (defaults del maestro) Anime.js no
  // busca el tween anterior sobre la misma propiedad: lee el "desde" del estilo computado EN EL
  // MOMENTO DE CREAR el tween, y ahí la tarjeta está a opacity 0 por CSS y sin transform inline
  // (el `set` de arriba aún no ha pintado nada: los hijos no escriben hasta tl.init()). Con un solo
  // `to`, medido en producción: la salida era opacity 0 -> 0 y la entrada translateY 0 -> 0. Hacia
  // delante la tarjeta se apagaba de golpe sin deslizar, y al volver desde CIERRE con un salto
  // grande (un fotograma de 700 ms) el maestro cruzaba la salida de una vez y la tarjeta se quedaba
  // a 0 con el contador diciendo "1 / 5" sobre la pantalla negra.
  tarjetas.forEach((el, i) => {
    const desde = ini + paso * i;
    tl.add(el, { opacity: [0, 1], y: [reduce ? 0 : 26, 0], duration: cruce, ease: 'out(3)' }, desde)
      .add(el, { opacity: [1, 0], y: [0, reduce ? 0 : -26], duration: cruce, ease: 'in(2)' }, desde + paso - cruce);
  });

  // EL MISMO REPARTO PARA TODOS. Antes el contador de main.ts hacía floor(progreso * total) sobre
  // el tramo ENTERO de GALERIA, sin restar `margen`: con la primera tarjeta a la vista decía
  // "2 / 5". Ahora el único que sabe dónde empieza cada tarjeta es este módulo, y lo expone.
  const indice = (tiempo: number): number => {
    const rel = tiempo - ini;
    if (rel < 0 || rel >= dur) return -1;
    return Math.min(tarjetas.length - 1, Math.floor(rel / paso));
  };

  let viva = -1;
  return {
    total: tarjetas.length,
    indice,
    actualizar(tiempo: number): void {
      // Qué tarjeta manda ahora. Fuera del capítulo, ninguna.
      // La ventana de `viva` es la de VISIBILIDAD, no la del tramo: durante el cruce de salida la
      // tarjeta ya se ha desvanecido y sus enlaces no deben seguir siendo pinchables. El contador,
      // en cambio, usa el tramo entero (`indice`): si se vaciara en cada cruce parpadearía.
      const rel = tiempo - ini;
      const k = (rel % paso) >= paso - cruce ? -1 : indice(tiempo);
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
