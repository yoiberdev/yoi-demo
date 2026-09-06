import { createDraggable, utils, type Draggable } from 'animejs';
import { P } from '../params';
import type { Scroller } from './scroller';

// Píldora con barra de progreso y cursor arrastrable que también mueve el scroll.
export interface Subnav { actualizar(progreso: number): void; revertir(): void }

export function montarSubnav(scroller: Scroller): Subnav {
  const nav = document.querySelector<HTMLElement>('#subnav');
  const barra = nav?.querySelector<HTMLElement>('.barra');
  const cursor = nav?.querySelector<HTMLElement>('.cursor');
  if (!nav || !barra || !cursor) return { actualizar: () => undefined, revertir: () => undefined };

  const recorrido = (): number => Math.max(1, barra.clientWidth - cursor.offsetWidth);
  const irA = (p: number): void => window.scrollTo({ top: utils.clamp(p, 0, 1) * scroller.maxScroll });

  const drag: Draggable = createDraggable(cursor, {
    y: false,
    container: barra,
    containerFriction: 1,
    onGrab: () => nav.classList.add('is-grabbed'),
    onRelease: () => nav.classList.remove('is-grabbed'),
    onUpdate: (self) => {
      if (self.grabbed) irA(self.x / recorrido());
    },
  });

  const clic = (ev: MouseEvent): void => {
    if (ev.target === cursor) return;
    const r = barra.getBoundingClientRect();
    irA((ev.clientX - r.left) / r.width);
  };
  barra.addEventListener('click', clic);

  return {
    actualizar(progreso) {
      const [a, b] = P.subnav.visible;
      nav.classList.toggle('is-visible', progreso > a && progreso < b);
      if (!drag.grabbed) drag.setX(progreso * recorrido(), true);
    },
    revertir() {
      barra.removeEventListener('click', clic);
      drag.revert();
    },
  };
}
