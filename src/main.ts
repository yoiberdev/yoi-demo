import '@fontsource-variable/space-grotesk';
import './styles/base.css';
import { animate, createScope, type JSAnimation, type Scope } from 'animejs';
import { P } from './params';
import { crearMaestro, tramoActual } from './core/maestro';
import { crearScroller, type Proxy } from './core/scroller';
import { montarEscenario } from './core/escenario';
import { montarTema } from './core/tema';
import { montarSubnav } from './core/subnav';
import { montarDebug } from './core/debug';
import { montarIntro } from './effects/intro';

const NOMBRES: Record<string, string> = { INTRO: 'intro', HERO_OUT: 'intro', GALERIA: 'galería', COMO: 'cómo está hecho', CIERRE: 'cierre' };

// Las secciones son espaciadores: su altura fija cuánto scroll dura cada tramo.
function ajustarAlturas(): void {
  for (const s of document.querySelectorAll<HTMLElement>('section[data-label]')) {
    const alturas = P.scroll.alturas[s.dataset.label ?? ''] ?? 1;
    s.style.height = `${alturas * 100}vh`;
    s.style.height = `${alturas * 100}lvh`;
  }
}

function montar(self?: Scope): () => void {
  const reduce = self?.matches.reduceMotion === true;
  const m = crearMaestro();
  const intro = montarIntro(m, reduce);
  montarEscenario(m, reduce);
  m.tl.init();

  const proxy: Proxy = { currentTime: 0 };
  const rotuloNombre = document.querySelector<HTMLElement>('#capitulo-nombre');
  const rotuloProgreso = document.querySelector<HTMLElement>('#capitulo-progreso');
  let introTemporal: JSAnimation | null = null;

  const pintarRotulo = (): void => {
    const { tramo, progreso } = tramoActual(m, proxy.currentTime);
    if (rotuloNombre) rotuloNombre.textContent = NOMBRES[tramo] ?? tramo;
    if (rotuloProgreso) rotuloProgreso.textContent = tramo === 'GALERIA' ? `${Math.min(8, Math.floor(progreso * 8) + 1)} / 8` : '';
  };

  const tema = montarTema(m);
  const scroller = crearScroller(m, proxy, () => {
    if (introTemporal && !introTemporal.completed) {
      if (window.scrollY < 2) return; // el scroller aún no manda: la intro sigue por tiempo
      introTemporal.pause(); // el usuario hizo scroll durante la intro: el scroll toma el mando
    }
    m.tl.seek(proxy.currentTime);
    tema.actualizar(proxy.currentTime);
    pintarRotulo();
    subnav.actualizar(scroller.progreso());
  });
  const subnav = montarSubnav(scroller);
  const quitarDebug = location.search.includes('debug') ? montarDebug(m, scroller, proxy) : null;

  if (reduce || window.scrollY > 1) {
    // Recarga a mitad de página o movimiento reducido: sin intro por tiempo.
    proxy.currentTime = m.L.INTRO_END;
    m.tl.seek(m.L.INTRO_END);
    tema.actualizar(proxy.currentTime);
  } else {
    introTemporal = animate(proxy, {
      currentTime: [m.L.INTRO, m.L.INTRO_END],
      duration: P.scroll.introDuration,
      ease: 'linear',
      onUpdate: () => {
        m.tl.seek(proxy.currentTime);
        pintarRotulo();
      },
      onComplete: () => {
        const pulso = intro.arrancarPulso();
        if (pulso && self) (self.data.loops ??= new Set()).add(pulso);
      },
    });
  }
  pintarRotulo();

  let temporizador = 0;
  const alRedimensionar = (): void => {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      ajustarAlturas();
      scroller.refrescar();
    }, 250);
  };
  window.addEventListener('resize', alRedimensionar);

  return () => {
    window.removeEventListener('resize', alRedimensionar);
    window.clearTimeout(temporizador);
    introTemporal?.revert();
    quitarDebug?.();
    tema.revertir();
    subnav.revertir();
    scroller.revertir();
    intro.revertir();
    m.tl.revert();
  };
}

document.fonts.ready.then(() => {
  ajustarAlturas();
  document.documentElement.classList.add('is-ready');
  createScope({ mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' } }).add(montar);
});
