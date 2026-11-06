/** Informe profesional del cuestionario de valores laborales (HTML autónomo, imprimible). Solo panel. */
import { calificarValores, integrarRiasec, seguimientoValores, VALORES_AVISO, VALORES_INFO, type ValoresDatos } from "./calificacion";
import { VALORES_ESCALA, VALORES_ITEMS, VALORES_NOMBRE_PROFESIONAL, valorDeItem } from "./escalas";

export type AplicacionValores = { datos: ValoresDatos; nombre: string; fecha: string };
/** Resultado del test de intereses del mismo paciente, si existe. */
export type RiasecParaValores = { codigo: string; fecha: string; nombres: string[] };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const COLOR: Record<string, string> = { bajo: "#94a3b8", medio: "#0ea5e9", alto: "#0d9488", esencial: "#4f46e5" };

export function informeValoresHtml(
  a: AplicacionValores,
  anterior?: AplicacionValores | null,
  notasPrivadas = "",
  riasec?: RiasecParaValores | null
) {
  const c = calificarValores(a.datos);
  const por = Object.fromEntries(c.valores.map((v) => [v.id, v]));
  const nombresTop = c.principales.map((v) => VALORES_INFO[v].nombre);
  let html = `<h1>Informe · ${esc(VALORES_NOMBRE_PROFESIONAL)}</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${a.datos.edad ? ` · Edad: ${a.datos.edad}` : ""}${a.datos.situacion ? ` · Situación: ${esc(a.datos.situacion)}` : ""} · Fecha: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))}</p>
<p class="muted">Instrumento: 24 afirmaciones (8 valores × 3, escala 0–4) y elección de los 3 valores más importantes. Seis valores provienen de la Teoría del Ajuste al Trabajo de Minnesota, tal como los usa la Red de Información Ocupacional del Departamento de Trabajo de EE. UU. (O*NET, Occupational Information Network); Servicio a los demás y Creatividad y variedad, del Inventario de Valores Laborales de Super (WVI, Work Values Inventory).</p>
<div class="kpi">
  <div><div class="v" style="font-size:16px">${nombresTop.map(esc).join(" · ")}</div><div class="l">Prioridades medidas</div></div>
  <div><div class="v" style="font-size:16px">${a.datos.elegidos.map((v) => esc(VALORES_INFO[v].nombre)).join(" · ")}</div><div class="l">Valores que eligió</div></div>
  <div><div class="v">${c.concordancia.n}<small>/3</small></div><div class="l">Concordancia elegidos / medidos</div></div>
  <div><div class="v">${c.diferenciacion}<small>/12</small></div><div class="l">Diferenciación (más alto − más bajo)</div></div>
</div>
<table><thead><tr><th>Valor</th><th>Puntuación</th><th>Nivel</th><th>Eligió</th></tr></thead><tbody>
${c.orden
  .map((id) => {
    const v = por[id];
    return `<tr${c.principales.includes(id) ? ' class="top"' : ""}><td><strong>${esc(v.nombre)}</strong></td><td>${v.suma} / 12<div class="bar"><i style="width:${v.pct}%;background:${COLOR[v.nivel.k]}"></i></div></td><td>${esc(v.nivel.label)}</td><td>${v.elegido ? `★ ${a.datos.elegidos.indexOf(id) + 1}` : ""}</td></tr>`;
  })
  .join("")}
</tbody></table>
<p class="muted">Niveles por rango de la escala (sin baremos): 0–5 poco importante, 6–8 importante, 9–10 muy importante, 11–12 esencial. Promedio general ${c.media.toFixed(2).replace(".", ",")} de 4. Concordancia: ${esc(c.concordancia.lectura)}</p>
<h2>Observaciones</h2>
${c.flags.length ? c.flags.map((f) => `<div class="flag ${f.lvl === "alert" ? "alarma" : f.lvl === "warn" ? "regla" : "neutra"}"><b>${f.lvl === "alert" ? "!" : "•"}</b> ${esc(f.t)}</div>`).join("") : `<div class="flag ok">✓ Perfil interpretable sin observaciones de estilo de respuesta.</div>`}
<h2>Valores principales: qué buscar en un trabajo</h2>
${c.principales
  .map((id, i) => {
    const info = VALORES_INFO[id];
    return `<div class="tipo"><h3>${i + 1}. ${esc(info.nombre)} <small>(${por[id].suma}/12 · ${esc(info.fuente)})</small></h3><p>${esc(info.descripcion)}</p><p><strong>Buscar:</strong> ${esc(info.buscar)}</p><p class="muted">Preguntas útiles al evaluar una opción: ${info.preguntas.map(esc).join(" · ")}</p></div>`;
  })
  .join("")}`;

  html += `<h2>Integración con el test de intereses vocacionales (RIASEC)</h2>`;
  if (riasec) {
    const integ = integrarRiasec(c, riasec.codigo);
    html += `<p class="muted">Código de intereses RIASEC (Realista, Investigador, Artístico, Social, Emprendedor, Convencional) del ${esc(fechaLarga(riasec.fecha))}: <strong>${esc(riasec.codigo)}</strong> (${riasec.nombres.map(esc).join(" – ")}). La relación entre valores y tipos de intereses es orientativa.</p>
<table><thead><tr><th>Valor principal</th><th>Intereses afines</th><th>En su código</th></tr></thead><tbody>
${integ.map((f) => `<tr><td>${esc(f.nombre)}</td><td>${f.afines.join(", ")}</td><td>${f.coinciden.length ? `✓ ${f.coinciden.join(", ")}` : "— (explorar)"}</td></tr>`).join("")}
</tbody></table>
<p class="muted">${
      integ.every((f) => f.coinciden.length)
        ? "Valores e intereses apuntan en la misma dirección: buscar carreras del código RIASEC en entornos que ofrezcan estos valores."
        : "Algún valor principal no coincide con sus intereses: puede satisfacerse por el entorno (tipo de organización, condiciones) más que por la actividad en sí. Conversarlo al comparar opciones."
    }</p>`;
  } else {
    html += `<p class="muted">El paciente aún no tiene un test de intereses vocacionales RIASEC (Realista, Investigador, Artístico, Social, Emprendedor, Convencional) respondido. Aplicarlo permite cruzar qué actividades le atraen con lo que necesita de un trabajo.</p>`;
  }

  if (anterior) {
    const s = seguimientoValores(a.datos, anterior.datos);
    const nom = (l: string[]) => l.map((v) => esc(VALORES_INFO[v as keyof typeof VALORES_INFO].nombre)).join(", ");
    html += `<h2>Seguimiento: comparación con la aplicación anterior</h2>
<p class="muted">Anterior: ${esc(fechaLarga(anterior.fecha))} · Prioridades: ${nom(s.principalesAntes)} → ${nom(s.principalesAhora)}</p>
<table><thead><tr><th>Valor</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>
${s.filas.map((f) => `<tr><td>${esc(f.nombre)}</td><td>${f.antes}</td><td>${f.ahora}</td><td><strong>${f.cambio > 0 ? "+" : ""}${f.cambio}</strong></td></tr>`).join("")}
</tbody></table>`;
  }

  html += `<h2>Respuestas ítem por ítem</h2>
<table><thead><tr><th>N.º</th><th>Afirmación</th><th>Valor</th><th>Resp.</th></tr></thead><tbody>
${VALORES_ITEMS.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td>${esc(VALORES_INFO[valorDeItem(i + 1)].nombre)}</td><td><strong>${a.datos.items[i]}</strong> <span class="muted">${esc(VALORES_ESCALA[a.datos.items[i]])}</span></td></tr>`).join("")}
</tbody></table>`;
  if (a.datos.abierta) html += `<h2>Otros aspectos importantes para la persona (respuesta abierta)</h2><p class="cita">${esc(a.datos.abierta)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">${esc(VALORES_AVISO)}</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Valores laborales · ${esc(a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}h3 small{color:#64748b;font-weight:400}
.muted{color:#64748b;font-size:12.5px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}tr.top td{background:#eef2ff}
.bar{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%}
.flag{padding:9px 12px;border-radius:8px;margin:6px 0;font-size:13px;border:1px solid #e2e8f0}.flag.alarma{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d}
.flag.regla{background:#fef3c7;border-color:#fcd34d;color:#78350f}.flag.ok{background:#f0fdf4;border-color:#bbf7d0}.flag.neutra{background:#f0f9ff;border-color:#bae6fd}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:14px 0}.kpi>div{background:#f8fafc;border-radius:8px;padding:10px}
.kpi .v{font-size:22px;font-weight:700}.kpi .v small{font-size:12px;color:#64748b}.kpi .l{font-size:11.5px;color:#64748b}
.tipo{border-left:4px solid #6366f1;background:#f8fafc;padding:10px 12px;margin:8px 0;border-radius:0 8px 8px 0}.tipo p{margin:4px 0}
.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.tipo{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
