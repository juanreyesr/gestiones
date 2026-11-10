// Pruebas del MCEA: el motor traducido debe dar exactamente lo mismo que el
// artefacto original (docs/instrumentos/MCEA_v1.0_artefacto.html) con cientos
// de respuestas simuladas, más validación, informes y registro. Ejecutar: pnpm test:mcea
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { buildPlan, compare, hypotheses, routing, scoreAll, validity } from "../src/lib/evaluaciones/mcea/motor.ts";
import { avanceMcea, datosMceaGuardados, limpiarBorradorMcea, validarMcea } from "../src/lib/evaluaciones/mcea/codigo.ts";
import { informeMceaHtml } from "../src/lib/evaluaciones/mcea/informe-html.ts";
import { informePacienteMcea, opcionesPorDefectoMcea } from "../src/lib/evaluaciones/mcea/informe-paciente.ts";
import { leerInformePaciente } from "../src/lib/evaluaciones/informe-paciente.ts";
import { REGISTRO } from "../src/lib/evaluaciones/registro.ts";
import { REGISTRO_SERVIDOR } from "../src/lib/evaluaciones/registro-servidor.ts";
import { deteriorosFiables, evolucionDelPaciente } from "../src/lib/evaluaciones/evolucion-paciente.ts";
import { solapesAlAsignar } from "../src/lib/evaluaciones/registro.ts";

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
  assert.equal(p.resultados[0].area, "Cómo ha estado");
  assert.ok(p.resultados.some((r) => r.area === "Lo que ha cambiado"));
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

console.log(`\n${ok}/7 casos correctos.`);
