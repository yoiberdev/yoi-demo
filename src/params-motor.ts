// Números del MOTOR 3D. Viven aparte de src/params.ts a propósito: `params.ts` lo importa
// `main.ts`, así que todo lo que se meta ahí viaja en la ENTRADA aunque el visitante nunca llegue a
// pedir el trozo 3D. Este fichero solo lo importa el trozo diferido.
//
// UNIDADES. Las de la geometría (src/motor/geometria.ts): el eje del motor es Y, y = 0 está en la
// garganta de la tobera. Medido sobre el grafo real (bbox de cada pieza en el marco del motor):
// el motor ocupa de y = -3,35 (labio de la campana) a y = +3,13 (anillo de bancada) y ±2,42 en X;
// su centro está en y = -0,11. Antes llegaba a +3,68 porque la chapa del monograma sobresalía por
// encima de todo; ahora la pieza más alta es la que debe serlo, el anillo de empuje.
export const PM = {
  motor: {
    // El objeto tiene que LLENAR el cuadro: es media parte del efecto de animejs.com. Con 9,8
    // sobre un motor de 7,6 de alto quedaba un tercio de aire arriba y abajo (visto en captura).
    encuadre: 8.2,    // alto del frustum ortográfico (unidades de motor) con zoom = 1
    // ANCHO MÍNIMO visible. Una cámara ortográfica fija el ALTO y deja que el ancho lo ponga el
    // aspecto: en un móvil de pie (390x844, aspecto 0,46) el encuadre sale de 9,8 x 4,5 y el motor,
    // que mide 6,2 de ancho, se salía por los lados (comprobado en captura). Si el ancho no llega
    // a este número, se abre el encuadre entero.
    anchoMin: 7.4,
    // MEDIDAS DEL OBJETO, para poder encuadrar sin adivinar. Salen del bbox del grafo (mismo
    // origen que el comentario de arriba): el motor ocupa ±2,42 en X y de -3,35 a +3,13 en Y.
    // Las usa el desvío de la galería para no sacar la máquina del cuadro (ver coreografia.ts).
    medioAncho: 2.42,
    medioAlto: 3.35,
    centro: 0.11,     // el motor se sube esto para que su centro caiga en el centro del encuadre
    camara: [0, 3.4, 20] as [number, number, number], // ortográfica: solo fija la dirección de vista
    cerca: -60,
    lejos: 80,
    // Luces. El reparto es el de los renders de verificación de geometría, que es donde se decidió
    // que el flatShading se lee: clave fuerte, contraluz frío flojo, hemisferio y un pelín de ambiente.
    luzClave: 2.1,
    luzBorde: 0.55,
    hemisferio: 0.75,
    ambiente: 0.18,
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
    // 0,5: el emisivo del acento es 0xff7a10 a propósito para que ningún pico recorte a blanco
    // (ver geometria.ts, crearMateriales): en el pico los aros siguen ámbar.
    latidoAmp: 0.50,        // cuánto respira el ámbar sobre su valor de la coreografía
    latidoHz: 0.00110,      // ~5,7 s
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
    intro: {
      base: 120,   // ms tras HERO_OUT en que entra la primera pieza
      paso: 115,   // ms entre pieza y pieza
      dur: 560,
      ease: 'out(4)',
      coronaDur: 760,    // la corona entra la última: es la imagen que vende
      // EL REPARTO DE LA CORONA VA POR ÁNGULO A LA CÁMARA, no por índice. Ver coreografia.ts: el
      // índice del tubo ES su ángulo y su entrada es RADIAL, así que cualquier reparto por índice
      // (`from: 'first'`, `'center'`, …) recorre la corona en un sentido y deja media corona dentro
      // y media fuera durante todo el gesto.
      coronaReparto: 340,  // ms entre el primer tubo y el último (el gesto entero dura esto + coronaDur)
      // Azimut LOCAL del tubo que mira a la cámara mientras dura el gesto. MEDIDO en el grafo
      // (cap6/azimut.mjs): la cámara está a 92° del motor cuando empieza y a 114° cuando acaba,
      // porque `raiz.rotateY` sigue girando de 1,8° a 26,3° durante el gesto. 105° es el centro:
      // el tubo del frente es el 10,5 de 36.
      coronaAzimut: 105,
      // 'detras' = la ola nace en el tubo del fondo, se cierra por los dos costados a la vez y el
      // ÚLTIMO en encajar es el que mira a la cámara.
      coronaDesde: 'detras' as 'frente' | 'detras',
      coronaRebote: 1.5, // sobrepaso del ease outBack
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
      apartar: 2.6,
      margenApartar: 0.35,  // aire que se le deja al objeto contra el borde al desviarlo
      escala: 0.72,
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
    bandaAlta: 0.045,     // primera ranura de la banda de arriba
    enBandaAlta: 3,       // cuántas ranuras lleva la banda de arriba (el resto van abajo)
    // 0,865: por debajo del labio de la campana (que acaba en 0,82) y por encima del rótulo de
    // capítulo, que en compacto vive a 4,5 rem del borde inferior (~0,915).
    bandaBaja: 0.865,     // primera ranura de la banda de abajo
    pasoCompacto: 0.07,   // separación entre ranuras de una banda
    columna: 0.045,   // más de la mitad del cuadro era negro vacío con 0,085
    codo: 0.05,       // el codo va en el extremo CERCANO al objeto: así la diagonal no cruza texto
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
