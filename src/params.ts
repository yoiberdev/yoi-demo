// Única fuente de números del demo. Ajustar "más rápido / más lento" es cambiar aquí, nunca lógica.
// origen: 'propio' = decisión de diseño; 'doc' = valor canónico de la documentación de Anime.js.
export const P = {
  intro: {
    chars: {
      x: ['.35em', 0] as [string, number],
      duration: 1000,
      ease: 'outQuint',
      stagger: 25,
      staggerEase: 'outIn(2)',
    },
    punto: { delay: 550, stiffness: 120, damping: 6 },
    lema: { delay: 500, stagger: 150 },
    origen: 'propio',
  },
};
