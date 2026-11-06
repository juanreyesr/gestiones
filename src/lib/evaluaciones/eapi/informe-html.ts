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
  evolucionEapi,
  TEXTO_TENDENCIA,
  type Tendencia,
  NOMBRES_MODULOS,
  SIGLAS_EAPI,
  type Banda,
  type EapiDatos,
  type ModuloEapi,
} from "./calificacion";
import { DASS21, DOCS, EAPI_NOMBRE_PROFESIONAL, GAD7, GAD_LABELS, PTQ, SAFETY } from "./escalas";

/** origen: fecha de cada escala cuando la aplicación une varias respuestas. */
export type AplicacionEapi = { datos: EapiDatos; nombre: string; fecha: string; origen?: Partial<Record<ModuloEapi, string>> | null };

const TEXTOS_ITEM: Record<ModuloEapi, (i: number) => string> = {
  gad: (i) => GAD7[i],
  dass: (i) => DASS21[i],
  ptq: (i) => PTQ[i],
  docs: (i) => `${DOCS[Math.floor(i / 5)].short}: ${DOCS[Math.floor(i / 5)].q[i % 5].t}`,
};
const CLASE_TENDENCIA = { mejora: "baja", igual: "", empeora: "sube", mixto: "" } as const;
const flecha = (t: Tendencia) => (t === "mejora" ? "↓ Mejora" : t === "empeora" ? "↑ Empeora" : "= Igual");

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

/** Deja solo un módulo (informe separado); la pregunta de seguridad se conserva. */
export function soloModuloEapi(datos: EapiDatos, m: ModuloEapi): EapiDatos {
  return { ...datos, gad: null, dass: null, ptq: null, docs: null, [m]: datos[m], func: m === "gad" ? datos.func : null };
}

/**
 * @param a aplicación a informar (puede ser la unión de varias: ver unirEapi).
 * @param origen fecha de respuesta de cada módulo cuando el informe une varias aplicaciones.
 */
export function informeEapiHtml(
  a: AplicacionEapi,
  anterior?: AplicacionEapi | null,
  notasPrivadas = "",
  origen?: Partial<Record<ModuloEapi, string>> | null
) {
  const r = a.datos;
  const s = calificarEapi(r);
  const alertas = s.flags.filter((f) => f.lvl === "alert").length;
  const sig = (m: ModuloEapi) => NOMBRES_MODULOS[m].sigla;
  const titulo =
    s.modulos.length === 1 ? `${NOMBRES_MODULOS[s.modulos[0]].completo}` : `${EAPI_NOMBRE_PROFESIONAL} (EAPI)`;
  const kpis: string[] = [];
  if (s.gad) kpis.push(`<div><div class="v">${s.gad.total}<small>/21</small></div><div class="l">GAD-7 · ${pill(s.gad.band)}</div></div>`);
  if (s.dass) {
    kpis.push(`<div><div class="v">${s.dass.anx.x2}<small>/42</small></div><div class="l">DASS-21 Ansiedad · ${pill(s.dass.anx.band)}</div></div>`);
    kpis.push(`<div><div class="v">${s.dass.str.x2}<small>/42</small></div><div class="l">DASS-21 Estrés · ${pill(s.dass.str.band)}</div></div>`);
    kpis.push(`<div><div class="v">${s.dass.dep.x2}<small>/42</small></div><div class="l">DASS-21 Depresión · ${pill(s.dass.dep.band)}</div></div>`);
  }
  if (s.ptq) kpis.push(`<div><div class="v">${s.ptq.total}<small>/60</small></div><div class="l">PTQ · ${pill(s.ptq.band)}</div></div>`);
  if (s.docs) kpis.push(`<div><div class="v">${s.docs.total}<small>/80</small></div><div class="l">DOCS · ${pill(s.docs.band)}</div></div>`);
  kpis.push(`<div><div class="v ${alertas ? "rojo" : ""}">${alertas}</div><div class="l">Señales de alarma</div></div>`);

  // Primera mención: nombre completo de cada instrumento con la sigla que se usa después.
  const instrumentos = `<h2>Instrumentos aplicados</h2>
<ul class="lista">${s.modulos
    .map(
      (m) =>
        `<li><strong>${esc(NOMBRES_MODULOS[m].completo)}</strong>: ${esc(NOMBRES_MODULOS[m].mide)}.${
          origen?.[m] ? ` <span class="muted">Respondido el ${esc(fechaLarga(origen[m]!))}.</span>` : ""
        }</li>`
    )
    .join("")}
<li><strong>Pregunta de seguridad</strong>, tomada del ítem 9 del Cuestionario de Salud del Paciente de 9 ítems (PHQ-9, por sus siglas en inglés): pensamientos de muerte o de hacerse daño en las últimas 2 semanas. Se aplica siempre.</li></ul>`;

  let html = `<h2>Señales de alarma y observaciones</h2>
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
}`;

  if (s.gad && r.gad) {
    const g = r.gad;
    html += `<h2>${sig("gad")} (últimas 2 semanas)</h2>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Punt.</th></tr></thead><tbody>
${GAD7.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td><strong>${g[i]}</strong></td></tr>`).join("")}
<tr><td></td><td>Repercusión funcional (no suma al total)</td><td><strong>${r.func == null ? "—" : r.func}</strong></td></tr>
<tr class="total"><td></td><td><strong>Total</strong> · 0–4 mínima, 5–9 leve, 10–14 moderada, 15–21 grave · cribado positivo ≥ 10</td><td><strong>${s.gad.total}</strong>${bar(s.gad.total, 21, s.gad.band.k)}</td></tr>
</tbody></table>`;
  }

  if (s.dass && r.dass) {
    const dassR = s.dass;
    const items = r.dass;
    html += `<h2>${sig("dass")} (última semana)</h2>
<table><thead><tr><th>Subescala</th><th>Ítems</th><th>Bruta</th><th>×2 (equivale a la versión de 42 ítems)</th><th>Banda</th></tr></thead><tbody>
${(Object.keys(DASS_SUB) as (keyof typeof DASS_SUB)[])
  .map((k) => {
    const v = dassR[k];
    return `<tr><td><strong>${esc(v.name)}</strong></td><td>${DASS_SUB[k].items.join(", ")}</td><td>${v.raw} / 21</td><td>${v.x2} / 42${bar(v.x2, 42, v.band.k)}</td><td>${pill(v.band)}</td></tr>`;
  })
  .join("")}
</tbody></table>
<p class="muted">Bandas sobre la puntuación ×2 — Depresión: 0–9 normal, 10–13 leve, 14–20 moderado, 21–27 severo, ≥ 28 extremadamente severo. Ansiedad: 0–7, 8–9, 10–14, 15–19, ≥ 20. Estrés: 0–14, 15–18, 19–25, 26–33, ≥ 34.</p>
<div class="sub">Respuestas ítem por ítem del ${sig("dass")}</div>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Sub.</th><th>Punt.</th></tr></thead><tbody>
${DASS21.map((t, i) => {
  const k = (Object.keys(DASS_SUB) as (keyof typeof DASS_SUB)[]).find((c) => (DASS_SUB[c].items as readonly number[]).includes(i + 1))!;
  return `<tr${(i === 9 || i === 20) && items[i] >= 2 ? ' class="alarma"' : ""}><td>${i + 1}</td><td>${esc(t)}</td><td>${DASS_SUB[k].name.slice(0, 3)}</td><td><strong>${items[i]}</strong></td></tr>`;
}).join("")}
</tbody></table>`;
  }

  if (s.ptq && r.ptq) {
    const p = s.ptq;
    const items = r.ptq;
    html += `<h2>${sig("ptq")} · Pensamiento negativo repetitivo (rasgo)</h2>
<table><thead><tr><th>Escala</th><th>Ítems</th><th>Puntuación</th></tr></thead><tbody>
${(Object.keys(PTQ_SUB) as (keyof typeof PTQ_SUB)[])
  .map((k) => `<tr><td>${esc(p.sub[k].name)}</td><td>${PTQ_SUB[k].items.join(", ")}</td><td>${p.sub[k].sum} / ${p.sub[k].max}${bar(p.sub[k].sum, p.sub[k].max)}</td></tr>`)
  .join("")}
<tr class="total"><td><strong>Total</strong></td><td>1–15</td><td><strong>${p.total} / 60</strong>${bar(p.total, 60, p.band.k)} ${pill(p.band)}</td></tr>
</tbody></table>
<p class="muted">Sin puntos de corte validados. Referencias orientativas: media no clínica ≈ 22 (versión española) a 28 (estudio original); media clínica ≈ 37. Las subescalas provienen del estudio original; la versión mexicana apoya una estructura unidimensional, por lo que el total es la puntuación principal.</p>
<div class="sub">Respuestas ítem por ítem del ${sig("ptq")}</div>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Punt.</th></tr></thead><tbody>
${PTQ.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td><strong>${items[i]}</strong></td></tr>`).join("")}
</tbody></table>`;
  }

  if (s.docs && r.docs) {
    const items = r.docs;
    html += `<h2>${sig("docs")} · Síntomas obsesivo-compulsivos (último mes)</h2>
<table><thead><tr><th>Dimensión</th><th>Tiempo</th><th>Evit.</th><th>Malestar</th><th>Interf.</th><th>Control</th><th>Suma</th></tr></thead><tbody>
${s.docs.dims
  .map(
    (d, i) =>
      `<tr><td><strong>${esc(d.short)}</strong><div class="muted">${esc(DOCS[i].name)}</div></td>${items
        .slice(i * 5, i * 5 + 5)
        .map((v) => `<td>${v}</td>`)
        .join("")}<td><strong>${d.sum}</strong> / 20${bar(d.sum, 20, d.sum >= 8 ? "mid" : "")}</td></tr>`
  )
  .join("")}
<tr class="total"><td colspan="6"><strong>Total</strong> · cortes: ≥ 18 frente a sin diagnóstico; ≥ 21 frente a otros trastornos de ansiedad</td><td><strong>${s.docs.total}</strong> / 80 <span class="pill ${s.docs.band.k}">${esc(s.docs.band.long ?? s.docs.band.label)}</span></td></tr>
</tbody></table>`;
  }

  html += `<h2>Pregunta de seguridad (PHQ-9, ítem 9 · últimas 2 semanas)</h2>
<div class="flag ${r.safety >= 1 ? "alarma" : "ok"}"><b>${r.safety >= 1 ? "!" : "✓"}</b> ${esc(SAFETY.t)}: <strong>${r.safety} · ${esc(GAD_LABELS[r.safety])}</strong>${
    r.safety >= 1 ? " — Al enviar, al paciente se le mostraron las líneas de ayuda." : ""
  }</div>`;

  // Evolución: resumen arriba (después de las puntuaciones) y detalle ítem por ítem aquí.
  let evolucion = "";
  if (anterior) {
    const ev = evolucionEapi(r, anterior.datos);
    const fechasAnt = anterior.origen
      ? ev.modulos.map((m) => `${NOMBRES_MODULOS[m].sigla}: ${fechaLarga(anterior.origen?.[m] ?? anterior.fecha)}`).join(" · ")
      : fechaLarga(anterior.fecha);
    if (!ev.modulos.length) {
      evolucion = `<h2>Evolución desde la evaluación anterior</h2><div class="flag neutra">• La evaluación anterior (${esc(fechasAnt)}) no tiene escalas en común con esta; no hay comparación posible.</div>`;
    } else {
      evolucion = `<h2>Evolución desde la evaluación anterior</h2>
<p class="muted">Anterior: ${esc(fechasAnt)}. Se comparan solo las escalas presentes en ambas. En todas, una puntuación más baja indica menos síntomas.</p>
<div class="evol ${CLASE_TENDENCIA[ev.global]}"><strong>${esc(TEXTO_TENDENCIA[ev.global])}</strong> · Ítems: ${ev.resumenItems.mejora} mejoran, ${ev.resumenItems.igual} siguen igual, ${ev.resumenItems.empeora} empeoran${
        ev.seguridad.tendencia === "empeora" ? ` · <b class="sube">La pregunta de seguridad subió (${ev.seguridad.antes} → ${ev.seguridad.ahora}): reevaluar riesgo</b>` : ""
      }</div>
<table><thead><tr><th>Escala</th><th>Antes</th><th>Ahora</th><th>Cambio</th><th>Banda</th><th>Resultado</th></tr></thead><tbody>
${ev.escalas
  .map(
    (e) =>
      `<tr><td>${esc(e.nombre)}<div class="muted">${esc(e.criterio)}</div></td><td>${e.antes}</td><td>${e.ahora}</td><td><strong class="${e.delta < 0 ? "baja" : e.delta > 0 ? "sube" : ""}">${e.delta > 0 ? "+" : ""}${e.delta}</strong></td><td class="muted">${
        e.bandaAntes === e.bandaAhora ? esc(e.bandaAhora) : `${esc(e.bandaAntes)} → ${esc(e.bandaAhora)}`
      }</td><td><strong class="${CLASE_TENDENCIA[e.tendencia]}">${flecha(e.tendencia)}</strong></td></tr>`
  )
  .join("")}
<tr><td>Pregunta de seguridad</td><td>${ev.seguridad.antes}</td><td>${ev.seguridad.ahora}</td><td><strong class="${CLASE_TENDENCIA[ev.seguridad.tendencia]}">${ev.seguridad.ahora - ev.seguridad.antes > 0 ? "+" : ""}${ev.seguridad.ahora - ev.seguridad.antes}</strong></td><td></td><td><strong class="${CLASE_TENDENCIA[ev.seguridad.tendencia]}">${flecha(ev.seguridad.tendencia)}</strong></td></tr>
</tbody></table>
<p class="muted">Criterios: GAD-7, cambio de 4 puntos o más (diferencia mínima clínicamente importante, MCID; Toussaint et al., 2020); DASS-21, PTQ y DOCS, cambio de banda o rango, porque no tienen MCID consolidados. El detalle ítem por ítem está al final del informe.</p>`;
      html += `<h2>Evolución ítem por ítem</h2>
${ev.modulos
  .map((m) => {
    const filas = ev.items.filter((it) => it.modulo === m);
    return `<div class="sub">${esc(NOMBRES_MODULOS[m].sigla)} · ${filas.filter((f) => f.tendencia === "mejora").length} mejoran, ${filas.filter((f) => f.tendencia === "igual").length} igual, ${filas.filter((f) => f.tendencia === "empeora").length} empeoran</div>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>
${filas
  .map(
    (it) =>
      `<tr${it.tendencia === "empeora" ? ' class="empeora"' : it.tendencia === "mejora" ? ' class="mejora"' : ""}><td>${it.n}</td><td>${esc(TEXTOS_ITEM[m](it.n - 1))}</td><td>${it.antes}</td><td>${it.ahora}</td><td><strong class="${CLASE_TENDENCIA[it.tendencia]}">${it.delta > 0 ? "+" : ""}${it.delta}</strong></td></tr>`
  )
  .join("")}
</tbody></table>`;
  })
  .join("")}`;
    }
  }

  if (r.abierta) html += `<h2>Comentario del paciente</h2><p class="cita">${esc(r.abierta)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">${esc(avisoEapi(s.modulos))}</p>`;

  // Glosario: solo las siglas que aparecen en este informe.
  const siglas = SIGLAS_EAPI.filter(([sigla]) => sigla !== "PHQ-9" && (html + evolucion).includes(sigla));
  const glosario = siglas.length
    ? `<div class="glosario"><strong>Siglas usadas en este informe</strong><ul>${siglas
        .map(([sigla, significado]) => `<li><b>${esc(sigla)}</b>: ${esc(significado)}</li>`)
        .join("")}</ul></div>`
    : "";

  html = `<h1>Informe de calificación · ${esc(titulo)}</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${r.edad ? ` · Edad: ${r.edad}` : ""} · Fecha de respuesta: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))}</p>
${instrumentos}
${glosario}
<div class="kpi">${kpis.join("")}</div>
${evolucion}
${html}`;

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
strong.baja,b.baja{color:#15803d}strong.sube,b.sube{color:#b91c1c}tr.mejora td{background:#f0fdf4}tr.empeora td{background:#fef2f2}.evol{padding:10px 12px;border-radius:8px;margin:8px 0;border:1px solid #e2e8f0;background:#f8fafc}.evol.baja{background:#f0fdf4;border-color:#bbf7d0}.evol.sube{background:#fef2f2;border-color:#fecaca}.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}
.lista{margin:4px 0;padding-left:18px}.lista li{margin:3px 0}.glosario{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:12.5px}.glosario ul{margin:4px 0;padding-left:18px}
.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.dx{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
