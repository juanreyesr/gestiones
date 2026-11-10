/** Informe clínico del MCEA (HTML autónomo, imprimible; uso exclusivo del profesional). Port del original. */
import { INS, MCEA_VERSION, RS, type ModuloId } from "./contenido";
import type { MceaDatos } from "./codigo";
import { A, CLS, compare, hypotheses, itemsCriticos, nombreModulo, rng, routing, scoreAll, textoFoco, validity } from "./motor";

export type AplicacionMcea = { datos: MceaDatos; nombre: string; fecha: string; minutos?: number | null };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const pill = (lvl: number | "n", t: string) => `<span class="pill l${lvl}">${esc(t)}</span>`;
const r1 = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
const RIESGO: Record<string, string> = { no: "No", duda: "No está seguro(a)", si: "Sí" };

export function informeMceaHtml(a: AplicacionMcea, anterior?: AplicacionMcea | null, notasPrivadas = "") {
  const d = a.datos;
  const sc = scoreAll(d);
  const R = routing(d);
  const fl = validity(d, d.estado === "detenida");
  const hy = hypotheses(d, sc);
  const i9 = A(d, "PHQ9_9") ?? 0;
  const crit = itemsCriticos(d, sc);
  const tr = d.tr && !("skip" in d.tr) ? d.tr : null;

  let html = `<span class="eyebrow">Informe clínico · uso exclusivo del terapeuta</span>
<h1>Mapa Cognitivo-Emocional Adaptativo (MCEA)</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong> · ${esc(fechaLarga(a.fecha))} · ${Object.keys(d.answers).length} respuestas${a.minutos ? ` · ${a.minutos} min` : ""} · modo ${d.modo === "full" ? "completo" : "adaptativo"} · batería v${esc(d.version || MCEA_VERSION)}${d.estado === "detenida" ? " · <b>detenida</b>" : ""}</p>`;

  html +=
    i9 >= 1
      ? `<div class="alert"><h3>Alerta de riesgo</h3><p>PHQ-9 ítem 9 = ${i9} («${esc(RS.phq[i9])}»). Respuesta a «¿Siente que hoy podría hacerse daño?»: <b>${esc(RIESGO[d.risk.self ?? ""] ?? "sin respuesta")}</b>.</p><p class="small">Registre la atención con «Marcar como atendida» en el expediente antes de enviar el informe al paciente.</p></div>`
      : `<div class="note">Riesgo: sin indicadores en el ítem 9 del PHQ-9. Esto no sustituye la valoración clínica.</div>`;

  if (fl.length) html += `<h2>Validez de la aplicación</h2><ul>${fl.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

  html += `<h2>Puntuaciones</h2><table><thead><tr><th>Escala</th><th>Puntaje</th><th>Nivel</th><th>Tipo y fuente</th></tr></thead><tbody>${Object.keys(sc)
    .map((id) => {
      const s = sc[id];
      const I = INS[id as ModuloId];
      const tipo = !I ? "Validado. Primeros 2 ítems del GAD-7. Corte ≥3." : `${I.kind === "val" ? "Validado. " : "Experimental. "}${I.src ?? ""}`;
      return `<tr><td><b>${esc(nombreModulo(id))}</b></td><td>${s.raw} / ${s.max}<div class="bar l${s.lvl}"><i style="width:${Math.round((100 * s.raw) / s.max)}%"></i></div></td><td>${pill(s.lvl, s.label)}</td><td class="small muted">${esc(tipo)}</td></tr>`;
    })
    .join("")}</tbody></table>`;

  const perfiles = Object.keys(sc).filter((id) => sc[id].subs);
  if (perfiles.length)
    html += `<h2>Perfil por subescala</h2>${perfiles
      .map(
        (id) =>
          `<p><b>${esc(nombreModulo(id))}</b></p>${Object.entries(sc[id].subs!)
            .map(
              ([n, v]) =>
                `<div class="fila l${v.lvl}"><span class="nom">${esc(n)}</span><div class="bar"><i style="width:${Math.round((100 * v.raw) / v.max)}%"></i></div><span class="val">${v.raw}/${v.max}</span></div>`
            )
            .join("")}`
      )
      .join("")}<p class="small muted">Subescalas experimentales de 2 a 3 ítems: orientan la exploración, no se interpretan de forma aislada.</p>`;

  if (crit.length)
    html += `<h2>Ítems con respuesta alta</h2><table><tbody>${crit.map((c) => `<tr><td class="small muted">${esc(c[0])}</td><td>${esc(c[1])}</td><td class="small">${esc(c[2])}</td></tr>`).join("")}</tbody></table>`;

  html += `<h2>Motivo declarado</h2><p>${d.focus.length ? d.focus.map((f) => esc(textoFoco(f))).join(" · ") : "No indicó"}</p>`;

  if (tr)
    html += `<h2>Registro guiado</h2><div class="map"><div><b>Situación</b>${esc(tr.sit || "—")}</div><div><b>Emoción</b>${esc(tr.emo.join(", ") || "—")} · intensidad ${tr.int}/100</div><div><b>Pensamiento automático</b>${esc(tr.pen || "—")}</div><div><b>Flecha descendente</b>${esc(tr.f1 || "—")} → ${esc(tr.f2 || "—")}</div><div><b>Conducta</b>${esc(tr.beh.join(", ") || "—")}</div><div><b>Distorsiones que reconoce</b>${esc(tr.dis.join(", ") || "Ninguna marcada")}</div></div>`;

  html += `<h2>Hipótesis para explorar</h2><ul>${hy.H.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="small muted">Generadas por reglas fijas a partir de los puntajes. Son puntos de partida para la entrevista, no conclusiones.</p>`;
  if (hy.S.length) html += `<h2>Evaluación adicional sugerida</h2><ul>${hy.S.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

  html += `<h2>Por qué se abrió cada módulo</h2><table><tbody>${Object.keys(R)
    .map((id) => `<tr><td><b>${esc(nombreModulo(id))}</b></td><td>${R[id].open ? pill(0, "Abierto") : pill("n", "No abierto")}</td><td class="small">${esc(R[id].reasons.join("; ") || "No alcanzó el umbral")}</td></tr>`)
    .join("")}</tbody></table>`;

  if (anterior) {
    const c = compare(anterior.datos, d);
    html += `<h2>Comparación con la aplicación anterior</h2><p class="muted">${esc(fechaLarga(anterior.fecha))} → ${esc(fechaLarga(a.fecha))}</p>
<table><thead><tr><th>Escala</th><th>T1</th><th>T2</th><th>Cambio</th><th>Mín. fiable</th><th>Clasificación</th></tr></thead><tbody>${c.rows
      .map((r) => `<tr><td><b>${esc(INS[r.id].name)}</b></td><td>${r.t1.raw}</td><td>${r.t2.raw}</td><td>${r.d > 0 ? "+" : ""}${r.d}</td><td>${r.m ? r1(r.m.v) : "—"}</td><td>${pill(CLS[r.cls][1], CLS[r.cls][0])}</td></tr>`)
      .join("")}</tbody></table>
<ul class="small"><li>Índice de Cambio Fiable (Jacobson y Truax, 1991): cambio mínimo fiable = 1,96 × DE × √(2 × (1 − fiabilidad)).</li><li>«Recuperado» exige además pasar de estar en o sobre el punto de corte a estar por debajo.</li>${c.rows
      .filter((r) => r.m)
      .map((r) => `<li>${esc(INS[r.id].name)}: ${esc(r.m!.src)}.</li>`)
      .join("")}${c.rows.some((r) => !r.m) ? "<li>Las escalas «sin norma» son experimentales: se muestra el cambio bruto.</li>" : ""}${c.skipped.length ? `<li>No comparables por no haberse aplicado en ambas fechas: ${esc(c.skipped.join(", "))}.</li>` : ""}</ul>`;
  }

  html += `<details><summary>Mostrar respuestas ítem por ítem (${Object.keys(d.answers).length})</summary><table><tbody>${(Object.keys(INS) as ModuloId[])
    .flatMap((id) =>
      rng(INS[id].items.length)
        .filter((i) => d.answers[`${id}_${i}`])
        .map((i) => {
          const v = d.answers[`${id}_${i}`].v;
          return `<tr><td class="small muted">${esc(INS[id].name)}</td><td>${esc(INS[id].items[i - 1])}</td><td><b>${v}</b> <span class="small muted">${esc(RS[INS[id].rs][v])}</span></td></tr>`;
        })
    )
    .join("")}</tbody></table></details>`;

  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">Alcance: tamizaje autoaplicado. No establece diagnóstico. Las escalas experimentales no tienen normas; sus niveles se basan en el anclaje de respuesta (media ≥ «A veces» = moderado, ≥ «A menudo» = alto). Batería MCEA v${esc(MCEA_VERSION)} (M. A. Juan J. Reyes).</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCEA · ${esc(a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#18242d;background:#fff}
h1{font-size:20px;margin:2px 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}
.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5a6873;font-weight:600}
.muted{color:#5a6873;font-size:12.5px}.small{font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5a6873}
.pill{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:600;border:1px solid currentColor;white-space:nowrap}
.l0{color:#2f7a5b}.l1{color:#a9861a}.l2{color:#b8611f}.l3{color:#a3302b}.ln{color:#5a6873}
.bar{height:7px;background:#eef2f5;border-radius:99px;overflow:hidden;margin-top:4px;flex:1;min-width:80px}.bar i{display:block;height:100%;background:currentColor}
td .bar{color:#1d4e6b}.fila{display:flex;align-items:center;gap:8px;margin:4px 0}.fila .nom{width:190px;font-size:12.5px;color:#18242d}.fila .val{width:44px;text-align:right;font-size:12px;color:#18242d}
.alert{border:1px solid #a3302b;background:#fbeceb;border-radius:8px;padding:12px;margin:12px 0}.note{border-left:4px solid #1d4e6b;background:#e2ebf1;padding:10px 12px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13px}
.map{display:grid;gap:6px}.map div{border:1px solid #e2e8f0;border-radius:8px;padding:8px}.map b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5a6873}
details{margin-top:18px}summary{cursor:pointer;display:inline-block;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;font-size:13px;color:#1d4e6b;background:#f8fafc}
.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#5a6873}
ul{padding-left:20px}@media print{body{padding:0}h2{break-after:avoid}tr,.alert,.map div{break-inside:avoid}details:not([open]){display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
