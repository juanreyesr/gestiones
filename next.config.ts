import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // microphone=(self): las notas de voz de las tareas se graban en el navegador del estudiante.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

// Sitio web público (HTML estático generado por sitio-web/build.mjs en public/).
// Las páginas viven en public/<idioma>/<seccion>/index.html y se sirven sin
// barra final: /es, /es/formacion, /en/learning...
const idiomasSitio = ["es", "en"];

const nextConfig: NextConfig = {
  env: {
    // Commit del despliegue: AvisoVersionNueva lo compara con /api/version para
    // ofrecer recargar las pestañas que quedaron con una versión anterior.
    NEXT_PUBLIC_VERSION_APP: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    // production | preview | development: en producción, "Actualizar" lleva al dominio oficial.
    NEXT_PUBLIC_ENTORNO_APP: process.env.VERCEL_ENV ?? "development",
  },
  async redirects() {
    return [
      // La dirección de Vercel (gestionesjj.vercel.app) se redirige al dominio
      // oficial en src/proxy.ts, con un periodo de respaldo que vence solo.
      { source: "/", destination: "/es", permanent: false },
    ];
  },
  async rewrites() {
    return idiomasSitio.flatMap((idioma) => [
      { source: `/${idioma}`, destination: `/${idioma}/index.html` },
      { source: `/${idioma}/:seccion`, destination: `/${idioma}/:seccion/index.html` },
    ]);
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
