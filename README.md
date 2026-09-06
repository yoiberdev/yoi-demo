# yoi-demo (rama `demo-anime`)

Demo personal de animaciones y transiciones con [Anime.js](https://animejs.com) 4.5.0 (MIT).
Vive en esta rama huérfana del repositorio de la web personal, **sin compartir código** con la
rama `main` (la web publicada en yoiber.com). Se prueba en `demo.yoiber.com`.

Recreación técnica inspirada en la home de animejs.com: usa la misma librería y las mismas
técnicas, con diseño, textos y assets propios. No contiene código, assets ni textos de ese sitio.

## Stack

Vite 8 + TypeScript, sin frameworks. `src/params.ts` es la única fuente de números de las
animaciones; cada efecto se monta desde `src/main.ts` dentro de un `createScope` con soporte de
`prefers-reduced-motion`.

## Desarrollo (sin Node en el host)

```bash
printf "DEV_UID=%s\nDEV_GID=%s\nWEB_PORT=5174\n" "$(id -u)" "$(id -g)" > .env
docker compose -f docker-compose.dev.yml up -d      # HMR en 127.0.0.1:5174
ssh -L 5174:127.0.0.1:5174 yoiber@2.25.161.181      # desde tu PC -> http://localhost:5174
```

## Publicación

Igual que yoiblog: en el servidor, `/opt/yoi-demo` tiene un clon de esta rama en `src/` y se
actualiza con `sudo /opt/yoi-demo/actualizar.sh` (git pull, docker compose build, up). El
contenedor `yoi-demo` sirve estáticos con nginx en la red `proxy`; la recepción pone el HTTPS.
