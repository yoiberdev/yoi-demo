# yoi-demo

Laboratorio de animaciones web con **[Anime.js](https://animejs.com) 4.5** (MIT).

**En vivo: https://demo.yoiber.com**

Recreación técnica inspirada en la home de animejs.com: usa la misma librería y las mismas
técnicas, con diseño, textos y assets propios. No contiene código, assets ni textos de ese sitio.

## Qué hay montado

| Pieza | Cómo funciona |
|---|---|
| Timeline maestro | Un solo reloj con etiquetas por capítulo. Nada se anima por su cuenta. |
| Scroll | El scroll no mueve nada: mueve el reloj. Cada sección traduce su paso por la pantalla a un tramo del maestro, con suavizado. |
| Intro | Corre por tiempo cuatro segundos y cede el mando en cuanto el visitante hace scroll. |
| Escenario 3D | Placas apiladas con `perspective` y `preserve-3d`, sin WebGL. Entra, se balancea, se abre y se hunde. |
| Texto | `splitText` por caracteres con escalonado, y un punto con física de muelle. |
| Tema | El capítulo claro se decide desde el tiempo del maestro, no desde el scroll, para que sea coherente al volver atrás. |
| Barra de progreso | Cursor arrastrable que mueve el scroll y se mueve con él. |
| Accesibilidad | Con `prefers-reduced-motion` no hay intro temporal, ni rotaciones 3D, ni bucles. El scrub sigue disponible. |

Añade `?debug` a la URL para ver el reloj, el capítulo, los fotogramas por segundo y saltar a
cualquier etiqueta.

## Estructura

- `src/params.ts`: la única fuente de números. Ajustar el ritmo es cambiar un valor aquí.
- `src/core/`: maestro, scroller, escenario, tema, barra de progreso y overlay de depuración.
- `src/effects/`: un fichero por efecto, con el contrato `mount(scope) => cleanup`.

## Desarrollo

No hace falta Node en la máquina: todo va en contenedores.

```bash
printf "DEV_UID=%s\nDEV_GID=%s\nWEB_PORT=5174\n" "$(id -u)" "$(id -g)" > .env
docker compose -f docker-compose.dev.yml up -d      # recarga en caliente en 127.0.0.1:5174
```

## Publicación

Estáticos servidos con nginx en Docker. En el servidor, `/opt/yoi-demo` tiene un clon de este
repositorio en `src/` y se actualiza con `sudo /opt/yoi-demo/actualizar.sh`.

## Licencia

Código MIT (ver `LICENSE`). Anime.js es de Julian Garnier, también MIT.
