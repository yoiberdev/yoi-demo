// Única fuente de números del demo. Ajustar "más rápido / más lento" es cambiar aquí, nunca lógica.
// origen: 'propio' = decisión de diseño; 'doc' = valor canónico de la documentación de Anime.js.

// LA ENTRADA DEL LOGO manda sobre el reloj, no al revés. Estos dos números NO se eligen aquí: son
// los del original de yoiber.com, leídos de AnimatedLogo.tsx y copiados en effects/logo-intro.ts
// (que los lleva escritos a mano, porque es un port literal). Se repiten aquí porque hay dos cosas
// que tienen que cuadrar con ellos: cuánto dura el tramo INTRO del maestro y cuándo se pide el
// trozo 3D. Si alguien toca la coreografía, esto se mueve con ella.
const LOGO = {
  arranque: 300,   // ms de espera desde el montaje hasta que arranca la entrada
  entrada: 4800,   // ms de coreografía: la barra aterriza en 4,5 s y el ajuste del SVG cierra en 4,8
};

export const P = {
  scroll: {
    sync: 0.9, // suavizado del scroll (más cerca de 0, más tarda en alcanzar la posición)
    // La intro corre por tiempo y el resto por scroll. Dura EXACTAMENTE lo que la entrada del logo:
    // el tramo INTRO es "el logo entrando", así que se acaban a la vez. Antes eran 4 000 ms con un
    // título de texto partido que duraba eso; ahora manda la coreografía de yoiber.com.
    introDuration: LOGO.arranque + LOGO.entrada, // 5100
    alturas: { HERO_OUT: 2, GALERIA: 10, COMO: 5, CIERRE: 2 } as Record<string, number>, // en alturas de viewport; 1 altura = 1000 unidades del maestro
    // El suavizado lo hace core/scroller.ts con un Timer propio por tiempo (no el `sync` de
    // onScroll: ver allí por qué). `sync` sigue siendo el factor; estos dos son su mecánica.
    suavizado: {
      fotograma: 1000 / 60, // ms: el fotograma para el que está definido el factor de la librería
      umbral: 0.5,          // unidades del maestro: por debajo se clava en el objetivo y el Timer se para
    },
    origen: 'propio',
  },
  // El hero: el logo (GSAP, effects/logo-intro.ts + logo-salida.ts) y el texto de debajo
  // (Anime.js, effects/hero.ts). Ver effects/hero.ts para por qué el texto entra tan tarde.
  intro: {
    on: 300,
    logo: LOGO,
    // El texto entra cuando el logo YA está montado. La medida está tomada del propio port: con
    // `power4.out` las formas llegan a escala 1,027 a los 2,5 s y a 1,000 a los 3,5 s, así que a
    // los 3,2 s de reloj (2,9 s después de INTRO_ON) el logo está visualmente quieto.
    texto: { delay: 2900, duration: 800, stagger: 150, y: 12 },
    // Cuánto del tramo HERO_OUT ocupa cada retirada, en tanto por uno. El texto se va un poco más
    // tarde que el logo: el logo despeja el centro y el texto se lo lleva mientras el motor sube.
    salidaTexto: 0.6,
    salidaLogo: 0.55,
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
    // ESTOS TRES SON LA RED, NO EL DISPARADOR. Quien pide el trozo 3D en la vida real es el propio
    // logo: `alTerminar` de effects/logo-intro.ts llama a `escena.pedirMotor()` en cuanto la entrada
    // se ensambla (ver main.ts). Los temporizadores solo cubren el caso de que ese aviso no llegue
    // nunca —el SVG no está en el marcado, o el navegador tumba la pestaña a mitad de la entrada—.
    // Por eso el suelo se ha subido: analizar 610 kB de JS, construir ~40 geometrías y renderizar
    // el maestro entero dos veces (lo que hace tl.init()) es una tarea larga, y ahora la entrada
    // del logo ocupa hasta los 5,1 s (LOGO.arranque + LOGO.entrada). El motor no hace falta hasta
    // HERO_OUT; si el visitante baja antes, `alBajar` lo pide en el acto.
    esperaMinima: LOGO.arranque + LOGO.entrada + 400,   // 5500 ms: no se pide el trozo antes de esto
    esperaOciosa: 700,    // ms de margen que se le da a requestIdleCallback a partir de esperaMinima
    esperaMaxima: 7500,   // ms: tope duro; se pide aunque el navegador no esté ocioso
    relevo: 420,          // ms del cruce entre el escenario CSS y el lienzo (también en base.css)
    // EL TELÓN del lienzo, en unidades del maestro por encima de HERO_OUT. El reloj se PARA justo
    // en HERO_OUT cuando la intro por tiempo termina (INTRO_END == HERO_OUT), así que hace falta un
    // margen para distinguir "la intro ha acabado" de "el visitante ha empezado a bajar".
    // Son DOS umbrales y no uno porque el telón sube y baja: con uno solo, arrastrar el scroll justo
    // encima de la frontera encadenaría cruces de 420 ms. 60 y 20 de 2000 son el 3 % y el 1 % del
    // tramo; con una ventana de 900 px, una banda de unos 18 px.
    // 600 y 400, no 60 y 20. Con 60 (el 3 % del tramo) el telón subía a 40 px de scroll: el motor
    // aparecía despiezado en cuarenta tubos detrás de un logo que todavía no se había movido. El
    // logo tarda el 55 % del tramo en irse, así que a 600 (30 %) ya está claramente saliendo y el
    // motor se descubre a medio ensamblar, que se lee mucho mejor que en su estado de partida.
    telonSube: 600,
    telonBaja: 400,
    // Espera antes de pedir el trozo 3D tras ensamblarse el logo, en ms. La flotación arranca a los
    // 500 ms; con 1400 lleva casi un segundo a la vista cuando llega la parada del analizador.
    esperaTrasIntro: 1400,
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
  // LA GALERÍA. `arranque` es la fracción del capítulo que se le regala al motor para que se
  // aparte ANTES de que entre la primera tarjeta. Sin él, la tarjeta aparece encima de la campana:
  // el desvío del motor empieza al 10 % del tramo y las tarjetas empezaban al 0 %.
  // `margenBajar`: "Ver los proyectos" (#bajar) aterriza en la PRIMERA TARJETA, no al principio de
  // GALERIA. Estas unidades por encima de `arranque` caen justo PASADO el cruce de entrada, que dura
  // min(500, 14 % del paso) = 230 unidades (galeria.ts): así se llega con la tarjeta ya entera. Con
  // 60 se caía al 26 % del cruce y, con su `out(3)`, la tarjeta se quedaba a opacidad 0,6 (medido).
  galeria: { arranque: 0.18, margenBajar: 250, origen: 'propio' },

  // EL TITULAR DE CAPÍTULO (effects/titulo.ts): el gesto con que entra cuando cambia el nombre.
  // Va fuera del maestro (es la reacción a un cambio de estado, no un instante del reloj).
  titulo: {
    gesto: {
      duration: 380,   // ms: más corto que el cruce más corto del maestro (500), para no pisar el siguiente cambio
      y: 14,           // px que sube al entrar
      ease: 'out(3)',
    },
    origen: 'propio',
  },

  // EL PIE DE PÁGINA (effects/pie.ts). `tapa`: cuando el borde inferior de #capitulos sube por
  // encima de esta fracción de la ventana ya manda el "Yoiber" del pie y el titular se vacía.
  // `entrada`: los bloques suben de 0 a 1 con scrub exacto mientras el pie asoma (sync: true).
  pie: {
    tapa: 0.6,
    entrada: {
      y: 24,            // px que sube cada bloque
      duration: 600,    // ms nominales: con sync el reloj es el scroll, así que solo cuenta la proporción con el stagger
      stagger: 90,      // ms entre bloque y bloque (4 bloques: el último arranca al 45 % del recorrido)
      ease: 'out(3)',
      // Umbrales en el orden de v4: '<borde del contenedor> <borde del objetivo>'.
      enter: 'bottom top',   // el borde inferior de la ventana toca el borde superior del pie: asoma
      leave: 'center top',   // el borde superior del pie llega al centro de la ventana: ya está entero
    },
    origen: 'propio',
  },

  subnav: { visible: [0.02, 0.98] as [number, number], origen: 'propio' },
};
