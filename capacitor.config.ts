import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativa (Android / iPhone) de GestionesJJ con Capacitor.
 * La app carga la version publicada en Vercel (server.url), asi cada despliegue
 * llega a la app sin publicar una version nueva en las tiendas. capacitor/www
 * solo tiene la pantalla que se ve si no hay conexion.
 */
const config: CapacitorConfig = {
  appId: "org.juanjreyes.gestiones",
  appName: "GestionesJJ",
  webDir: "capacitor/www",
  server: {
    url: "https://www.juanjreyes.org/admin",
    // Dominios que se abren dentro de la app; el resto (PayPal, WhatsApp,
    // Google Maps...) se abre en el navegador o la app correspondiente.
    allowNavigation: ["www.juanjreyes.org", "juanjreyes.org"],
    errorPath: "sin-conexion.html",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
