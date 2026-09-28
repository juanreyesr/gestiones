# Sitio web público · Ps. Juan J. Reyes

Portada formal de `www.juanjreyes.org` (bilingüe es/en). Es HTML estático: `build.mjs`
contiene todo el contenido y los estilos y genera las páginas directamente en `public/`.

- Editar contenido: modificar `sitio-web/build.mjs` y ejecutar `node sitio-web/build.mjs`.
  No editar a mano los HTML de `public/es` y `public/en` (se sobrescriben).
- Destinos de botones: `public/config.json` (`aulaURL`, `bookingURL`, `email`, `whatsapp`).
  Se leen al generar y también en el navegador; tras cambiarlos, volver a ejecutar el build.
- Rutas (ver `next.config.ts`): `/` redirige a `/es`; `/es/<seccion>` y `/en/<seccion>` se
  sirven desde `public/<idioma>/<seccion>/index.html`. Las URLs con barra final redirigen a la
  versión sin barra.
- Accesos a la app (menú superior): "Aula virtual" → `/estudiante` (también en Programas de
  formación) y "Acceso administrativo" → `/admin`. Son rutas relativas, funcionan en cualquier dominio.
