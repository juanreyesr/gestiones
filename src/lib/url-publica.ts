/**
 * URL publica para enlaces que se comparten (agendar, encuestas, QR de
 * sesiones en vivo, asignacion a cursos...). Usa el dominio publico
 * configurado en NEXT_PUBLIC_APP_URL (p. ej. https://www.juanjreyes.org)
 * aunque el owner este navegando desde otro dominio del proyecto (como
 * gestionesjj.vercel.app), para que lo compartido siempre lleve el dominio
 * propio. Sin la variable, cae al dominio actual del navegador.
 */
export function urlPublica(ruta: string) {
  const configurada = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const base = configurada || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${ruta}`;
}
