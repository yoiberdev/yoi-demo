import { animate, splitText, stagger, spring, utils, type JSAnimation } from 'animejs';
import { P } from '../params';
import type { Maestro } from '../core/maestro';

// Intro: se escribe dentro del maestro (tramo INTRO, por tiempo) y el hero se va en HERO_OUT (por scroll).
export interface Intro { revertir(): void; arrancarPulso(): JSAnimation | null }

export function montarIntro(m: Maestro, reduce: boolean): Intro {
  const { tl } = m;
  const titulo = document.querySelector<HTMLElement>('#titulo');
  const punto = document.querySelector<HTMLElement>('#punto');
  const lema = document.querySelector<HTMLElement>('#lema');
  const nota = document.querySelector<HTMLElement>('#nota');
  const bajar = document.querySelector<HTMLElement>('#bajar');
  if (!titulo || !punto || !lema || !nota || !bajar) return { revertir: () => undefined, arrancarPulso: () => null };

  const split = splitText(titulo, { words: false, chars: { class: 'char' } });
  let pulso: JSAnimation | null = null;

  const salida = { y: -120, opacity: 0, duration: m.duracion('HERO_OUT') * 0.6, ease: 'in(2)' };

  if (reduce) {
    utils.set([...split.chars, punto, lema, nota, bajar], { opacity: 1, x: 0, y: 0, scale: 1 });
    tl.add('#hero', { opacity: 0, duration: m.duracion('HERO_OUT') * 0.6, ease: 'linear' }, 'HERO_OUT');
  } else {
    const c = P.intro.chars;
    tl.set(split.chars, { x: c.x[0], opacity: 0 }, 0)
      .set(punto, { scale: 0 }, 0)
      .set([lema, nota, bajar], { opacity: 0, y: 12 }, 0)
      .add(split.chars, {
        x: c.x, opacity: [0, 1], duration: c.duration, ease: c.ease, delay: stagger(c.stagger, { ease: c.staggerEase }),
      }, 'INTRO_ON')
      .add(punto, {
        scale: [0, 1], ease: spring({ stiffness: P.intro.punto.stiffness, damping: P.intro.punto.damping }),
      }, `INTRO_ON+=${P.intro.punto.delay}`)
      .add([lema, nota, bajar], {
        opacity: 1, y: 0, duration: 800, ease: 'out(3)', delay: stagger(P.intro.lema.stagger),
      }, `INTRO_ON+=${P.intro.lema.delay}`)
      .add('#hero', salida, 'HERO_OUT');
  }

  return {
    arrancarPulso() {
      if (reduce || pulso) return pulso;
      pulso = animate(punto, { scale: [1, 1.18], duration: 1200, alternate: true, loop: true, ease: 'inOutSine' });
      return pulso;
    },
    revertir() {
      pulso?.revert();
      pulso = null;
      split.revert();
    },
  };
}
