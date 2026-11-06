// Casos de prueba del Anexo D (EAPI / Batería AEI). Ejecutar: pnpm test:eapi
import assert from "node:assert/strict";
import { calificarEapi, seguimientoEapi, EAPI_SIN_DX } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { evolucionEapi, unirEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { avanceEapi, codificarEapi, decodificarEapi, limpiarBorradorEapi, modulosDeOpciones, validarEapi } from "../src/lib/evaluaciones/eapi/codigo.ts";
import { informeEapiHtml, soloModuloEapi } from "../src/lib/evaluaciones/eapi/informe-html.ts";
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
  assert.deepEqual(areasEapi(u).map((a) => a.id), ["gad", "str", "anx", "dep"]);
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
  assert.match(inf.resultados[0].texto, /Comparado con su evaluación del .*: ha mejorado/);
  // Evolución robusta: historial de 3 aplicaciones, nivel antes → ahora, preguntas destacadas.
  const p0 = dec("AEI1-G3333333-D333333333333333333333-P444444444444444-S0"); // primera, la más alta
  const inf3 = informePacienteEapi(a, opcionesPorDefectoEapi(a), {
    paciente: "Ana", fechaAplicacion: "2026-11-01", notas: "", profesional: "X",
    anterior: { datos: p, fecha: "2026-10-01" },
    historial: [{ datos: p0, fecha: "2026-09-01" }, { datos: p, fecha: "2026-10-01" }],
  });
  const evp = inf3.evolucion;
  assert.equal(evp.fechas.length, 3);
  const gadF = evp.areas.find((x) => x.area === "Preocupación y nerviosismo");
  assert.deepEqual(gadF.puntos.map((x) => x.nivel), ["Alto", "Alto", "Alto"]); // 21, 20, 15
  assert.equal(gadF.tendencia, "mejora");
  assert.match(gadF.frase, /Bajaron sus molestias, aunque sigue en nivel alto\. Desde su primera evaluación .* se mantiene en el mismo nivel/);
  const dep = evp.areas.find((x) => x.area === "Estado de ánimo");
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

console.log(`\n${ok}/9 casos correctos (Anexo D + escalas separadas; D.7 se prueba en el navegador).`);
