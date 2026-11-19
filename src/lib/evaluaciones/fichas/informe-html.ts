/**
 * Fichas terapéuticas JJR: HTML imprimible A4 (documento autónomo) de
 *  (a) la ficha EN BLANCO (parte del paciente, con renglones y tablas vacías, para
 *      imprimirla en consulta), y
 *  (b) la ficha CON SUS RESPUESTAS (para el expediente).
 * Sin la guía del terapeuta. Mismos estilos sobrios que los demás informes HTML.
 */
import { camposDeFicha, ETAPAS_FICHAS, FICHA_INTRO_GENERAL, rotuloFila, type Campo, type Ficha, type Seccion } from "./catalogo";
import type { AutorFicha, RespuestasFicha, ValorCasillas } from "./codigo";
import type { RiesgoFicha } from "./riesgo";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

const ESTILOS = `
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
h1{font-size:20px;margin:0 0 2px}h2{font-size:15px;margin:20px 0 8px;padding-top:10px;border-top:1px solid #e2e8f0}h3{font-size:14px;margin:0 0 4px}
.muted{color:#64748b;font-size:12.5px}p{margin:6px 0}.etapa{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#0f766e;font-weight:700}
.datos{display:flex;gap:24px;margin:10px 0 4px;font-size:13px}.datos span{flex:1;border-bottom:1px solid #94a3b8;padding-bottom:2px;min-height:22px}
.intro{border-left:4px solid #0d9488;background:#f0fdfa;padding:8px 12px;margin:10px 0;border-radius:0 8px 8px 0}.intro p{margin:5px 0}
.campo{margin:12px 0 14px}.et{font-weight:600;font-size:13.5px}.ayuda,.ejemplo{font-size:12px;color:#64748b}.ejemplo{font-style:italic;color:#94a3b8}
.linea{height:26px;border-bottom:1px solid #94a3b8}.lineas .linea{margin-top:2px}
.escala{display:flex;gap:6px;margin-top:6px}.escala i{flex:1;max-width:38px;height:28px;border:1px solid #94a3b8;border-radius:99px;text-align:center;font:600 12px/26px system-ui,sans-serif;color:#475569}
.extremos{display:flex;justify-content:space-between;font-size:11.5px;color:#64748b;margin-top:3px;max-width:480px}
.casillas{columns:2;column-gap:20px;margin-top:4px;font-size:13px}.casillas div{break-inside:avoid;margin:2px 0}.caja{display:inline-block;width:11px;height:11px;border:1px solid #475569;margin-right:6px;vertical-align:-1px}
.caja.si{background:#0f766e;border-color:#0f766e}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}th,td{text-align:left;padding:6px;border:1px solid #cbd5e1;vertical-align:top}
th{font-size:11px;background:#f1f5f9;color:#475569}td.fija{font-weight:600;background:#f8fafc;width:20%}td.vacia{height:44px}table.ciclo td.vacia{height:70px}
.resp{white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:8px 10px;margin:4px 0}.sin{color:#94a3b8;font-style:italic}
ol,ul{margin:4px 0;padding-left:22px}.barra{height:7px;background:#f1f5f9;border-radius:99px;overflow:hidden;max-width:260px;margin-top:4px}.barra i{display:block;height:100%;background:#0d9488}
.flag{padding:9px 12px;border-radius:8px;margin:8px 0;font-size:13px;border:1px solid #fca5a5;background:#fee2e2;color:#7f1d1d}
.invita{margin:4px 0 8px;color:#334155}td.fija.ejemplo{font-weight:400}
.cierre{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;background:#f8fafc;margin-top:6px}
.pie{margin-top:22px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media print{body{padding:0}h2{break-after:avoid}.campo,tr,.flag{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

const documento = (titulo: string, cuerpo: string) =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title><style>@page{size:A4;margin:14mm}${ESTILOS}</style></head><body>${cuerpo}</body></html>`;

const encabezado = (f: Ficha) =>
  `<div class="etapa">Etapa ${f.etapa} · ${esc(ETAPAS_FICHAS[f.etapa])}</div><h1>Ficha ${esc(f.id)} · ${esc(f.titulo)}</h1><div class="muted">${esc(f.tiempo)} aproximadamente</div>`;

const explicacion = (f: Ficha) => `<div class="intro">${f.explicacion.map((p) => `<p>${esc(p)}</p>`).join("")}<p class="muted">${esc(FICHA_INTRO_GENERAL)}</p></div>`;

const etiquetaCampo = (c: Campo, conEjemplo: boolean) =>
  `<div class="et">${esc(c.etiqueta)}${c.requerido ? " *" : ""}</div>${c.ayuda ? `<div class="ayuda">${esc(c.ayuda)}</div>` : ""}${conEjemplo && c.ejemplo ? `<div class="ejemplo">Ejemplo: ${esc(c.ejemplo)}</div>` : ""}`;

/* ------------------------------ ficha en blanco ------------------------------ */

function campoEnBlanco(c: Campo): string {
  let cuerpo = "";
  switch (c.tipo) {
    case "texto":
      cuerpo = `<div class="linea"></div>`;
      break;
    case "parrafo":
      cuerpo = `<div class="lineas">${'<div class="linea"></div>'.repeat(5)}</div>`;
      break;
    case "escala":
      cuerpo = `<div class="escala">${Array.from({ length: 11 }, (_, i) => `<i>${i}</i>`).join("")}</div><div class="extremos"><span>${esc(c.extremos[0])}</span><span>${esc(c.extremos[1])}</span></div>`;
      break;
    case "lista":
      cuerpo = Array.from({ length: Math.min(c.maxFilas, 6) }, (_, i) => `<div class="linea"><span class="muted">${i + 1}.</span></div>`).join("");
      break;
    case "casillas":
      cuerpo = `<div class="casillas">${c.opciones.map((o) => `<div><span class="caja"></span>${esc(o)}</div>`).join("")}${c.conOtra ? `<div><span class="caja"></span>Otra: ____________________</div>` : ""}</div>`;
      break;
    case "tabla": {
      const filas = c.filasFijas ? c.filasFijas.length : c.filas;
      const cab = `<tr><th></th>${c.columnas.map((k) => `<th>${esc(k.titulo)}${k.ayuda ? `<br><span style="font-weight:400">${esc(k.ayuda)}</span>` : ""}</th>`).join("")}</tr>`;
      const ejemplo = !c.filasFijas && c.columnas.some((k) => k.ejemplo) ? `<tr><td class="fija ejemplo">Ejemplo</td>${c.columnas.map((k) => `<td class="ejemplo">${esc(k.ejemplo ?? "")}</td>`).join("")}</tr>` : "";
      const cuerpoFilas = Array.from({ length: filas }, (_, i) => `<tr><td class="fija">${esc(rotuloFila(c, i))}</td>${c.columnas.map(() => `<td class="vacia"></td>`).join("")}</tr>`).join("");
      cuerpo = `<table class="${c.columnas.length >= 5 ? "ciclo" : ""}"><thead>${cab}</thead><tbody>${ejemplo}${cuerpoFilas}</tbody></table>${ejemplo ? `<div class="ayuda">El renglón de ejemplo es solo una muestra de cómo responder.</div>` : ""}`;
      break;
    }
  }
  return `<div class="campo" data-corte>${etiquetaCampo(c, c.tipo !== "tabla")}${cuerpo}</div>`;
}

const seccionEnBlanco = (s: Seccion) => `<h2>${esc(s.titulo)}</h2><p class="invita">${esc(s.intro)}</p>${s.campos.map(campoEnBlanco).join("")}`;

/** Ficha en blanco (parte del paciente) lista para imprimir en A4. */
export function fichaEnBlancoHtml(f: Ficha): string {
  const cuerpo = `${encabezado(f)}
<div class="datos"><span>Nombre:</span><span>Fecha:</span></div>
${explicacion(f)}
${f.secciones.map(seccionEnBlanco).join("")}
<h2>${esc(f.cierre.titulo)}</h2><div class="cierre"><p>${esc(f.cierre.texto)}</p></div>${f.cierre.campos.map(campoEnBlanco).join("")}
<div class="pie">Ficha ${esc(f.id)} · Fichas terapéuticas JJR (TCC) · M. A. Juan J. Reyes</div>`;
  return documento(`Ficha ${f.id} · ${f.titulo} (en blanco)`, cuerpo);
}

/* ------------------------------ ficha con respuestas ------------------------------ */

const sinRespuesta = `<p class="sin">Sin respuesta</p>`;

function respuestaDe(c: Campo, valor: unknown): string {
  switch (c.tipo) {
    case "texto":
    case "parrafo":
      return typeof valor === "string" && valor.trim() ? `<div class="resp">${esc(valor)}</div>` : sinRespuesta;
    case "escala":
      return typeof valor === "number"
        ? `<p><strong>${valor}</strong> de 10 <span class="muted">(${esc(c.extremos[0])} · ${esc(c.extremos[1])})</span></p><div class="barra"><i style="width:${valor * 10}%"></i></div>`
        : sinRespuesta;
    case "lista": {
      const filas = Array.isArray(valor) ? (valor as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
      return filas.length ? `<ol>${filas.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : sinRespuesta;
    }
    case "casillas": {
      const v = (valor ?? { marcadas: [], otra: "" }) as ValorCasillas;
      const marcadas = Array.isArray(v.marcadas) ? v.marcadas : [];
      if (!marcadas.length && !v.otra) return sinRespuesta;
      return `<div class="casillas" style="columns:1">${marcadas.map((o) => `<div><span class="caja si"></span>${esc(o)}</div>`).join("")}${v.otra ? `<div><span class="caja si"></span>Otra: ${esc(v.otra)}</div>` : ""}</div>`;
    }
    case "tabla": {
      const filas = Array.isArray(valor) ? (valor as unknown[][]) : [];
      const conTexto = (f: unknown[]) => f.some((x) => typeof x === "string" && x.trim() !== "");
      const visibles = filas.map((f, i) => ({ f, i })).filter(({ f }) => Array.isArray(f) && conTexto(f));
      if (!visibles.length) return sinRespuesta;
      const cab = `<tr><th></th>${c.columnas.map((k) => `<th>${esc(k.titulo)}</th>`).join("")}</tr>`;
      const cuerpo = (c.filasFijas ? filas.map((f, i) => ({ f, i })) : visibles)
        .map(({ f, i }) => `<tr><td class="fija">${esc(rotuloFila(c, i).replace(/ \(opcional\)$/, ""))}</td>${c.columnas.map((_, j) => `<td>${esc(typeof f?.[j] === "string" && f[j] ? f[j] : "—")}</td>`).join("")}</tr>`)
        .join("");
      return `<table><thead>${cab}</thead><tbody>${cuerpo}</tbody></table>`;
    }
  }
}

const campoRespondido = (c: Campo, r: RespuestasFicha) => `<div class="campo" data-corte>${etiquetaCampo({ ...c, ayuda: undefined, ejemplo: undefined } as Campo, false)}${respuestaDe(c, r[c.id])}</div>`;

export type DatosFichaRespondida = {
  ficha: Ficha;
  respuestas: RespuestasFicha;
  nombre: string;
  fecha: string;
  /** Palabras de riesgo halladas en el texto libre (se destacan arriba). */
  riesgo?: RiesgoFicha | null;
  notasPrivadas?: string;
  /** «terapeuta»: la llenó el psicólogo (no el paciente). */
  autor?: AutorFicha;
};

/** Ficha con las respuestas del paciente, para el expediente. */
export function fichaRespondidaHtml(a: DatosFichaRespondida): string {
  const f = a.ficha;
  const total = camposDeFicha(f).length;
  const resp = a.respuestas ?? {};
  const alarma = a.riesgo?.riesgo
    ? `<div class="flag"><strong>Posible señal de riesgo en el texto libre.</strong> Lea la respuesta completa y valore el riesgo antes de la próxima sesión.${a.riesgo.coincidencias
        .map((c) => `<br>• «${esc(c.fragmento)}» (${esc(c.campo)})`)
        .join("")}</div>`
    : "";
  const cuerpo = `${encabezado(f)}
<p class="muted">${a.autor === "terapeuta" ? `<strong>Llenada por el terapeuta</strong>` : `Respondió: <strong>${esc(a.nombre || "—")}</strong>`} · Fecha: ${esc(fechaLarga(a.fecha) || "—")} · ${
    camposDeFicha(f).filter((c) => respuestaDe(c, resp[c.id]) !== sinRespuesta).length
  } de ${total} preguntas respondidas</p>
${alarma}
${f.secciones
  .map((s) => `<h2>${esc(s.titulo)}</h2>${s.campos.map((c) => campoRespondido(c, resp)).join("")}`)
  .join("")}
<h2>${esc(f.cierre.titulo)}</h2>${f.cierre.campos.map((c) => campoRespondido(c, resp)).join("")}
${a.notasPrivadas?.trim() ? `<h2>Notas del profesional</h2><div class="resp">${esc(a.notasPrivadas)}</div>` : ""}
<div class="pie">Ficha ${esc(f.id)} · Fichas terapéuticas JJR (TCC). ${a.autor === "terapeuta" ? "Ficha llenada por el terapeuta" : "Respuestas del paciente"}, sin calificación; las palabras de riesgo se detectan por reglas y no sustituyen la lectura clínica.</div>`;
  return documento(`Ficha ${f.id} · ${f.titulo} · ${a.nombre}`, cuerpo);
}
