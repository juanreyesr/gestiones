/**
 * Ficha clínica de una Biblioteca JJR como documento HTML autónomo (A4), para descargar en PDF.
 * Respeta la vista: el estudiante no recibe «Cómo lo detecta el sistema»; el terapeuta no recibe el caso.
 */
import { fichaPorId } from "../evaluaciones/fichas/catalogo";
import type { Biblioteca, FichaClinica, VistaFicha } from "./tipos";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ETAPAS: Record<number, string> = {
  1: "Evaluación y formulación",
  2: "Psicoeducación",
  3: "Técnicas cognitivas",
  4: "Técnicas conductuales",
  5: "Prevención de recaídas",
};

const ESTILOS = `
*{box-sizing:border-box}body{margin:0;padding:24px;font:13.5px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 2px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#0f766e;margin:18px 0 6px}
.muted{color:#64748b;font-size:12px}p{margin:6px 0}ul,ol{margin:4px 0;padding-left:20px}li{margin:2px 0}
.dif{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;margin:6px 0;background:#f8fafc}.dif b{display:block}
.alerta{border:1px solid #fca5a5;background:#fee2e2;color:#7f1d1d;border-radius:8px;padding:6px 10px}
.paso{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;margin:6px 0}.paso .et{font-size:11.5px;color:#64748b;font-weight:600}
.ficha{font-size:12px;color:#0f766e;font-weight:600}.caso{border-left:4px solid #0d9488;background:#f0fdfa;padding:8px 12px;border-radius:0 8px 8px 0}
.pie{margin-top:22px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b}
@media print{body{padding:0}.dif,.paso,li{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const lista = (xs: string[]) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

export function fichaClinicaHtml(ficha: FichaClinica, biblioteca: Biblioteca, vista: VistaFicha): string {
  const plan = ficha.plan
    .map((p) => {
      const fichas = p.fichas
        .map((id) => fichaPorId(id))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => `<div class="ficha">Ficha ${esc(f.id)} · ${esc(f.titulo)}</div>`)
        .join("");
      return `<div class="paso"><div class="et">Etapa ${p.etapa} · ${esc(ETAPAS[p.etapa])}</div><p>${esc(p.texto)}</p>${fichas}</div>`;
    })
    .join("");
  const final =
    vista === "terapeuta"
      ? `<h2>Cómo lo detecta el sistema</h2>${lista(ficha.deteccion)}`
      : `<h2>Caso para analizar</h2><p class="caso">${esc(ficha.caso)}</p><h2>Clave para recordar</h2><p><b>${esc(ficha.clave)}</b></p>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(ficha.nombre)}</title><style>${ESTILOS}</style></head><body>
<p class="muted">Biblioteca ${esc(biblioteca.titulo)} · M. A. Juan J. Reyes</p>
<h1>${esc(ficha.nombre)}</h1>
<p class="muted">DSM-5-TR: ${esc(ficha.codigos.dsm)} · CIE-11: ${esc(ficha.codigos.cie)}</p>
<p>${esc(ficha.enPocasPalabras)}</p>
<h2>Síntomas clave</h2>${lista(ficha.sintomasClave)}
<h2>Duración y umbral</h2><p>${esc(ficha.duracion)}</p>
<h2>No confundir con</h2>${ficha.noConfundir.map((d) => `<div class="dif"><b>${esc(d.con)}</b>${esc(d.diferencia)}</div>`).join("")}
<h2>Preguntas para la entrevista</h2>${lista(ficha.preguntas)}
<h2>Señales de alerta</h2><div class="alerta">${lista(ficha.alertas)}</div>
<h2>Plan TCC por etapas</h2>${plan}
${final}
<h2>Referencias</h2><ul class="muted">${ficha.referencias.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
<p class="pie">Material de referencia de redacción propia. Los códigos son del DSM-5-TR y la CIE-11; los criterios completos deben consultarse en los manuales oficiales y el diagnóstico requiere entrevista clínica.</p>
</body></html>`;
}
