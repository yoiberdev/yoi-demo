import '@fontsource-variable/space-grotesk';
import './styles/base.css';
import { animate, createScope, type JSAnimation, type Scope } from 'animejs';
import { P } from './params';
import { crearMaestro, tramoActual } from './core/maestro';
import { crearScroller, type Proxy } from './core/scroller';
import { montarEscena } from './core/escena';
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
  const proxy: Proxy = { currentTime: 0 };
  const intro = montarIntro(m, reduce);
  // El escenario: CSS siempre, y el motor 3D por encima si la máquina lo aguanta. El relevo pide
  // el trozo diferido él solo; aquí no se espera a nada. Ver core/escena.ts.
  // El reloj que lee el motor 3D es el del PROPIO MAESTRO, no `proxy`. Son el mismo número casi
  // siempre, pero `proxy` solo es fiable justo después de un tic de scroll: al redimensionar,
  // `scroller.refrescar()` reconstruye la línea de tiempo y el maestro se queda en su etiqueta
  // mientras `proxy` conserva el valor viejo. Con el escenario CSS eso no se notaba (nadie lee
  // `proxy` por fotograma); el motor lo lee 60 veces por segundo para el temblor, el parpadeo del
  // penacho y las vueltas de la turbina, y ahí se veía el salto.
  const escena = montarEscena(m, { reduce, tiempo: () => m.tl.currentTime });
  m.tl.init();

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
  const quitarDebug = location.search.includes('debug') ? montarDebug(m, scroller, proxy, escena) : null;

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
      m.tl.seek(proxy.currentTime);   // refrescar() reconstruye y deja el maestro en 0: se repone
    }, 250);
  };
  window.addEventListener('resize', alRedimensionar);

  return () => {
    window.removeEventListener('resize', alRedimensionar);
    window.clearTimeout(temporizador);
    introTemporal?.revert();
    quitarDebug?.();
    escena.revertir();
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
