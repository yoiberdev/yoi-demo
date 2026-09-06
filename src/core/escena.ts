import { P } from '../params';
import type { Maestro } from './maestro';
import { montarEscenario } from './escenario';
import { medirCapacidad, type Calidad, type Capacidad } from './capacidad';

// EL RELEVO DE ESCENARIO
// ================================================================================================
// Hay dos escenarios y solo uno se ve:
//   - el de CSS (core/escenario.ts): placas con perspective. No pesa nada y siempre funciona.
//   - el de WebGL (effects/motor3d.ts): el motor de cohete. Pesa ~150 kB comprimidos y solo se
//     pide con import() cuando la máquina lo aguanta.
// Los dos cumplen el mismo contrato `Escena` y los dos escriben dentro del MISMO timeline maestro.
// Ni maestro.ts ni scroller.ts saben cuál está puesto: por eso son intercambiables.
//
// Regla de oro: el escenario CSS se monta SIEMPRE y no se desmonta nunca. Cuando entra el 3D, el
// CSS se tapa (opacity 0 y luego `hidden`), pero sus animaciones siguen dentro del maestro. Por eso
// la vuelta atrás es instantánea: si se pierde el contexto WebGL a mitad de página, se destapa el
// CSS y ya está en el fotograma correcto, porque nunca dejó de seguir al reloj.

export interface Escena {
  readonly tipo: 'css' | 'webgl';
  /** Idempotente: llamarla dos veces no debe hacer nada la segunda. */
  revertir(): void;
  /** Contadores para el overlay de ?debug y para comprobar que la limpieza no deja nada. */
  info?(): Record<string, number | string | boolean>;
}

/** Lo que el trozo diferido necesita de la entrada. Todo lo demás lo construye él. */
export interface ContextoMotor {
  m: Maestro;
  /** Contenedor del lienzo, ya en el DOM y con tamaño. */
  anfitrion: HTMLElement;
  /** El reloj del maestro ahora mismo (proxy.currentTime). El trozo lo lee; nunca lo mueve. */
  tiempo: () => number;
  calidad: Calidad;
  tactil: boolean;
  /** Lo llama el 3D cuando se rinde en marcha: contexto perdido o demasiado lento. */
  rendirse: (motivo: string) => void;
}

/** Firma que exporta effects/motor3d.ts. Se importa solo como tipo: no arrastra nada al bundle. */
export type MontarMotor = (ctx: ContextoMotor) => Escena;

export interface OpcionesEscena {
  reduce: boolean;
  tiempo: () => number;
}

export type EstadoRelevo = 'css' | 'cargando' | 'webgl' | 'fallido';

export interface Relevo {
  capacidad: Capacidad;
  estado(): EstadoRelevo;
  info(): Record<string, number | string | boolean> | null;
  revertir(): void;
}

export function montarEscena(m: Maestro, op: OpcionesEscena): Relevo {
  const html = document.documentElement;
  const stage = document.querySelector<HTMLElement>('#stage');
  const anfitrion = document.querySelector<HTMLElement>('#motor');

  // 1) El reserva, siempre y primero: se añade al maestro antes de que main.ts llame a tl.init().
  const css = montarEscenario(m, op.reduce);

  const forzado = new URLSearchParams(location.search).get('motor'); // ?motor=css | ?motor=3d
  const capacidad = medirCapacidad(op.reduce);

  let estado: EstadoRelevo = 'css';
  let muerto = false;
  let pedido = false;
  let tresD: Escena | null = null;

  // Temporizadores, todos con su identificador guardado para poder cancelarlos.
  let idOcio = 0;          // requestIdleCallback, o setTimeout donde no exista
  let ocioEsTimeout = false;
  let idEspera = 0;        // espera mínima antes de mirar si hay ocio
  let idTope = 0;          // tope duro
  let idTapar = 0;         // tapar el CSS cuando termina el cruce
  let idSoltar = 0;        // soltar el 3D cuando termina el cruce de vuelta
  let idRaf = 0;
  let idVigila = 0;        // espera al primer fotograma dibujado
  /** El 3D que se está soltando tras rendirse: sigue vivo hasta que termina el cruce. */
  let soltando: Escena | null = null;

  function desarmarDisparadores(): void {
    window.clearTimeout(idEspera);
    window.clearTimeout(idTope);
    cancelAnimationFrame(idRaf);
    if (idOcio) {
      if (ocioEsTimeout) window.clearTimeout(idOcio);
      else window.cancelIdleCallback(idOcio);
      idOcio = 0;
    }
    window.removeEventListener('scroll', alBajar);
  }

  function alBajar(): void {
    if (window.scrollY > 1) pedir();
  }

  function pedir(): void {
    if (pedido || muerto) return;
    pedido = true;
    desarmarDisparadores();
    estado = 'cargando';
    html.classList.add('motor-cargando');
    void cargar();
  }

  async function cargar(): Promise<void> {
    try {
      // ÚNICO import() dinámico del proyecto. Vite lo saca a su propio fichero bajo /assets/,
      // del mismo origen: la CSP `script-src 'self'` lo permite sin tocar nada.
      const mod = await import('../effects/motor3d');
      if (muerto || !anfitrion) return;
      tresD = mod.montarMotor({
        m, anfitrion, tiempo: op.tiempo,
        calidad: capacidad.calidad, tactil: capacidad.tactil, rendirse,
      });
      estado = 'webgl';
      html.classList.remove('motor-cargando');
      // NADA DE CRUZAR POR RELOJ. El cruce (que es lo que deja el escenario CSS a opacidad 0) no
      // empieza hasta que el motor ha DIBUJADO un fotograma. Si el contexto se crea pero el bucle
      // no entrega —un driver que no compone, unos sombreadores que se atascan— no salta ninguna
      // excepción, así que sin esta comprobación quedaría el CSS tapado y el lienzo vacío: la
      // página en blanco. Y si en `sinFotogramas` ms no ha salido ninguno, se vuelve al CSS.
      const desde = performance.now();
      const mirar = (): void => {
        if (muerto || estado !== 'webgl') return;
        const f = Number(tresD?.info?.().fotogramas ?? 0);
        if (f > 0) {
          html.classList.add('motor-on');   // el cruce lo hace el CSS (transition de opacidad)
          idTapar = window.setTimeout(() => {
            if (!muerto && estado === 'webgl' && stage) stage.hidden = true;
          }, P.motor.relevo);
          return;
        }
        if (performance.now() - desde > P.motor.sinFotogramas) {
          rendirse('sin fotogramas');
          return;
        }
        idVigila = requestAnimationFrame(mirar);
      };
      idVigila = requestAnimationFrame(mirar);
    } catch (e) {
      // Red caída, trozo que no está, CSP, error al crear el renderizador o fallo dentro del
      // módulo: nunca se propaga. La página se queda con el escenario CSS, que no se ha movido.
      estado = 'fallido';
      html.classList.remove('motor-cargando');
      if (import.meta.env.DEV) console.warn('[motor] no se pudo montar el 3D:', e);
    }
  }

  // Vuelta atrás en caliente. El CSS sigue enganchado al maestro: basta con destaparlo.
  function rendirse(motivo: string): void {
    if (estado !== 'webgl' || muerto) return;
    estado = 'fallido';
    window.clearTimeout(idTapar);
    cancelAnimationFrame(idVigila);
    if (stage) stage.hidden = false;
    html.classList.remove('motor-on');
    // La instancia pendiente se guarda en el cierre y no solo en la local del temporizador: si el
    // scope se revierte dentro de esos 420 ms, el clearTimeout mataba al único que la conocía y el
    // renderizador, el lienzo y el bucle se quedaban puestos para siempre.
    soltando = tresD;
    tresD = null;
    idSoltar = window.setTimeout(() => { soltando?.revertir(); soltando = null; }, P.motor.relevo);
    if (import.meta.env.DEV) console.warn('[motor] vuelta al escenario CSS:', motivo);
  }

  const salida: Relevo = {
    capacidad,
    estado: () => estado,
    info: () => tresD?.info?.() ?? null,
    revertir() {
      if (muerto) return;
      muerto = true;
      desarmarDisparadores();
      window.clearTimeout(idTapar);
      window.clearTimeout(idSoltar);
      cancelAnimationFrame(idVigila);
      (tresD ?? soltando)?.revertir();
      tresD = null;
      soltando = null;
      css.revertir();
      html.classList.remove('motor-on', 'motor-cargando');
      if (stage) stage.hidden = false;
    },
  };

  if (!anfitrion || forzado === 'css' || (!capacidad.usar3d && forzado !== '3d')) return salida;

  // 2) Cuándo se pide el trozo. Nunca durante la primera pintura: se esperan dos fotogramas (así la
  //    primera pintura ya ocurrió) y luego a que la intro termine de escribir el título. Después, al
  //    primer hueco de ocio; si el navegador nunca está ocioso, por tiempo. Si el visitante ya está
  //    bajando, se pide en el acto: el 3D hace falta a partir de HERO_OUT.
  window.addEventListener('scroll', alBajar, { passive: true });
  if (window.scrollY > 1) {
    pedir(); // recarga a mitad de página: el 3D ya se necesita
  } else {
    idRaf = requestAnimationFrame(() => {
      idRaf = requestAnimationFrame(() => {
        idEspera = window.setTimeout(() => {
          ocioEsTimeout = !('requestIdleCallback' in window);
          idOcio = ocioEsTimeout
            ? window.setTimeout(pedir, P.motor.esperaOciosa)
            : window.requestIdleCallback(() => pedir(), { timeout: P.motor.esperaOciosa });
        }, P.motor.esperaMinima);
        idTope = window.setTimeout(pedir, P.motor.esperaMaxima);
      });
    });
  }

  return salida;
}
