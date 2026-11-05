// Casos de prueba del Anexo D (B-Breve). Ejecutar: pnpm test:b-breve
// (Node 22.6+ con --experimental-strip-types). D.7 se prueba en el navegador.
import assert from "node:assert/strict";
import { calificarBBreve, discrepanciaBBreve, seguimientoBBreve, B_BREVE_SIN_REGLAS } from "../src/lib/evaluaciones/b-breve/calificacion.ts";
import { codificarBBreve, decodificarBBreve, leerBBreve } from "../src/lib/evaluaciones/b-breve/codigo.ts";

let ok = 0;
const caso = (nombre, fn) => { fn(); ok++; console.log(`✔ ${nombre}`); };
const areas = (c) => Object.fromEntries(c.areas.map((a) => [a.id, [a.suma, a.pct, a.prioritaria]]));

const A = decodificarBBreve("B16-2103320231021301-01-CASO01");
caso("D.1 Caso base", () => {
  assert.deepEqual(A.items, [2,1,0,3,3,2,0,2,3,1,0,2,1,3,0,1]);
  assert.equal(A.S1, 0); assert.equal(A.S2, 1); assert.equal(A.ref, "CASO01");
  const c = calificarBBreve(A);
  assert.deepEqual(areas(c), { estres: [7,58,true], consuelo: [10,56,true], adultos: [6,50,true], rutinas: [1,17,false] });
  assert.equal(c.total, 24); assert.equal(c.pctTotal, 50); assert.equal(c.banda.etiqueta, "Carga alta");
  const alarmas = c.senales.filter((s) => s.nivel === "alarma");
  assert.equal(alarmas.length, 1); assert.match(alarmas[0].texto, /^S2 = Sí/);
  const reglas = c.senales.filter((s) => s.nivel === "regla").map((s) => s.texto);
  assert.equal(reglas.length, 2);
  assert.match(reglas[0], /^Ítems 6, 9 con 2 o 3/);
  assert.match(reglas[1], /^Ítem 12 con 2 o 3/);
  assert.equal(codificarBBreve(A), "B16-2103320231021301-01-CASO01");
});

const B = decodificarBBreve("B16-1101210100321100-00-CASO01");
caso("D.2 Segundo cuidador y discrepancia", () => {
  assert.deepEqual(B.items, [1,1,0,1,2,1,0,1,0,0,3,2,1,1,0,0]);
  const c = calificarBBreve(B);
  assert.deepEqual(areas(c), { estres: [4,33,false], consuelo: [5,28,false], adultos: [5,42,false], rutinas: [0,0,false] });
  assert.equal(c.total, 14); assert.equal(c.banda.etiqueta, "Carga moderada");
  assert.deepEqual(c.senales.map((s) => s.texto.slice(0, 20)), ["Ítem 12 con 2 o 3: a"]);
  const d = discrepanciaBBreve(A, B);
  assert.deepEqual(d.items, [4, 9, 11, 14]); assert.equal(d.significativa, true);
  assert.match(d.lectura, /^Inconsistencia parental/);
});

const P = decodificarBBreve("B16-2103333332121301-01-CASO01");
caso("D.3 Seguimiento sin progreso", () => {
  const s = seguimientoBBreve(A, P);
  const f = Object.fromEntries(s.filas.map((x) => [x.id, [x.antes, x.ahora, x.cambio]]));
  assert.deepEqual(f.consuelo, [15, 10, -5]); assert.deepEqual(f.adultos, [8, 6, -2]);
  assert.equal(s.totalAntes, 31); assert.equal(s.totalAhora, 24);
  assert.equal(s.progreso, false); assert.match(s.lectura, /^Todavía no se alcanza/);
});

caso("D.4 Seguimiento con progreso", () => {
  const C = decodificarBBreve("B16-2100110031021301-00-CASO01");
  assert.deepEqual(C.items, [2,1,0,0,1,1,0,0,3,1,0,2,1,3,0,1]);
  const s = seguimientoBBreve(C, P);
  const consuelo = s.filas.find((x) => x.id === "consuelo");
  assert.deepEqual([consuelo.antes, consuelo.ahora, consuelo.cambio], [15, 2, -13]);
  assert.equal(s.progreso, true); assert.match(s.lectura, /^Progreso\./);
  assert.equal(P.S2, 1); assert.equal(C.S2, 0);
});

caso("D.5 Carga baja y sin reglas", () => {
  const c = calificarBBreve(decodificarBBreve("B16-1000000000000100-00"));
  assert.equal(c.total, 2); assert.equal(c.banda.etiqueta, "Carga ambiental baja");
  assert.equal(c.areas.some((a) => a.prioritaria), false);
  assert.equal(c.senales.length, 0);
  assert.equal(B_BREVE_SIN_REGLAS, "Ningún ítem activa reglas específicas.");
});

caso("D.6 Entradas inválidas", () => {
  for (const t of ["xyz", "B16-21033202310213-01", "B16-2103320231021304-01", "2103320231021301-01", "B16-2103320231021301-01-CASO-01"]) {
    assert.equal(decodificarBBreve(t), null, t);
    assert.equal(leerBBreve(t), null, t);
  }
  assert.equal(leerBBreve('{"items":[4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"S1":0,"S2":0}'), null);
  assert.equal(leerBBreve('{"items":[0,0,0],"S1":0,"S2":0}'), null);
  assert.notEqual(leerBBreve("b16-2103320231021301-01-caso01"), null); // insensible a mayúsculas
});

console.log(`\n${ok}/6 casos del Anexo D correctos.`);
