// Pruebas del MCEA: el motor traducido debe dar exactamente lo mismo que el
// artefacto original (docs/instrumentos/MCEA_v1.0_artefacto.html) con cientos
// de respuestas simuladas, más validación, informes y registro. Ejecutar: pnpm test:mcea
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { buildPlan, compare, hypotheses, routing, scoreAll, validity } from "../src/lib/evaluaciones/mcea/motor.ts";
import { avanceMcea, datosMceaGuardados, limpiarBorradorMcea, validarMcea } from "../src/lib/evaluaciones/mcea/codigo.ts";
import { informeMceaHtml } from "../src/lib/evaluaciones/mcea/informe-html.ts";
import { AREAS_MCEA, informePacienteMcea, opcionesPorDefectoMcea } from "../src/lib/evaluaciones/mcea/informe-paciente.ts";
import { INS, RS, MCEA_CRISIS } from "../src/lib/evaluaciones/mcea/contenido.ts";
import { GAD7, GAD_LABELS, PTQ, PTQ_LABELS } from "../src/lib/evaluaciones/eapi/escalas.ts";
import { leerInformePaciente } from "../src/lib/evaluaciones/informe-paciente.ts";
import { REGISTRO } from "../src/lib/evaluaciones/registro.ts";
import { REGISTRO_SERVIDOR } from "../src/lib/evaluaciones/registro-servidor.ts";
import { deteriorosFiables, evolucionDelPaciente } from "../src/lib/evaluaciones/evolucion-paciente.ts";
import { solapesAlAsignar } from "../src/lib/evaluaciones/registro.ts";
import { perfilIntegrado } from "../src/lib/evaluaciones/perfil-integrado.ts";

// Motor original del artefacto, cargado tal cual (rama module.exports, sin interfaz).
const html = fs.readFileSync(new URL("../docs/instrumentos/MCEA_v1.0_artefacto.html", import.meta.url), "utf8");
const codigo = html.split("<script>")[1].split("</script>")[0];
const mod = { exports: {} };
vm.runInNewContext(codigo, { module: mod, console, Math, Date, JSON, Object, Array, Set, String, Number });
const O = mod.exports;

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };

/** Responde siguiendo el plan con un generador; devuelve el estado propio y el equivalente del original. */
function simular(semilla, modo = "adapt", anchor = []) {
  let x = semilla;
  const r = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const e = { modo, anchor, focus: [], gate: null, answers: {}, risk: { self: null }, tr: null };
  const focos = ["nose", "animo", "ansiedad", "pensamientos", "pareja", "metas"];
  for (let pos = 0, g = 0; g < 400; g++) {
    const st = buildPlan(e)[pos];
    if (!st || st.t === "end") break;
    if (st.t === "focus") e.focus = focos.filter(() => r() < 0.3);
    else if (st.t === "item") { const top = st.ins === "PHQ9" || st.ins === "GAD7" ? 3 : 4; e.answers[`${st.ins}_${st.i}`] = { v: Math.floor(r() * (top + 1) * (0.4 + r() * 0.8)) % (top + 1), t: 800 + Math.floor(r() * 5000) }; }
    else if (st.t === "risk") e.risk.self = ["no", "duda", "si"][Math.floor(r() * 3)];
    else if (st.t === "gate") e.gate = ["si", "ex", "no"][Math.floor(r() * 3)];
    else if (st.t === "tr") e.tr = r() < 0.5 ? { skip: true } : { sit: "s", emo: ["Culpa"], int: 60, pen: "p", f1: "", f2: "", beh: [], dis: ["Catastrofismo"] };
    pos++;
  }
  const orig = { mode: modo, anchor, focus: e.focus, gate: e.gate, answers: e.answers, risk: { self: e.risk.self, ack: null }, tr: e.tr, status: "completa" };
  return { e, orig };
}
const limpio = (x) => JSON.parse(JSON.stringify(x));

caso("Equivalencia con el original: plan, ramificación, puntajes e hipótesis (600 casos)", () => {
  for (let s = 1; s <= 600; s++) {
    const modo = s % 7 === 0 ? "full" : "adapt";
    const anchor = s % 11 === 0 ? ["PTQ", "RP"] : [];
    const { e, orig } = simular(s, modo, anchor);
    assert.deepEqual(limpio(buildPlan(e)), limpio(O.buildPlan(orig)), `plan ${s}`);
    assert.deepEqual(limpio(routing(e)), limpio(O.routing(orig)), `ruta ${s}`);
    const mio = scoreAll(e), suyo = O.scoreAll(orig);
    assert.deepEqual(limpio(mio), limpio(suyo), `puntajes ${s}`);
    assert.deepEqual(hypotheses(e, mio), limpio(O.hypotheses(orig, suyo)), `hipótesis ${s}`);
    assert.deepEqual(validity(e, false), limpio(O.validity(orig)), `validez ${s}`);
  }
});

caso("Equivalencia del cambio fiable (comparación T1 → T2)", () => {
  O.DB = O.freshDB();
  for (let s = 1; s <= 150; s++) {
    const a = simular(s), b = simular(s + 1000, "adapt", ["PAN", "PTQ", "AS", "RP", "DC", "GAD7"]);
    const mio = compare(a.e, b.e), suyo = O.compare({ ...a.orig, n: 1 }, { ...b.orig, n: 2 });
    assert.deepEqual(mio.rows.map((r) => [r.id, r.d, r.cls]), limpio(suyo.rows.map((r) => [r.id, r.d, r.cls])), `cmp ${s}`);
    assert.deepEqual(mio.skipped, limpio(suyo.skipped));
  }
});

caso("Validación: exige el plan completo, descarta módulos que ya no aplican, permite detenerse en riesgo", () => {
  const { e } = simular(5);
  const v = validarMcea({ ...e, answers: { ...e.answers, RP_1: { v: 3, t: 1 } }, gate: e.gate ?? "no" }, { modo: "adapt", anchor: [] });
  assert.ok(v.ok);
  if (!routing(v.datos).RP.open) assert.equal(v.datos.answers.RP_1, undefined);
  const falta = { ...e.answers }; delete falta.PHQ9_3;
  assert.equal(validarMcea({ ...e, answers: falta }, { modo: "adapt", anchor: [] }).ok, false);
  // Detenida en la pantalla de riesgo: basta con el PHQ-9 y la respuesta de riesgo.
  const phq = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [`PHQ9_${i}`, { v: i === 9 ? 2 : 1, t: 2000 }]));
  const d = validarMcea({ answers: phq, risk: { self: "si" }, estado: "detenida" }, {});
  assert.ok(d.ok); assert.equal(d.datos.estado, "detenida");
  // Valores fuera de escala o IDs inventados no pasan.
  assert.equal(limpiarBorradorMcea({ answers: { PHQ9_1: { v: 4 }, XX_1: { v: 1 } } }).answers.PHQ9_1, undefined);
  // El modo lo fija el enlace, no el navegador.
  assert.equal(validarMcea({ ...e, modo: "full" }, { modo: "adapt", anchor: [] }).ok ? "adapt" : "", "adapt");
  assert.deepEqual(avanceMcea(limpiarBorradorMcea({ answers: { PHQ9_1: { v: 1, t: 1 } } })).respondidas, 1);
});

caso("Servidor: alerta de seguridad con el ítem 9; registro: alarma, reevaluación anclada y evolución", () => {
  const phq = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [`PHQ9_${i}`, { v: 2, t: 2000 }]));
  const v = REGISTRO_SERVIDOR.mcea.validar({ answers: phq, risk: { self: "duda" }, estado: "detenida" }, { modo: "adapt" });
  assert.ok(v.ok); assert.equal(v.alertaSeguridad, 2);
  const { e } = simular(42);
  const datos = validarMcea(e, { modo: "adapt", anchor: [] }).datos;
  const fila = { id: "r1", instrumento: "mcea", datos, fecha: "2026-11-10", createdAt: "2026-11-10T15:00:00Z", respondienteNombre: "Ana" };
  const res = REGISTRO.mcea.resumen(fila);
  assert.equal(res.alarma, (datos.answers.PHQ9_9?.v ?? 0) >= 1);
  assert.match(res.insignia, /PHQ-9 \d+/);
  const nueva = REGISTRO.mcea.opcionesNueva(fila, { modo: "adapt" });
  assert.deepEqual(nueva.anchor, Object.entries(routing(datos)).filter(([, x]) => x.open).map(([k]) => k));
  assert.ok(datosMceaGuardados(datos));
  const ev = evolucionDelPaciente([fila, { ...fila, id: "r2", fecha: "2026-12-10", createdAt: "2026-12-10T15:00:00Z" }]);
  assert.equal(ev.series.find((s) => s.id === "phq9").puntos.length, 2);
});

caso("Informes: clínico con hipótesis y comparación; paciente con secciones, avance y líneas de ayuda", () => {
  const a = validarMcea(simular(7, "full").e, { modo: "full", anchor: [] }).datos;
  const b = validarMcea(simular(8, "full").e, { modo: "full", anchor: [] }).datos;
  const h = informeMceaHtml({ datos: b, nombre: "Ana", fecha: "2026-12-10", minutos: 12 }, { datos: a, nombre: "Ana", fecha: "2026-11-10" });
  assert.match(h, /Hipótesis para explorar/); assert.match(h, /Por qué se abrió cada módulo/); assert.match(h, /Comparación con la aplicación anterior/);
  assert.match(h, /Mostrar respuestas ítem por ítem/);
  const p = informePacienteMcea(b, opcionesPorDefectoMcea(), { paciente: "Ana", fechaAplicacion: "2026-12-10", notas: "", profesional: "M. A.", anterior: { datos: a, fecha: "2026-11-10" } });
  assert.ok(p.resultados.some((r) => r.area === "Ánimo"), "el ánimo siempre tiene tarjeta");
  assert.ok(p.resultados.some((r) => r.area === "Lo que ha cambiado"));
  assert.deepEqual(p.destacado, { titulo: "Lo más importante", texto: "" });
  assert.ok(p.ayuda.some((l) => /1582/.test(l)));
  const leido = leerInformePaciente(JSON.parse(JSON.stringify(p)));
  assert.equal(leido.resultados.length, p.resultados.length, "sobrevive a la publicación");
  assert.doesNotMatch(JSON.stringify(p), /PHQ-9 \d/, "sin puntajes si no se piden");
});

const filaMcea = (id, fecha, phq, gad) => {
  const ans = {};
  for (let i = 1; i <= 9; i++) ans[`PHQ9_${i}`] = { v: i <= phq % 10 ? Math.min(3, Math.ceil(phq / 9)) : 0, t: 2000 };
  const d = validarMcea({ answers: { ...ans, ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [`GAD7_${i}`, { v: gad, t: 2000 }])), ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [`BR_${i}`, { v: 0, t: 2000 }])), ...Object.fromEntries([1, 2, 3, 4].map((i) => [`FR_${i}`, { v: 2, t: 2000 }])), ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`PTQ_${i + 1}`, { v: 1, t: 2000 }])) }, focus: ["ansiedad"], gate: "si", risk: { self: "no" }, tr: { skip: true } }, { modo: "adapt", anchor: [] });
  assert.ok(d.ok, d.error);
  return { id, instrumento: "mcea", datos: d.datos, fecha, createdAt: `${fecha}T10:00:00Z`, respondienteNombre: "Ana" };
};

caso("Deterioro fiable: PHQ-9 ≥ 6 y GAD-7 ≥ 4 entre aplicaciones (de cualquier evaluación)", () => {
  const a = filaMcea("a", "2026-09-01", 0, 1), b = filaMcea("b", "2026-10-01", 0, 2);
  const det = deteriorosFiables(evolucionDelPaciente([a, b]).series);
  assert.deepEqual(det.map((x) => x.sigla), ["GAD-7"], "GAD-7 7 → 14");
  assert.equal(det[0].ahora - det[0].antes, 7);
  const c = filaMcea("c", "2026-11-01", 0, 2);
  assert.equal(deteriorosFiables(evolucionDelPaciente([b, c]).series).length, 0, "sin cambio");
});

caso("Doble aplicación: EAPI abierto o reciente frente a MCEA (GAD-7, PTQ, PHQ-9)", () => {
  const hoy = new Date("2026-11-10T12:00:00Z");
  const abiertos = [{ instrumento: "eapi", opciones: { modulos: ["gad", "ptq"] }, createdAt: "2026-11-08T10:00:00Z" }];
  const s1 = solapesAlAsignar("mcea", { modo: "adapt" }, abiertos, [], hoy);
  assert.equal(s1.length, 1); assert.deepEqual(s1[0].escalas, ["GAD-7", "PTQ"]); assert.equal(s1[0].posibles, true);
  const reciente = filaMcea("r", "2026-11-05", 0, 2);
  const s2 = solapesAlAsignar("eapi", { modulos: ["gad", "dass"] }, [], [reciente], hoy);
  assert.equal(s2.length, 1); assert.deepEqual(s2[0].escalas, ["GAD-7"]); assert.match(s2[0].motivo, /hace 5 días/);
  assert.equal(solapesAlAsignar("eapi", { modulos: ["gad"] }, [], [filaMcea("v", "2026-10-01", 0, 2)], hoy).length, 0, "más de 14 días");
  assert.equal(solapesAlAsignar("eapi", { modulos: ["dass", "docs"] }, abiertos, [reciente], hoy).length, 0, "sin escalas en común");
  assert.equal(solapesAlAsignar("riasec", {}, abiertos, [reciente], hoy).length, 0);
});

caso("Perfil integrado: una medida por área (la más reciente), escalas compartidas unidas, patrones y riesgo", () => {
  // EAPI con GAD-7 (8 de oct.) y MCEA con GAD-7 y PHQ-9 (1 de nov.): el GAD-7 del MCEA es la medida principal de ansiedad.
  const eapi = { id: "e1", instrumento: "eapi", fecha: "2026-10-08", createdAt: "2026-10-08T10:00:00Z", respondienteNombre: "Ana",
    datos: { gad: [1, 1, 1, 1, 1, 1, 1], dass: Array(21).fill(2), safety: 0 } };
  const m1 = filaMcea("m1", "2026-11-01", 0, 2);
  const p = perfilIntegrado([eapi, m1]);
  const ans = p.areas.find((a) => a.id === "ansiedad");
  assert.equal(ans.principal.sigla, "GAD-7"); assert.equal(ans.principal.valor, 14); assert.equal(ans.principal.fecha, "2026-11-01");
  assert.ok(ans.principal.deterioroFiable, "GAD-7 7 → 14 entre EAPI y MCEA");
  assert.deepEqual(ans.otras.map((x) => x.sigla), ["DASS-21 Ans."]);
  assert.equal(p.areas.find((a) => a.id === "animo").principal.sigla, "PHQ-9");
  assert.ok(p.areas.some((a) => a.id === "estres"));
  assert.ok(p.patrones && p.patrones.items.some((x) => /Recursos/.test(x.nombre)));
  assert.ok(p.sintesis.some((s) => /Empeoró claramente \(más que la variación normal\): GAD-7/.test(s)));
  assert.equal(p.riesgo, null);
  assert.equal(p.desde, "2026-10-08"); assert.equal(p.hasta, "2026-11-01");
  // Riesgo: la última aplicación con pregunta de seguridad lo marcó.
  const eapiRiesgo = { ...eapi, id: "e2", fecha: "2026-11-05", createdAt: "2026-11-05T10:00:00Z", datos: { ...eapi.datos, safety: 2 } };
  const p2 = perfilIntegrado([eapi, m1, eapiRiesgo]);
  assert.match(p2.riesgo.texto, /EAPI = 2/); assert.match(p2.sintesis[0], /pregunta de seguridad/);
  assert.equal(perfilIntegrado([]).areas.length, 0);
});

/* ===================== Informe para el paciente v2 ===================== */
const arr = (x, n) => (Array.isArray(x) ? x : Array(n).fill(x));
/** Aplicación completa (modo completo: se abren todos los módulos) con respuestas uniformes o por lista. */
function mcea({ phq = 0, gad = 0, ptq = 0, pan = 0, dc = 0, as = 0, rp = 0, fr = 0, tr = { skip: true }, gate = "si" } = {}) {
  const ans = {};
  const poner = (id, v, n) => arr(v, n).forEach((x, i) => (ans[`${id}_${i + 1}`] = { v: x, t: 2000 }));
  poner("PHQ9", phq, 9); poner("GAD7", gad, 7); poner("BR", 0, 9); poner("PAN", pan, 8); poner("DC", dc, 10);
  poner("PTQ", ptq, 15); poner("AS", as, 12); poner("RP", rp, 12); poner("FR", fr, 4);
  const r = validarMcea({ answers: ans, focus: [], gate, risk: { self: ans.PHQ9_9.v >= 1 ? "duda" : null }, tr }, { modo: "full", anchor: [] });
  assert.ok(r.ok, r.error);
  return r.datos;
}
const largo = (n) => ("Texto muy largo escrito por la persona. ").repeat(60).slice(0, n);
const TR_MAX = { sit: largo(1500), emo: ["Tristeza", "Culpa"], int: 80, pen: largo(1500), f1: "", f2: largo(500), beh: ["Me aislé", "Lo hablé con calma", "Hice algo que me ayudó"], dis: INS.DC.names };
const MAXD = () => mcea({ phq: 3, gad: 3, ptq: 4, pan: 4, dc: 4, as: 4, rp: 4, fr: 4, tr: TR_MAX });
const CEROD = () => mcea({});
const EXTRA = { paciente: "Ana", fechaAplicacion: "2026-11-01", notas: "", profesional: "X" };
const informe = (d, ant, o) => informePacienteMcea(d, o ?? opcionesPorDefectoMcea(), { ...EXTRA, anterior: ant ? { datos: ant, fecha: "2026-10-01" } : null });
const textoTodo = (inf) => [inf.destacado?.titulo, inf.destacado?.texto, ...inf.resultados.flatMap((r) => [r.area, r.nivel, r.texto])].join("\n");
const seccion = (texto, desde, hasta) => { const a = texto.indexOf(desde); const b = texto.indexOf(hasta, a); return a < 0 ? "" : texto.slice(a, b < 0 ? undefined : b); };
const area = (inf, n) => inf.resultados.find((r) => r.area === n);
const AREAS_PUNTUADAS = ["Ánimo", "Preocupación y ansiedad", "Pensamientos que vuelven", "Pensamientos negativos automáticos", "Lo que puede estar frenándole", "En su relación de pareja"];
const MEDIA = () => mcea({ phq: 2, gad: 2, ptq: 3, pan: 2, dc: [3, 0, 0, 3, 0, 0, 0, 0, 0, 0], as: 2, rp: 2, fr: [3, 0, 0, 3], tr: { sit: "Discutimos", emo: ["Culpa"], int: 60, pen: "Todo me sale mal", f1: "", f2: "", beh: ["Evité el tema"], dis: ["Catastrofismo"] } });

caso("V2.1 Peor caso: dentro de los límites, sin recortes de leerInformePaciente y con el recuadro sin texto", () => {
  const inf = informe(MAXD(), CEROD());
  const leido = leerInformePaciente(JSON.parse(JSON.stringify(inf)));
  assert.equal(JSON.stringify(leido).length, JSON.stringify(inf).length, "leerInformePaciente recortó contenido");
  assert.equal(leido.resultados.length, inf.resultados.length);
  inf.resultados.forEach((r, i) => assert.equal(leido.resultados[i].texto.length, r.texto.length, `recorte en ${r.area}`));
  assert.deepEqual(leido.destacado, { titulo: "Lo más importante", texto: "" });
  assert.ok(Buffer.byteLength(JSON.stringify(inf), "utf8") < 60000);
  assert.ok(inf.resultados.length <= 30);
  for (const r of inf.resultados) assert.ok(r.texto.length < 4000, `${r.area}: ${r.texto.length} caracteres`);
  // Con todo al máximo: carga alta, conexión primero y «Sus próximos pasos» al final; ninguna tarjeta genérica de «a su favor».
  assert.equal(inf.resultados[0].area, "Cómo se conectan sus resultados");
  assert.equal(inf.resultados.at(-1).area, "Sus próximos pasos");
  assert.ok(!inf.resultados.some((r) => r.area === "Lo que está a su favor"));
  for (const a of [...AREAS_PUNTUADAS, "Formas de pensar que aparecieron", "Su mapa de un momento difícil", "Sus recursos", "Lo que ha cambiado"]) assert.ok(area(inf, a), `falta ${a}`);
  console.log(`  tamaño máximo ${Buffer.byteLength(JSON.stringify(inf), "utf8")} bytes; tarjeta más larga ${Math.max(...inf.resultados.map((r) => r.texto.length))} caracteres`);
  // Sin carga alta, con todas las formas de pensar: la tarjeta de formas también cabe.
  const sin = informe(mcea({ phq: 1, gad: 1, ptq: 1, pan: 1, dc: 4, as: 0, rp: 0 }));
  assert.ok(area(sin, "Formas de pensar que aparecieron").texto.length < 4000);
  console.log(`  formas de pensar (las 10): ${area(sin, "Formas de pensar que aparecieron").texto.length} caracteres`);
});

caso("V2.2 Todo bajo: solo tarjetas breves «A su favor», sin lenguaje de alarma ni próximos pasos", () => {
  const inf = informe(CEROD());
  assert.deepEqual(inf.resultados.map((r) => r.area), ["Ánimo", "Preocupación y ansiedad", "Pensamientos que vuelven", "Pensamientos negativos automáticos"]);
  assert.deepEqual(inf.resultados.map((r) => r.tono), Array(4).fill("bien"));
  assert.deepEqual(inf.resultados.map((r) => r.nivel), Array(4).fill("A su favor"));
  for (const r of inf.resultados) { assert.ok(r.texto.length < 400, `${r.area} (bajo) muy largo`); assert.doesNotMatch(r.texto, /Para empezar esta semana:/); }
  assert.ok(!inf.resultados.some((r) => ["Sus próximos pasos", "Cómo se conectan sus resultados", "Sus recursos"].includes(r.area)));
  assert.doesNotMatch(textoTodo(inf), /prioridad|alarma|urgente|grave|intens|riesgo|peligro|preocupante|desborda|alto\b/i);
  assert.equal(inf.destacado.texto, "");
});

caso("V2.3 Las tarjetas van de mayor a menor necesidad; el ánimo va primero con riesgo marcado", () => {
  const d = mcea({ phq: [1, 1, 1, 1, 1, 0, 0, 0, 0], gad: 3, ptq: 2, pan: 1 }); // ánimo leve, ansiedad alta, pensamientos que vuelven elevados, negativos leves
  const inf = informe(d);
  const tarjetas = inf.resultados.filter((r) => r.area !== "Sus próximos pasos");
  assert.deepEqual(tarjetas.map((r) => r.area), ["Preocupación y ansiedad", "Pensamientos que vuelven", "Pensamientos negativos automáticos", "Ánimo"]);
  assert.deepEqual(tarjetas.map((r) => r.nivel), ["Para trabajar primero", "Para trabajar", "Para cuidar", "Para cuidar"]);
  assert.deepEqual(tarjetas.map((r) => r.tono), ["atencion", "atencion", "leve", "leve"]);
  assert.ok(!inf.resultados.some((r) => r.tono === "alto"));
  // Las de nivel bajo van al final y breves.
  const mix = informe(mcea({ phq: 3, gad: 0, ptq: 4, pan: 0 }));
  assert.deepEqual(mix.resultados.map((r) => [r.area, r.nivel]).slice(0, 4), [["Ánimo", "Para trabajar primero"], ["Pensamientos que vuelven", "Para trabajar primero"], ["Preocupación y ansiedad", "A su favor"], ["Pensamientos negativos automáticos", "A su favor"]]);
  // Con riesgo marcado (ítem 9 ≥ 1) y el ánimo alto, «Ánimo» va primero aunque otra área tenga más puntaje relativo.
  const sinRiesgo = informe(mcea({ phq: [2, 2, 2, 2, 2, 2, 2, 2, 0], gad: 3 }));
  assert.equal(sinRiesgo.resultados[0].area, "Preocupación y ansiedad");
  const conRiesgo = informe(mcea({ phq: [2, 2, 2, 2, 2, 2, 2, 2, 1], gad: 3 }));
  assert.equal(conRiesgo.resultados[0].area, "Ánimo");
  // Se pueden quitar áreas y las puntuaciones solo salen si se activan.
  assert.equal(area(inf, "Preocupación y ansiedad").puntuacion, undefined);
  const conPunt = informe(d, null, { ...opcionesPorDefectoMcea(), mostrarPuntuaciones: true });
  assert.equal(area(conPunt, "Preocupación y ansiedad").puntuacion, "21 de 21");
  const o = opcionesPorDefectoMcea();
  assert.deepEqual(AREAS_MCEA.map((a) => a.id), ["conexion", "estado", "mente", "formas", "frenando", "pareja", "mapa", "recursos", "avance", "pasos"]);
  const sin = informe(d, null, { ...o, incluir: { ...o.incluir, estado: false, pasos: false } });
  assert.ok(!sin.resultados.some((r) => ["Ánimo", "Preocupación y ansiedad", "Sus próximos pasos"].includes(r.area)));
  // «Sus próximos pasos»: 3 como máximo, numerados, con cierre realista.
  const pasos = area(informe(mcea({ phq: 1, gad: 1, ptq: 2, pan: 1 })), "Sus próximos pasos").texto;
  assert.ok((pasos.match(/^\d\. /gm) ?? []).length <= 3 && (pasos.match(/^\d\. /gm) ?? []).length >= 2);
  assert.match(pasos, /El cambio es gradual/);
});

caso("V2.4 El ítem 9 del PHQ-9 nunca se cita", () => {
  const item9 = INS.PHQ9.items[8];
  for (const d of [mcea({ phq: [0, 0, 0, 0, 0, 0, 0, 0, 3] }), mcea({ phq: 3, gad: 3, ptq: 4, pan: 4 }), MAXD()]) {
    const inf = informe(d, CEROD());
    const todo = JSON.stringify(inf);
    for (const t of [item9, "estaría mejor muerto", "lastimarse", "mejor muert"]) assert.ok(!todo.includes(t), `aparece: ${t}`);
    assert.doesNotMatch(todo, /suicid|morir|muert|hacerse daño|autolesi/i);
  }
  // Solo el ítem 9 alto: el ánimo queda en nivel bajo y no se cita nada de él.
  const solo = area(informe(mcea({ phq: [0, 0, 0, 0, 0, 0, 0, 0, 3] })), "Ánimo");
  assert.equal(solo.nivel, "A su favor"); assert.doesNotMatch(solo.texto, /Lo que más marcó/);
  // Las líneas de ayuda se mantienen como hasta ahora.
  assert.deepEqual(informe(MAXD()).ayuda, MCEA_CRISIS);
  assert.equal(informe(MAXD(), null, { ...opcionesPorDefectoMcea(), incluirAyuda: false }).ayuda, null);
});

caso("V2.5 Sin palabras prohibidas, siglas ni etiquetas con las opciones por defecto", () => {
  for (const d of [MAXD(), CEROD(), MEDIA(), mcea({ phq: 1, gad: 1, ptq: 2, pan: 1, as: 1, rp: 1 })]) {
    const todo = textoTodo(informe(d, CEROD()));
    assert.doesNotMatch(todo, /trastorno|se curar[aá]|garantiz|deber[ií]a ser capaz|desaparecer[aá]|\bcura\b|empeor[oó]/i);
    assert.doesNotMatch(todo, /PHQ|GAD|PTQ|MCEA|DASS|DOCS|\bPAN\b|\bTCC\b/);
    assert.doesNotMatch(todo, /ansioso|deprimido|obsesivo|depresi[oó]n\b|neur[oó]tic/i);
    assert.doesNotMatch(todo, /\(a\)|\(o\)/); // sin marcas de género
    assert.doesNotMatch(todo, /medicaci|medicamento|fármaco|antidepresiv/i); // sin indicaciones médicas
    assert.doesNotMatch(todo, /undefined|null|NaN/);
  }
});

caso("V2.6 Cada tarjeta de nivel leve o superior trae los subtítulos obligatorios", () => {
  const muestras = [
    [MAXD(), true],
    [MEDIA(), true],
    [mcea({ phq: 1, gad: 1, ptq: 2, pan: 1, as: 0, rp: 0 }), false], // leve / elevado: respuestas bajo el umbral de «lo que más marcó»
    [mcea({ phq: 2, gad: 2, ptq: 3, pan: 2, as: 3, rp: 3 }), true],
    [CEROD(), false],
  ];
  let con = 0;
  for (const [d, marco] of muestras) {
    const inf = informe(d);
    const altas = inf.resultados.filter((r) => r.nivel === "Para trabajar primero").map((r) => r.area);
    const conPasos = altas.length >= 3 ? altas.slice(0, 2) : null;
    for (const r of inf.resultados) {
      if (!AREAS_PUNTUADAS.includes(r.area) && r.area !== "Formas de pensar que aparecieron") continue;
      if (r.nivel === "A su favor") { assert.doesNotMatch(r.texto, /Para empezar esta semana:/); continue; }
      con++;
      const sinPasos = r.area === "Formas de pensar que aparecieron" ? !!conPasos : conPasos && !conPasos.includes(r.area);
      if (sinPasos) assert.doesNotMatch(r.texto, /Para empezar esta semana:/);
      const lineas = r.texto.split("\n");
      for (const sub of ["Lo que muestran sus respuestas:", "Por qué pasa:", "Su oportunidad de cambio:", ...(marco ? ["Lo que más marcó:"] : []), ...(sinPasos ? ["Lo iremos trabajando después de lo primero:"] : ["Para empezar esta semana:", "Lo que trabajaremos juntos:"])]) assert.ok(lineas.includes(sub), `${r.area} (${r.nivel}) sin «${sub}»`);
      assert.match(r.texto, /^• /m);
    }
  }
  assert.ok(con >= 14, `solo ${con} tarjetas verificadas`);
  // El nivel alto da menos pasos que el leve (más acompañamiento).
  const pasosDe = (phq) => seccion(area(informe(mcea({ phq })), "Ánimo").texto, "Para empezar esta semana:", "Lo que trabajaremos").match(/^• /gm).length;
  assert.ok(pasosDe(1) >= pasosDe(3) && pasosDe(3) === 2);
  assert.match(area(informe(mcea({ phq: 3 })), "Ánimo").texto, /prioridad.*de cerca/);
});

caso("V2.7 Preocupación y pensamientos que vuelven dicen lo mismo que el EAPI (mismos ítems, orden y escala)", async () => {
  assert.deepEqual(INS.GAD7.items, GAD7); assert.deepEqual(INS.PTQ.items, PTQ);
  assert.deepEqual(RS.phq, GAD_LABELS); assert.deepEqual(RS.ptq, PTQ_LABELS);
  const { CONTENIDO_AREAS } = await import("../src/lib/evaluaciones/eapi/contenido-paciente.ts");
  const g = area(informe(mcea({ gad: [0, 3, 2, 0, 0, 0, 0] })), "Preocupación y ansiedad"); // 5 puntos: leve
  assert.ok(g.texto.includes(CONTENIDO_AREAS.gad.niveles[0].porQue) && g.texto.includes(CONTENIDO_AREAS.gad.niveles[0].oportunidad));
  assert.match(g.texto, /Lo que más marcó:\n• Le ha costado soltar las preocupaciones una vez que empiezan\.\n• Se ha preocupado por muchas cosas distintas a la vez\./);
  assert.ok(area(informe(mcea({ gad: 2 })), "Preocupación y ansiedad").texto.includes(CONTENIDO_AREAS.gad.niveles[1].porQue)); // 14 puntos: moderado
  const p = area(informe(mcea({ ptq: 4 })), "Pensamientos que vuelven");
  assert.ok(p.texto.includes(CONTENIDO_AREAS.ptq.niveles[1].porQue));
  assert.equal(p.nivel, "Para trabajar primero");
  // «Elevado» y «Algo elevado» del MCEA corresponden al nivel «elevado» del EAPI; solo el nivel alto es «para trabajar primero».
  assert.equal(area(informe(mcea({ ptq: 2 })), "Pensamientos que vuelven").nivel, "Para trabajar"); // 30 puntos
  assert.equal(area(informe(mcea({ ptq: 1 })), "Pensamientos que vuelven").nivel, "A su favor"); // 15 puntos
});

caso("V2.8 Carga alta: conexión, solo 2 áreas con pasos, 2 próximos pasos y tono sereno", () => {
  const d = mcea({ phq: 3, gad: 3, ptq: 4, pan: 3, as: 3, rp: 0 });
  const inf = informe(d);
  const nombres = inf.resultados.map((r) => r.area);
  assert.ok(inf.resultados.every((r) => r.tono !== "alto"), "hay tono alto");
  assert.ok(inf.resultados.every((r) => !/^(Alto|Muy alto|Moderado|Leve|Intenso|Presente|Estable)$/.test(r.nivel)), "hay insignia de gravedad");
  assert.equal(inf.resultados.filter((r) => r.nivel === "Para trabajar primero").length, 5);
  assert.equal(nombres[0], "Cómo se conectan sus resultados");
  const con = inf.resultados[0].texto;
  assert.match(con, /la preocupación y los nervios, los pensamientos que vuelven, el ánimo bajo, los pensamientos negativos sobre usted y los hábitos que le frenan/);
  assert.doesNotMatch(con, /pareja/); // solo las áreas que salieron altas
  assert.match(con, /mejorar un punto del círculo/);
  // Riesgo marcado (ítem 9 alto) y ánimo alto: «Ánimo» va de primera y lleva pasos.
  assert.equal(nombres[1], "Ánimo");
  const conPasos = inf.resultados.filter((r) => /Para empezar esta semana:/.test(r.texto)).map((r) => r.area);
  assert.equal(conPasos.length, 2);
  assert.deepEqual(conPasos, nombres.slice(1, 3));
  for (const r of inf.resultados.slice(3, -1)) assert.match(r.texto, /Lo iremos trabajando después de lo primero:/);
  const sp = area(inf, "Sus próximos pasos").texto;
  assert.equal((sp.match(/^\d\. /gm) ?? []).length, 2);
  assert.doesNotMatch(textoTodo(inf), /todo va a estar bien|todo saldrá bien/i);
  assert.equal(inf.destacado.texto, "");
  // La conexión y los pasos se pueden quitar.
  const o = opcionesPorDefectoMcea();
  const q = informe(d, null, { ...o, incluir: { ...o.incluir, conexion: false, pasos: false } });
  assert.ok(!q.resultados.some((r) => ["Cómo se conectan sus resultados", "Sus próximos pasos"].includes(r.area)));
  assert.equal(informe(mcea({ phq: 3, gad: 3, ptq: 1 })).resultados.some((r) => r.area === "Cómo se conectan sus resultados"), false, "con menos de 3 áreas no hay carga alta");
});

caso("V2.9 Pareja: frase de seguridad y pasos solo sobre lo que la persona puede hacer por su parte", () => {
  const prohibido = /aguant|\bced(er|e|a|í|iendo)\b|sométa|resign|tolere/i;
  for (const d of [mcea({ rp: 3 }), mcea({ rp: [3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), mcea({ rp: [0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0] }), mcea({ rp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3] }), mcea({ rp: 2 }), MAXD()]) {
    const r = area(informe(d), "En su relación de pareja");
    assert.ok(r, "falta la tarjeta de pareja");
    assert.match(r.texto, /Si en su relación hay miedo, amenazas o agresiones, coménteselo a su psicólogo: eso se atiende de otra manera\./);
    assert.doesNotMatch(r.texto, prohibido);
    const pasos = seccion(r.texto, "Para empezar esta semana:", "Lo que trabajaremos juntos:");
    if (pasos) assert.doesNotMatch(pasos, /haga que|exija|obligue|convenza|controle/i);
  }
  // En carga alta, sin pasos, la frase de seguridad se conserva.
  const alta = informe(mcea({ phq: 3, gad: 3, ptq: 4, pan: 3, rp: 3 }));
  const rp = area(alta, "En su relación de pareja");
  assert.doesNotMatch(rp.texto, /Para empezar esta semana:/);
  assert.match(rp.texto, /coménteselo a su psicólogo/);
  // Solo salen las subescalas altas, y son las de verdad.
  const sola = area(informe(mcea({ rp: [0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0] })), "En su relación de pareja").texto;
  assert.match(sola, /reacciona protegiéndose o atacando/); assert.doesNotMatch(sola, /temor a que su pareja deje de quererle/);
  // Sin pareja o sin subescalas altas no hay tarjeta.
  assert.ok(!area(informe(mcea({ rp: 0 })), "En su relación de pareja"));
  assert.ok(!area(informe(mcea({ rp: 3, gate: "no" })), "En su relación de pareja"));
});

caso("V2.10 Recursos solo con datos reales; formas de pensar, mapa y avance", () => {
  // Sin datos: la tarjeta no aparece (ni frases genéricas de relleno).
  const vacio = informe(CEROD());
  assert.ok(!area(vacio, "Sus recursos"));
  assert.doesNotMatch(textoTodo(vacio), /Se tomó el tiempo de responder/);
  // Con ítems de recursos ≥ 3 y lo que reconoció: aparecen esos y no otros.
  const rec = area(informe(mcea({ fr: [4, 0, 0, 3], tr: { sit: "", emo: [], int: 50, pen: "", f1: "", f2: "", beh: ["Hice algo que me ayudó"], dis: ["Etiquetas"] } })), "Sus recursos").texto;
  assert.match(rec, /Puede tratarse con comprensión cuando se equivoca/); assert.match(rec, /Logra notar cuando un pensamiento le está haciendo daño/);
  assert.doesNotMatch(rec, /alguien con quien hablar|formas propias/);
  assert.match(rec, /Reconoció por su cuenta formas de pensar/); assert.match(rec, /hizo algo que le ayudó/);
  assert.ok(area(informe(mcea({ fr: [3, 0, 0, 0] })), "Sus recursos"));
  assert.ok(!area(informe(mcea({ fr: [2, 2, 2, 2] })), "Sus recursos"));
  // Formas de pensar: cada una de las 10 con explicación y pregunta.
  const f = area(informe(mcea({ dc: 4 })), "Formas de pensar que aparecieron").texto;
  for (const n of INS.DC.names) assert.ok(f.includes(`• ${n}: `), `falta ${n}`);
  assert.equal((f.match(/Para revisarla:/g) ?? []).length, 10);
  assert.ok(!area(informe(mcea({ dc: 2 })), "Formas de pensar que aparecieron"));
  // Mapa: se conserva y añade el margen de cambio ligado a lo que reconoció.
  const m = area(informe(MEDIA()), "Su mapa de un momento difícil").texto;
  assert.match(m, /Lo que pasó: Discutimos/); assert.match(m, /Lo que sintió: Culpa/); assert.match(m, /Lo que hizo: Evité el tema/);
  assert.ok(m.split("\n").includes("Dónde está el margen de cambio:"));
  assert.match(m, /Entre lo que pasó y lo que sintió hubo un pensamiento/); assert.match(m, /formas de pensar: Catastrofismo\./);
  // Avance: lo que mejoró primero; lo que aumentó como «especial atención»; sin «empeoró».
  const av = area(informe(MAXD(), CEROD()), "Lo que ha cambiado").texto;
  assert.ok(av.includes("Áreas para prestar especial atención en nuestra próxima sesión:"));
  assert.doesNotMatch(av, /empeor/i);
  const ant = mcea({ phq: 3, gad: 3, ptq: 4, pan: 4 });
  const mixto = informe(mcea({ phq: 0, gad: 0, ptq: 0, pan: 4, as: 3 }), ant);
  const t = area(mixto, "Lo que ha cambiado").texto;
  assert.ok(t.indexOf("Donde hay un cambio claro a su favor:") >= 0 && t.indexOf("Donde hay un cambio claro a su favor:") < t.indexOf("especial atención"));
  assert.doesNotMatch(t, /empeor|aument[óo] el malestar/i);
  assert.ok(!area(informe(CEROD()), "Lo que ha cambiado"));
});

caso("V2.11 Contenido: una entrada por cada subescala, distorsión e ítem; el formulario público no importa el contenido", async () => {
  const c = await import("../src/lib/evaluaciones/mcea/contenido-paciente.ts");
  assert.equal(c.PARES_PHQ.length, 8); // ítems 1 a 8: el 9 nunca
  assert.deepEqual(Object.keys(c.PARES_PAN).sort(), Object.keys(INS.PAN.sub).sort());
  assert.deepEqual(Object.keys(c.DISTORSIONES).sort(), [...INS.DC.names].sort());
  assert.deepEqual(Object.keys(c.CONTENIDO_AUTOSABOTAJE).sort(), Object.keys(INS.AS.sub).sort());
  assert.deepEqual(Object.keys(c.CONTENIDO_PAREJA).sort(), Object.keys(INS.RP.sub).sort());
  for (const x of [...Object.values(c.CONTENIDO_AUTOSABOTAJE), ...Object.values(c.CONTENIDO_PAREJA)]) assert.ok(x.indicador && x.porQue && x.salida && x.paso);
  for (const x of Object.values(c.DISTORSIONES)) assert.ok(x.explicacion && x.pregunta);
  for (const a of [c.CONTENIDO_ANIMO, c.CONTENIDO_PAN]) {
    assert.equal(a.niveles.length, 3);
    a.niveles.forEach((x) => assert.ok(x.pasos.length >= 2 && x.pasos.length <= 3 && x.indicador && x.porQue && x.oportunidad && x.juntos));
  }
  assert.ok(c.CONTENIDO_ANIMO.niveles[2].pasos.length === 2 && c.CONTENIDO_PAN.niveles[2].pasos.length === 2);
  for (const f of ["src/components/evaluaciones/mcea-form.tsx", "src/components/evaluaciones/formularios.tsx"]) assert.doesNotMatch(fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), /contenido-paciente/);
  // Todas las combinaciones de subescalas altas generan tarjetas válidas (cada subescala con su contenido).
  for (const n of Object.keys(INS.AS.sub)) {
    const v = INS.AS.sub[n]; const resp = Array(12).fill(0); v.forEach((i) => (resp[i - 1] = 3));
    assert.ok(area(informe(mcea({ as: resp })), "Lo que puede estar frenándole"), n);
  }
});

console.log(`\n${ok} casos correctos.`);
