/** Informe profesional del cuestionario de temperamento (HTML autónomo, imprimible). Solo panel. */
import {
  calificarTemperamentos,
  COMBINACIONES,
  ladoDeItem,
  seguimientoTemperamentos,
  TEMPERAMENTOS_AVISO,
  TEMPERAMENTOS_INFO,
  TEXTO_POCO_DIFERENCIADO,
  type TemperamentosDatos,
} from "./calificacion";
import { TEMPERAMENTOS_ESCALA, TEMPERAMENTOS_ITEMS, TEMPERAMENTOS_NOMBRE_PROFESIONAL, temperamentoDeItem, type TemperamentoId } from "./escalas";

export type AplicacionTemperamentos = { datos: TemperamentosDatos; nombre: string; fecha: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};
const COLOR: Record<TemperamentoId, string> = { S: "#f59e0b", C: "#dc2626", M: "#4f46e5", F: "#0d9488" };
const TIPO: Record<string, string> = {
  "poco-diferenciado": "Poco diferenciado",
  predominante: "Predominante",
  combinado: "Combinado",
  codominantes: "Codominantes",
};
const lista = (l: string[]) => `<ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const signo = (n: number) => `${n > 0 ? "+" : ""}${n}`;

function bloqueTemperamento(id: TemperamentoId, titulo: string, suma: number, completo = false) {
  const i = TEMPERAMENTOS_INFO[id];
  return `<div class="tipo" style="border-left-color:${COLOR[id]}"><h3>${esc(titulo)}: ${esc(i.nombre)} <small>(${suma}/40 · ${esc(i.dimensiones)})</small></h3>
<p>${esc(i.resumen)}</p>
<p><strong>Conducta habitual:</strong></p>${lista(i.caracteristicas)}
<p><strong>Características positivas (fortalezas):</strong></p>${lista(i.fortalezas)}
<p><strong>Características negativas o aspectos a cuidar:</strong></p>${lista(i.cuidar)}${
    completo ? `<p><strong>Señales a observar en sí mismo:</strong></p>${lista(i.observar)}<p><strong>Cómo aprovechar sus puntos fuertes:</strong></p>${lista(i.aprovechar)}` : ""
  }
<p><strong>En las relaciones:</strong> ${esc(i.relaciones)}</p>
<p><strong>En el trabajo o el estudio:</strong> ${esc(i.trabajo)}</p>
<p><strong>Bajo estrés:</strong> ${esc(i.estres)}</p></div>`;
}

export function informeTemperamentosHtml(a: AplicacionTemperamentos, anterior?: AplicacionTemperamentos | null, notasPrivadas = "") {
  const c = calificarTemperamentos(a.datos);
  const nombresDominantes = c.dominantes.map((id, k) => (k === 0 ? TEMPERAMENTOS_INFO[id].nombre : TEMPERAMENTOS_INFO[id].nombre.toLowerCase())).join(" y ");
  const por = Object.fromEntries(c.temperamentos.map((v) => [v.id, v])) as Record<TemperamentoId, (typeof c.temperamentos)[number]>;
  let html = `<h1>Informe · ${esc(TEMPERAMENTOS_NOMBRE_PROFESIONAL)}</h1>
<p class="muted">Respondió: <strong>${esc(a.nombre || "—")}</strong>${a.datos.edad ? ` · Edad: ${a.datos.edad}` : ""}${a.datos.situacion ? ` · Situación: ${esc(a.datos.situacion)}` : ""} · Fecha: ${esc(fechaLarga(a.fecha))} · Calificado el ${esc(new Date().toLocaleDateString("es-GT"))}</p>
<p class="muted">Instrumento: «Cuestionario de temperamento · versión JJ» (M. A. Juan J. Reyes), 40 afirmaciones originales (10 por temperamento: 6 del lado fuerte y 4 del lado difícil), escala 0–4. Los textos descriptivos están redactados de usted, tal como los lee el paciente en su informe.</p>
<div class="dom"><div class="l">${c.dominantes.length > 1 ? "Temperamentos dominantes" : "Temperamento dominante"}</div><div class="n">${esc(nombresDominantes)}</div><div class="m">${
    c.tipo === "poco-diferenciado"
      ? "Perfil poco diferenciado: la diferencia con los demás temperamentos es pequeña; leerlo como una tendencia suave."
      : c.tipo === "predominante"
        ? "Perfil predominante: diferencia clara frente al segundo temperamento."
        : c.tipo === "codominantes"
          ? "Codominantes: los dos puntajes más altos son iguales (orden fijo de la prueba)."
          : `Perfil combinado: ${esc(c.perfil)}.`
  }</div></div>
<div class="kpi">
  <div><div class="v" style="font-size:16px">${esc(c.perfil)}</div><div class="l">Perfil</div></div>
  <div><div class="v" style="font-size:16px">${esc(TIPO[c.tipo])}</div><div class="l">Tipo de perfil</div></div>
  <div><div class="v">${c.rango}<small>/40</small></div><div class="l">Diferencia entre el puntaje más alto y el más bajo</div></div>
  <div><div class="v">${c.brecha}<small>/40</small></div><div class="l">Diferencia entre el primero y el segundo</div></div>
</div>
<table><thead><tr><th>Temperamento</th><th>Puntaje</th><th>Porcentaje</th></tr></thead><tbody>
${c.orden
  .map((id) => {
    const v = por[id];
    return `<tr${id === c.principal || id === c.secundario ? ' class="top"' : ""}><td><strong>${esc(v.nombre)}</strong> <span class="muted">${esc(TEMPERAMENTOS_INFO[id].dimensiones)}</span></td><td>${v.suma} / 40<div class="bar"><i style="width:${v.pct}%;background:${COLOR[id]}"></i></div></td><td>${v.pct} %</td></tr>`;
  })
  .join("")}
</tbody></table>
<p class="muted">Orden de mayor a menor (empates: sanguíneo, colérico, melancólico, flemático). Reglas: poco diferenciado si la diferencia entre el más alto y el más bajo es ≤ 5 (aun así se nombra el dominante, el de mayor puntaje, aclarando que la diferencia es pequeña); predominante si el primero supera al segundo en 8 o más; combinado si la diferencia es menor (el orden importa); tercera influencia si el segundo y el tercero están a 3 puntos o menos. Promedio general ${c.media.toFixed(2).replace(".", ",")} de 4.</p>
<h2>Observaciones</h2>
${c.flags.length ? c.flags.map((f) => `<div class="flag ${f.lvl === "alert" ? "alarma" : f.lvl === "warn" ? "regla" : "neutra"}"><b>${f.lvl === "alert" ? "!" : "•"}</b> ${esc(f.t)}</div>`).join("") : `<div class="flag ok">✓ Perfil interpretable sin observaciones de estilo de respuesta.</div>`}
<h2>Dimensiones (orientativas)</h2>
<table><thead><tr><th>Dimensión</th><th>Valor</th><th>Lectura</th></tr></thead><tbody>
<tr><td><strong>Hacia afuera</strong> = (S + C) − (M + F)</td><td>${signo(c.dimensiones.afuera.valor)} <span class="muted">(−80 a 80)</span></td><td>${esc(c.dimensiones.afuera.label)}</td></tr>
<tr><td><strong>Reacción intensa</strong> = (C + M) − (S + F)</td><td>${signo(c.dimensiones.intensa.valor)} <span class="muted">(−80 a 80)</span></td><td>${esc(c.dimensiones.intensa.label)}</td></tr>
</tbody></table>
<p class="muted">S = sanguíneo, C = colérico, M = melancólico, F = flemático. Etiquetas: ≤ −10 hacia adentro o serena; entre −9 y 9 intermedio; ≥ 10 hacia afuera o intensa. Lectura moderna de Eysenck: sanguíneo = extravertido y estable; colérico = extravertido y reactivo; melancólico = introvertido y reactivo; flemático = introvertido y estable.</p>`;

  html += `<h2>${c.dominantes.length > 1 ? "Temperamentos dominantes" : "Temperamento dominante"}: ${esc(nombresDominantes)}</h2>`;
  if (c.tipo === "poco-diferenciado")
    html += `<div class="tipo"><p>${esc(TEXTO_POCO_DIFERENCIADO)}</p><p class="muted">Se nombra el dominante por tener el puntaje más alto, pero la diferencia con los demás es pequeña (${c.rango} puntos entre el más alto y el más bajo): se interpreta como una tendencia suave, no como un tipo. Conversarlo con el paciente.</p></div>`;
  html += c.dominantes.map((id, k) => bloqueTemperamento(id, c.dominantes.length > 1 ? `Dominante ${k + 1}` : "Dominante", por[id].suma, true)).join("");
  if (c.secundario && c.tipo !== "codominantes") html += `<h2>Temperamento secundario</h2>${bloqueTemperamento(c.secundario, "Secundario", por[c.secundario].suma)}`;
  if (c.combinacion) {
    const comb = COMBINACIONES[c.combinacion];
    html += `<h2>Perfil combinado: ${esc(comb.nombre)}</h2><div class="tipo"><p>${esc(comb.resumen)}</p>${
      c.tipo === "codominantes" ? `<p class="muted">Codominantes: los dos puntajes son iguales; se presentan en el orden fijo de la prueba, sin que uno predomine.</p>` : ""
    }<p><strong>Características principales de la mezcla:</strong></p>${lista(comb.caracteristicas)}
<p><strong>Cómo se comporta</strong></p>
<p><em>Trato con los demás:</em> ${esc(comb.comportamiento.trato)}</p>
<p><em>Decisiones:</em> ${esc(comb.comportamiento.decisiones)}</p>
<p><em>Conflicto:</em> ${esc(comb.comportamiento.conflicto)}</p>
<p><em>Trabajo:</em> ${esc(comb.comportamiento.trabajo)}</p>
<p><strong>De qué debe cuidarse:</strong></p>${lista(comb.cuidar)}
<p><strong>En qué ser más observador de sí mismo:</strong></p>${lista(comb.observar)}
<p><strong>Cómo aprovechar lo positivo de su combinación:</strong></p>${lista(comb.aprovechar)}${
      c.tercero ? `<p><strong>Tercera influencia:</strong> ${esc(TEMPERAMENTOS_INFO[c.tercero].nombre)} (${por[c.tercero].suma}/40), a ${por[c.secundario!].suma - por[c.tercero].suma} puntos del segundo: ${esc(TEMPERAMENTOS_INFO[c.tercero].resumen)}</p>` : ""
    }</div>`;
  }

  html += `<h2>Estilo de respuesta</h2>${
    c.flags.some((f) => f.lvl !== "" && !/Edad/.test(f.t))
      ? c.flags.filter((f) => f.lvl !== "" && !/Edad/.test(f.t)).map((f) => `<div class="flag ${f.lvl === "alert" ? "alarma" : "regla"}">${esc(f.t)}</div>`).join("")
      : `<div class="flag ok">✓ Sin señales de respuesta automática ni de aceptación indiscriminada (promedio ${c.media.toFixed(2).replace(".", ",")} de 4).</div>`
  }`;

  if (c.destacados.length) {
    html += `<h2>Ítems destacados</h2><p class="muted">Frases marcadas con 4 (o con 3 si no hubo ninguna con 4) del temperamento principal y del secundario. «Difícil» señala el lado más complicado del temperamento.</p>`;
    html += c.destacados
      .map(
        (g) =>
          `<h3>${esc(g.nombre)}</h3>${g.items.length ? `<table><thead><tr><th>N.º</th><th>Afirmación</th><th>Lado</th><th>Resp.</th></tr></thead><tbody>${g.items.map((i) => `<tr><td>${i.n}</td><td>${esc(i.texto)}</td><td>${i.lado === "fuerte" ? "Fuerte" : "Difícil"}</td><td><strong>${i.valor}</strong></td></tr>`).join("")}</tbody></table>` : `<p class="muted">Ninguna frase marcada con 3 o 4.</p>`}`
      )
      .join("");
    html += `<h2>Implicaciones para la terapia</h2>${c.destacados
      .map((g) => {
        const t = TEMPERAMENTOS_INFO[g.id].terapia;
        return `<div class="tipo" style="border-left-color:${COLOR[g.id]}"><h3>${esc(g.nombre)}</h3><p><strong>Alianza:</strong> ${esc(t.alianza)}</p><p><strong>Ritmo:</strong> ${esc(t.ritmo)}</p><p><strong>Tareas:</strong> ${esc(t.tareas)}</p><p><strong>Riesgos:</strong> ${esc(t.riesgos)}</p></div>`;
      })
      .join("")}`;
  }

  if (anterior) {
    const s = seguimientoTemperamentos(a.datos, anterior.datos);
    html += `<h2>Seguimiento: comparación con la aplicación anterior</h2>
<p class="muted">Anterior: ${esc(fechaLarga(anterior.fecha))} · Perfil: ${esc(s.perfilAntes)} → ${esc(s.perfilAhora)} · ${s.cambioDeTipo ? "<strong>cambió el perfil</strong>" : "el perfil se mantiene"}</p>
<table><thead><tr><th>Temperamento</th><th>Antes</th><th>Ahora</th><th>Cambio</th></tr></thead><tbody>
${s.filas.map((f) => `<tr><td>${esc(f.nombre)}</td><td>${f.antes}</td><td>${f.ahora}</td><td><strong>${signo(f.cambio)}</strong></td></tr>`).join("")}
</tbody></table>`;
  }

  html += `<h2>Respuestas ítem por ítem</h2>
<table><thead><tr><th>N.º</th><th>Afirmación</th><th>Temperamento</th><th>Lado</th><th>Resp.</th></tr></thead><tbody>
${TEMPERAMENTOS_ITEMS.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td>${esc(TEMPERAMENTOS_INFO[temperamentoDeItem(i + 1)].nombre)}</td><td>${ladoDeItem(i + 1) === "fuerte" ? "Fuerte" : "Difícil"}</td><td><strong>${a.datos.items[i]}</strong> <span class="muted">${esc(TEMPERAMENTOS_ESCALA[a.datos.items[i]])}</span></td></tr>`).join("")}
</tbody></table>`;
  if (a.datos.abierta) html += `<h2>Otros aspectos que la persona quiso contar (respuesta abierta)</h2><p class="cita">${esc(a.datos.abierta)}</p>`;
  if (notasPrivadas.trim()) html += `<h2>Notas del profesional</h2><p class="cita">${esc(notasPrivadas)}</p>`;
  html += `<h2>Fundamento y límites</h2><p class="aviso" style="margin-top:0;border-top:0;padding-top:0">${esc(TEMPERAMENTOS_AVISO)}</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Temperamento · ${esc(a.nombre)}</title>
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
.tipo{border-left:4px solid #6366f1;background:#f8fafc;padding:10px 12px;margin:8px 0;border-radius:0 8px 8px 0}.tipo p{margin:4px 0}.tipo ul{margin:2px 0 6px;padding-left:20px}
.dom{border:2px solid #4f46e5;background:#eef2ff;border-radius:10px;padding:10px 14px;margin:12px 0}.dom .l{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#4f46e5;font-weight:700}.dom .n{font-size:22px;font-weight:700}.dom .m{font-size:12.5px;color:#475569}
.cita{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px}.aviso{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}tr,.flag,.tipo{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${html}</body></html>`;
}
