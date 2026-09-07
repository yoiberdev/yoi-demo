import { stagger, utils } from 'animejs';
import { P } from '../params';
import type { Maestro } from '../core/maestro';

// EL TEXTO DEL HERO — lo que queda debajo del logo
// ================================================================================================
// Sustituye a effects/intro.ts (el titular "yoiber." de texto partido con splitText, borrado).
//
// POR QUÉ SE VA EL TITULAR Y SE QUEDA EL RESTO. El logo de yoiber.com ES la marca: sus tres formas
// dibujan la Y del monograma. Poner debajo, a 9 rem, la palabra "yoiber" en letra era decir dos
// veces lo mismo, y además se solapaban (el logo mide hasta 320 px y el h1 estaba pegado a él).
// El lema y la nota, en cambio, dicen algo que el logo no dice: qué es esta página, con qué está
// hecha y que está en obras. Eso es contenido, no decoración, y se queda como subtítulo del logo.
// Con el titular se va también el punto de acento y su pulso: era el remate tipográfico del h1.
//
// QUIÉN ANIMA QUÉ EN EL HERO. Dos librerías y una frontera limpia:
//   · el LOGO, con GSAP:  effects/logo-intro.ts (entrada + flotación) y effects/logo-salida.ts.
//   · el TEXTO y el VELO, con Anime.js y dentro del maestro: este fichero.
// No comparten ni un nodo, así que no hay dos escritores para ninguna propiedad.
//
// CUÁNDO ENTRA EL TEXTO. Tarde, a propósito: `P.intro.texto.delay` está medido para que el logo ya
// esté montado. Si el texto subiera a la vez que las formas cruzan la pantalla a 15 aumentos, se
// leería como parte del ruido; apareciendo después, el logo aterriza y entonces la página se
// presenta. Como es un hijo del maestro y no un `animate()` suelto, sigue siendo reversible con el
// scroll: quien vuelva arriba desde la galería lo ve deshacerse.

export interface Hero { revertir(): void }

export function montarHero(m: Maestro, reduce: boolean): Hero {
  const { tl } = m;
  const velo = document.querySelector<HTMLElement>('#velo');
  const lema = document.querySelector<HTMLElement>('#lema');
  const nota = document.querySelector<HTMLElement>('#nota');
  const bajar = document.querySelector<HTMLElement>('#bajar');
  if (!velo) return { revertir: () => undefined };

  // Los textos son opcionales: esta página es la web de Yoiber, no una demo, y el logo habla solo.
  // Si algún día vuelve a haber subtítulo, basta con añadirlo al marcado y aquí se anima de nuevo.
  const texto = [lema, nota, bajar].filter((e): e is HTMLElement => e !== null);
  const dur = m.duracion('HERO_OUT') * P.intro.salidaTexto;

  if (reduce) {
    utils.set([velo, ...texto], { opacity: 1, y: 0 });
    tl.add([velo, ...texto], { opacity: 0, duration: dur, ease: 'linear' }, 'HERO_OUT');
    return { revertir: () => undefined };
  }

  const T = P.intro.texto;
  // El velo entra ANTES que el texto y con el logo: es el suelo sobre el que se lee todo lo demás.
  tl.set(velo, { opacity: 0 }, 0)
    .add(velo, { opacity: 1, duration: 1200, ease: 'linear' }, 'INTRO_ON')
    // HERO_OUT: el velo se va mientras el motor toma el centro.
    .add(velo, { opacity: 0, duration: dur, ease: 'in(2)' }, 'HERO_OUT');

  // Hoy no hay subtítulo: el logo habla solo. Si vuelve a haberlo, se anima igual que antes.
  if (texto.length) {
    tl.set(texto, { opacity: 0, y: T.y }, 0)
      .add(texto, {
        opacity: 1, y: 0, duration: T.duration, ease: 'out(3)', delay: stagger(T.stagger),
      }, `INTRO_ON+=${T.delay}`)
      .add(texto, { y: -120, opacity: 0, duration: dur, ease: 'in(2)' }, 'HERO_OUT');
  }

  // Nada que soltar: no hay nodos creados ni escuchadores, y los hijos del maestro los deshace el
  // `m.tl.revert()` de main.ts.
  return { revertir: () => undefined };
}
