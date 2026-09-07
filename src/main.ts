import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import './styles/base.css';
import { animate, createScope, type JSAnimation, type Scope } from 'animejs';
import { P } from './params';
import { crearMaestro, tramoActual } from './core/maestro';
import { crearScroller, type Proxy } from './core/scroller';
import { montarEscena } from './core/escena';
import { montarTema } from './core/tema';
import { montarSubnav } from './core/subnav';
import { montarDebug } from './core/debug';
import { montarHero } from './effects/hero';
import { montarGaleria } from './effects/galeria';
import { montarLogoIntro } from './effects/logo-intro';
import { montarLogoSalida } from './effects/logo-salida';
import { montarTitulo } from './effects/titulo';
import { montarPie } from './effects/pie';

// Los nombres del titular de capítulo (#capitulo-nombre, effects/titulo.ts). INTRO y HERO_OUT van
// vacíos: ahí el logo está en pantalla y es él quien dice de quién es la página.
const NOMBRES: Record<string, string> = { INTRO: '', HERO_OUT: '', GALERIA: 'Proyectos', COMO: 'Por dentro', CIERRE: 'Encendido' };

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
  // El texto del hero (lema, nota y enlace) y el velo: Anime.js, dentro del maestro.
  const hero = montarHero(m, reduce);
  // Antes de tl.init(): la galería añade sus tweens al maestro y init() los tiene que ver.
  const galeria = montarGaleria(m, reduce);
  // El escenario: CSS siempre, y el motor 3D por encima si la máquina lo aguanta. Ver core/escena.ts.
  // El reloj que lee el motor 3D es el del PROPIO MAESTRO, no `proxy`. Son el mismo número casi
  // siempre, pero `proxy` es el OBJETIVO al que el scroller acerca el maestro tic a tic (ver
  // core/scroller.ts): entre un tic y el siguiente pueden diferir, y el motor lee el reloj 60 veces
  // por segundo para el temblor, el parpadeo del penacho y las vueltas de la turbina. Leyendo el
  // maestro, lo que se dibuja es siempre lo que el maestro acaba de colocar.
  const escena = montarEscena(m, {
    reduce,
    tiempo: () => m.tl.currentTime,
    // El motor llega con la página quieta (lo pide la intro del logo al ensamblarse): nadie va a
    // mover el scroll detrás para recolocar el reloj, así que se recoloca aquí. `colocar` es la
    // función de más abajo: mueve el maestro Y la timeline de GSAP del logo, que es justo lo que
    // hace falta reponer.
    alMontarMotor: () => colocar(proxy.currentTime),
  });

  // EL RELEVO, en tres eslabones (ver effects/logo-salida.ts para el porqué de cada uno):
  //   1) la SALIDA del logo se escribe en el maestro como un escalar 0..1 en HERO_OUT, y es lo que
  //      ata la timeline de GSAP al reloj del scroll;
  //   2) `alEmpezar` avisa a la entrada de que el visitante ya baja, para que termine deprisa en vez
  //      de cruzarse con la retirada;
  //   3) `alTapar` congela la flotación cuando el logo ya no se ve.
  // El logo se monta DESPUÉS (no toca el maestro), así que la salida lo alcanza por el cierre.
  let logo: ReturnType<typeof montarLogoIntro> | null = null;
  const salidaLogo = montarLogoSalida(m, {
    reduce,
    alEmpezar: () => logo?.acelerarEntrada(),
    alTapar: (fuera) => logo?.congelar(fuera),
  });

  m.tl.init();

  // TODO EL MUNDO COLOCA EL RELOJ POR AQUÍ. `m.tl.seek()` mueve a los hijos del maestro (el hero, el
  // escenario y, cuando llega, el motor); `salidaLogo.aplicar()` copia el escalar que acaba de
  // moverse a la timeline de GSAP del logo. Van juntos SIEMPRE, y por eso están en la misma función:
  // si alguien llamara al seek a secas, el logo se quedaría en el fotograma anterior.
  const colocar = (t: number): void => {
    m.tl.seek(t);
    salidaLogo.aplicar();
  };

  // La intro del logo de yoiber.com: entrada y flotación con su propio reloj (GSAP), como el
  // original. Solo la SALIDA está atada al maestro. `alTerminar` es el eslabón con el motor: en
  // cuanto las tres formas se ensamblan se pide el trozo 3D, ni antes (competiría con la entrada)
  // ni mucho después (tiene que estar montado para cuando el visitante baje).
  // El trozo 3D pesa 617 kB y al analizarlo el hilo principal se para. Si se pide en cuanto las
  // formas se ensamblan, esa parada cae justo encima del arranque de la flotación y el logo se
  // queda congelado un par de segundos: medido, la flotación empezaba a moverse a los 7,9 s en vez
  // de a los 5,5 s del original. Así que se espera a que la flotación lleve ya un rato a la vista.
  // Y si el visitante baja antes, se pide en el acto: entonces sí lo necesita ya.
  let esperaMotor = 0;
  const pedirYa = (): void => {
    window.clearTimeout(esperaMotor);
    esperaMotor = 0;
    window.removeEventListener('scroll', pedirYa);
    escena.pedirMotor();          // idempotente: escena.ts lleva su propio pestillo
  };
  logo = montarLogoIntro(self, {
    alTerminar: () => {
      esperaMotor = window.setTimeout(pedirYa, P.motor.esperaTrasIntro);
      window.addEventListener('scroll', pedirYa, { once: true, passive: true });
    },
  });

  let introTemporal: JSAnimation | null = null;

  // El titular de capítulo y el pie viven FUERA del maestro (el porqué, en la cabecera de cada
  // módulo): el titular reacciona a un cambio de nombre y el pie mide su propio scroll.
  const titulo = montarTitulo(reduce);
  const quitarPie = montarPie(reduce);

  // ¿Ya asoma el pie? Se mira desde el scroll y el tramo de CIERRE del scroller (su `fin` es el
  // borde inferior de #capitulos menos una ventana) en vez de medir el DOM: este callback corre
  // justo después de que el maestro escriba en decenas de nodos, y un getBoundingClientRect aquí
  // forzaría el layout en cada tic.
  const pieALaVista = (): boolean => {
    const cierre = scroller.tramos.find((t) => t.X === 'CIERRE');
    return cierre !== undefined && window.scrollY > cierre.fin + window.innerHeight * (1 - P.pie.tapa);
  };
  const pintarRotulo = (): void => {
    const { tramo } = tramoActual(m, proxy.currentTime);
    // El contador lo reparte la galería (indice): -1 antes de la primera tarjeta y fuera del capítulo.
    const k = galeria.indice(proxy.currentTime);
    titulo.pintar(pieALaVista() ? '' : (NOMBRES[tramo] ?? tramo), k >= 0 ? `${k + 1} / ${galeria.total}` : '');
  };

  const tema = montarTema(m);
  // EL TRASPASO DE LA INTRO va en el segundo callback (`manda`): mientras la intro corre por tiempo
  // y el visitante no ha bajado, el scroller ni toca el proxy. Antes lo escribía igual y este
  // callback solo se saltaba el seek: dos escritores para el mismo número, y al redimensionar en
  // mitad de la intro el suavizado tiraba del reloj. En cuanto baja 2 px la intro se para y el
  // scroll toma el mando para siempre: una intro parada ya no vuelve a mandar aunque el scroll
  // regrese a 0 (antes sí, y la página se quedaba congelada en el fotograma de la parada).
  const scroller = crearScroller(m, proxy, () => {
    colocar(proxy.currentTime);
    tema.actualizar(proxy.currentTime);
    galeria.actualizar(proxy.currentTime);
    hero.actualizar(proxy.currentTime);
    pintarRotulo();
    subnav.actualizar(scroller.progreso());
  }, () => {
    if (!introTemporal || introTemporal.completed || introTemporal.paused) return true;
    if (window.scrollY < 2) return false; // el scroller aún no manda: la intro sigue por tiempo
    introTemporal.pause(); // el usuario hizo scroll durante la intro: el scroll toma el mando
    return true;
  });
  const subnav = montarSubnav(scroller);
  const quitarDebug = location.search.includes('debug') ? montarDebug(m, scroller, proxy, escena, salidaLogo) : null;

  // "Ver los proyectos": el enlace del hero. preventDefault porque el href="#galeria" apuntaría al
  // espaciador, o sea al principio del tramo y no a la primera tarjeta. Con scroll-behavior: smooth
  // en el body, scrollTo anima; si la intro por tiempo aún corre, el scroller la para al primer tic.
  const bajar = document.querySelector<HTMLAnchorElement>('#bajar');
  const irAProyectos = (ev: Event): void => {
    ev.preventDefault();
    window.scrollTo({ top: scroller.pxParaTiempo(m.L.GALERIA + m.duracion('GALERIA') * P.galeria.arranque + P.galeria.margenBajar) });
  };
  bajar?.addEventListener('click', irAProyectos);

  if (reduce || window.scrollY > 1) {
    // Recarga a mitad de página o movimiento reducido: sin intro por tiempo. El reloj se pone
    // directamente donde está el scroll (con scroll 0, `objetivo()` es INTRO_END: la intro ya
    // acabada). Antes se ponía en INTRO_END siempre y el suavizado recorría la página entera desde
    // el hero hasta la posición que el navegador había restaurado.
    proxy.currentTime = scroller.objetivo();
    colocar(proxy.currentTime);
    tema.actualizar(proxy.currentTime);
  } else {
    // La intro corre por tiempo y dura lo que la entrada del logo (P.scroll.introDuration sale de
    // los números del original). Sin onComplete: el bucle de flotación lo arranca el propio logo
    // desde su `onComplete`, que es donde estaba en yoiber.com.
    introTemporal = animate(proxy, {
      currentTime: [m.L.INTRO, m.L.INTRO_END],
      duration: P.scroll.introDuration,
      ease: 'linear',
      onUpdate: () => {
        colocar(proxy.currentTime);
        pintarRotulo();
      },
    });
  }
  pintarRotulo();

  let temporizador = 0;
  const alRedimensionar = (): void => {
    window.clearTimeout(temporizador);
    window.clearTimeout(esperaMotor);
    window.removeEventListener('scroll', pedirYa);
    temporizador = window.setTimeout(() => {
      ajustarAlturas();
      scroller.refrescar();   // rehace los tramos y en su primer tic vuelve a colocar el maestro
    }, 250);
  };
  window.addEventListener('resize', alRedimensionar);

  return () => {
    window.removeEventListener('resize', alRedimensionar);
    window.clearTimeout(temporizador);
    bajar?.removeEventListener('click', irAProyectos);
    introTemporal?.revert();
    quitarDebug?.();
    quitarPie();
    titulo.revertir();
    escena.revertir();
    galeria.revertir();
    tema.revertir();
    subnav.revertir();
    scroller.revertir();
    logo?.();            // el cleanup de la intro del logo: mata entrada, flotación y espera
    salidaLogo.revertir();
    hero.revertir();
    m.tl.revert();
  };
}

document.fonts.ready.then(() => {
  ajustarAlturas();
  document.documentElement.classList.add('is-ready');
  createScope({ mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' } }).add(montar);
});
