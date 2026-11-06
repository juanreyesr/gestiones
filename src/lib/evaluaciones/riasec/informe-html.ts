/** Informe profesional del test vocacional RIASEC (HTML autónomo, imprimible). Solo panel. */
import { calificarRiasec, RIASEC_AVISO, RIASEC_INFO, seguimientoRiasec, type RiasecDatos } from "./calificacion";
import { RIASEC_ESCALA, RIASEC_ITEMS, RIASEC_NOMBRE_PROFESIONAL, tipoDeItem } from "./escalas";

export type AplicacionRiasec = { datos: RiasecDatos; nombre: string; fecha: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const COLOR: Record<string, string> = { R: "#0f766e", I: "#1d4ed8", A: "#a21caf", S: "#dc2626", E: "#d97706", C: "#4b5563" };

/** Hexágono RIASEC en SVG con el perfil dibujado. */
function hexagono(sumas: Record<string, number>) {
  const tipos = ["R", "I", "A", "S", "E", "C"];
  const cx = 130, cy = 120, r = 95;
  const punto = (i: number, f: number) => {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + Math.cos(ang) * r * f, cy + Math.sin(ang) * r * f];
  };
  const borde = tipos.map((_, i) => punto(i, 1).join(",")).join(" ");
  const guias = [0.25, 0.5, 0.75].map((f) => `<polygon points="${tipos.map((_, i) => punto(i, f).join(",")).join(" ")}" fill="none" stroke="#e2e8f0"/>`).join("");
  const perfil = tipos.map((t, i) => punto(i, Math.max(sumas[t], 0.4) / 24).join(",")).join(" ");
  const etiquetas = tipos
    .map((t, i) => {
      const [x, y] = punto(i, 1.17);
      return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="${COLOR[t]}">${t} ${sumas[t]}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 260 245" width="260" height="245" role="img" aria-label="Hexágono RIASEC">${guias}<polygon points="${borde}" fill="none" stroke="#94a3b8"/><polygon points="${perfil}" fill="rgba(79,70,229,.18)" stroke="#4f46e5" stroke-width="2"/>${etiquetas}</svg>`;
}

export function informeRiasecHtml(a: AplicacionRiasec, anterior?: AplicacionRiasec | null, notasPrivadas = "") {
  const c = calificarRiasec(a.datos);
  const sumas = Object.fromEntries(c.tipos.map((t) => [t.tipo, t.suma]));
  const top = c.orden.slice(0, 3);
  let html = `<h1>Informe · ${esc(RIASEC_NOMBRE_PROFESIONAL)}</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${a.datos.edad ? ` · Edad: ${a.datos.edad}` : ""}${a.datos.estudios ? ` · Estudios: ${esc(a.datos.estudios)}` : ""} · Fecha: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))}</p>
<p class="muted">RIASEC son las iniciales de los seis tipos de intereses del modelo de John L. Holland: Realista (R), Investigador (I), Artístico (A), Social (S), Emprendedor (E) y Convencional (C). El código Holland son las letras de los tres tipos con mayor puntuación.</p>
<div class="kpi">
  <div><div class="v">${esc(c.codigo)}</div><div class="l">Código Holland (${top.map((t) => esc(RIASEC_INFO[t].nombre)).join(" – ")})</div></div>
  <div><div class="v">${c.diferenciacion.valor}<small>/24</small></div><div class="l">Diferenciación · ${esc(c.diferenciacion.k)}</div></div>
  <div><div class="v" style="font-size:18px">${esc(c.consistencia.k)}</div><div class="l">Consistencia (${esc(c.orden[0])}–${esc(c.orden[1])})</div></div>
  <div><div class="v">${c.flags.filter((f) => f.lvl === "alert" || f.lvl === "warn").length}</div><div class="l">Observaciones a revisar</div></div>
</div>
<div class="perfil">${hexagono(sumas)}
<table><thead><tr><th>Tipo</th><th>Puntuación</th><th>Nivel</th></tr></thead><tbody>
${[...c.tipos]
  .sort((x, y) => c.orden.indexOf(x.tipo) - c.orden.indexOf(y.tipo))
  .map(
    (t) =>
      `<tr${top.includes(t.tipo) ? ' class="top"' : ""}><td><strong style="color:${COLOR[t.tipo]}">${t.tipo}</strong> · ${esc(t.nombre)}</td><td>${t.suma} / 24<div class="bar"><i style="width:${t.pct}%;background:${COLOR[t.tipo]}"></i></div></td><td>${esc(t.nivel.label)}</td></tr>`
  )
  .join("")}
</tbody></table></div>
<p class="muted">Niveles por rango de la escala (sin baremos): 0–8 bajo, 9–15 medio, 16–20 alto, 21–24 muy alto. ${esc(c.diferenciacion.lectura)} ${esc(c.consistencia.lectura)}</p>
<h2>Observaciones</h2>
${c.flags.length ? c.flags.map((f) => `<div class="flag ${f.lvl === "alert" ? "alarma" : f.lvl === "warn" ? "regla" : "neutra"}"><b>${f.lvl === "alert" ? "!" : "•"}</b> ${esc(f.t)}</div>`).join("") : `<div class="flag ok">✓ Perfil interpretable sin observaciones de estilo de respuesta.</div>`}
<h2>Tipos principales y opciones para explorar</h2>
${top
  .map((t, i) => {
    const info = RIASEC_INFO[t];
    return `<div class="tipo"><h3><span style="color:${COLOR[t]}">${i + 1}. ${t} · ${esc(info.nombre)}</span> <small>(${sumas[t]}/24 · ${esc(info.corto)})</small></h3><p>${esc(info.descripcion)}</p><p class="muted">Ambientes: ${esc(info.ambientes)}</p><p><strong>Carreras y campos:</strong> ${info.carreras.map(esc).join(" · ")}</p></div>`;
  })
  .join("")}`;

  if (anterior) {
    const s = seguimientoRiasec(a.datos, anterior.datos);
    html += `<h2>Seguimiento: comparación con la aplicación anterior</h2>
<p class="muted">Anterior: ${esc(fechaLarga(anterior.fecha))} · Código: ${esc(s.codigoAntes)} → ${esc(s.codigoAhora)}</p>
<table><thead><tr><th>Tipo</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>
${s.filas.map((f) => `<tr><td>${f.tipo} · ${esc(f.nombre)}</td><td>${f.antes}</td><td>${f.ahora}</td><td><strong>${f.cambio > 0 ? "+" : ""}${f.cambio}</strong></td></tr>`).join("")}
</tbody></table>`;
  }

  html += `<h2>Respuestas ítem por ítem</h2>
<table><thead><tr><th>N.º</th><th>Afirmación</th><th>Tipo</th><th>Resp.</th></tr></thead><tbody>
${RIASEC_ITEMS.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td>${tipoDeItem(i + 1)}</td><td><strong>${a.datos.items[i]}</strong> <span class="muted">${esc(RIASEC_ESCALA[a.datos.items[i]])}</span></td></tr>`).join("")}
</tbody></table>`;
  if (a.datos.carreras) html += `<h2>Carreras u ocupaciones que le interesan (respuesta abierta)</h2><p class="cita">${esc(a.datos.carreras)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<p class="aviso">${esc(RIASEC_AVISO)}</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Intereses vocacionales · ${esc(a.nombre)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}h3 small{color:#64748b;font-weight:400}
.muted{color:#64748b;font-size:12.5px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}tr.top td{background:#eef2ff}
.bar{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%}
.perfil{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.perfil table{flex:1;min-width:260px}
.flag{padding:9px 12px;border-radius:8px;margin:6px 0;font-size:13px;border:1px solid #e2e8f0}.flag.alarma{background:#fee2e2;border-color:#fca5a5;color:#7f1d1d}
.flag.regla{background:#fef3c7;border-color:#fcd34d;color:#78350f}.flag.ok{background:#f0fdf4;border-color:#bbf7d0}.flag.neutra{background:#f0f9ff;border-color:#bae6fd}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:14px 0}.kpi>div{background:#f8fafc;border-radius:8px;padding:10px}
.kpi .v{font-size:24px;font-weight:700;letter-spacing:.04em}.kpi .v small{font-size:12px;color:#64748b}.kpi .l{font-size:11.5px;color:#64748b}
.tipo{border-left:4px solid #6366f1;background:#f8fafc;padding:10px 12px;margin:8px 0;border-radius:0 8px 8px 0}.tipo p{margin:4px 0}
.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.tipo{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
