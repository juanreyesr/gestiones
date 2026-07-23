// Limite simple por IP en memoria (por instancia de servidor). No sustituye
// un WAF, pero evita que un bot martille los endpoints publicos (unirse a una
// sesion, enviar respuestas/preguntas, o probar PINs/tokens al azar).

type Ventana = { count: number; resetAt: number };

const buckets = new Map<string, Ventana>();

const LIMPIEZA_MS = 5 * 60_000;
let ultimaLimpieza = Date.now();

function limpiar(ahora: number) {
  if (ahora - ultimaLimpieza < LIMPIEZA_MS) return;
  ultimaLimpieza = ahora;
  for (const [key, ventana] of buckets) {
    if (ventana.resetAt <= ahora) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Devuelve true si la solicitud puede continuar, false si se alcanzo el limite.
 * `key` identifica el endpoint (para no compartir cupo entre rutas distintas).
 */
export function rateLimit(request: Request, options: { key: string; limit: number; windowMs: number }): boolean {
  const ahora = Date.now();
  limpiar(ahora);

  const bucketKey = `${options.key}:${getClientIp(request)}`;
  const actual = buckets.get(bucketKey);

  if (!actual || actual.resetAt <= ahora) {
    buckets.set(bucketKey, { count: 1, resetAt: ahora + options.windowMs });
    return true;
  }

  if (actual.count >= options.limit) {
    return false;
  }

  actual.count += 1;
  return true;
}

export function rateLimitResponse() {
  return Response.json({ error: "Demasiadas solicitudes. Intenta de nuevo en un momento." }, { status: 429 });
}
