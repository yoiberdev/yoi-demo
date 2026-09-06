// Única fuente de números del demo. Ajustar "más rápido / más lento" es cambiar aquí, nunca lógica.
// origen: 'propio' = decisión de diseño; 'doc' = valor canónico de la documentación de Anime.js.
export const P = {
  scroll: {
    sync: 0.9, // suavizado del scroll (más cerca de 0, más tarda en alcanzar la posición)
    introDuration: 4000, // la intro corre por tiempo; el resto, por scroll
    alturas: { HERO_OUT: 2, GALERIA: 8, COMO: 5, CIERRE: 1 } as Record<string, number>, // en alturas de viewport; 1 altura = 1000 unidades del maestro
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
  subnav: { visible: [0.02, 0.98] as [number, number], origen: 'propio' },
};
