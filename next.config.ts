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
  async redirects() {
    return [{ source: "/", destination: "/es", permanent: false }];
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
