// Pruebas del panel de evolución del expediente. Ejecutar: pnpm test:evolucion
import assert from "node:assert/strict";
import { diasDesde, evolucionDelPaciente, resumenEvolucion, tendenciaEntre } from "../src/lib/evaluaciones/evolucion-paciente.ts";
import { agruparCambios, cambiosRecientes, informeAvancePaciente, opcionesPorDefectoAvance } from "../src/lib/evaluaciones/evolucion-explicada.ts";
import { leerInformePaciente } from "../src/lib/evaluaciones/informe-paciente.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
const g = (s) => s.split("").map(Number);
const r = (id, fecha, instrumento, datos, quien = "Ana") => ({ id, evaluacionId: null, pacienteId: "p", instrumento, respondienteNombre: quien, respondienteRelacion: null, fecha, datos, origen: "enlace", createdAt: `${fecha}T15:00:00Z` });

const filas = [
  r("r3", "2026-11-01", "eapi", { gad: g("3222312"), dass: g("232120221131232112201"), ptq: g("323231323132312"), docs: null, safety: 0, func: 2 }),
  r("r1", "2026-09-01", "eapi", { gad: g("3333333"), dass: g("333333333333333333333"), ptq: g("444444444444444"), docs: null, safety: 0, func: 2 }),
  r("r2", "2026-10-01", "eapi", { gad: g("3333323"), dass: g("332231332232333223312"), ptq: g("434342434243423"), docs: null, safety: 1, func: 3 }),
  r("r4", "2026-10-15", "eapi", { gad: null, dass: null, ptq: null, docs: g("10000210003443400000"), safety: 0, func: null }),
  r("r5", "2026-09-20", "riasec", { items: [2,1,1,1,1,1, 3,3,3,3,3,3, 4,4,4,4,4,4, 4,4,4,4,4,4, 1,1,1,1,1,1, 0,0,0,0,0,0] }),
  r("r6", "2026-10-02", "b-breve", { items: Array(16).fill(1), S1: 0, S2: 0 }, "Mamá"),
  r("x", "2026-10-03", "eapi", { gad: [9] }), // inválida: se ignora
];

caso("Series ordenadas por fecha con bandas y tendencias", () => {
  const { series, hitos } = evolucionDelPaciente(filas);
  assert.deepEqual(series.map((s) => s.id), ["gad", "dass-dep", "dass-anx", "dass-str", "ptq", "docs", "b-breve"]);
  const gad = series.find((s) => s.id === "gad");
  assert.deepEqual(gad.puntos.map((p) => p.valor), [21, 20, 15]);
  assert.deepEqual(gad.puntos.map((p) => p.banda), ["Grave", "Grave", "Grave"]);
  assert.equal(gad.tendencia, "mejora"); // 20 → 15 (≥ 4)
  assert.equal(gad.tendenciaInicio, "mejora");
  const dep = series.find((s) => s.id === "dass-dep");
  assert.deepEqual(dep.puntos.map((p) => p.banda), ["Extremadamente severo", "Extremadamente severo", "Moderado"]);
  assert.equal(series.find((s) => s.id === "dass-anx").tendencia, "igual");
  assert.equal(series.find((s) => s.id === "docs").tendencia, null); // una sola aplicación
  assert.equal(series.find((s) => s.id === "b-breve").puntos[0].valor, 16);
  assert.equal(hitos.length, 1); assert.match(hitos[0].titulo, /código ASI/);
});

caso("Criterios de cambio y resumen", () => {
  const gadDef = { mcid: 4, bandas: [] };
  assert.equal(tendenciaEntre(gadDef, 12, 9), "igual");
  assert.equal(tendenciaEntre(gadDef, 12, 8), "mejora");
  assert.equal(tendenciaEntre(gadDef, 8, 12), "empeora");
  const bandas = [{ hasta: 21, etiqueta: "a", k: "low" }, { hasta: 36, etiqueta: "b", k: "mid" }, { hasta: 60, etiqueta: "c", k: "high" }];
  assert.equal(tendenciaEntre({ bandas }, 30, 22), "igual");
  assert.equal(tendenciaEntre({ bandas }, 22, 21), "mejora");
  const res = resumenEvolucion(evolucionDelPaciente(filas).series);
  assert.deepEqual([res.comparables, res.mejora, res.igual, res.empeora, res.global], [5, 4, 1, 0, "mejora"]);
  assert.equal(resumenEvolucion([]).global, null);
  assert.equal(diasDesde("2026-11-01", new Date(2026, 10, 6, 23, 59)), 5);
});

caso("Cambios explicados: mejoras y aumentos con las preguntas que los explican", () => {
  const c = cambiosRecientes(filas);
  const g2 = agruparCambios(c);
  const gad = c.find((x) => x.id === "gad");
  assert.equal(gad.tendencia, "mejora");
  assert.equal(gad.fiable, true); // 20 → 15: ≥ 4
  assert.equal(gad.bajaron.length, 5); // 5 preguntas bajaron un punto
  assert.ok(gad.bajaron.every((p) => p.ahora < p.antes));
  assert.deepEqual(g2.mejoras.map((x) => x.id).sort(), ["dass-dep", "dass-str", "gad", "ptq"]);
  // Desesperanza (DASS 10 y 21) se marca como sensible.
  const dep = c.find((x) => x.id === "dass-dep");
  assert.ok(dep.bajaron.some((p) => p.n === 21 && p.sensible));
});

caso("Informe de avance: mejoras primero y sin preguntas sensibles", () => {
  // Empeora: ánimo con el ítem 9 del PHQ-9 y desesperanza del DASS subiendo.
  const sube = [
    ...filas,
    r("r7", "2026-11-20", "eapi", { gad: g("3222312"), dass: g("232120221331232112203"), ptq: g("323231323132312"), docs: null, safety: 0, func: 2 }),
  ];
  const c = cambiosRecientes(sube);
  const dep = c.find((x) => x.id === "dass-dep");
  assert.equal(dep.tendencia, "empeora"); // 18 → 22: de moderado a severo
  assert.ok(dep.subieron.length === 2 && dep.subieron.every((p) => p.sensible)); // solo subieron los ítems 10 y 21
  const infSube = informeAvancePaciente(c, opcionesPorDefectoAvance(c), { paciente: "Ana", notas: "", profesional: "M. A." });
  const tarjeta = infSube.resultados.find((x) => x.area === "Tristeza y desgano");
  assert.ok(tarjeta && !/Lo que más subió|nada por que vivir|ningún sentido/.test(tarjeta.texto));
  // Orden: mejoras, luego aumentos, al final lo que se mantiene.
  const orden = infSube.resultados.map((x) => (x.nivel === "Mejoró" ? 0 : x.nivel === "Para prestar atención" ? 1 : 2));
  assert.deepEqual(orden, [...orden].sort());
  assert.ok(orden.includes(1));
  const inf = informeAvancePaciente(cambiosRecientes(filas), opcionesPorDefectoAvance(cambiosRecientes(filas)), { paciente: "Ana", notas: " ok ", profesional: "M. A." });
  assert.equal(inf.resultados[0].nivel, "Mejoró");
  const todo = JSON.stringify(inf);
  assert.ok(!/nada por que vivir|ningún sentido/i.test(todo), "no cita desesperanza");
  assert.ok(!/GAD-7|DASS|PTQ/.test(todo), "sin siglas técnicas");
  assert.ok(leerInformePaciente(JSON.parse(todo)), "pasa el filtro de la página pública");
  const conDep = inf.resultados.find((x) => x.area === "Tristeza y desgano");
  assert.ok(conDep && !conDep.puntuacion);
});

caso("Cambio fiable sin cambio de banda y informe solo con áreas a atender", () => {
  const ptq = (n) => Array.from({ length: 15 }, (_, i) => (i < n ? 1 : 0));
  const filas2 = [
    r("a", "2026-11-01", "eapi", { gad: null, dass: null, ptq: ptq(5), docs: null, safety: 0, func: null }),
    r("b", "2026-11-09", "eapi", { gad: null, dass: null, ptq: ptq(15).map((v, i) => (i === 0 ? 2 : v)), docs: null, safety: 0, func: null }),
  ];
  const c = cambiosRecientes(filas2);
  assert.equal(c[0].tendencia, "empeora"); // 5 → 16: sigue «no clínico», pero ≥ 10,5
  assert.equal(c[0].fiable, true);
  const inf = informeAvancePaciente(c, opcionesPorDefectoAvance(c), { paciente: "Ana", notas: "", profesional: "M. A." });
  assert.match(inf.intro, /prestar especial atención en nuestra próxima sesión/);
  assert.doesNotMatch(inf.intro, /mejoró|aumentaron/);
  assert.equal(inf.destacado.titulo, "Para prestar especial atención en nuestra próxima sesión");
  assert.equal(inf.resultados[0].nivel, "Para prestar atención");
});

console.log(`\n${ok}/5 casos correctos.`);
