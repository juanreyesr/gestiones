// Casos de prueba del Anexo D (EAPI / Batería AEI). Ejecutar: pnpm test:eapi
import assert from "node:assert/strict";
import { calificarEapi, seguimientoEapi, EAPI_SIN_DX } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { evolucionEapi, unirEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { avanceEapi, codificarEapi, decodificarEapi, limpiarBorradorEapi, modulosDeOpciones, validarEapi } from "../src/lib/evaluaciones/eapi/codigo.ts";
import { informeEapiHtml, soloModuloEapi } from "../src/lib/evaluaciones/eapi/informe-html.ts";
import { leerInformePaciente } from "../src/lib/evaluaciones/informe-paciente.ts";
import { DASS21, DOCS, GAD7, PTQ, SAFETY } from "../src/lib/evaluaciones/eapi/escalas.ts";
import { areasEapi, informePacienteEapi, opcionesPorDefectoEapi } from "../src/lib/evaluaciones/eapi/informe-paciente.ts";

const COMPLETA = ["gad", "dass", "ptq"];
const CON_DOCS = ["gad", "dass", "ptq", "docs"];

let ok = 0;
const caso = (nombre, fn) => { fn(); ok++; console.log(`✔ ${nombre}`); };
const dec = (c) => { const d = decodificarEapi(c); assert.ok(d, `no decodifica ${c}`); return d; };

caso("D.1 Caso completo con DOCS", () => {
  const codigo = "AEI1-G3222312-D232120221131232112201-P323231323132312-S1-F2-O10000210003443400000-RCASO7";
  const d = dec(codigo);
  assert.equal(codificarEapi(d), codigo);
  const c = calificarEapi(d);
  assert.equal(c.gad.total, 15); assert.equal(c.gad.band.label, "Grave"); assert.equal(c.gad.positive, true);
  assert.deepEqual([c.dass.dep.raw, c.dass.dep.x2, c.dass.dep.band.label], [10, 20, "Moderado"]);
  assert.deepEqual([c.dass.anx.raw, c.dass.anx.x2, c.dass.anx.band.label], [11, 22, "Extremadamente severo"]);
  assert.deepEqual([c.dass.str.raw, c.dass.str.x2, c.dass.str.band.label], [13, 26, "Severo"]);
  assert.deepEqual([c.ptq.total, c.ptq.band.label, c.ptq.sub.core.sum, c.ptq.sub.unprod.sum, c.ptq.sub.capture.sum], [34, "Elevado", 22, 6, 6]);
  assert.deepEqual(c.docs.dims.map((x) => x.sum), [1, 3, 18, 0]);
  assert.equal(c.docs.total, 22); assert.equal(c.docs.band.label, "Sobre corte 21"); assert.equal(c.docs.top.short, "Pensamientos inaceptables");
  assert.equal(c.flags.length, 6); assert.equal(c.flags.filter((f) => f.lvl === "alert").length, 1);
  assert.match(c.flags[0].t, /^Ítem de seguridad = 1/);
  assert.equal(c.flags.filter((f) => f.lvl === "warn").length, 3);
  assert.equal(c.flags.filter((f) => f.lvl === "").length, 2);
  assert.deepEqual(c.dx.map((x) => x.id), ["safety", "tag", "panic", "stress", "dep", "rnt", "ocd"]);
});

caso("D.2 Ejemplo sin DOCS y seguimiento", () => {
  const a = dec("AEI1-G3222312-D232120221131232112201-P323231323132312-S0-F2-RDEMO1");
  const p = dec("AEI1-G3333323-D332231332232333223312-P434342434243423-S1-F3-RDEMO1");
  const c = calificarEapi(a);
  assert.deepEqual([c.gad.total, c.gad.band.label, c.dass.dep.x2, c.dass.dep.band.label, c.dass.anx.x2, c.dass.anx.band.label, c.dass.str.x2, c.dass.str.band.label, c.ptq.total, c.ptq.band.label],
    [15, "Grave", 20, "Moderado", 22, "Extremadamente severo", 26, "Severo", 34, "Elevado"]);
  assert.equal(c.flags.filter((f) => f.lvl === "alert").length, 0);
  assert.equal(c.flags.filter((f) => f.lvl === "warn").length, 3);
  const s = Object.fromEntries(seguimientoEapi(a, p).map((f) => [f.name, f]));
  assert.deepEqual([s["GAD-7 total"].before, s["GAD-7 total"].after, s["GAD-7 total"].delta], [20, 15, -5]);
  assert.match(s["GAD-7 total"].note, /MCID/);
  assert.deepEqual([s["DASS-21 Depresión (×2)"].before, s["DASS-21 Depresión (×2)"].after], [32, 20]);
  assert.equal(s["DASS-21 Depresión (×2)"].note, "Banda: Extremadamente severo → Moderado");
  assert.deepEqual([s["DASS-21 Ansiedad (×2)"].before, s["DASS-21 Ansiedad (×2)"].after, s["DASS-21 Ansiedad (×2)"].note], [34, 22, ""]);
  assert.equal(s["DASS-21 Estrés (×2)"].note, "Banda: Extremadamente severo → Severo");
  assert.deepEqual([s["DASS-21 Estrés (×2)"].before, s["DASS-21 Estrés (×2)"].after], [36, 26]);
  assert.deepEqual([s["PTQ total"].before, s["PTQ total"].after], [49, 34]);
  assert.deepEqual([s["Ítem de seguridad"].before, s["Ítem de seguridad"].after], [1, 0]);
});

caso("D.3 Ejemplo con módulo TOC", () => {
  const c = calificarEapi(dec("AEI1-G1101100-D010010100010100100000-P232221323232312-S0-F1-O10000210003443400000-RDEMO2"));
  assert.deepEqual([c.gad.total, c.gad.band.label, c.dass.dep.x2, c.dass.dep.band.label, c.dass.anx.x2, c.dass.anx.band.label, c.dass.str.x2, c.dass.str.band.label, c.ptq.total, c.ptq.band.label, c.docs.total, c.docs.band.label],
    [4, "Mínima", 6, "Normal", 4, "Normal", 2, "Normal", 33, "Elevado", 22, "Sobre corte 21"]);
  assert.deepEqual(c.dx.map((x) => x.id), ["ocd"]);
  assert.equal(c.flags.length, 2); assert.ok(c.flags.every((f) => f.lvl === ""));
});

caso("D.4 Todo en cero", () => {
  const c = calificarEapi(dec("AEI1-G0000000-D000000000000000000000-P000000000000000-S0"));
  assert.deepEqual([c.gad.total, c.gad.band.label, c.dass.dep.band.label, c.dass.anx.band.label, c.dass.str.band.label, c.ptq.total, c.ptq.band.label], [0, "Mínima", "Normal", "Normal", "Normal", 0, "Rango no clínico"]);
  assert.equal(c.flags.length, 0); assert.equal(c.dx.length, 0);
  assert.match(EAPI_SIN_DX, /^Todas las puntuaciones están en rango normal o mínimo/);
});

caso("D.5 Desesperanza sin ítem de seguridad", () => {
  const c = calificarEapi(dec("AEI1-G0000000-D000000000300000000000-P000000000000000-S0"));
  assert.equal(c.flags.filter((f) => f.lvl === "alert").length, 1); assert.match(c.flags[0].t, /desesperanza/);
  assert.deepEqual([c.dass.dep.raw, c.dass.dep.x2, c.dass.dep.band.label], [3, 6, "Normal"]);
});

caso("D.6 Entradas inválidas", () => {
  assert.equal(decodificarEapi("AEI1-G123"), null);
  assert.equal(decodificarEapi("AEI1-G3222312-D232120221131232112201-P323231323132312"), null);
  assert.equal(decodificarEapi("AEI1-G3222312-D232120221131232112201-P323231323132315-S0"), null);
  const o = decodificarEapi("AEI1-G3222312-D232120221131232112201-P323231323132312-S0-O123");
  assert.ok(o); assert.equal(o.docs, null);
  const z = (n) => Array(n).fill(0);
  assert.equal(validarEapi({ gad: z(7), dass: z(21), ptq: z(15), safety: 0 }, COMPLETA).ok, true);
  assert.equal(validarEapi({ gad: [5, 0, 0, 0, 0, 0, 0], dass: z(21), ptq: z(15), safety: 0 }, COMPLETA).ok, false);
  assert.equal(validarEapi({ gad: z(7), dass: z(21), ptq: z(15), safety: 0 }, CON_DOCS).ok, false); // DOCS activo y faltante
});

caso("E.1 Escalas por separado: validación, calificación y avance", () => {
  const z = (n) => Array(n).fill(0);
  // Solo GAD-7: no exige las demás y las guarda en null.
  const v = validarEapi({ gad: [3, 2, 2, 2, 3, 1, 2], dass: z(21), safety: 0, func: 2 }, ["gad"]);
  assert.equal(v.ok, true);
  assert.deepEqual([v.datos.dass, v.datos.ptq, v.datos.docs, v.datos.func], [null, null, null, 2]);
  assert.deepEqual(v.datos.modulos, ["GAD-7"]);
  assert.equal(validarEapi({ safety: 0 }, ["ptq"]).ok, false);
  // Solo PTQ: func se descarta (pertenece al GAD-7).
  const p = validarEapi({ ptq: z(15), safety: 1, func: 3 }, ["ptq"]);
  assert.equal(p.ok, true); assert.equal(p.datos.func, null);
  const c = calificarEapi(v.datos);
  assert.deepEqual(c.modulos, ["gad"]);
  assert.equal(c.gad.total, 15); assert.equal(c.dass, null); assert.equal(c.ptq, null);
  assert.deepEqual(c.dx.map((x) => x.id), ["tag"]);
  // Avance según escalas asignadas.
  const b = limpiarBorradorEapi({ gad: [1, 1, null], safety: 0 });
  assert.deepEqual(avanceEapi(b, ["gad"]), { respondidas: 3, total: 8 });
  assert.deepEqual(avanceEapi(b, COMPLETA), { respondidas: 3, total: 44 });
  assert.deepEqual(avanceEapi(b, CON_DOCS).total, 64);
  // Opciones: formato nuevo y compatibilidad con { docs: true }.
  assert.deepEqual(modulosDeOpciones({ modulos: ["docs", "gad", "x"] }), ["gad", "docs"]);
  assert.deepEqual(modulosDeOpciones({ docs: true }), CON_DOCS);
  assert.deepEqual(modulosDeOpciones({}), COMPLETA);
  assert.deepEqual(modulosDeOpciones({ modulos: [] }), COMPLETA);
});

caso("E.2 Informe unificado y separado", () => {
  const z = (n) => Array(n).fill(0);
  const gad = validarEapi({ gad: [3, 2, 2, 2, 3, 1, 2], safety: 0, func: 2 }, ["gad"]).datos;
  const dass = validarEapi({ dass: dec("AEI1-G0000000-D232120221131232112201-P000000000000000-S0").dass, safety: 1 }, ["dass"]).datos;
  const u = unirEapi([gad, dass]);
  assert.equal(u.gad.length, 7); assert.equal(u.dass.length, 21); assert.equal(u.ptq, null);
  assert.equal(u.safety, 1); assert.equal(u.func, 2);
  const cu = calificarEapi(u);
  assert.deepEqual(cu.modulos, ["gad", "dass"]);
  assert.ok(cu.flags.some((f) => /Ansiedad DASS|GAD-7 positivo/.test(f.t)) || cu.dx.length > 0);
  // Informe separado: solo DASS-21.
  const s = soloModuloEapi(u, "dass");
  assert.deepEqual(calificarEapi(s).modulos, ["dass"]); assert.equal(s.func, null); assert.equal(s.safety, 1);
  // Siglas explicadas en la primera mención.
  const html = informeEapiHtml({ datos: u, nombre: "Prueba", fecha: "2026-11-01" }, null, "", { gad: "2026-11-01", dass: "2026-10-20" });
  assert.match(html, /Escala del Trastorno de Ansiedad Generalizada de 7 ítems \(GAD-7/);
  assert.match(html, /Escalas de Depresión, Ansiedad y Estrés de 21 ítems \(DASS-21\)/);
  assert.match(html, /Cuestionario de Salud del Paciente de 9 ítems \(PHQ-9/);
  assert.match(html, /<b>DSM-5-TR<\/b>: Manual Diagnóstico/);
  assert.doesNotMatch(html, /Cuestionario de Pensamiento Perseverativo/); // PTQ no aplicado
  assert.ok(html.indexOf("(GAD-7") < html.indexOf("GAD-7 ·"), "la sigla se define antes de usarse sola");
  // Este caso tiene 3 o más áreas «para trabajar primero» (carga alta): aparece «conexion».
  assert.deepEqual(areasEapi(u).map((a) => a.id), ["conexion", "gad", "str", "anx", "dep", "pasos"]);
  assert.deepEqual(areasEapi(u, true).map((a) => a.id), ["evolucion", "conexion", "gad", "str", "anx", "dep", "pasos"]);
  // Todo con z(): sin error.
  assert.ok(informeEapiHtml({ datos: validarEapi({ docs: z(20), safety: 0 }, ["docs"]).datos, nombre: "", fecha: "" }).includes("DOCS"));
});

caso("E.3 Evolución entre aplicaciones (ítem por ítem y por escala)", () => {
  const a = dec("AEI1-G3222312-D232120221131232112201-P323231323132312-S0-F2-RDEMO1"); // actual
  const p = dec("AEI1-G3333323-D332231332232333223312-P434342434243423-S1-F3-RDEMO1"); // anterior
  const ev = evolucionEapi(a, p);
  const g = ev.escalas.find((e) => e.id === "gad");
  assert.deepEqual([g.antes, g.ahora, g.delta, g.tendencia], [20, 15, -5, "mejora"]);
  assert.equal(ev.escalas.find((e) => e.id === "dass-dep").tendencia, "mejora"); // Extremadamente severo → Moderado
  assert.equal(ev.escalas.find((e) => e.id === "dass-anx").tendencia, "igual"); // misma banda
  assert.equal(ev.escalas.find((e) => e.id === "ptq").tendencia, "mejora"); // clínico → elevado
  assert.equal(ev.global, "mejora");
  assert.equal(ev.items.length, 7 + 21 + 15);
  assert.equal(ev.resumenItems.mejora + ev.resumenItems.igual + ev.resumenItems.empeora, 43);
  assert.deepEqual(ev.seguridad, { antes: 1, ahora: 0, tendencia: "mejora" });
  // Al revés: empeora; y escalas sin coincidencia no se comparan.
  assert.equal(evolucionEapi(p, a).global, "empeora");
  const soloPtq = { ...a, gad: null, dass: null };
  assert.deepEqual(evolucionEapi(soloPtq, p).modulos, ["ptq"]);
  // Informes: profesional con evolución arriba y detalle por ítem; paciente con frase de evolución.
  const html = informeEapiHtml({ datos: a, nombre: "Ana", fecha: "2026-11-01" }, { datos: p, nombre: "Ana", fecha: "2026-10-01" });
  assert.match(html, /Evolución desde la evaluación anterior/);
  assert.match(html, /Evolución ítem por ítem/);
  assert.ok(html.indexOf("Evolución desde") < html.indexOf("Señales de alarma y observaciones"));
  assert.match(html, /<b>MCID<\/b>/);
  const inf = informePacienteEapi(a, opcionesPorDefectoEapi(a), { paciente: "Ana", fechaAplicacion: "2026-11-01", notas: "", profesional: "X", anterior: { datos: p, fecha: "2026-10-01" } });
  assert.match(inf.evolucion.titulo, /hay mejoría/);
  assert.match(inf.resultados.find((r) => r.area === "Preocupación y ansiedad").texto, /Comparado con su evaluación del .*: ha mejorado/);
  // Evolución robusta: historial de 3 aplicaciones, nivel antes → ahora, preguntas destacadas.
  const p0 = dec("AEI1-G3333333-D333333333333333333333-P444444444444444-S0"); // primera, la más alta
  const inf3 = informePacienteEapi(a, opcionesPorDefectoEapi(a), {
    paciente: "Ana", fechaAplicacion: "2026-11-01", notas: "", profesional: "X",
    anterior: { datos: p, fecha: "2026-10-01" },
    historial: [{ datos: p0, fecha: "2026-09-01" }, { datos: p, fecha: "2026-10-01" }],
  });
  const evp = inf3.evolucion;
  assert.equal(evp.fechas.length, 3);
  const gadF = evp.areas.find((x) => x.area === "Preocupación y ansiedad");
  assert.deepEqual(gadF.puntos.map((x) => x.nivel), ["Alto", "Alto", "Alto"]); // 21, 20, 15
  assert.equal(gadF.tendencia, "mejora");
  assert.match(gadF.frase, /Bajaron sus molestias, aunque sigue en nivel alto\. Desde su primera evaluación .* se mantiene en el mismo nivel/);
  const dep = evp.areas.find((x) => x.area === "Tristeza y desgano");
  assert.match(dep.frase, /Pasó de muy alto a moderado desde la evaluación anterior\. Desde su primera evaluación .* pasó de muy alto a moderado, un avance importante/);
  assert.ok(evp.mejoras.length > 0 && evp.mejoras.length <= 4);
  assert.match(evp.resumen, /últimas 3 evaluaciones/);
  // No se citan los ítems de desesperanza (DASS 10 y 21).
  const D = dec("AEI1-G0000000-D000000000300000000003-P000000000000000-S0");
  const D0 = dec("AEI1-G0000000-D000000000000000000000-P000000000000000-S0");
  const infD = informePacienteEapi(D, opcionesPorDefectoEapi(D), { paciente: "A", fechaAplicacion: "2026-11-01", notas: "", profesional: "X", anterior: { datos: D0, fecha: "2026-10-01" } });
  assert.equal(infD.evolucion.atencion.length, 0);
  // Se puede quitar del informe.
  const sinEv = informePacienteEapi(a, { ...opcionesPorDefectoEapi(a), incluir: { ...opcionesPorDefectoEapi(a).incluir, evolucion: false } }, { paciente: "A", fechaAplicacion: "2026-11-01", notas: "", profesional: "X", anterior: { datos: p, fecha: "2026-10-01" } });
  assert.equal(sinEv.evolucion, undefined);
});

/* ===================== Informe para el paciente v2 ===================== */
const MAX = { gad: Array(7).fill(3), dass: Array(21).fill(3), ptq: Array(15).fill(4), docs: Array(20).fill(4), safety: 0, func: 3 };
const CERO = { gad: Array(7).fill(0), dass: Array(21).fill(0), ptq: Array(15).fill(0), docs: Array(20).fill(0), safety: 0, func: 0 };
const EXTRA = { paciente: "Ana", fechaAplicacion: "2026-11-01", notas: "", profesional: "X" };
const informe = (d, ant, o) => informePacienteEapi(d, o ?? opcionesPorDefectoEapi(d), { ...EXTRA, anterior: ant ? { datos: ant, fecha: "2026-10-01" } : null });
const textoTodo = (inf) => [inf.destacado?.titulo, inf.destacado?.texto, ...inf.resultados.flatMap((r) => [r.area, r.nivel, r.texto])].join("\n");
const seccion = (texto, desde, hasta) => { const a = texto.indexOf(desde); const b = texto.indexOf(hasta, a); return a < 0 ? "" : texto.slice(a, b < 0 ? undefined : b); };

caso("F.1 Informe del paciente v2: peor caso pasa leerInformePaciente sin recortes y dentro de los límites", () => {
  const inf = informe(MAX, CERO);
  const leido = leerInformePaciente(JSON.parse(JSON.stringify(inf)));
  assert.equal(JSON.stringify(leido).length, JSON.stringify(inf).length, "leerInformePaciente recortó contenido");
  assert.equal(leido.resultados.length, inf.resultados.length);
  inf.resultados.forEach((r, i) => assert.equal(leido.resultados[i].texto.length, r.texto.length, `recorte en ${r.area}`));
  assert.equal(leido.destacado.texto, "");
  assert.equal(leido.destacado.titulo, "Lo más importante");
  assert.ok(Buffer.byteLength(JSON.stringify(inf), "utf8") < 60000);
  for (const r of inf.resultados) assert.ok(r.texto.length < 4000, `${r.area}: ${r.texto.length} caracteres`);
  assert.deepEqual(inf.destacado, { titulo: "Lo más importante", texto: "" }); // v2.1: el recuadro no tiene texto
  assert.ok(!inf.resultados.some((r) => r.area === "Lo que está a su favor")); // v2.1: no existe esa tarjeta
  assert.ok(inf.evolucion);
  // Con DOCS y todas las áreas: conexión + 6 áreas + próximos pasos.
  assert.deepEqual(inf.resultados.map((r) => r.area), // Con riesgo marcado (desesperanza alta) y el ánimo alto, «Tristeza y desgano» va primero.
  ["Cómo se conectan sus resultados", "Tristeza y desgano", "Preocupación y ansiedad", "Estrés y ansiedad", "Tensión y palpitaciones", "Pensamientos que vuelven", "Pensamientos o rituales repetitivos", "Sus próximos pasos"]);
  const globalJson = Buffer.byteLength(JSON.stringify(inf), "utf8");
  console.log(`  tamaño máximo ${globalJson} bytes; tarjeta más larga ${Math.max(...inf.resultados.map((r) => r.texto.length))} caracteres`);
});

caso("F.2 Todo en cero: solo fortalezas, sin lenguaje de alarma", () => {
  const inf = informe(CERO);
  assert.deepEqual(inf.resultados.map((r) => r.tono), Array(6).fill("bien"));
  assert.deepEqual(inf.resultados.map((r) => r.nivel), Array(6).fill("A su favor")); // las áreas bajas siguen como tarjetas breves
  assert.ok(!inf.resultados.some((r) => r.area === "Lo que está a su favor"));
  assert.ok(!inf.resultados.some((r) => r.area === "Sus próximos pasos"));
  assert.doesNotMatch(textoTodo(inf), /prioridad|alarma|urgente|grave|intens|riesgo|peligro|preocupante|desborda|alto\b/i);
  assert.equal(inf.destacado.texto, "");
  // Con una sola escala en cero sale su tarjeta breve «A su favor».
  const una = informe({ ...CERO, dass: null, ptq: null, docs: null }).resultados;
  assert.equal(una.length, 1);
  assert.equal(una[0].nivel, "A su favor");
});

caso("F.3 Las tarjetas van de mayor a menor nivel (bajas al final); alto en ámbar", () => {
  // GAD leve (7), estrés muy alto, ansiedad moderada (sin carga alta: solo 2 áreas «para trabajar primero»), depresión normal, PTQ alto, DOCS bajo.
  const dass = Array(21).fill(0);
  [1, 6, 8, 11, 12, 14, 18].forEach((n) => (dass[n - 1] = 3)); // estrés 21 → ×2 = 42 muy alto
  [2, 4, 7].forEach((n) => (dass[n - 1] = 2)); dass[8] = 1; // ansiedad 7 → ×2 = 14 moderado
  const d = { gad: [1, 1, 1, 1, 1, 1, 1], dass, ptq: Array(15).fill(3), docs: Array(20).fill(0), safety: 0, func: 0 };
  const inf = informe(d);
  assert.deepEqual(inf.resultados.map((r) => r.area), ["Estrés y ansiedad", "Pensamientos que vuelven", "Tensión y palpitaciones", "Preocupación y ansiedad", "Tristeza y desgano", "Pensamientos o rituales repetitivos", "Sus próximos pasos"]);
  const area = (n) => inf.resultados.find((r) => r.area === n);
  assert.equal(area("Estrés y ansiedad").tono, "atencion"); // prioridad alta → ámbar
  assert.equal(area("Estrés y ansiedad").nivel, "Para trabajar primero");
  assert.equal(area("Pensamientos que vuelven").nivel, "Para trabajar primero");
  assert.deepEqual([area("Tensión y palpitaciones").nivel, area("Tensión y palpitaciones").tono], ["Para trabajar", "atencion"]);
  assert.deepEqual([area("Preocupación y ansiedad").nivel, area("Preocupación y ansiedad").tono], ["Para cuidar", "leve"]);
  assert.deepEqual([area("Tristeza y desgano").nivel, area("Tristeza y desgano").tono], ["A su favor", "bien"]);
  assert.ok(!inf.resultados.some((r) => r.area === "Cómo se conectan sus resultados")); // sin carga alta
  assert.ok(!inf.resultados.some((r) => r.tono === "alto"));
  // «Próximos pasos»: 3 como máximo, numerados, con cierre realista.
  const pasos = area("Sus próximos pasos").texto;
  assert.equal((pasos.match(/^\d\. /gm) ?? []).length, 3);
  assert.match(pasos, /El cambio es gradual/);
  // La tabla de evolución conserva sus niveles y colores.
  const p0 = { ...d, dass: Array(21).fill(0) };
  assert.ok(informe(d, p0).evolucion.areas.some((x) => x.puntos.some((q) => q?.tono === "alto")));
  // Puntuaciones solo si se activan; las áreas nuevas y las existentes se pueden quitar.
  assert.equal(area("Estrés y ansiedad").puntuacion, undefined);
  const conPunt = informe(d, null, { ...opcionesPorDefectoEapi(d), mostrarPuntuaciones: true });
  assert.match(conPunt.resultados.find((r) => r.area === "Estrés y ansiedad").puntuacion, /de 42/);
  const o = opcionesPorDefectoEapi(d);
  assert.equal(o.incluir.afavor, undefined); assert.equal(o.incluir.pasos, true); // v2.1: ya no existe «a su favor»
  assert.ok(!areasEapi(d).some((a) => a.id === "afavor"));
  const sin = informe(d, null, { ...o, incluir: { ...o.incluir, pasos: false, gad: false } });
  assert.ok(!sin.resultados.some((r) => ["Sus próximos pasos", "Preocupación y ansiedad"].includes(r.area)));
  // Con evaluación anterior, la mejoría sigue en la comparación de cada tarjeta.
  const mejor = informe({ ...d, dass: Array(21).fill(0) }, d);
  assert.match(mejor.resultados.find((r) => r.area === "Estrés y ansiedad").texto, /Comparado con su evaluación del .*: ha mejorado/);
});

caso("F.4 Nunca aparecen los ítems 10 y 21 del DASS-21 ni la pregunta de seguridad", () => {
  const dass = Array(21).fill(0);
  dass[9] = 3; dass[20] = 3; // desesperanza al máximo, el resto en cero
  const dassMax = Array(21).fill(3);
  for (const d of [{ ...CERO, dass, safety: 3 }, { ...MAX, safety: 3 }, { ...MAX, dass: dassMax, safety: 3 }]) {
    const inf = informe(d, { ...CERO });
    const todo = JSON.stringify(inf) + JSON.stringify(inf.evolucion);
    for (const t of [DASS21[9], DASS21[20], SAFETY.t, "estaría mejor muerto", "nada por que vivir", "ningún sentido", "lastimarse"]) assert.ok(!todo.includes(t), `aparece: ${t}`);
    assert.doesNotMatch(todo, /sin sentido|nada por que vivir|suicid|morir|muert/i);
  }
});

caso("F.5 Sin palabras prohibidas, siglas ni etiquetas con las opciones por defecto", () => {
  for (const d of [MAX, CERO, { ...MAX, docs: null }, { gad: [2, 2, 2, 2, 2, 2, 2], dass: Array(21).fill(1), ptq: Array(15).fill(2), docs: Array(20).fill(1), safety: 0, func: 1 }]) {
    const todo = textoTodo(informe(d, CERO));
    assert.doesNotMatch(todo, /trastorno|se curar[aá]|garantiz|deber[ií]a ser capaz|desaparecer[aá]|\bcura\b/i);
    assert.doesNotMatch(todo, /GAD-7|DASS|PTQ|DOCS|TOC\b|TCC|PHQ/);
    assert.doesNotMatch(todo, /ansioso|deprimido|obsesivo|depresi[oó]n\b/i); // etiquetas: se describen conductas y procesos
    assert.doesNotMatch(todo, /\(a\)|\(o\)/); // sin marcas de género
  }
});

caso("F.6 Cada tarjeta de nivel leve o superior trae «Su oportunidad de cambio:» y «Para empezar esta semana:»", () => {
  const muestras = [
    MAX,
    { gad: [1, 1, 1, 1, 1, 1, 1], dass: Array(21).fill(1), ptq: Array(15).fill(2), docs: Array(20).fill(1), safety: 0, func: 0 }, // leve / elevado / moderado
    { gad: [2, 2, 2, 1, 1, 1, 1], dass: Array(21).fill(2), ptq: Array(15).fill(3), docs: Array(20).fill(3), safety: 0, func: 0 },
    CERO,
  ];
  let con = 0;
  for (const d of muestras) {
    const inf = informe(d);
    // En carga alta (3 o más áreas «para trabajar primero») solo las dos áreas más altas llevan pasos.
    const altas = inf.resultados.filter((r) => r.nivel === "Para trabajar primero").map((r) => r.area);
    const conPasos = altas.length >= 3 ? altas.slice(0, 2) : null;
    for (const r of inf.resultados) {
      if (["Lo que está a su favor", "Sus próximos pasos"].includes(r.area)) continue;
      if (r.nivel === "A su favor") {
        assert.doesNotMatch(r.texto, /Para empezar esta semana:/); // nivel bajo: breve
        assert.ok(r.texto.length < 400, `${r.area} (bajo) muy largo`);
        continue;
      }
      if (r.nivel === "Para entender") continue; // tarjeta «Cómo se conectan sus resultados»
      con++;
      const sinPasos = conPasos && !conPasos.includes(r.area);
      if (sinPasos) assert.doesNotMatch(r.texto, /Para empezar esta semana:/);
      for (const sub of ["Lo que muestran sus respuestas:", "Por qué pasa:", "Su oportunidad de cambio:", ...(sinPasos ? ["Lo iremos trabajando después de lo primero:"] : ["Para empezar esta semana:", "Lo que trabajaremos juntos:"])]) assert.ok(r.texto.split("\n").includes(sub), `${r.area} (${r.nivel}) sin «${sub}»`);
      assert.match(r.texto, /^• /m);
    }
  }
  assert.ok(con >= 14, `solo ${con} tarjetas verificadas`);
});

caso("F.7 Lo que más marcó parte de las respuestas altas; el nivel alto acompaña más y da menos pasos", () => {
  // Solo la pregunta «No ha sido capaz de parar o controlar su preocupación» alta y el resto bajo.
  const g = informe({ ...CERO, gad: [0, 3, 0, 0, 0, 0, 0, ] .map((v, i) => (i === 1 ? 3 : 2)), }).resultados.find((r) => r.area === "Preocupación y ansiedad");
  assert.match(g.texto, /Lo que más marcó:\n• Le ha costado soltar las preocupaciones una vez que empiezan\./);
  assert.match(g.texto, /No todo depende de usted/);
  assert.ok(g.texto.match(/^• /gm).length >= 3);
  // Las respuestas por debajo del umbral no se citan.
  const poco = informe({ ...CERO, gad: [1, 1, 1, 1, 1, 1, 1] }).resultados.find((r) => r.area === "Preocupación y ansiedad");
  assert.doesNotMatch(poco.texto, /Lo que más marcó/);
  // Intensidad y acompañamiento.
  const pasosDe = (nivelGad) => {
    const v = [[1, 1, 1, 1, 1, 1, 1], [2, 2, 2, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3, 3]][nivelGad];
    const t = informe({ ...CERO, gad: v }).resultados.find((r) => r.area === "Preocupación y ansiedad").texto;
    return { n: seccion(t, "Para empezar esta semana:", "Lo que trabajaremos").match(/^• /gm).length, t };
  };
  const [leve, mod, alto] = [pasosDe(0), pasosDe(1), pasosDe(2)];
  assert.ok(leve.n >= alto.n && mod.n >= alto.n && alto.n === 2);
  assert.match(alto.t, /prioridad.*de cerca/);
  assert.notEqual(leve.t, mod.t); assert.notEqual(mod.t, alto.t);
});

caso("F.8 DOCS alto: los primeros pasos son solo de observación", () => {
  const inf = informe({ ...CERO, docs: Array(20).fill(4) });
  const r = inf.resultados.find((x) => x.area === "Pensamientos o rituales repetitivos");
  assert.equal(r.nivel, "Para trabajar primero");
  const pasos = seccion(r.texto, "Para empezar esta semana:", "Lo que trabajaremos juntos:");
  assert.match(pasos, /Anote/);
  assert.doesNotMatch(pasos, /expon|enfrent|resist|no lo haga|deje de|evite|sin hacer|acérquese|intente/i);
  assert.match(r.texto, /guía|acompañ/);
  // También en el nivel moderado y en «Sus próximos pasos» cuando DOCS es el área principal.
  const mod = informe({ ...CERO, docs: Array(20).fill(0).map((_, i) => (i < 5 ? 3 : 1)) });
  const rm = mod.resultados.find((x) => x.area === "Pensamientos o rituales repetitivos");
  assert.doesNotMatch(seccion(rm.texto, "Para empezar esta semana:", "Lo que trabajaremos juntos:"), /expon|enfrent|resist|deje de|evite|sin hacer/i);
  const sp = inf.resultados.find((x) => x.area === "Sus próximos pasos").texto;
  assert.doesNotMatch(sp, /expon|enfrent|resist|deje de|evite|sin hacer/i);
});

caso("F.9 Contenido: los 7 + 19 + 3 + 4 pares por ítem existen y el formulario público no importa el contenido", async () => {
  const c = await import("../src/lib/evaluaciones/eapi/contenido-paciente.ts");
  assert.equal(c.PARES_GAD.length, GAD7.length);
  assert.equal(Object.keys(c.PARES_DASS).length, 19);
  assert.ok(!("10" in c.PARES_DASS) && !("21" in c.PARES_DASS));
  assert.deepEqual(Object.keys(c.PARES_PTQ).sort(), ["capture", "core", "unprod"]);
  assert.deepEqual(Object.keys(c.PARES_DOCS).sort(), DOCS.map((d) => d.id).sort());
  assert.equal(PTQ.length, 15);
  const niveles = { gad: 3, str: 4, anx: 4, dep: 4, ptq: 2, docs: 2 };
  for (const [id, n] of Object.entries(niveles)) {
    assert.equal(c.CONTENIDO_AREAS[id].niveles.length, n, id);
    c.CONTENIDO_AREAS[id].niveles.forEach((x) => assert.ok(x.pasos.length >= 2 && x.pasos.length <= 3 && x.indicador && x.porQue && x.oportunidad && x.juntos));
  }
  const { readdirSync, readFileSync } = await import("node:fs");
  for (const f of ["src/components/evaluaciones/formularios.tsx", "src/components/evaluaciones/formulario-comun.tsx"]) {
    try { assert.doesNotMatch(readFileSync(f, "utf8"), /contenido-paciente/); } catch (e) { if (e.code !== "ENOENT") throw e; }
  }
  void readdirSync;
});

caso("F.10 Carga alta (adenda): prioridades en vez de gravedad, conexión, solo 2 áreas con pasos, ayuda serena", () => {
  const dass = Array(21).fill(0);
  [3, 5, 13, 16, 17].forEach((n) => (dass[n - 1] = 3)); // depresión muy alta
  [2, 4, 7, 9, 15, 19, 20].forEach((n) => (dass[n - 1] = 3)); // ansiedad muy alta
  [1, 6, 8, 11, 12].forEach((n) => (dass[n - 1] = 2)); // estrés moderado (10 → ×2 = 20)
  const d = { gad: [3, 3, 3, 2, 2, 2, 2], dass, ptq: Array(15).fill(3), docs: null, safety: 1, func: 2 };
  const o = opcionesPorDefectoEapi(d);
  assert.equal(o.incluirAyuda, true);
  const inf = informe(d, null, o);
  const nombres = inf.resultados.map((r) => r.area);
  assert.ok(inf.resultados.every((r) => r.tono !== "alto"), "hay tono alto");
  assert.ok(inf.resultados.every((r) => !/^(Alto|Muy alto|Moderado|Leve)$/.test(r.nivel)), "hay insignia de gravedad");
  assert.equal(inf.resultados.filter((r) => r.nivel === "Para trabajar primero").length, 4);
  assert.equal(inf.resultados.find((r) => r.area === "Estrés y ansiedad").nivel, "Para trabajar");
  // Tarjeta de conexión, antes de las áreas, solo con áreas altas.
  assert.equal(nombres[0], "Cómo se conectan sus resultados");
  const con = inf.resultados[0].texto;
  assert.match(con, /la preocupación, la tensión del cuerpo, los pensamientos que vuelven y el desánimo/);
  assert.match(con, /mejorar un punto del círculo/);
  assert.deepEqual(areasEapi(d).map((a) => a.id), ["conexion", "gad", "str", "anx", "dep", "ptq", "pasos"]);
  // Solo las DOS áreas más altas (las dos primeras tras la conexión) llevan «Para empezar esta semana:».
  const conPasos = inf.resultados.filter((r) => /Para empezar esta semana:/.test(r.texto)).map((r) => r.area);
  assert.equal(conPasos.length, 2);
  assert.deepEqual(conPasos, nombres.slice(1, 3));
  for (const r of inf.resultados.slice(3, -1)) assert.match(r.texto, /Lo iremos trabajando después de lo primero:/);
  assert.ok(inf.resultados.slice(1, 3).every((r) => (r.texto.match(/^• /gm) ?? []).length > 0));
  // «Sus próximos pasos»: máximo 2.
  const sp = inf.resultados.find((r) => r.area === "Sus próximos pasos").texto;
  assert.equal((sp.match(/^\d\. /gm) ?? []).length, 2);
  // Recuadro: solo el título (v2.1), también con riesgo marcado; sin consuelo hueco.
  assert.deepEqual(inf.destacado, { titulo: "Lo más importante", texto: "" });
  assert.doesNotMatch(textoTodo(inf), /todo va a estar bien|todo saldrá bien|temporada pesada/i);
  assert.ok(!nombres.includes("Lo que está a su favor"));
  // Se pueden quitar la conexión y los pasos; sin riesgo no aparece la frase de ayuda.
  const q = informe({ ...d, safety: 0 }, null, { ...opcionesPorDefectoEapi({ ...d, safety: 0 }), incluir: { ...o.incluir, conexion: false, pasos: false } });
  assert.ok(!q.resultados.some((r) => ["Cómo se conectan sus resultados", "Sus próximos pasos"].includes(r.area)));
  assert.equal(q.destacado.texto, "");
  // Longitudes y límites también aquí.
  assert.equal(JSON.stringify(leerInformePaciente(JSON.parse(JSON.stringify(inf)))).length, JSON.stringify(inf).length);
  inf.resultados.forEach((r) => assert.ok(r.texto.length < 4000));
});

console.log(`\n${ok} casos correctos (Anexo D + escalas separadas + informe del paciente v2; D.7 se prueba en el navegador).`);
