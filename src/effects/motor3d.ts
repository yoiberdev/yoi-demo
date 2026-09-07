import 'animejs/adapters/three';
import { engine, utils } from 'animejs';
import { InstancedMesh, Material, Mesh, Texture, WebGLRenderer, type Object3D } from 'three';
import { P } from '../params';
import { PM } from '../params-motor';
import type { ContextoMotor, Escena } from '../core/escena';
import { escalaLienzo } from '../core/capacidad';
import { construirRig } from '../motor/rig';
import { montarCoreografia } from '../motor/coreografia';
import { montarRotulos } from '../motor/rotulos';
import { crearPenacho } from '../motor/penacho';

// TROZO DIFERIDO. Todo lo que huele a Three vive en este fichero o por debajo de él.
// La entrada no lo importa nunca de forma estática: solo `import('../effects/motor3d')` desde
// core/escena.ts. Si esa regla se rompe, Vite mete Three en el bundle de entrada y la primera
// carga pasa de 33 kB comprimidos a 180 kB. Se comprueba mirando el tamaño de index-*.js.

/** Los dos contornos: las aristas de pliegue (LineSegments) y los cascos de silueta (BackSide). */
const esContorno = (nombre: string): boolean => nombre.startsWith('aristas-') || nombre.startsWith('silueta-');

export function montarMotor(ctx: ContextoMotor): Escena {
  const { m, anfitrion, tiempo, calidad, tactil, rendirse } = ctx;

  // ---------------------------------------------------------------------------------------
  // 1. LIENZO Y RENDERIZADOR
  // ---------------------------------------------------------------------------------------
  const lienzo = document.createElement('canvas');
  lienzo.className = 'motor-lienzo';
  lienzo.setAttribute('aria-hidden', 'true');   // es decorado, no contenido
  anfitrion.append(lienzo);

  let render: WebGLRenderer;
  try {
    render = new WebGLRenderer({
      canvas: lienzo,
      // alpha: el fondo lo pone el CSS, que además cambia de tema en el capítulo claro. Así el
      // lienzo no tiene que enterarse del tema ni sincronizar ningún color de borrado.
      alpha: true,
      antialias: calidad !== 'baja',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
      // 'default', no 'high-performance': ~59 000 triángulos sin sombras; la integrada va sobrada,
      // y pedir la dedicada en un portátil con dos GPU se come la batería sin ganar un fotograma.
      powerPreference: 'default',
    });
  } catch (e) {
    lienzo.remove();
    throw e;   // lo caza core/escena.ts y se queda el escenario CSS
  }
  render.shadowMap.enabled = false;   // lo más caro que hay, y el sombreado plano no lo necesita

  // RED BAJO EL RENDERIZADOR. Todo lo que viene ahora puede fallar (una pieza que la geometría
  // renombra, un OOM al crear geometrías en un móvil justo) y el `catch` de core/escena.ts se lo
  // tragaría dejando los restos puestos: el lienzo en el DOM con contexto vivo, el reloj de la
  // página en manos de un bucle que no llegó a montarse y, si el fallo es después de engancharse
  // al maestro, ~130 hijos escribiendo en un grafo a medias. Cada paso irreversible se apunta aquí
  // y se deshace en orden inverso.
  const deshacer: (() => void)[] = [];
  deshacer.push(() => {
    render.renderLists.dispose();
    render.dispose();
    render.forceContextLoss();
    lienzo.width = 0;
    lienzo.height = 0;
    lienzo.remove();
  });

  try {
    // -------------------------------------------------------------------------------------
    // 2. ESCENA, COREOGRAFÍA, RÓTULOS Y PENACHO
    // -------------------------------------------------------------------------------------
    const rig = construirRig(calidad);
    deshacer.push(() => rig.liberar());

    // EL TEMA Y LA TINTA. El capítulo "cómo está hecho" pone `html.is-light` y el fondo pasa de
    // negro a crema. Los dos colores de contorno no valen para los dos fondos (ver
    // geometria.ts / aplicarTema), y el lienzo es `alpha: true`, así que nadie más se entera del
    // cambio: aquí se escucha la clase del <html> y se repinta la tinta. Es una sola escritura de
    // color por cambio de capítulo, no trabajo por fotograma.
    const raizHtml = document.documentElement;
    const mirarTema = (): void => rig.tema(raizHtml.classList.contains('is-light'));
    mirarTema();
    const observadorTema = new MutationObserver(mirarTema);
    observadorTema.observe(raizHtml, { attributes: true, attributeFilter: ['class'] });
    deshacer.push(() => observadorTema.disconnect());
    // El penacho ligero (dos capas y una sola cara) es lo PRIMERO que se degrada en móvil: mide
    // 9,5 u en un encuadre de 8,8, o sea que ocupa la pantalla entera con mezcla aditiva.
    const penacho = crearPenacho(rig.yLabio, calidad === 'baja');   // cuelga del labio
    deshacer.push(() => penacho.liberar());
    rig.motor.grupo.add(penacho.obj);           // tiembla con el motor y sube con él
    const coreo = montarCoreografia(m, rig);
    // utils.remove NECESITA el segundo argumento: sin él recorre los hijos del `engine`, y el
    // maestro se crea con autoplay:false, así que nunca es hijo del engine y no quita nada.
    deshacer.push(() => utils.remove(coreo.objetivos, m.tl));
    const rotulos = montarRotulos(rig, coreo.estado, anfitrion);
    deshacer.push(() => rotulos.revertir());

    if (calidad === 'baja') {
      // Los contornos (aristas + cascos de silueta) son 9 llamadas de dibujo y 33 000 triángulos
      // repetidos, y el casco además rellena: en móvil, donde lo que duele es el relleno, es lo
      // primero que sobra. La silueta se sigue leyendo por el sombreado plano.
      rig.motor.grupo.traverse((o) => { if (esContorno(o.name)) o.visible = false; });
    }

    // La coreografía se añade a un maestro que YA está inicializado y en marcha:
    //   (a) todos los valores van como [desde, hasta] explícitos (ver coreografia.ts);
    //   (b) hay que volver a llamar a tl.init() para que los hijos nuevos pinten su estado de
    //       partida, y justo después reponer el reloj con seek(), porque init() lo deja en 0.
    m.tl.init();
    m.tl.seek(tiempo());

    // -------------------------------------------------------------------------------------
    // 3. TAMAÑO
    // -------------------------------------------------------------------------------------
    let escalaExtra = 1;   // lo que recorta el vigilante de fotogramas

    function dimensionar(): void {
      const r = anfitrion.getBoundingClientRect();
      const ancho = Math.max(1, Math.round(r.width));
      const alto = Math.max(1, Math.round(r.height));
      render.setPixelRatio(escalaLienzo(ancho, alto, tactil) * escalaExtra);
      render.setSize(ancho, alto, false);   // false: el tamaño CSS lo pone la hoja de estilos
      rig.disponer(ancho, alto);            // ortográfica: solo cambia el encuadre, no deforma
      rotulos.medir();
    }
    dimensionar();

    let idRaf = 0;
    const observadorTam = new ResizeObserver(() => {
      cancelAnimationFrame(idRaf);
      idRaf = requestAnimationFrame(dimensionar);
    });
    observadorTam.observe(anfitrion);
    deshacer.push(() => { observadorTam.disconnect(); cancelAnimationFrame(idRaf); });

    // Cambio de densidad de píxeles (mover la ventana entre dos monitores). Se escucha con una
    // media query en vez de comprobarlo dentro del vigilante, que solo salta cada 1,5 s.
    let mqDpr: MediaQueryList | null = null;
    function alCambiarDpr(): void { dimensionar(); escucharDpr(); }
    function escucharDpr(): void {
      mqDpr?.removeEventListener('change', alCambiarDpr);
      mqDpr = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mqDpr.addEventListener('change', alCambiarDpr);
    }
    escucharDpr();
    deshacer.push(() => mqDpr?.removeEventListener('change', alCambiarDpr));

    // COMPILAR ANTES DE ENSEÑAR. Sin esto, el primer render() arrastra la compilación de los cinco
    // programas: en un móvil eso es una tarea larga justo en el cruce con el escenario CSS.
    render.compile(rig.escena, rig.camara);

    // -------------------------------------------------------------------------------------
    // 4. EL BUCLE. Uno solo, y Anime.js va dentro
    // -------------------------------------------------------------------------------------
    // Trampa medida en el paquete instalado (engine.js): poner `useDefaultMainLoop = false` NO
    // detiene el rAF que el motor ya tuviera en marcha; `tickEngine` se vuelve a pedir a sí mismo
    // sin mirar esa bandera. Se apaga con `pause()` y se reenciende con `resume()`.
    const mainLoopAnterior = engine.useDefaultMainLoop;
    engine.pause();
    engine.useDefaultMainLoop = false;
    engine.resume();
    deshacer.push(() => {
      engine.useDefaultMainLoop = mainLoopAnterior;
      if (mainLoopAnterior) engine.wake();
    });

    let vivo = true;
    let anterior = 0;
    let suma = 0;
    let n = 0;
    let calentando = 60;
    // En calidad baja el peldaño de los contornos es un no-op (ya están ocultos), así que empezar
    // en 0 gastaría una ventana entera de medición sin degradar nada, justo en el aparato donde
    // más urge.
    let escalon = 0;
    let avisosGraves = 0;
    let buenas = 0;
    let fotogramas = 0;

    render.setAnimationLoop((ahora: number) => {
      if (!vivo) return;
      try {
        // ORDEN: Anime.js escribe en el grafo -> el canal derivado completa -> los rótulos se
        // proyectan -> Three dibuja. Nunca al revés.
        engine.update();
        const t = tiempo();
        coreo.aplicar(t);
        penacho.aplicar(coreo.estado, t);
        rotulos.aplicar();
        render.render(rig.escena, rig.camara);
        fotogramas++;
      } catch (e) {
        // OBLIGATORIO. En three.module.js (WebGLAnimation) el requestAnimationFrame del siguiente
        // fotograma se pide DESPUÉS de llamar al callback: si el callback lanza, el bucle no se
        // vuelve a pedir nunca. Y como el bucle lleva el reloj de Anime.js, ahí se congelaría la
        // página entera, también el suavizado del scroll.
        rendirse(`excepción en el bucle: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      if (anterior) {
        const dt = ahora - anterior;
        if (calentando > 0) calentando--;
        else if (dt < P.motor.saltoFps) { suma += dt; n++; }
        if (n > 0 && (n >= P.motor.muestrasFps || suma >= P.motor.ventanaFps)) {
          vigilar(suma / n);
          suma = 0;
          n = 0;
        }
      }
      anterior = ahora;
    });
    deshacer.push(() => { vivo = false; render.setAnimationLoop(null); });

    // -------------------------------------------------------------------------------------
    // 5. DEGRADAR EN MARCHA (y volver a subir)
    // -------------------------------------------------------------------------------------
    // Con ?motor=3d el visitante ha pedido el 3D a propósito (es lo que usan las pruebas y lo que
    // permite mirarlo en una máquina sin GPU): se degrada igual, pero no se abandona.
    const consulta = new URLSearchParams(location.search);
    const forzado = consulta.get('motor') === '3d';
    const fijo = consulta.has('fijo');   // ?fijo: ni degrada ni se rinde (capturas de referencia)

    function contornos(visible: boolean): void {
      if (calidad === 'baja') return;   // en móvil ya están fuera desde el montaje
      rig.motor.grupo.traverse((o) => { if (esContorno(o.name)) o.visible = visible; });
    }

    function peldano(k: number): void {
      escalon = k;
      contornos(k < 2);
      penacho.ligero(k >= 2);
      escalaExtra = k >= 3 ? 0.62 : k >= 1 ? 0.8 : 1;
      dimensionar();
    }

    function vigilar(medio: number): void {
      if (fijo) return;
      if (medio <= P.motor.msLento) {
        avisosGraves = 0;
        // Se RECUPERA. Un tirón pasajero (una recogida de basura, otra pestaña comiéndose la GPU)
        // dejaba el lienzo a 0,62 de resolución para el resto de la sesión.
        if (escalon > 0 && ++buenas >= P.motor.ventanasBuenas) { buenas = 0; peldano(escalon - 1); }
        return;
      }
      buenas = 0;
      if (medio > P.motor.msInsufrible && ++avisosGraves >= 2 && !forzado) {
        rendirse(`${Math.round(1000 / medio)} fps sostenidos`);
        return;
      }
      if (escalon < 3) { peldano(escalon + 1); return; }
      if (!forzado) rendirse(`${Math.round(1000 / medio)} fps con todo bajado`);
    }

    // -------------------------------------------------------------------------------------
    // 6. CONTEXTO WEBGL PERDIDO
    // -------------------------------------------------------------------------------------
    // (No hay manejador de `visibilitychange`: Anime.js registra el suyo al importarse y
    // `pauseOnDocumentHidden` está activo por defecto; duplicarlo solo añadía un camino más.)
    function alPerder(ev: Event): void {
      ev.preventDefault();               // sin esto el navegador ni intenta restaurarlo
      rendirse('contexto WebGL perdido');
    }
    lienzo.addEventListener('webglcontextlost', alPerder);
    deshacer.push(() => lienzo.removeEventListener('webglcontextlost', alPerder));

    // -------------------------------------------------------------------------------------
    // 7. LIMPIEZA
    // -------------------------------------------------------------------------------------
    function revertir(): void {
      if (!vivo) return;   // idempotente
      vivo = false;

      // Primero el bucle y el reloj: si algo fallara más abajo, la página seguiría animándose.
      render.setAnimationLoop(null);
      engine.useDefaultMainLoop = mainLoopAnterior;
      if (mainLoopAnterior) engine.wake();

      observadorTam.disconnect();
      observadorTema.disconnect();
      cancelAnimationFrame(idRaf);
      mqDpr?.removeEventListener('change', alCambiarDpr);
      lienzo.removeEventListener('webglcontextlost', alPerder);
      rotulos.revertir();
      coreo.revertir();

      // Que el maestro deje de escribir en objetos muertos: sin esto, cada seek() del scroll
      // seguiría tocando el grafo desechado durante el resto de la sesión.
      utils.remove(coreo.objetivos, m.tl);

      penacho.liberar();
      rig.liberar();
      const nodos: Object3D[] = [];
      rig.escena.traverse((o) => nodos.push(o));
      for (const o of nodos) {
        const malla = o as Mesh;
        const geo = malla.geometry;
        if (geo) {
          geo.dispose();
          geo.setIndex(null);
          for (const nombre of Object.keys(geo.attributes)) geo.deleteAttribute(nombre);
          geo.morphAttributes = {};
        }
        // dispose() de InstancedMesh es el único que suelta instanceMatrix (36 tubos, 5 zunchos,
        // 127 orificios, 12 tirantes, 18 álabes).
        if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
        const mats: Material[] = Array.isArray(malla.material) ? malla.material
          : malla.material ? [malla.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof Texture) v.dispose();
          mat.dispose();
        }
        o.clear();
      }
      rig.escena.clear();

      render.renderLists.dispose();
      render.dispose();
      render.forceContextLoss();
      lienzo.width = 0;
      lienzo.height = 0;
      lienzo.remove();
      delete (window as unknown as Record<string, unknown>).__motor;
    }

    function info(): Record<string, number | string | boolean> {
      return {
        geometrias: render.info.memory.geometries,
        texturas: render.info.memory.textures,
        programas: render.info.programs?.length ?? 0,
        triangulos: render.info.render.triangles,
        llamadas: render.info.render.calls,
        dpr: render.getPixelRatio(),
        escalon,
        fotogramas,
        contexto: !render.getContext().isContextLost(),
        bucleAnime: engine.useDefaultMainLoop,
      };
    }

    // -------------------------------------------------------------------------------------
    // 8. EL MANDO. Solo con ?debug o ?motor: es una superficie de depuración con referencias al
    //    renderizador y al grafo entero, y además ancla contra la recolección de basura.
    // -------------------------------------------------------------------------------------
    if (consulta.has('debug') || consulta.has('motor')) {
      (window as unknown as Record<string, unknown>).__motor = {
        tl: m.tl,
        L: m.L,
        PM,
        rig,
        coreo,
        render,
        info,
        /** Coloca el reloj del maestro donde se le diga y pinta ese fotograma, sin tocar el scroll. */
        seek(t: number): void {
          m.tl.seek(t);
          coreo.aplicar(t);
          penacho.aplicar(coreo.estado, t);
          rotulos.aplicar();
          render.render(rig.escena, rig.camara);
        },
        /** Cuenta de verdad lo que hay en el grafo, no lo que se dibujó en el último fotograma. */
        contar(): Record<string, number> {
          let vertices = 0;
          let triangulos = 0;
          let mallas = 0;
          rig.escena.traverse((o) => {
            const malla = o as Mesh;
            if (!malla.isMesh && !(o as { isLineSegments?: boolean }).isLineSegments) return;
            const g = malla.geometry;
            if (!g) return;
            mallas++;
            const v = g.attributes.position?.count ?? 0;
            const idx = g.index ? g.index.count : v;
            const nInst = (o as InstancedMesh).isInstancedMesh ? (o as InstancedMesh).count : 1;
            vertices += v;
            if (malla.isMesh) triangulos += (idx / 3) * nInst;
          });
          return { vertices, triangulos, mallas };
        },
      };
    }

    return { tipo: 'webgl', revertir, info };
  } catch (e) {
    // Fallo a mitad del montaje: se deshace lo que ya estuviera hecho, en orden inverso, y se
    // propaga. core/escena.ts lo caza y la página se queda con el escenario CSS, intacto.
    for (const f of deshacer.reverse()) {
      try { f(); } catch { /* la limpieza nunca puede tapar el error de verdad */ }
    }
    throw e;
  }
}
