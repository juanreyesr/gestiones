/**
 * Informe de calificación del B-Breve como documento HTML autónomo (fondo
 * claro, una columna). Se muestra en el expediente dentro de un iframe y se
 * imprime o guarda como PDF desde ahí. Solo para el panel del psicólogo.
 */
import {
  B_BREVE_AVISO_INFORME,
  B_BREVE_SIN_REGLAS,
  B_BREVE_TOTAL_MAX,
  calificarBBreve,
  discrepanciaBBreve,
  seguimientoBBreve,
  type CalificacionBBreve,
} from "./calificacion";
import type { BBreveDatos } from "./codigo";
import { B_BREVE_ITEMS, B_BREVE_SEGURIDAD } from "./contenido";

export type AplicacionBBreve = {
  datos: BBreveDatos;
  nombre: string;
  relacion: string;
  fecha: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

const diasEntre = (a: string, b: string) => {
  const t = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`).getTime();
  if (!/^\d{4}-\d{2}-\d{2}/.test(a) || !/^\d{4}-\d{2}-\d{2}/.test(b)) return null;
  return Math.round(Math.abs(t(a) - t(b)) / 86_400_000);
};

const quien = (a: AplicacionBBreve) => `${esc(a.nombre || "Sin nombre")}${a.relacion ? ` (${esc(a.relacion)})` : ""}`;

function tablaAreas(c: CalificacionBBreve) {
  return `<table><thead><tr><th>Área</th><th>Puntuación</th><th>% del máximo</th><th>Lectura</th></tr></thead><tbody>
${c.areas
  .map(
    (a) => `<tr><td><strong>${esc(a.nombre)}</strong><div class="muted">Ítems ${a.items.join(", ")}</div></td>
<td>${a.suma} / ${a.max}</td>
<td>${a.pct} %<div class="bar"><i class="${a.prioritaria ? "alta" : ""}" style="width:${a.pct}%"></i></div></td>
<td>${a.prioritaria ? `<span class="pill roja">Prioritaria</span><div class="muted">Profundizar en ${esc(a.profundizar)} del Cuestionario B</div>` : `<span class="pill verde">No prioritaria</span>`}</td></tr>`
  )
  .join("")}
<tr class="total"><td><strong>Total</strong></td><td><strong>${c.total} / ${B_BREVE_TOTAL_MAX}</strong></td><td>${c.pctTotal} %</td><td><span class="pill ${c.banda.clave}">${esc(c.banda.etiqueta)}</span></td></tr>
</tbody></table>`;
}

function senales(c: CalificacionBBreve, prefijo = "") {
  if (c.senales.length === 0) return `<div class="flag ok">✓ ${B_BREVE_SIN_REGLAS}</div>`;
  return c.senales
    .map((s) => `<div class="flag ${s.nivel === "alarma" ? "alarma" : "regla"}"><b>${s.nivel === "alarma" ? "!" : "•"}</b> ${prefijo}${esc(s.texto)}</div>`)
    .join("");
}

export function informeBBreveHtml(a: AplicacionBBreve, b?: AplicacionBBreve | null, p?: AplicacionBBreve | null, notasPrivadas = "") {
  const ca = calificarBBreve(a.datos);
  const alarmas = ca.senales.filter((s) => s.nivel === "alarma").length;
  let html = `<h1>Informe de calificación · Cuestionario B-Breve</h1>
<p class="muted">Código de caso: <strong>${esc(a.datos.ref || "—")}</strong> · Respondió: <strong>${quien(a)}</strong> · Fecha de aplicación: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))}</p>
<div class="kpi">
  <div><div class="v">${ca.total}<small> / 48</small></div><div class="l">Puntuación total</div></div>
  <div><div class="v"><span class="pill ${ca.banda.clave}">${esc(ca.banda.etiqueta)}</span></div><div class="l">${esc(ca.banda.texto)}</div></div>
  <div><div class="v">${ca.areas.filter((x) => x.prioritaria).length}</div><div class="l">Áreas prioritarias (≥ 50 %)</div></div>
  <div><div class="v ${alarmas ? "rojo" : ""}">${alarmas}</div><div class="l">Señales de alarma</div></div>
</div>
<h2>Señales de alarma y reglas por ítem</h2>${senales(ca)}
<h2>Puntuación por áreas${b ? " · cuidador 1" : ""}</h2>${tablaAreas(ca)}`;

  if (b) {
    const cb = calificarBBreve(b.datos);
    const d = discrepanciaBBreve(a.datos, b.datos);
    html += `<h2>Cuidador 2: ${quien(b)} · ${esc(fechaLarga(b.fecha))}</h2>
${cb.senales.filter((s) => s.nivel === "alarma").length ? senales({ ...cb, senales: cb.senales.filter((s) => s.nivel === "alarma") }, "Cuidador 2 · ") : ""}
${tablaAreas(cb)}
${cb.senales.some((s) => s.nivel === "regla") ? `<div class="sub">Reglas por ítem del cuidador 2</div>${senales({ ...cb, senales: cb.senales.filter((s) => s.nivel === "regla") })}` : ""}
<h2>Discrepancia entre cuidadores</h2>
<div class="flag ${d.significativa ? "regla" : "ok"}"><b>${d.significativa ? "•" : "✓"}</b> <strong>${d.items.length}</strong> ítem(s) con diferencia de 2 puntos o más${d.items.length ? ` (ítems ${d.items.join(", ")})` : ""}. ${esc(d.lectura)}</div>`;
  }

  if (p) {
    const s = seguimientoBBreve(a.datos, p.datos);
    const dias = diasEntre(a.fecha, p.fecha);
    const cambio = (n: number) => `<strong class="${n < 0 ? "baja" : n > 0 ? "sube" : ""}">${n > 0 ? "+" : ""}${n}</strong>`;
    html += `<h2>Seguimiento: comparación con la aplicación anterior</h2>
<p class="muted">Anterior: ${quien(p)}, ${esc(fechaLarga(p.fecha))}${dias !== null ? ` · ${dias} días entre aplicaciones${dias < 28 ? " (el criterio está pensado para cada 4 semanas)" : ""}` : ""}</p>
<table><thead><tr><th>Área</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>
${s.filas.map((f) => `<tr><td>${esc(f.nombre)}</td><td>${f.antes} / ${f.max}</td><td>${f.ahora} / ${f.max}</td><td>${cambio(f.cambio)}</td></tr>`).join("")}
<tr class="total"><td><strong>Total</strong></td><td>${s.totalAntes} / 48</td><td>${s.totalAhora} / 48</td><td>${cambio(s.totalAhora - s.totalAntes)}</td></tr>
<tr><td>S1 · S2</td><td>${p.datos.S1 ? "Sí" : "No"} · ${p.datos.S2 ? "Sí" : "No"}</td><td>${a.datos.S1 ? "Sí" : "No"} · ${a.datos.S2 ? "Sí" : "No"}</td><td></td></tr>
</tbody></table>
<div class="flag ${s.progreso ? "ok" : "regla"}"><b>${s.progreso ? "✓" : "•"}</b> ${esc(s.lectura)}</div>`;
  }

  html += `<h2>Respuestas ítem por ítem</h2>
<table><thead><tr><th>N.º</th><th>Enunciado</th><th>C1</th>${b ? "<th>C2</th><th>Dif.</th>" : ""}</tr></thead><tbody>
${B_BREVE_ITEMS.map((item, i) => {
  const d = b ? Math.abs(a.datos.items[i] - b.datos.items[i]) : 0;
  return `<tr${d >= 2 ? ' class="dif"' : ""}><td>${item.n}</td><td>${esc(item.texto)}</td><td><strong>${a.datos.items[i]}</strong></td>${
    b ? `<td><strong>${b.datos.items[i]}</strong></td><td>${d >= 2 ? `<span class="pill moderada">${d}</span>` : d}</td>` : ""
  }</tr>`;
}).join("")}
${B_BREVE_SEGURIDAD.map((s) => {
  const va = a.datos[s.clave], vb = b?.datos[s.clave];
  return `<tr${va === 1 || vb === 1 ? ' class="alarma"' : ""}><td>${s.clave}</td><td>${esc(s.corto)}</td><td><strong>${va ? "Sí" : "No"}</strong></td>${
    b ? `<td><strong>${vb ? "Sí" : "No"}</strong></td><td>${va !== vb ? "≠" : ""}</td>` : ""
  }</tr>`;
}).join("")}
</tbody></table>`;

  const abiertas = [a, b].filter((x): x is AplicacionBBreve => !!x && !!(x.datos.abierta || x.datos.extra));
  for (const x of abiertas) {
    html += `<h2>Respuesta abierta${b ? ` · ${quien(x)}` : ""}</h2>
${x.datos.abierta ? `<p class="cita">${esc(x.datos.abierta)}</p>` : `<p class="muted">(sin respuesta)</p>`}
${x.datos.extra ? `<div class="sub">Comentarios adicionales</div><p class="cita">${esc(x.datos.extra)}</p>` : ""}`;
  }

  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">${esc(B_BREVE_AVISO_INFORME)} Fuente: sección 10.2 de "Polidipsia psicógena infantil: guía para el psicólogo" (Lic. Juan J. Reyes).</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>B-Breve · ${esc(a.datos.ref || a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}
.muted{color:#64748b;font-size:12.5px}.sub{font-weight:600;margin:10px 0 6px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}tr.total td{background:#f8fafc}tr.dif td{background:#fef3c7}tr.alarma td{background:#fee2e2}
.bar{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%;background:#0d9488}.bar i.alta{background:#d97706}
.pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:11.5px;font-weight:700}.verde{background:#dcfce7;color:#166534}
.pill.baja{background:#dcfce7;color:#166534}.pill.moderada{background:#fef3c7;color:#92400e}.pill.alta,.roja{background:#fee2e2;color:#991b1b}
.flag{padding:9px 12px;border-radius:8px;margin:6px 0;font-size:13px;border:1px solid #e2e8f0}.flag.alarma{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d}
.flag.regla{background:#fef3c7;border-color:#fcd34d;color:#78350f}.flag.ok{background:#f0fdf4;border-color:#bbf7d0}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:14px 0}.kpi>div{background:#f8fafc;border-radius:8px;padding:10px}
.kpi .v{font-size:22px;font-weight:700}.kpi .v small{font-size:13px;color:#64748b}.kpi .l{font-size:11.5px;color:#64748b}.rojo{color:#b91c1c}
strong.baja{color:#15803d}strong.sube{color:#b91c1c}.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}
.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
