# Sitio web público · Ps. Juan J. Reyes

Portada formal de `www.juanjreyes.org` (bilingüe es/en). `plantilla.mjs` contiene los textos
y el HTML de todas las páginas; `build.mjs` agrega los estilos y el JS y genera las secciones
como HTML estático en `public/`.

- **Portada (`/es`, `/en`)**: se edita desde GestionesJJ → botón **"Editar página"** (textos en
  español e inglés y tres carruseles de imágenes: encabezado, junto al título de las áreas y
  biografía) con vista previa
  en tiempo real. Lo editado se guarda solo como borrador y llega al sitio con "Publicar cambios".
  La genera `src/app/sitio-portada/[idioma]/route.ts` con la misma plantilla y el contenido
  publicado (tabla `gestionesjj_sitio_portada`, imágenes en el bucket público `gestionesjj-sitio`,
  migración `055`); si no hay nada publicado usa los textos por defecto de `plantilla.mjs`.
- **Carruseles**: con una imagen queda fija; con varias, cambian solas con un fundido lento y un acercamiento sutil, sin
  flechas ni puntos; la siguiente se precarga antes de mostrarse y se respeta "reducir movimiento".
- Editar las demás secciones, el menú o el pie: modificar `sitio-web/plantilla.mjs` (estilos y JS
  en `build.mjs`) y ejecutar `node sitio-web/build.mjs`. No editar a mano los HTML de
  `public/es` y `public/en` (se sobrescriben).
- Destinos de botones: `public/config.json` (`aulaURL`, `bookingURL`, `email`, `whatsapp`).
  Se leen al generar y también en el navegador; tras cambiarlos, volver a ejecutar el build.
- Rutas (ver `next.config.ts`): `/` redirige a `/es`; `/es` y `/en` van a la portada dinámica; `/es/<seccion>` y `/en/<seccion>` se
  sirven desde `public/<idioma>/<seccion>/index.html`. Las URLs con barra final redirigen a la
  versión sin barra.
- Accesos a la app (menú superior): "Aula virtual" → `/estudiante` (también en Programas de
  formación) y "Acceso administrativo" → `/admin`. Son rutas relativas, funcionan en cualquier dominio.
