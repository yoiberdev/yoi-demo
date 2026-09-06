// Única fuente de números del demo. Ajustar "más rápido / más lento" es cambiar aquí, nunca lógica.
// origen: 'propio' = decisión de diseño; 'doc' = valor canónico de la documentación de Anime.js.
export const P = {
  scroll: {
    sync: 0.9, // suavizado del scroll (más cerca de 0, más tarda en alcanzar la posición)
    introDuration: 4000, // la intro corre por tiempo; el resto, por scroll
    alturas: { HERO_OUT: 2, GALERIA: 8, COMO: 5, CIERRE: 2 } as Record<string, number>, // en alturas de viewport; 1 altura = 1000 unidades del maestro
    origen: 'propio',
  },
  intro: {
    on: 300,
    chars: { x: ['.35em', 0] as [string, number], duration: 1000, ease: 'outQuint', stagger: 25, staggerEase: 'outIn(2)' },
    punto: { delay: 550, stiffness: 120, damping: 6 },
    lema: { delay: 500, stagger: 150 },
    origen: 'propio',
  },
  panel: {
    entrada: { rotateX: 70, y: '70vh', scale: 0.6 },
    galeria: { rotateY: 18 },
    como: { rotateX: 45, z: 160, giro: -180 },
    cierre: { rotateX: 100, y: '35vh' },
    origen: 'propio',
  },
  tema: { margen: 250, origen: 'propio' }, // los colores viven en base.css (:root y html.is-light); la transición, en CSS
  // El motor 3D: cuándo se pide, con qué calidad y con cuánto lienzo. Ver src/core/capacidad.ts.
  motor: {
    // Después de la intro (P.scroll.introDuration = 4 000). Analizar 610 kB de JS, construir ~40
    // geometrías y renderizar el maestro entero dos veces (lo que hace tl.init()) es una tarea
    // larga: encima de la animación del título, en un móvil, se ve. El motor no hace falta hasta
    // HERO_OUT, que es cuando se monta.
    esperaMinima: 4200,   // ms: no se pide el trozo antes de esto
    esperaOciosa: 700,    // ms de margen que se le da a requestIdleCallback a partir de esperaMinima
    esperaMaxima: 6000,   // ms: tope duro; se pide aunque el navegador no esté ocioso
    relevo: 420,          // ms del cruce entre el escenario CSS y el lienzo (también en base.css)
    vetoNucleos: 2,       // hardwareConcurrency <= esto: ni se intenta
    vetoMemoria: 2,       // deviceMemory (GB) <= esto: ni se intenta
    minNucleos: 4,        // por debajo: calidad baja
    minMemoria: 4,        // por debajo: calidad baja
    // 12, no 8. Con 8 hilos lógicos —cualquier portátil moderno— el nivel alto era el camino por
    // defecto de la mayoría del escritorio, y medido son 90 132 triángulos en el grafo frente a
    // 64 460 del medio: un 40 % más de trabajo para una diferencia que no se ve (48 tubos en vez
    // de 36 y 128 segmentos de revolución en vez de 96).
    altaNucleos: 12,      // desde aquí y sin puntero grueso: calidad alta
    dprMax: 2,            // tope de relación de píxeles en sobremesa
    dprMaxTactil: 1.5,    // tope con puntero grueso
    dprMin: 0.8,          // suelo al repartir el presupuesto en pantallas enormes
    // Dos presupuestos. Con 2,6 M para todos, un escritorio de 2560x1440 salía a 0,84 de dpr, o
    // sea por debajo de la resolución nativa y con la imagen visiblemente blanda, y eso con solo
    // 43 llamadas de dibujo. En un móvil, en cambio, el relleno es exactamente lo que duele.
    presupuestoPx: 4000000,       // píxeles de dibujo como mucho, con ratón
    presupuestoPxTactil: 2000000, // ...y con puntero grueso
    muestrasFps: 90,      // frames que se miden antes de decidir si degradar
    ventanaFps: 1500,     // ...o ese tiempo, lo que llegue antes (a 8 fps, 90 frames son 11 s)
    saltoFps: 500,        // ms: por encima no es lentitud, es un salto (pestaña, GC, depurador)
    msLento: 22,          // ~45 fps: baja un escalón
    msInsufrible: 34,     // ~29 fps: segundo aviso -> se rinde y vuelve al CSS
    ventanasBuenas: 4,    // ventanas seguidas por encima de msLento para SUBIR un peldaño otra vez
    sinFotogramas: 1500,  // ms sin un solo fotograma dibujado -> se rinde (ver core/escena.ts)
    origen: 'propio',
  },
  subnav: { visible: [0.02, 0.98] as [number, number], origen: 'propio' },
};
