/**
 * Informe profesional del EAPI como documento HTML autónomo (fondo claro, una
 * columna, listo para imprimir o guardar como PDF). Solo panel del psicólogo.
 */
import {
  avisoEapi,
  calificarEapi,
  DASS_SUB,
  EAPI_ENCABEZADO_DX,
  EAPI_SIN_DX,
  PTQ_SUB,
  seguimientoEapi,
  type Banda,
  type EapiDatos,
} from "./calificacion";
import { DASS21, DOCS, EAPI_NOMBRE_PROFESIONAL, GAD7, GAD_LABELS, PTQ, SAFETY } from "./escalas";

export type AplicacionEapi = { datos: EapiDatos; nombre: string; fecha: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

const pill = (b: Banda) => `<span class="pill ${b.k}">${esc(b.label)}</span>`;
const bar = (v: number, max: number, k = "") => `<div class="bar"><i class="${k}" style="width:${Math.round((v / max) * 100)}%"></i></div>`;
const tono = (lvl: string) => (lvl === "alert" ? "alarma" : lvl === "warn" ? "regla" : "neutra");

export function informeEapiHtml(a: AplicacionEapi, anterior?: AplicacionEapi | null, notasPrivadas = "") {
  const r = a.datos;
  const s = calificarEapi(r);
  const alertas = s.flags.filter((f) => f.lvl === "alert").length;
  let html = `<h1>Informe de calificación · ${esc(EAPI_NOMBRE_PROFESIONAL)} (EAPI)</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${r.edad ? ` · Edad: ${r.edad}` : ""} · Fecha de respuesta: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))} · Módulos: GAD-7, DASS-21, PTQ${s.docs ? ", DOCS" : ""}</p>
<div class="kpi">
  <div><div class="v">${s.gad.total}<small>/21</small></div><div class="l">GAD-7 · ${pill(s.gad.band)}</div></div>
  <div><div class="v">${s.dass.anx.x2}<small>/42</small></div><div class="l">DASS Ansiedad · ${pill(s.dass.anx.band)}</div></div>
  <div><div class="v">${s.dass.str.x2}<small>/42</small></div><div class="l">DASS Estrés · ${pill(s.dass.str.band)}</div></div>
  <div><div class="v">${s.dass.dep.x2}<small>/42</small></div><div class="l">DASS Depresión · ${pill(s.dass.dep.band)}</div></div>
  <div><div class="v">${s.ptq.total}<small>/60</small></div><div class="l">PTQ · ${pill(s.ptq.band)}</div></div>
  ${s.docs ? `<div><div class="v">${s.docs.total}<small>/80</small></div><div class="l">DOCS · ${pill(s.docs.band)}</div></div>` : ""}
  <div><div class="v ${alertas ? "rojo" : ""}">${alertas}</div><div class="l">Señales de alarma</div></div>
</div>
<h2>Señales de alarma y observaciones</h2>
${s.flags.length ? s.flags.map((f) => `<div class="flag ${tono(f.lvl)}"><b>${f.lvl === "alert" ? "!" : "•"}</b> ${esc(f.t)}</div>`).join("") : `<div class="flag ok">✓ Ninguna regla específica activada.</div>`}
<h2>Comentarios complementarios: DSM-5-TR y CIE-11</h2>
<p class="muted">${esc(EAPI_ENCABEZADO_DX)}</p>
${
  s.dx.length
    ? s.dx
        .map(
          (d) => `<div class="dx ${tono(d.lvl)}"><h3>${esc(d.title)}</h3><div class="codes">${d.codes.map((c) => `<span>${esc(c)}</span>`).join("")}</div><p>${esc(d.text)}</p>${
            d.bullets.length ? `<ul>${d.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""
          }</div>`
        )
        .join("")
    : `<div class="flag ok">✓ ${esc(EAPI_SIN_DX)}</div>`
}
<h2>GAD-7 (últimas 2 semanas)</h2>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Punt.</th></tr></thead><tbody>
${GAD7.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td><strong>${r.gad[i]}</strong></td></tr>`).join("")}
<tr><td></td><td>Repercusión funcional (no suma al total)</td><td><strong>${r.func == null ? "—" : r.func}</strong></td></tr>
<tr class="total"><td></td><td><strong>Total</strong> · 0–4 mínima, 5–9 leve, 10–14 moderada, 15–21 grave · cribado positivo ≥ 10</td><td><strong>${s.gad.total}</strong>${bar(s.gad.total, 21, s.gad.band.k)}</td></tr>
</tbody></table>
<h2>DASS-21 (última semana)</h2>
<table><thead><tr><th>Subescala</th><th>Ítems</th><th>Bruta</th><th>×2 (DASS-42)</th><th>Banda</th></tr></thead><tbody>
${(Object.keys(DASS_SUB) as (keyof typeof DASS_SUB)[])
  .map((k) => {
    const v = s.dass[k];
    return `<tr><td><strong>${esc(v.name)}</strong></td><td>${DASS_SUB[k].items.join(", ")}</td><td>${v.raw} / 21</td><td>${v.x2} / 42${bar(v.x2, 42, v.band.k)}</td><td>${pill(v.band)}</td></tr>`;
  })
  .join("")}
</tbody></table>
<p class="muted">Bandas sobre la puntuación ×2 — Depresión: 0–9 normal, 10–13 leve, 14–20 moderado, 21–27 severo, ≥ 28 extremadamente severo. Ansiedad: 0–7, 8–9, 10–14, 15–19, ≥ 20. Estrés: 0–14, 15–18, 19–25, 26–33, ≥ 34.</p>
<div class="sub">Respuestas ítem por ítem del DASS-21</div>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Sub.</th><th>Punt.</th></tr></thead><tbody>
${DASS21.map((t, i) => {
  const k = (Object.keys(DASS_SUB) as (keyof typeof DASS_SUB)[]).find((c) => (DASS_SUB[c].items as readonly number[]).includes(i + 1))!;
  return `<tr${(i === 9 || i === 20) && r.dass[i] >= 2 ? ' class="alarma"' : ""}><td>${i + 1}</td><td>${esc(t)}</td><td>${DASS_SUB[k].name.slice(0, 3)}</td><td><strong>${r.dass[i]}</strong></td></tr>`;
}).join("")}
</tbody></table>
<h2>PTQ · Pensamiento negativo repetitivo (rasgo)</h2>
<table><thead><tr><th>Escala</th><th>Ítems</th><th>Puntuación</th></tr></thead><tbody>
${(Object.keys(PTQ_SUB) as (keyof typeof PTQ_SUB)[])
  .map((k) => `<tr><td>${esc(s.ptq.sub[k].name)}</td><td>${PTQ_SUB[k].items.join(", ")}</td><td>${s.ptq.sub[k].sum} / ${s.ptq.sub[k].max}${bar(s.ptq.sub[k].sum, s.ptq.sub[k].max)}</td></tr>`)
  .join("")}
<tr class="total"><td><strong>Total</strong></td><td>1–15</td><td><strong>${s.ptq.total} / 60</strong>${bar(s.ptq.total, 60, s.ptq.band.k)} ${pill(s.ptq.band)}</td></tr>
</tbody></table>
<p class="muted">Sin puntos de corte validados. Referencias orientativas: media no clínica ≈ 22 (versión española) a 28 (estudio original); media clínica ≈ 37. Las subescalas provienen del estudio original; la versión mexicana apoya una estructura unidimensional, por lo que el total es la puntuación principal.</p>
<div class="sub">Respuestas ítem por ítem del PTQ</div>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Punt.</th></tr></thead><tbody>
${PTQ.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td><strong>${r.ptq[i]}</strong></td></tr>`).join("")}
</tbody></table>`;

  if (s.docs && r.docs) {
    html += `<h2>DOCS · Síntomas obsesivo-compulsivos (último mes)</h2>
<table><thead><tr><th>Dimensión</th><th>Tiempo</th><th>Evit.</th><th>Malestar</th><th>Interf.</th><th>Control</th><th>Suma</th></tr></thead><tbody>
${s.docs.dims
  .map(
    (d, i) =>
      `<tr><td><strong>${esc(d.short)}</strong><div class="muted">${esc(DOCS[i].name)}</div></td>${r
        .docs!.slice(i * 5, i * 5 + 5)
        .map((v) => `<td>${v}</td>`)
        .join("")}<td><strong>${d.sum}</strong> / 20${bar(d.sum, 20, d.sum >= 8 ? "mid" : "")}</td></tr>`
  )
  .join("")}
<tr class="total"><td colspan="6"><strong>Total</strong> · cortes: ≥ 18 frente a sin diagnóstico; ≥ 21 frente a otros trastornos de ansiedad</td><td><strong>${s.docs.total}</strong> / 80 <span class="pill ${s.docs.band.k}">${esc(s.docs.band.long ?? s.docs.band.label)}</span></td></tr>
</tbody></table>`;
  }

  html += `<h2>Ítem de seguridad (PHQ-9, ítem 9 · últimas 2 semanas)</h2>
<div class="flag ${r.safety >= 1 ? "alarma" : "ok"}"><b>${r.safety >= 1 ? "!" : "✓"}</b> ${esc(SAFETY.t)}: <strong>${r.safety} · ${esc(GAD_LABELS[r.safety])}</strong>${
    r.safety >= 1 ? " — Al enviar, al paciente se le mostraron las líneas de ayuda." : ""
  }</div>`;

  if (anterior) {
    const filas = seguimientoEapi(r, anterior.datos);
    html += `<h2>Seguimiento: comparación con la aplicación anterior</h2>
<p class="muted">Anterior: ${esc(fechaLarga(anterior.fecha))}</p>
<table><thead><tr><th>Medida</th><th>Antes</th><th>Ahora</th><th>Cambio</th><th>Nota</th></tr></thead><tbody>
${filas
  .map(
    (f) =>
      `<tr><td>${esc(f.name)}</td><td>${f.before}</td><td>${f.after}</td><td><strong class="${f.delta < 0 ? "baja" : f.delta > 0 ? "sube" : ""}">${f.delta > 0 ? "+" : ""}${f.delta}</strong></td><td class="muted">${esc(f.note)}</td></tr>`
  )
  .join("")}
</tbody></table>
<p class="muted">Para el GAD-7, un cambio de 4 puntos o más se considera la diferencia mínima clínicamente importante (Toussaint et al., 2020). Para DASS-21 y PTQ se informa el cambio de banda y la dirección; no existen MCID consolidados.</p>`;
  }

  if (r.abierta) html += `<h2>Comentario del paciente</h2><p class="cita">${esc(r.abierta)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">${esc(avisoEapi(Boolean(s.docs)))}</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EAPI · ${esc(a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}
.muted{color:#64748b;font-size:12.5px}.sub{font-weight:600;margin:12px 0 6px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}tr.total td{background:#f8fafc}tr.alarma td{background:#fee2e2}
.bar{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%;background:#0d9488}.bar i.mid{background:#d97706}.bar i.high{background:#dc2626}
.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:11.5px;font-weight:700}.pill.low{background:#dcfce7;color:#166534}.pill.mid{background:#fef3c7;color:#92400e}.pill.high{background:#fee2e2;color:#991b1b}
.flag{padding:9px 12px;border-radius:8px;margin:6px 0;font-size:13px;border:1px solid #e2e8f0}.flag.alarma{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d}
.flag.regla{background:#fef3c7;border-color:#fcd34d;color:#78350f}.flag.ok{background:#f0fdf4;border-color:#bbf7d0}.flag.neutra{background:#f0f9ff;border-color:#bae6fd}
.dx{border-left:4px solid #0ea5e9;background:#f8fafc;padding:10px 12px;margin:8px 0;border-radius:0 8px 8px 0}.dx.alarma{border-left-color:#dc2626}.dx.regla{border-left-color:#d97706}
.dx p{margin:4px 0}.dx ul{margin:4px 0;padding-left:18px}.codes{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}.codes span{background:#e2e8f0;border-radius:6px;padding:1px 7px;font-size:11.5px}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:14px 0}.kpi>div{background:#f8fafc;border-radius:8px;padding:10px}
.kpi .v{font-size:22px;font-weight:700}.kpi .v small{font-size:12px;color:#64748b}.kpi .l{font-size:11.5px;color:#64748b}.rojo{color:#b91c1c}
strong.baja{color:#15803d}strong.sube{color:#b91c1c}.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}
.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.dx{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
