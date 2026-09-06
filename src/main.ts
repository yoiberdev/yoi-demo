import '@fontsource-variable/space-grotesk';
import './styles/base.css';
import { animate, createScope, splitText, stagger, spring, utils, type Scope } from 'animejs';
import { P } from './params';

document.documentElement.classList.add('js');

function montarIntro(self?: Scope): void {
  const reduce = self?.matches.reduceMotion === true;
  const titulo = document.querySelector<HTMLElement>('#titulo');
  const punto = document.querySelector<HTMLElement>('#punto');
  const lema = document.querySelector<HTMLElement>('#lema');
  const nota = document.querySelector<HTMLElement>('#nota');
  if (!titulo || !punto || !lema || !nota) return;

  const { chars } = splitText(titulo, { words: false, chars: { class: 'char' } });

  if (reduce) {
    utils.set([...chars, punto, lema, nota], { opacity: 1, x: 0, y: 0, scale: 1 });
    return;
  }

  utils.set(chars, { x: P.intro.chars.x[0], opacity: 0 });
  utils.set(punto, { scale: 0 });
  utils.set([lema, nota], { opacity: 0, y: 12 });

  animate(chars, {
    x: P.intro.chars.x,
    opacity: [0, 1],
    duration: P.intro.chars.duration,
    ease: P.intro.chars.ease,
    delay: stagger(P.intro.chars.stagger, { ease: P.intro.chars.staggerEase }),
  });

  animate(punto, {
    scale: [0, 1],
    delay: P.intro.punto.delay,
    ease: spring({ stiffness: P.intro.punto.stiffness, damping: P.intro.punto.damping }),
    onComplete: () => {
      animate(punto, { scale: [1, 1.18], duration: 1200, alternate: true, loop: true, ease: 'inOutSine' });
    },
  });

  animate([lema, nota], {
    opacity: 1,
    y: 0,
    duration: 800,
    ease: 'out(3)',
    delay: stagger(P.intro.lema.stagger, { start: P.intro.lema.delay }),
  });
}

document.fonts.ready.then(() => {
  document.documentElement.classList.add('is-ready');
  createScope({
    mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
  }).add(montarIntro);
});
