/** Informe profesional de Intereses Vocacionales JJR (HTML autónomo, imprimible). Solo panel. */
import { BANCO_JJR, CAMPOS_PRINCIPALES, INFO_CAMPOS, NOMBRES_CAMPOS } from "./banco";
import {
  calificarJjr,
  JJR_CONTRASTE,
  JJR_ENCABEZADO,
  mediaTexto,
  seguimientoJjr,
  type CalificacionJjr,
} from "./calificacion";
import { JJR_ESCALA, JJR_PREGUNTAS_ABIERTAS, type JjrDatos } from "./codigo";

export type AplicacionJjr = { datos: JjrDatos; nombre: string; fecha: string; edad?: number | null };
/** Resultado RIASEC del mismo paciente (solo para contrastar hipótesis; no se convierte). */
export type RiasecParaJjr = { codigo: string; fecha: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const ESTADO: Record<string, string> = { completo: "Completo", parcial: "Parcial (5 de 6)", insuficiente: "Insuficiente (sin media)" };
const POR_ID = new Map(BANCO_JJR.map((i) => [i.id, i]));
const etiquetaValor = (v: JjrDatos["respuestas"][string]) =>
  v === null ? '<span class="muted">Sin respuesta</span>' : v === "NC" ? "<strong>NC</strong> <span class=\"muted\">no comprende</span>" : `<strong>${v}</strong> <span class="muted">${esc(JJR_ESCALA[v])}</span>`;

/** Letras RIASEC del código del paciente presentes en la hipótesis conceptual del campo. */
const coincidenciaRiasec = (hipotesis: string, codigo: string) =>
  hipotesis
    .split("/")
    .map((l) => l.trim())
    .filter((l) => codigo.slice(0, 3).includes(l));

export function informeJjrHtml(a: AplicacionJjr, anterior?: AplicacionJjr | null, notasPrivadas = "", riasec?: RiasecParaJjr | null) {
  const c = calificarJjr(a.datos);
  const investigacion = a.datos.instrumento === "JJR-INV-176";
  const titulo = investigacion
    ? `Intereses Vocacionales JJR Actualizada · banco ampliado de investigación (${a.datos.instrumento}, forma ${a.datos.forma})`
    : `Intereses Vocacionales JJR Actualizada (${a.datos.instrumento})`;
  let html = `<div class="exp"><strong>Experimental.</strong> ${esc(JJR_ENCABEZADO)}</div>
<h1>Informe · ${esc(titulo)}</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${a.edad ? ` · Edad: ${a.edad}` : ""} · Fecha: ${esc(fechaLarga(a.fecha))} · Versión ${esc(a.datos.version)} · Orden ${esc(a.datos.orden_id)} · Modo ${esc(a.datos.modo)} · Idioma ${esc(a.datos.idioma)}</p>`;
  if (a.edad !== null && a.edad !== undefined && a.edad < 16)
    html += `<div class="flag regla"><b>!</b> La población propuesta para el pilotaje es de 16 años o más; esta aplicación queda fuera de ese rango y requiere revisión específica.</div>`;
  html += `<div class="kpi">
  <div><div class="v">${c.conteo.numericas}<small>/${c.conteo.total}</small></div><div class="l">Respuestas numéricas (0–4)</div></div>
  <div><div class="v">${c.conteo.nc}</div><div class="l">«No comprendo» (NC)</div></div>
  <div><div class="v">${c.conteo.omitidas}</div><div class="l">Sin respuesta</div></div>
  <div><div class="v" style="font-size:16px">${c.perfilCompleto ? "Perfil completo" : "Perfil incompleto"}</div><div class="l">${investigacion ? (c.protocoloFormaCompleto ? "Forma completa (130 numéricas)" : "Forma incompleta") : "14 campos × 6 anclas"}</div></div>
</div>
<h2>Perfil por campo (orden fijo, sin ranking)</h2>
<table><thead><tr><th>Campo</th><th>Media 0–4</th><th>Respondidas</th><th>NC</th><th>Omit.</th><th>Estado</th></tr></thead><tbody>
${c.campos
  .map(
    (k) =>
      `<tr><td><strong>${esc(k.campo)}</strong> ${esc(k.nombre)}</td><td>${k.estado === "insuficiente" ? "—" : `${mediaTexto(k.media)}${k.estado === "parcial" ? " <em>(parcial)</em>" : ""}<div class="bar"><i style="width:${(k.indice ?? 0).toFixed(1)}%;background:${k.estado === "parcial" ? "#94a3b8" : "#0d9488"}"></i></div>`}</td><td>${k.n_validas}/6</td><td>${k.n_no_comprende}</td><td>${k.n_omitidas}</td><td>${esc(ESTADO[k.estado])}</td></tr>`
  )
  .join("")}
</tbody></table>
<p class="muted">Media = promedio de las respuestas a las 6 actividades ancla del campo (0 «No me gustaría nada» … 4 «Me gustaría mucho»). Con 5 respuestas se muestra rotulada como parcial; con 4 o menos no se calcula. Una media de 3 significa respuestas próximas a «bastante», no interés alto respecto a otras personas: no hay normas, percentiles ni puntos de corte. No interpretar diferencias pequeñas entre campos como preferencias firmes (no hay error de medida estimado). Sin código tipo Holland, puntaje total ni compatibilidad con carreras.</p>
<h2>Observaciones</h2>`;
  const obs: string[] = [];
  if (!c.perfilCompleto) obs.push(`<div class="flag neutra"><b>•</b> Perfil incompleto: ${c.campos.filter((k) => k.estado !== "completo").map((k) => `${k.campo} (${k.estado})`).join(", ")}. Revisar con la persona las actividades no comprendidas o sin responder antes de interpretar el conjunto; no significa falta de vocación.</div>`);
  if (c.uniforme) obs.push(`<div class="flag neutra"><b>•</b> Perfil uniforme: todas las medias son iguales (${mediaTexto(c.campos[0].media)}). El cuestionario no diferenció preferencias entre campos. No inferir desinterés, apatía ni falta de sinceridad; puede requerir revisar contexto o comprensión.</div>`);
  if (c.conteo.nc >= 5) obs.push(`<div class="flag regla"><b>•</b> ${c.conteo.nc} actividades marcadas como «no comprendo»: revisar vocabulario y familiaridad (no es un fallo de la persona).</div>`);
  html += obs.length ? obs.join("") : `<div class="flag ok">✓ Perfil completo y con diferencias entre campos (descriptivas).</div>`;

  html += `<h2>Campos: definición, límite y rutas ilustrativas</h2>
<p class="muted">Propuestas editoriales del instrumento. Las letras RIASEC (Realista, Investigador, Artístico, Social, Emprendedor, Convencional) son hipótesis de relación conceptual para revisión, no puntuaciones convertibles.${riasec ? ` Código RIASEC del paciente (${esc(fechaLarga(riasec.fecha))}): <strong>${esc(riasec.codigo)}</strong>; se marca solo dónde coincide la hipótesis, sin convertir resultados.` : ""}</p>
${CAMPOS_PRINCIPALES.map((campo) => {
  const k = c.campos.find((x) => x.campo === campo)!;
  const info = INFO_CAMPOS[campo];
  const coinc = riasec ? coincidenciaRiasec(info.riasec, riasec.codigo) : [];
  return `<div class="tipo"><h3>${esc(campo)} · ${esc(NOMBRES_CAMPOS[campo].nombre)} <small>(media ${mediaTexto(k.media)} · ${k.n_validas}/6)</small></h3><p>${esc(info.definicion)}</p><p class="muted"><strong>Límite:</strong> ${esc(info.limite)} · <strong>Relación conceptual:</strong> ${esc(info.riasec)}${riasec ? (coinc.length ? ` (coincide con ${coinc.join(", ")} de su código)` : " (sin coincidencia con su código)") : ""}</p><p class="muted"><strong>Rutas ilustrativas:</strong> ${esc(info.rutas)}</p></div>`;
}).join("")}
<p class="muted">${esc(JJR_CONTRASTE)} Registrar qué actividad se probó y si cambió el interés, como información adicional (no corrige el puntaje).</p>`;

  if (anterior) {
    const ca = calificarJjr(anterior.datos);
    const s = seguimientoJjr(c, ca);
    html += `<h2>Seguimiento: aplicación anterior del mismo protocolo</h2>
<p class="muted">Anterior: ${esc(fechaLarga(anterior.fecha))} · misma versión (${esc(anterior.datos.version)})${investigacion ? ` y forma ${esc(anterior.datos.forma)}` : ""}. Comparación descriptiva: sin error de medida estimado, ningún cambio se califica como real.</p>
<table><thead><tr><th>Campo</th><th>Antes</th><th>Ahora</th><th>Diferencia</th></tr></thead><tbody>
${s.map((f) => `<tr><td>${esc(f.campo)} ${esc(f.nombre)}</td><td>${mediaTexto(f.antes)}</td><td>${mediaTexto(f.ahora)}</td><td>${f.cambio === null ? "—" : `${f.cambio > 0 ? "+" : ""}${f.cambio.toFixed(2).replace(".", ",")}`}</td></tr>`).join("")}
</tbody></table>`;
  }

  if (investigacion) {
    const lista = (grupos: CalificacionJjr["candidatos"]) =>
      grupos
        .map((g) => `<tr><td colspan="3" class="grupo">${esc(g.campo)} · ${esc(g.nombre)}</td></tr>${g.items.map((i) => `<tr><td>${esc(i.id)}</td><td>${esc(i.actividad)}</td><td>${etiquetaValor(i.valor)}</td></tr>`).join("")}`)
        .join("");
    html += `<h2>Candidatos nuevos de los campos principales (no puntúan)</h2>
<p class="muted">Se incluyen ${c.candidatos.reduce((n, g) => n + g.items.length, 0)} actividades candidatas de la forma ${esc(a.datos.forma)}. No forman parte de la media del campo: su inclusión alteraría la fórmula y la comparabilidad.</p>
<table><thead><tr><th>ID</th><th>Actividad</th><th>Respuesta</th></tr></thead><tbody>${lista(c.candidatos)}</tbody></table>
<h2>Áreas exploratorias (sin puntaje ni ranking)</h2>
<p class="muted">Turismo y hospitalidad, deporte, artes escénicas, trabajo con animales, servicios personales y producción agropecuaria: respuestas individuales como temas de conversación, no resultados de una escala.</p>
<table><thead><tr><th>ID</th><th>Actividad</th><th>Respuesta</th></tr></thead><tbody>${lista(c.exploratorias)}</tbody></table>`;
  }

  html += `<h2>Respuestas ítem por ítem (orden mostrado)</h2>
<table><thead><tr><th>N.º</th><th>ID</th><th>Actividad</th><th>Respuesta</th></tr></thead><tbody>
${a.datos.orden_ids
  .map((id, i) => {
    const it = POR_ID.get(id)!;
    return `<tr><td>${i + 1}</td><td>${esc(id)}${it.grupo !== "ancla" ? ` <span class="muted">${it.grupo === "candidato" ? "cand." : "expl."}</span>` : ""}</td><td>${esc(it.actividad)}</td><td>${etiquetaValor(a.datos.respuestas[id] ?? null)}</td></tr>`;
  })
  .join("")}
</tbody></table>`;
  if (a.datos.abiertas.otras) html += `<h2>${esc(JJR_PREGUNTAS_ABIERTAS.otras)} <small class="muted">(no puntúa)</small></h2><p class="cita">${esc(a.datos.abiertas.otras)}</p>`;
  if (a.datos.abiertas.noConocia) html += `<h2>${esc(JJR_PREGUNTAS_ABIERTAS.noConocia)} <small class="muted">(no puntúa)</small></h2><p class="cita">${esc(a.datos.abiertas.noConocia)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">Instrumento original en desarrollo (Lic. Juan J. Reyes), inspirado en la finalidad de los inventarios de intereses clásicos; no es el inventario de Thurstone ni una adaptación oficial y no hereda sus normas. Sin participantes, coeficientes, baremos ni validez demostrada. No usar para selección, diagnóstico, admisión, exclusión ni para recomendar una única carrera. Uso: pilotaje con consentimiento y devolución supervisada. NC = «no comprendo la actividad» y «sin respuesta» = omisión: ninguna puntúa ni se imputa.</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Intereses JJR · ${esc(a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}h3 small{color:#64748b;font-weight:400}
.muted{color:#64748b;font-size:12.5px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}td.grupo{background:#f1f5f9;font-weight:600;font-size:12px}
.bar{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%}
.exp{background:#fef3c7;border:1px solid #fcd34d;color:#78350f;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:13px}
.flag{padding:9px 12px;border-radius:8px;margin:6px 0;font-size:13px;border:1px solid #e2e8f0}
.flag.regla{background:#fef3c7;border-color:#fcd34d;color:#78350f}.flag.ok{background:#f0fdf4;border-color:#bbf7d0}.flag.neutra{background:#f0f9ff;border-color:#bae6fd}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:14px 0}.kpi>div{background:#f8fafc;border-radius:8px;padding:10px}
.kpi .v{font-size:22px;font-weight:700}.kpi .v small{font-size:12px;color:#64748b}.kpi .l{font-size:11.5px;color:#64748b}
.tipo{border-left:4px solid #0d9488;background:#f8fafc;padding:10px 12px;margin:8px 0;border-radius:0 8px 8px 0}.tipo p{margin:4px 0}
.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.tipo{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
