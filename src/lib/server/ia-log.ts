import Anthropic from "@anthropic-ai/sdk";

/** Modelo de las funciones de IA de la clínica (configurable con ANTHROPIC_MODEL). */
export const modeloIA = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/** Describe un error de la API de Anthropic sin incluir datos del paciente. */
export function describirError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    const causa =
      error.status === 401
        ? "clave inválida o revocada"
        : error.status === 403
          ? "sin permiso para el modelo"
          : error.status === 404
            ? "modelo no encontrado (revisar ANTHROPIC_MODEL)"
            : error.status === 429
              ? "límite de uso alcanzado"
              : error.status === 400 && /credit|balance/i.test(error.message)
                ? "sin saldo en Billing"
                : error.status && error.status >= 500
                  ? "falla temporal de Anthropic"
                  : "error de la API";
    return `status=${error.status ?? "?"} · ${causa} · request_id=${error.requestID ?? "?"} · ${error.message.slice(0, 300)}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 300)}`;
  return String(error).slice(0, 300);
}

/** Línea `[ia]` de una llamada correcta (solo metadatos, nunca datos del paciente). */
export function registrarLlamada(
  modo: string,
  inicio: number,
  r: { model: string; usage: { input_tokens: number; output_tokens: number }; stop_reason: string | null },
  valido: boolean
) {
  console.info(
    `[ia] ${modo} ok · modelo=${r.model} · ${Date.now() - inicio} ms · ` +
      `tokens entrada=${r.usage.input_tokens} salida=${r.usage.output_tokens} · ` +
      `fin=${r.stop_reason} · valido=${valido ? "sí" : "no"}`
  );
}

export function registrarError(modo: string, modelo: string, inicio: number, error: unknown) {
  console.error(`[ia] ${modo} error · modelo=${modelo} · ${Date.now() - inicio} ms · ${describirError(error)}`);
}
