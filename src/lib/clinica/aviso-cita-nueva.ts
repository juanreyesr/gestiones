import { getAccessToken } from "./ai-client";

/**
 * Tras crear o aprobar una cita en el panel: pide al servidor el aviso
 * inmediato de hoja de datos pendiente (si corresponde). No bloquea ni falla.
 */
export function avisarCitaNueva(citaId: string | null | undefined) {
  if (!citaId) return;
  void (async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/clinica/cita-creada", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ citaId }),
      });
    } catch {
      // Silencioso: el aviso es complementario.
    }
  })();
}
