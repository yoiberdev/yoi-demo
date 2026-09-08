// Números del MOTOR 3D. Viven aparte de src/params.ts a propósito: `params.ts` lo importa
// `main.ts`, así que todo lo que se meta ahí viaja en la ENTRADA aunque el visitante nunca llegue a
// pedir el trozo 3D. Este fichero solo lo importa el trozo diferido.
//
// UNIDADES. Las de la geometría (src/motor/geometria.ts): el eje del motor es Y, y = 0 está en la
// garganta de la tobera. Medido sobre el grafo real (vértices de cada pieza, instancias incluidas,
// en el marco del motor; sonda19 del carril "objeto", Vuelta 2): el motor ocupa de y = -3,35 (labio
// de la campana) a y = +3,17 (cabezas de los tornillos de la brida de empuje) y ±2,48 en X (los
// tubos de la corona, que ahora llegan hasta el labio); su centro está en y = -0,09. Antes llegaba
// a +3,68 porque la chapa del monograma sobresalía por encima de todo; ahora la pieza más alta es
// la que debe serlo, la brida de empuje.
export const PM = {
  motor: {
    // El objeto tiene que LLENAR el cuadro: es media parte del efecto de animejs.com. Con 9,8
    // sobre un motor de 7,6 de alto quedaba un tercio de aire arriba y abajo (visto en captura).
    encuadre: 8.2,    // alto del frustum ortográfico (unidades de motor) con zoom = 1
    // EL AIRE MÍNIMO alrededor del objeto, en fracción del encuadre y en LOS DOS EJES (informe
    // BRECHA, fila 16). Una cámara ortográfica fija el ALTO y deja que el ancho lo ponga el
    // aspecto; en apaisado `encuadre` manda (8,2 sobre 6,7 de motor: 9 % de aire arriba y abajo,
    // y de sobra a los lados). En un móvil de pie el ancho es lo que no llega: con 8,2 de alto y
    // aspecto 0,587 (iPhone 13, 390x664) salen 4,8 de ancho para 4,96 de motor. Antes se
    // arreglaba con un ancho mínimo fijo (7,4), que dejaba el motor en 275 px de los 390 (el 70 %)
    // y el 47 % del alto en negro (medido en HERO_OUT 100 %). Ahora rig.ts abre el encuadre SOLO
    // hasta que el objeto entero quepa con este aire a cada lado: el ancho visible es
    // 2 · 2,48 / (1 − 2 · 0,06) = 5,64, y el motor pasa a ocupar el 88 % del ancho del teléfono
    // (medido: 343 px de 390 por vértices; con el casco de silueta y el filo, ~360).
    margen: 0.06,
    // MEDIDAS DEL OBJETO, para poder encuadrar sin adivinar. Salen del bbox del grafo (mismo
    // origen que el comentario de arriba): el motor ocupa ±2,48 en X y de -3,35 a +3,17 en Y.
    // `medioAncho` es además el RADIO máximo del grafo (hypot(x, z) = 2,48 en los tubos, sonda19),
    // así que vale para el ancho proyectado con cualquier guiñada. Las usan el encuadre (rig.ts)
    // y el desvío de la galería, para no sacar la máquina del cuadro (ver coreografia.ts).
    medioAncho: 2.48,
    medioAlto: 3.35,
    centro: 0.09,     // el motor se sube esto para que su centro caiga en el centro del encuadre
    camara: [0, 3.4, 20] as [number, number, number], // ortográfica: solo fija la dirección de vista
    cerca: -60,
    lejos: 80,
    // LUZ Y SOMBREADO (informe BRECHA, filas 8 y 12). UNA luz clave y un sombreado de TRES TONOS
    // (MeshToonMaterial con un gradiente de tres valores; ver geometria.ts, crearMateriales).
    // Antes eran cuatro luces (clave 2,1 + contraluz 0,55 + hemisferio 0,75 + ambiente 0,18) sobre
    // Lambert facetado, y medido a 200 px de ancho el motor era un degradado de 43 niveles con
    // >= 1 % de píxeles cada uno (HERO_OUT 100 %, 1440x900; el informe contó 25-34 con la
    // geometría vieja). Ni hemisferio ni contraluz: el filo cálido del lado en sombra lo pone el
    // shader (`rim`), no una luz, y así no añade tonos intermedios.
    //
    // 2,33 y no 2,1: con física de luces (r155+) la cara iluminada vale albedo · I / π, y con el
    // valor 1,0 del escalón claro eso da 0,904 · 2,33 / π = 0,67 lineal = 215 en sRGB para el
    // blanco 0xf4f4f2, que es el tono claro que se buscaba (la referencia mide 212).
    luzClave: 2.33,
    // De dónde viene la clave (posición de la DirectionalLight; mira al origen). Manda sobre DÓNDE
    // caen los cortes del toon en un cuerpo de revolución vertical: con la normal horizontal
    // n = (cos φ, 0, sin φ) y esta dirección, dot(n, L) = 0,77 · cos(φ - 27°). Con los cortes de
    // abajo el claro ocupa la mitad derecha del ancho visible, el medio un cuarto y la sombra el
    // cuarto izquierdo, que es donde va el filo. Con (5, 8, 6), la posición de antes, la sombra
    // era una tira del 9 % pegada al borde.
    luzDesde: [7, 6, 3.5] as [number, number, number],
    // Ambiente: CERO. El escalón de sombra del gradiente ya evita el negro; un ambiente de 0,06
    // pondría por sí solo el blanco en sombra en 36 sRGB, por encima de la meta.
    ambiente: 0,
    // EL GRADIENTE DEL TOON. Tres VALORES (la respuesta a la luz, lineal: multiplican a la clave) y
    // dos CORTES en dot(normal, luz) (-1..1): por debajo del primero, sombra; entre los dos, tono
    // medio; por encima, claro. Los valores salen de resolver, en lineal, qué sRGB se quiere para
    // el blanco 0xf4f4f2 (albedo lineal 0,904) con la clave 2,33:
    //   · oscuro (fondo #1f1e1d = 30): sombra 34 (3-5 puntos por encima del fondo, fundida como
    //     la de la referencia: #212121 sobre #252423), medio 100, claro 215;
    //   · claro (fondo #efe9df = 233): aquí el tono más cercano al papel es el ILUMINADO (237,
    //     un blanco sobre crema, por eso el valor pasa de 1), medio 195, sombra 150. La sombra es
    //     CLARA a propósito: el capítulo claro es el despiece, visto desde arriba (rotX -20), y
    //     ahí la pared de la campana mira hacia abajo, lejos de la única luz: con una sombra de 80
    //     la campana entera salía como un cubo negro sobre el crema mientras la cúpula y los tubos
    //     eran blancos (v1-claro-solo.png). Sobre papel el objeto es blanco y se dibuja con la
    //     tinta; los tres tonos solo lo modelan un poco, como en la lámina de la referencia.
    //   sRGB -> lineal -> g = lineal · π / (0,904 · 2,33). Sin ambiente, cada material sale de la
    //   misma escala: el gris `medio` de la paleta está elegido para que su cara iluminada sea el
    //   tono medio del blanco (ver M.paleta en geometria.ts).
    // `anchura` es cuántos texels tiene la textura del gradiente: los valores siguen siendo tres,
    // la anchura solo fija con qué precisión caen los cortes (con 3 texels caen fijos en ±1/3 y
    // el claro ocupa 141° alrededor de la luz, que es demasiado).
    toon: {
      // [0,12, 0,5] y no [-0,05, 0,35]: con los cortes bajos la sombra del blanco no llegaba al 1 %
      // de los píxeles en reposo (0,58 %, log-v2) y el motor se leía en DOS tonos (blanco y gris)
      // con grietas oscuras; con estos, en la cámara el claro ocupa el 39 % del ancho visible, el
      // medio el 24 % y la sombra el 37 % (aritmética de arriba con φ), que es la proporción de
      // la referencia, y la tapa de la cúpula (normal hacia arriba, dot 0,59) sigue en claro.
      cortes: [0.12, 0.5] as [number, number],
      oscuro: [0.024, 0.19, 1.0] as [number, number, number],
      claro: [0.455, 0.81, 1.26] as [number, number, number],
      anchura: 64,
    },
    // LA LUZ DE BORDE (rim), en el shader: rim = (1 - dot(normal, vista))^potencia · color · fuerza,
    // sumado al final. Salmón, como el de la referencia (medido allí: #ffc7a8 en el filo sobre
    // #212121). `fuerzaClaro` es la del tema claro, donde el papel ya es cálido y el filo solo
    // tiene que separar el borde del crema.
    // Potencia 8 y no 3, medido en dos pasos: con 3 el filo llegaba hasta cos φ = 0,54 (el 16 %
    // exterior del ancho de un cilindro) y en la campana, cuyas normales miran a medias a la
    // cámara, teñía de marrón TODA la cara en sombra —52 sRGB en vez de 34, con un degradado de
    // 56 a 96 en diez tonos del 1,4-2 % cada uno (log-v1)—, o sea que volvía el degradado por otra
    // puerta. Con 6 la sombra de la pared de la cámara seguía en 38-42 (sonda de log-v4: a
    // cos φ = 0,5 el filo aún suma 0,004 lineales). Con 8 el filo es una tira ((1 - cos φ)⁸ > 0,1
    // <=> cos φ < 0,25, el 3 % exterior) y la sombra se queda en su tono: medido en la pared de la
    // cámara a 1440x900 (pixeles.mjs, fila 303), la cara en sombra es (35, 34, 34) sobre el fondo
    // (31, 30, 29) —+4 de luminancia— y el filo son 3-4 px cálidos de (54, 42, 34) a (87, 62, 51)
    // en el borde. La fuerza sube a la vez (0,35 -> 0,8) porque ahora solo pinta el borde y tiene
    // que verse: en el píxel del borde exacto vale (232, 162, 127) antes del suavizado.
    rim: { color: 0xffb38a, fuerza: 0.8, fuerzaClaro: 0.4, potencia: 8 },
    origen: 'propio',
  },

  // Las NUEVE piezas rotuladas del despiece, en el orden en que se separan (de arriba abajo) y en
  // el que ocupan las ranuras de su columna. Ese orden se cuadró MIDIENDO la altura proyectada de
  // cada pieza en el despiece: con la lista sin ordenar, dos guías se cruzaban (se ve en captura).
  //   y:     desplazamiento axial del despiece.
  //   r:     desplazamiento radial (sale por su propio vector; 0 si va en el eje).
  //   ancla: punto LOCAL de la pieza donde engancha la guía del rótulo.
  //   lado:  columna izquierda (-1, cuatro) o derecha (+1, cinco).
  piezas: [
    { id: 'bancada',       y: 3.6,  r: 0,   ancla: [1.15, 3.05, 0],     lado: -1, movil: true, titulo: 'Estructura de empuje', nota: 'anillo y 12 tirantes en A' },
    { id: 'radiadores',    y: 1.9,  r: 0,   ancla: [-2.30, 2.40, 1.05], lado: -1, titulo: 'Paneles radiadores', nota: 'tres a 120°, aristas a 60,1°' },
    { id: 'cupula',        y: 2.2,  r: 0,   ancla: [0.6, 2.8, 0],       lado: 1,  titulo: 'Cúpula del colector', nota: 'se levanta y deja ver los inyectores' },
    { id: 'inyector',      y: 1.3,  r: 0,   ancla: [1.06, 2.24, 0],     lado: 1,  movil: true, titulo: 'Placa de inyectores', nota: '127 orificios en siete anillos' },
    { id: 'turbobomba',    y: 0.9,  r: 2.3, ancla: [0, 0.2, 0],         lado: 1,  titulo: 'Turbobomba', nota: 'voluta, cuerpo, turbina y escape' },
    { id: 'camara',        y: 0.4,  r: 0,   ancla: [0.97, 1.5, 0],      lado: -1, movil: true, titulo: 'Cámara de combustión', nota: 'relación de contracción 3,24' },
    { id: 'conductos',     y: 0,    r: 1.1, ancla: [1.2, 0.8, 0],       lado: 1,  titulo: 'Conductos', nota: 'descarga, línea al domo y escape' },
    { id: 'refrigeracion', y: -1.0, r: 0,   ancla: [0.66, -0.1, 0.3],   lado: -1, titulo: 'Corona de refrigeración', nota: '36 tubos de radio variable' },
    { id: 'campana',       y: -2.3, r: 0,   ancla: [1.6, -2.6, 0],      lado: 1,  movil: true, titulo: 'Campana de la tobera', nota: 'perfil de Rao, expansión 17,6' },
  ] as PiezaNum[],

  // Piezas que se mueven en el despiece pero NO llevan rótulo. La placa de identificación viaja
  // con la estructura de empuje (que es donde está atornillada) en vez de salir por su cuenta:
  // medido, sacándola por su radio se movía HACIA la cámara —o sea, casi nada en pantalla— y se
  // quedaba escondida detrás del inyector, con su guía apuntando a un radiador.
  sueltas: [
    { id: 'placa', y: 3.6, r: 0.6, ancla: [0, 0, 0], lado: 1, titulo: '', nota: '' },
  ] as PiezaNum[],

  // LA CAPA DE VIDA. Va con el reloj del NAVEGADOR, no con el del maestro, y esa es toda la idea:
  // la coreografía entera es función del scroll y por eso se deshace perfecta al subir, pero también
  // por eso la página se queda helada en cuanto dejas de bajar. Esto es lo único que corre solo.
  // No hace falta que sea reversible porque no va a ninguna parte: son ciclos que solo laten.
  // Frecuencias en radianes por milisegundo (periodo en segundos = 2π / (Hz · 1000)).
  //
  // POR DEBAJO DEL UMBRAL VISIBLE, medido (informe BRECHA, fila 3): con 0,021 rad y 30 s de periodo
  // la galería quieta cambiaba el 2,08 % de sus píxeles en NUEVE segundos, y solo en contornos de
  // 1-2 px: ~1 px/s, que el ojo no separa de una foto. Se multiplica por ocho y se COMPONEN dos
  // senos con periodos que no son múltiplos (9,0 s y 13,1 s): un solo seno sobre el eje del motor
  // es un metrónomo, y además sobre un cuerpo de revolución girar sobre su propio eje apenas mueve
  // la silueta (solo las facetas y los accesorios). El cabeceo en X, a un tercio, es lo que mueve
  // la boca de la campana y el anillo de bancada, que es lo que se ve "respirar".
  vida: {
    // 1,25 vueltas/s y NO 2: el rotor lleva 18 álabes (20° entre uno y otro) y a 60 Hz 2 vueltas/s
    // son 12° por fotograma, más de media separación: la rueda se ve girar HACIA ATRÁS a 8°
    // por fotograma (efecto estroboscópico, es aritmética). Con 1,25 vueltas/s son 7,5° por
    // fotograma y el giro se lee hacia delante. (A 30 fps ya alias a partir de 0,83 vueltas/s;
    // ahí se acepta.) Antes 0,0004 = un álabe cada 0,87 s, invisible.
    turbinaIdle: 0.00785,   // 1,25 · 2π / 1000 rad/ms
    derivaAmp: 0.07,        // radianes (4°) de guiñada del conjunto sobre su eje
    derivaHz: 0.0007,       // periodo 9,0 s: se nota sin marear
    cabeceoAmp: 0.023,      // radianes (1,3°, un tercio de la deriva) de cabeceo en X
    cabeceoHz: 0.00048,     // periodo 13,1 s, no múltiplo del de la deriva: nunca se repite igual
    // 0,5: el emisivo del acento no es el acento, es el acento con la saturación al máximo y la
    // luminosidad a 0,45 (ver geometria.ts, emisivoDelAcento) para que ningún pico recorte a
    // blanco: en el pico los aros siguen del color de la tarjeta.
    latidoAmp: 0.50,        // cuánto respira el acento sobre su valor de la coreografía
    latidoHz: 0.00110,      // ~5,7 s
    // EL ACENTO POR PROYECTO (informe BRECHA, fila 9). La página decide el acento vigente desde el
    // reloj del maestro (core/acento.ts) y avisa con el evento 'yoi:acento' SOLO cuando cambia; el
    // motor funde entonces el color de los aros, la luz de cámara y la garganta hacia el nuevo con
    // el reloj del NAVEGADOR. Los mismos 400 ms que la transición CSS de la sub-nav y el contador
    // (base.css): así todo lo que lleva el acento cambia de color a la vez.
    acentoMs: 400,
  },

  // Los tres paneles radiadores además se abren en abanico cada uno por su radio, dentro del grupo.
  abanicoRadiador: 1.35,

  coreo: {
    // EL MONTAJE. Ocurre en HERO_OUT, no en INTRO. Dos razones medidas, no de gusto:
    //   · en INTRO el hero tapa la mitad del cuadro y la corona -la imagen que vende- se estrenaba
    //     detrás de un texto (se ve en la captura 1-ensamblando del prototipo);
    //   · pedir el trozo 3D a los 1 800 ms metía el análisis de 610 kB de JS, ~40 geometrías y dos
    //     renderizados completos del maestro ENCIMA de la animación del título.
    // Con el montaje aquí, el trozo se puede pedir después de la intro (P.motor.esperaMinima) y el
    // gesto se estrena limpio, en el cuadro vacío que deja el título al irse.
    //
    // EL GESTO ENTERO ATERRIZA ANTES DE GALERIA (fila 10, ronda 1). La corona empieza en
    // HERO_OUT + base + 9·paso y dura coronaReparto + coronaDur: con 115 / 340 / 760 acababa en
    // 7 355, o sea 255 unidades DENTRO de GALERIA, y la primera vista del motor montado (HERO_OUT
    // 100 %, bajo el titular "Proyectos") pillaba 24 de los 36 tubos a mitad de rebote, hundidos
    // 0,3 u en la campana: una cuña negra en V en el frente durante ~500 px de scroll (tono 52 =
    // 17,9 % del objeto a 200 px, frente al 3 % en reposo; medido en las tres ventanas). Con
    // 100 / 280 / 560 la corona empieza en 6 120 y acaba en 6 960 (HERO_OUT 93 %), 140 antes de
    // GALERIA; la última pieza (la campana) aterriza en 6 580, así que el primer tubo (6 680) sigue
    // llegando sobre una campana ya quieta. El montaje escalonado se ve entero igual: al 50 % del
    // tramo la campana acaba de arrancar (6 020) y la corona aún no (6 120), como antes.
    intro: {
      base: 120,   // ms tras HERO_OUT en que entra la primera pieza
      paso: 100,   // ms entre pieza y pieza (115 dejaba la corona acabando dentro de GALERIA)
      dur: 560,
      ease: 'out(4)',
      coronaDur: 560,    // la corona entra la última: es la imagen que vende
      // EL REPARTO DE LA CORONA VA POR ÁNGULO A LA CÁMARA, no por índice. Ver coreografia.ts: el
      // índice del tubo ES su ángulo y su entrada es RADIAL, así que cualquier reparto por índice
      // (`from: 'first'`, `'center'`, …) recorre la corona en un sentido y deja media corona dentro
      // y media fuera durante todo el gesto.
      coronaReparto: 280,  // ms entre el primer tubo y el último (el gesto entero dura esto + coronaDur)
      // Azimut LOCAL del tubo que mira a la cámara mientras dura el gesto. MEDIDO en el grafo
      // (cap6/azimut.mjs): la cámara está a 92° del motor cuando empieza y a 114° cuando acaba,
      // porque `raiz.rotateY` sigue girando de 1,8° a 26,3° durante el gesto. 105° es el centro:
      // el tubo del frente es el 10,5 de 36.
      coronaAzimut: 105,
      // 'detras' = la ola nace en el tubo del fondo, se cierra por los dos costados a la vez y el
      // ÚLTIMO en encajar es el que mira a la cámara.
      coronaDesde: 'detras' as 'frente' | 'detras',
      // 0,5 y no 1,5. En la 4.5.0 `Back(s)` es (s+1)·t³ − s·t² y `outBack` su espejo, así que el
      // sobrepaso máximo vale 4s³ / (27(s+1)²) del recorrido: con 1,5 es el 8 % de 4,2 u = 0,34 u
      // de tubo HUNDIDO en la campana en el pico (medido: min z = -0,336). El tubo mide 0,10 de
      // radio a media campana y 0,18 en la boca (radioTubo con 36 y holgura 0,88 = 0,084·rPared),
      // así que desaparecía ENTERO dentro de la pared y asomaba la campana desnuda entre los
      // vecinos. Con 0,5 es el 0,8 % = 0,035 u, de un quinto a un tercio del radio: se lee como
      // pellizco y no como agujero.
      coronaRebote: 0.5, // sobrepaso del ease outBack
      coronaFuera: 4.2,  // de cuán lejos (radialmente) vienen los tubos
      escala: [0.9, 0.96] as [number, number],
      rotY: [-26, -14] as [number, number],
      zoom: 0.82,
    },
    heroOut: {
      rotY: [-14, 18] as [number, number],
      rotX: [0, -7] as [number, number],   // negativo = se ve un poco desde arriba
      escala: [0.96, 1] as [number, number],
      zoom: [0.82, 1] as [number, number],
      luz: [0.4, 1] as [number, number],   // factor sobre PM.motor.luzClave
      ease: 'inOut(2)',
    },
    galeria: {
      giro: 300,      // grados en todo el tramo, a velocidad constante
      // EL DESVÍO DE LA GALERÍA. Magnitud, siempre positiva: la dirección la decide la
      // coreografía mirando el encuadre de verdad (ver `aplicar`, punto 4b).
      //
      // Era -3,2 en X a secas y estaba mal por dos motivos medidos en captura:
      //   · en un móvil de pie el encuadre solo tiene 7,4 u de ancho, así que 3,2 sacaba el tercio
      //     izquierdo de la campana FUERA de la pantalla durante los 8 000 del capítulo más largo
      //     (mov-05, mov-06, mov-08);
      //   · y en escritorio dejaba el 55 % del cuadro en negro para NADA: el escenario CSS con las
      //     placas se apaga cuando entra el motor (`html.motor-on #stage { opacity: 0 }`), o sea
      //     que el hueco no lo ocupa nadie.
      // 1,7 es un descentrado de composición —"me aparto mientras hablan otros"—, no un abandono.
      // 2,6 y no 1,4: se bajó cuando el hueco no lo ocupaba nadie, y ahora vive ahí la tarjeta
      // del proyecto. El desplazamiento real lo sigue recortando la holgura del encuadre.
      // (Solo en APAISADO: en un cuadro de pie manda `vertical`, más abajo.)
      apartar: 2.6,
      margenApartar: 0.35,  // aire que se le deja al objeto contra el borde al desviarlo
      escala: 0.72,
      // LA COMPOSICIÓN VERTICAL (fila 16): la tarjeta va en DOS FILAS con el motor en medio
      // (base.css, @media (max-aspect-ratio: 1/1)): título y pila arriba, bajo la cabecera y al
      // lado del titular de capítulo, y captura, "qué" y enlace abajo, pegados a la sub-nav. El
      // motor vive en la BANDA que queda entre las dos filas, centrado en ella y encogido lo justo
      // si a la escala de la galería (0,72) no cabe (nunca agrandado). La banda se define en
      // PÍXELES CSS desde los bordes y no en fracciones del alto, porque las dos filas son texto a
      // tamaño fijo: en un teléfono alto lo que sobra tiene que ir al motor, no repartirse.
      //   · `arriba`: 3,25 rem del titular + título de dos líneas a 1,5 rem + pila de dos líneas
      //     (medido: la fila acaba a 141 px con "API financiera reactiva") más aire;
      //   · `abajo`: 4,5 rem hasta la sub-nav + enlace (una línea) + "qué" de tres líneas +
      //     captura de 6 rem y sus márgenes (medido: 272 px, igual en las cinco tarjetas y de 360
      //     a 393 px de ancho, porque el cuerpo baja con el ancho para partir igual) más aire.
      // Lo que da cada teléfono (banda menos el 3 % de aire por lado), medido con la vida a cero:
      // iPhone 13 (390x664) 222 px y el motor a 0,665 de su escala de galería (177 x 222 px, con
      // 40 px de aire hasta la pila de una línea, 16 con la de dos, y 12,5 hasta la captura);
      // Pixel 5 (393x851) 338 px y escala 1 (aquí sobra sitio: 46 px de aire abajo); 360x640,
      // 200 px y 0,647 (17 px de aire abajo). Antes, con `apartar` a secas, el título y la
      // captura se escribían ENCIMA del motor (28 y 53 px de solape en el iPhone) y el título
      // llevaba un degradado detrás para leerse. Estos números y los de la tarjeta en base.css
      // son EL MISMO reparto: si se mueve uno, se mueve el otro. El 3 % de aire cubre el
      // cabeceo de la capa de vida (1,3° sobre 2,48 de radio: 2 px a esta escala).
      vertical: {
        arriba: 148,    // px CSS desde el borde superior en que acaba la fila de arriba
        abajo: 280,     // px CSS desde el borde inferior en que empieza la fila de abajo
        margen: 0.03,   // aire dentro de la banda, en fracción de su alto, arriba y abajo
      },
      luz: 0.55,
      // El desvío ARRANCA TARDE a propósito: hasta 0,10 el motor se queda montado, entero y
      // centrado. Ese fotograma —la máquina recién ensamblada, de frente y a tamaño— no existía
      // en todo el demo: el desvío empezaba en el mismo instante en que aterrizaba el último tubo.
      espera: 0.1,
      entra: 0.08,
      vuelve: 0.1,
      pulsos: 8,      // un latido del inyector por demo, alineado con el contador "n / 8"
      pulsoSube: 240,
      pulsoBaja: 560,
      emisivo: 1.05,  // emissiveIntensity en el pico del latido (ver el emisivo del acento en geometria.ts)
    },
    como: {
      // LAS VENTANAS, CON LA ARITMÉTICA DEL TRAMO (COMO dura 5 000 unidades; ver coreografia.ts):
      //   · los nueve rótulos acaban de ABRIRSE en rotulos[0] + 8·pasoRotulo/5000 + durRotulo/5000
      //     = 0,16 + 0,152 + 0,084 = 0,396, y se quedan abiertos hasta `cerrar` (0,089 del tramo);
      //   · el último CIERRE acaba en cerrar + 8·pasoCierraRotulo/5000 + durCierraRotulo/5000
      //     = 0,485 + 0,072 + 0,052 = 0,609, con 0,011 de margen antes de logo[0] = 0,62.
      // Antes cerrar = 0,56 daba 0,684 > logo[0] = 0,60: la marca arrancaba con los rótulos aún
      // recogiéndose y salían a media opacidad DETRÁS de la placa (informe BRECHA, fila 4,
      // captura demo-esc-07-como-b). La marca se corrió 0,02 y el reposo (quieto) mide 0,09.
      abrir: [0, 0.12] as [number, number],
      separar: [0.1, 0.34] as [number, number],
      rotulos: [0.16, 0.40] as [number, number],
      parallax: [0.44, 0.58] as [number, number],
      cerrar: 0.485,
      logo: [0.62, 0.70] as [number, number],
      quieto: [0.70, 0.79] as [number, number],
      recomponer: [0.79, 1] as [number, number],
      rotX: -20,      // se inclina para ver el despiece desde arriba
      bajar: -0.64,   // el despiece se va más ARRIBA que abajo: se baja para centrarlo en el cuadro
      desplazar: -0.6, // el despiece crece hacia la derecha (turbobomba y conductos): se compensa
      zoom: 0.58,     // el despiece ocupa ~12,3 u de alto: 8,2 / 0,58 = 14,1 u de encuadre
      giroAbre: 62,
      giroParallax: 34,
      giroFinal: 22,
      paso: 70,
      dur: 900,
      pasoRotulo: 95,
      durRotulo: 420,
      pasoCierraRotulo: 45,
      durCierraRotulo: 260,
      repartoTubo: 220,  // ms entre el primer tubo y el último al florecer (reparto por ángulo, no por índice)
      tuboFuera: 0.6,  // cuánto florece cada tubo hacia fuera
      // Si el motor se apaga del todo, la marca no EMERGE del objeto: se superpone a un fotograma
      // negro y se lee como marca de agua (el mismo plano se conseguiría con un <img>). El motor
      // tiene que seguir ahí, reconocible, detrás.
      // 0,15 y no 0,34: con un tercio de luz el despiece seguía compitiendo con la placa (fila 4
      // del informe BRECHA). COMO es el capítulo CLARO: con 0,15 el resto del motor no se hunde
      // en negro sino que se aplana a gris sobre el crema, y se sigue reconociendo (medido en
      // captura a 1440x900, COMO 74 %).
      apagado: 0.15,   // a cuánto baja la LUZ del resto del motor mientras manda la marca
      borrado: 0.5,    // cuánta OPACIDAD pierde el resto del motor
      // LA COMPOSICIÓN VERTICAL DEL DESPIECE (fila 16). En compacto los rótulos van en dos bandas
      // (PM.rotulos.bandaAlta / bandaBaja) y el despiece tiene que caber ENTRE ellas: de la última
      // ranura de arriba (0,28 + medio rótulo) a la primera de abajo (0,865 − medio rótulo), o sea
      // de ~0,30 a ~0,85 del alto: centro en 0,575 y 0,52 de alto con un poco de aire. Con el
      // encuadre nuevo (5,64 de ancho) el despiece a zoom 0,58 medía 12,9 u proyectadas sobre
      // 16,6 visibles en el iPhone y su anillo de bancada subía hasta los 83 px, DEBAJO de la
      // banda alta: se encoge (k = 0,52 · 16,6 / 12,9 = 0,67) y se baja para que quepa entre las
      // dos bandas. `altoDespiece` es el alto PROYECTADO del despiece abierto (rotX −20° y la
      // inclinación de la cámara incluidas), medido en píxeles en COMO 40 % (392 px a 30,6 px/u).
      // Medido después (COMO 40 %, vida a cero): el despiece queda a 18 / 12 px de la última
      // ranura de arriba y de la primera de abajo en el iPhone 13, 25 / 17 en el Pixel 5 (851 de
      // alto) y 18 / 10 en 360x640; las cuatro guías no se cruzan.
      vertical: { centro: 0.575, alto: 0.52 },
      altoDespiece: 12.9,
    },
    cierre: {
      previo: [0, 0.22] as [number, number],
      brillo: [0.1, 0.45] as [number, number],
      penacho: [0.14, 0.46] as [number, number],
      salida: [0.4, 1] as [number, number],
      fundido: [0.74, 1] as [number, number],
      vibra: 0.035,     // amplitud del temblor, en unidades de motor
      vibraHz: 0.055,   // radianes por unidad del maestro (no por ms de reloj real)
      rpm: 0.09,        // vueltas de la turbina por unidad del maestro
      subir: 2.4,       // antes de encender, el motor se levanta: el penacho necesita el hueco
      alturaSalida: 17, // se va por arriba, fuera de cuadro
      escalaSalida: 1.14,
      zoom: [1, 0.72] as [number, number],
      emisiva: 1.55,    // emissiveIntensity de los inyectores en el encendido (más recorta a blanco)
      luzCamara: 26,    // PointLight en la garganta (unidades de motor: el radio es grande)
    },
    origen: 'propio',
  },

  // La marca. El hallazgo del análisis del logo es que TRES piezas en corona a 120° no pueden
  // resolverse en la silueta del monograma desde ninguna cámara (dos de sus brazos están a 180,00°
  // exactos y una proyección lineal no crea antiparalelos). Así que la marca no se "resuelve": ya
  // ESTÁ construida, es la placa de identificación, y el momento del logo consiste en traerla
  // delante de la cámara mientras el resto del motor se apaga.
  marca: {
    adelante: 9,   // cuánto se adelanta la placa HACIA la cámara desde el centro del motor
    // 0,32 y no 0,5. Con medio cuadro de alto el monograma no era un remate: era una pantalla de
    // carga encima del motor, y cada defecto de la malla se veía a tamaño natural. A un tercio del
    // alto la marca manda igual (el resto del motor está al 15 % de luz y al 50 % de opacidad) y
    // el objeto sigue leyéndose detrás, que es justo lo que pedía este plano.
    alto: 0.32,    // fracción del encuadre efectivo que ocupa la marca
    emisiva: 0.95, // cuánto se auto-ilumina cuando manda (la luz clave está al 15 % en ese momento)
    origen: 'propio',
  },

  rotulos: {
    anchoCompacto: 900,   // px de ancho por debajo de los cuales solo se pintan los rótulos `movil`
    // EN COMPACTO los rótulos van en dos bandas, arriba y abajo del objeto, y NO en columnas
    // laterales: en 390 px de ancho una columna se escribe encima del motor y se sale por el borde
    // (comprobado en captura: "Estructura de empuje" caía sobre un radiador).
    //
    // CUATRO, y repartidos POR LA Y DEL ANCLA. Eran seis a partes iguales entre las dos bandas, y
    // así "Cámara de combustión" —cuya pieza vive en la mitad ALTA del despiece— caía en la banda
    // de abajo: su guía subía cruzando la campana entera y se cortaba con las otras cinco
    // (mov-13, mov-14, mov-15). Con la banda de arriba quedándose los tres anclajes altos y la de
    // abajo solo el de la campana, las ranuras van en el mismo orden que las anclas y NINGUNA guía
    // puede cruzar otra: es geometría, no suerte.
    margen: 0.045,        // fracción del ancho hasta el borde, en compacto
    // 0,14 y no 0,045: la banda de arriba tiene que quedar DEBAJO de la cabecera fija (2,75 rem =
    // 44 px en compacto) y del titular de capítulo (de 3,25 a 4,75 rem = 76 px). El rótulo mide
    // 0,72 rem · 1,3 = 15 px y se centra en la ranura, así que la primera necesita
    // (76 + 6 + 7,5) / alto: 0,135 con 664 px (iPhone 13) y 0,105 con 851 (Pixel 5); 0,14 vale
    // para las dos (93 y 119 px) y para 640 (90 px). Medido antes del cambio: "Estructura de
    // empuje" se escribía sobre la cabecera (15 px de solape).
    bandaAlta: 0.14,      // primera ranura de la banda de arriba
    enBandaAlta: 3,       // cuántas ranuras lleva la banda de arriba (el resto van abajo)
    // 0,865: por debajo del labio de la campana (que acaba en 0,82) y por encima del rótulo de
    // capítulo, que en compacto vive a 4,5 rem del borde inferior (~0,915).
    bandaBaja: 0.865,     // primera ranura de la banda de abajo
    pasoCompacto: 0.07,   // separación entre ranuras de una banda
    columna: 0.045,   // más de la mitad del cuadro era negro vacío con 0,085
    codo: 0.05,       // el codo va en el extremo CERCANO al objeto: así la diagonal no cruza texto
    // EN COMPACTO el codo no puede ir a una fracción del ancho: con 0,05 (20 px a 390) la diagonal
    // salía DESDE DENTRO del bloque de texto y cruzaba los rótulos de debajo —la de "Estructura de
    // empuje" tachaba "Placa de inyectores" y la de "Placa", "Cámara de combustión" (ronda 1,
    // rec-ip13-como40-rotulos)—. Ahora el codo va en el borde del <b> MÁS ANCHO de su banda
    // (medido en el DOM al destaparse la capa; rotulos.ts) más este aire: la diagonal arranca fuera
    // de todo texto de la banda y, como baja hacia el objeto (las anclas quedan a la derecha del
    // codo en los tres teléfonos: 205 px frente a ~155), no vuelve a entrar. Y la raya horizontal
    // pasa a `raya` px del centro de la ranura, DEBAJO del rótulo en la banda alta y ENCIMA en la
    // baja: el <b> mide 0,72 rem · 1,3 = 15 px (±7,5 del centro), así que 9 deja 1 px entre la caja
    // del texto y el trazo de 1 px. El texto NO se mueve de su ranura: el aire entre las bandas y
    // el despiece (18 / 12 px en el iPhone 13) es el de antes.
    aireCodo: 8,      // px entre el borde del texto más ancho de la banda y el codo, en compacto
    raya: 9,          // px del centro de la ranura al tramo horizontal de la guía, en compacto
    alto: 0.115,
    dibujo: 0.62,
    radioPunto: 3.2,
    origen: 'propio',
  },

  penacho: {
    // SEIS, no cuatro. El degradado radial se hace con capas encajadas (no hay shader), así que el
    // número de capas ES la resolución del degradado: con cuatro, la franja que solo cubre la capa
    // de fuera medía el 14 % del radio y salía como una FUNDA MARRÓN de canto duro alrededor del
    // chorro (recorte zoom-penacho-boca). Con seis, cada escalón es la mitad y el canto exterior
    // se deshace. Cuestan 2 llamadas y ~1 500 triángulos más, en el único fotograma del demo donde
    // el motor ya casi no se ve.
    capas: 6,
    // MÁS LARGO Y MÁS FINO. Con largo 7 sobre un radio de 2,5 el chorro medía menos de tres veces
    // su anchura: a esa proporción cualquier cosa se lee como una LLAMA. Un escape de tobera se
    // reconoce por ser desproporcionadamente largo. 9,5 sobre 2,15 son 4,4 anchuras, y el final
    // queda fuera de cuadro, que es justo lo que hace falta: un chorro no "termina", se sale.
    // 12, no 9,5. La cola se apaga ahora a NEGRO en el último 30 % (ver `pintaColores`), así que
    // el trozo que de verdad se ve es más corto que la geometría; sin alargarla, el chorro
    // terminaba dentro del cuadro. Lo que se ve tiene que salirse SIEMPRE.
    largo: 12,       // unidades de motor, DESDE EL LABIO (la campana mide 3,3 de largo)
    radio: 2.15,     // nace con el radio de la boca de la campana (2,10) y de ahí solo se estrecha
    // CELDAS DE CHOQUE. Un chorro sobreexpandido se estrangula y se vuelve a hinchar varias veces
    // al salir, con la barriga cada vez más floja. Es EL rasgo que distingue un escape de una
    // llama, y es geometría, así que sale gratis en el perfil de revolución.
    celdas: 4,       // cuántos estrangulamientos a lo largo del chorro
    celda: 0.36,     // cuánto cierra el primero (los siguientes se amortiguan solos)
    diamantes: 3,    // los rombos brillantes van EN los estrangulamientos, no repartidos a ojo
    parpadeoHz: [0.21, 0.53] as [number, number],
    parpadeo: [0.06, 0.035] as [number, number],
    estira: 1.35,
    origen: 'propio',
  },
};

export interface PiezaNum {
  id: string;
  y: number;
  r: number;
  ancla: [number, number, number];
  lado: -1 | 1;
  /** Si es true, la pieza conserva rótulo en pantalla estrecha. Nueve rótulos no caben en un móvil. */
  movil?: boolean;
  titulo: string;
  nota: string;
}
