// Números del MOTOR 3D. Viven aparte de src/params.ts a propósito: `params.ts` lo importa
// `main.ts`, así que todo lo que se meta ahí viaja en la ENTRADA aunque el visitante nunca llegue a
// pedir el trozo 3D. Este fichero solo lo importa el trozo diferido.
//
// UNIDADES. Las de la geometría (src/motor/geometria.ts): el eje del motor es Y, y = 0 está en la
// garganta de la tobera. Medido sobre el grafo real: el motor ocupa de y = -3,35 (labio de la
// campana) a y = +4,91 (punta de los radiadores) y ±3,1 en X; su centro está en y = +0,78.
export const PM = {
  motor: {
    // El objeto tiene que LLENAR el cuadro: es media parte del efecto de animejs.com. Con 9,8
    // sobre un motor de 7,6 de alto quedaba un tercio de aire arriba y abajo (visto en captura).
    encuadre: 8.8,    // alto del frustum ortográfico (unidades de motor) con zoom = 1
    // ANCHO MÍNIMO visible. Una cámara ortográfica fija el ALTO y deja que el ancho lo ponga el
    // aspecto: en un móvil de pie (390x844, aspecto 0,46) el encuadre sale de 9,8 x 4,5 y el motor,
    // que mide 6,2 de ancho, se salía por los lados (comprobado en captura). Si el ancho no llega
    // a este número, se abre el encuadre entero.
    anchoMin: 7.4,
    centro: -0.78,    // el motor se baja esto para que su centro caiga en el centro del encuadre
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
    { id: 'radiadores',    y: 1.9,  r: 0,   ancla: [-1.86, 3.35, 1.09], lado: -1, titulo: 'Paneles radiadores', nota: 'tres a 120°, aristas a 60,1°' },
    { id: 'cupula',        y: 2.2,  r: 0,   ancla: [0.6, 2.8, 0],       lado: 1,  titulo: 'Cúpula del colector', nota: 'se levanta y deja ver los inyectores' },
    { id: 'inyector',      y: 1.3,  r: 0,   ancla: [1.06, 2.24, 0],     lado: 1,  movil: true, titulo: 'Placa de inyectores', nota: '127 orificios en siete anillos' },
    { id: 'turbobomba',    y: 0.9,  r: 2.3, ancla: [0, 0.2, 0],         lado: 1,  movil: true, titulo: 'Turbobomba', nota: 'voluta, cuerpo, turbina y escape' },
    { id: 'camara',        y: 0.4,  r: 0,   ancla: [0.97, 1.5, 0],      lado: -1, movil: true, titulo: 'Cámara de combustión', nota: 'relación de contracción 3,24' },
    { id: 'conductos',     y: 0,    r: 1.7, ancla: [1.2, 0.8, 0],       lado: 1,  titulo: 'Conductos', nota: 'descarga, línea al domo y escape' },
    { id: 'refrigeracion', y: -1.0, r: 0,   ancla: [0.66, -0.1, 0.3],   lado: -1, movil: true, titulo: 'Corona de refrigeración', nota: '36 tubos de radio variable' },
    { id: 'campana',       y: -2.3, r: 0,   ancla: [1.6, -2.6, 0],      lado: 1,  movil: true, titulo: 'Campana de la tobera', nota: 'perfil de Rao, expansión 17,6' },
  ] as PiezaNum[],

  // Piezas que se mueven en el despiece pero NO llevan rótulo. La placa de identificación viaja
  // con la estructura de empuje (que es donde está atornillada) en vez de salir por su cuenta:
  // medido, sacándola por su radio se movía HACIA la cámara —o sea, casi nada en pantalla— y se
  // quedaba escondida detrás del inyector, con su guía apuntando a un radiador.
  sueltas: [
    { id: 'placa', y: 3.6, r: 0.6, ancla: [0, 0, 0], lado: 1, titulo: '', nota: '' },
  ] as PiezaNum[],

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
      coronaPaso: 9,     // ms entre tubo y tubo (la ola recorre el anillo una vuelta entera)
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
      apartar: -3.2,  // se va a la izquierda (unidades de motor) para dejar sitio a las demos
      escala: 0.72,
      luz: 0.55,
      entra: 0.08,
      vuelve: 0.1,
      pulsos: 8,      // un latido del inyector por demo, alineado con el contador "n / 8"
      pulsoSube: 240,
      pulsoBaja: 560,
      emisivo: 2.6,   // emissiveIntensity en el pico del latido
    },
    como: {
      abrir: [0, 0.12] as [number, number],
      separar: [0.1, 0.34] as [number, number],
      rotulos: [0.19, 0.43] as [number, number],
      parallax: [0.46, 0.58] as [number, number],
      cerrar: 0.56,
      logo: [0.6, 0.68] as [number, number],
      quieto: [0.68, 0.78] as [number, number],
      recomponer: [0.78, 1] as [number, number],
      rotX: -20,      // se inclina para ver el despiece desde arriba
      bajar: 0.25,    // el despiece se va más abajo que arriba: se sube para centrarlo en el cuadro
      desplazar: -0.6, // el despiece crece hacia la derecha (turbobomba y conductos): se compensa
      zoom: 0.62,     // el despiece ocupa ~12,3 u de alto: 8,8 / 0,62 = 14,2 u de encuadre
      giroAbre: 62,
      giroParallax: 34,
      giroFinal: 22,
      paso: 70,
      dur: 900,
      pasoRotulo: 95,
      durRotulo: 420,
      pasoCierraRotulo: 45,
      durCierraRotulo: 260,
      pasoTubo: 6,
      tuboFuera: 0.6,  // cuánto florece cada tubo hacia fuera
      // Si el motor se apaga del todo, la marca no EMERGE del objeto: se superpone a un fotograma
      // negro y se lee como marca de agua (el mismo plano se conseguiría con un <img>). El motor
      // tiene que seguir ahí, reconocible, detrás.
      apagado: 0.34,   // a cuánto baja la LUZ del resto del motor mientras manda la marca
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
      emisiva: 6.5,     // emissiveIntensity de los inyectores en el encendido
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
    alto: 0.5,     // fracción del encuadre efectivo que ocupa la marca
    emisiva: 0.95, // cuánto se auto-ilumina cuando manda (la luz clave está al 18 % en ese momento)
    origen: 'propio',
  },

  rotulos: {
    anchoCompacto: 900,   // px de ancho por debajo de los cuales solo se pintan los rótulos `movil`
    // EN COMPACTO los seis rótulos van en dos bandas, arriba y abajo del objeto, y NO en columnas
    // laterales: en 390 px de ancho una columna se escribe encima del motor y se sale por el borde
    // (comprobado en captura: "Estructura de empuje" caía sobre un radiador).
    margen: 0.045,        // fracción del ancho hasta el borde, en compacto
    bandaAlta: 0.07,      // primera ranura de la banda de arriba
    bandaBaja: 0.72,      // primera ranura de la banda de abajo
    pasoCompacto: 0.075,  // separación entre ranuras de una banda
    columna: 0.045,   // más de la mitad del cuadro era negro vacío con 0,085
    codo: 0.05,       // el codo va en el extremo CERCANO al objeto: así la diagonal no cruza texto
    alto: 0.115,
    dibujo: 0.62,
    radioPunto: 3.2,
    origen: 'propio',
  },

  penacho: {
    capas: 4,
    largo: 7,        // unidades de motor, DESDE EL LABIO (la campana mide 3,3 de largo)
    radio: 2.5,     // el penacho nace con el radio de la boca de la campana (2,10) y se afila
    diamantes: 7,
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
