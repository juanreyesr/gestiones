// Casos de prueba del Anexo D (EAPI / Batería AEI). Ejecutar: pnpm test:eapi
import assert from "node:assert/strict";
import { calificarEapi, seguimientoEapi, EAPI_SIN_DX } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { codificarEapi, decodificarEapi, validarEapi } from "../src/lib/evaluaciones/eapi/codigo.ts";

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
  assert.equal(validarEapi({ gad: z(7), dass: z(21), ptq: z(15), safety: 0 }, false).ok, true);
  assert.equal(validarEapi({ gad: [5, 0, 0, 0, 0, 0, 0], dass: z(21), ptq: z(15), safety: 0 }, false).ok, false);
  assert.equal(validarEapi({ gad: z(7), dass: z(21), ptq: z(15), safety: 0 }, true).ok, false); // DOCS activo y faltante
});

console.log(`\n${ok}/6 casos del Anexo D correctos (D.7 se prueba en el navegador).`);
