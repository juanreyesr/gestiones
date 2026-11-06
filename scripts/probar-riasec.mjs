// Pruebas de la calificación del test vocacional RIASEC. Ejecutar: pnpm test:riasec
import assert from "node:assert/strict";
import { calificarRiasec, seguimientoRiasec } from "../src/lib/evaluaciones/riasec/calificacion.ts";
import { RIASEC_ORDEN, tipoDeItem } from "../src/lib/evaluaciones/riasec/escalas.ts";
import { validarRiasec } from "../src/lib/evaluaciones/riasec/codigo.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
/** Construye 36 respuestas a partir de sumas por tipo (R,I,A,S,E,C) repartidas en 6 ítems. */
const perfil = (sumas) => sumas.flatMap((s) => { const base = Math.floor(s / 6), resto = s % 6; return Array.from({ length: 6 }, (_, i) => base + (i < resto ? 1 : 0)); });

caso("Orden intercalado y tipo de cada ítem", () => {
  assert.equal(new Set(RIASEC_ORDEN).size, 36);
  assert.deepEqual(RIASEC_ORDEN.slice(0, 6).map(tipoDeItem), ["R", "I", "A", "S", "E", "C"]);
  assert.equal(tipoDeItem(36), "C"); assert.equal(tipoDeItem(19), "S");
});

caso("Perfil claro SAE", () => {
  const c = calificarRiasec({ items: perfil([2, 10, 20, 24, 16, 6]) });
  assert.equal(c.codigo, "SAE");
  assert.deepEqual(c.tipos.map((t) => t.suma), [2, 10, 20, 24, 16, 6]);
  assert.equal(c.tipos[3].nivel.label, "Muy alto"); assert.equal(c.tipos[0].nivel.label, "Bajo");
  assert.equal(c.diferenciacion.k, "alta"); assert.equal(c.diferenciacion.valor, 22);
  assert.equal(c.consistencia.k, "alta");
  assert.equal(c.alternativos.length, 0);
  assert.equal(c.flags.length, 0);
});

caso("Empate entre los dos primeros", () => {
  const c = calificarRiasec({ items: perfil([4, 4, 20, 20, 12, 4]) });
  assert.equal(c.codigo, "ASE"); // desempate por orden del hexágono
  assert.ok(c.alternativos.includes("SAE"), c.alternativos.join(","));
  assert.ok(c.flags.some((f) => /empates/.test(f.t)));
});

caso("Intereses opuestos (R y S): consistencia baja", () => {
  const c = calificarRiasec({ items: perfil([24, 6, 4, 21, 8, 10]) });
  assert.equal(c.codigo, "RSC"); assert.equal(c.consistencia.k, "baja");
});

caso("Respuestas idénticas y perfil plano", () => {
  const c = calificarRiasec({ items: Array(36).fill(2) });
  assert.equal(c.flags[0].lvl, "alert"); assert.equal(c.diferenciacion.k, "baja");
  const bajo = calificarRiasec({ items: Array(36).fill(0).map((_, i) => (i % 9 === 0 ? 1 : 0)) });
  assert.ok(bajo.flags.some((f) => /plano bajo/.test(f.t)));
  const alto = calificarRiasec({ items: Array(36).fill(4).map((v, i) => (i === 0 ? 3 : v)) });
  assert.ok(alto.flags.some((f) => /plano alto/.test(f.t)));
});

caso("Seguimiento y validación", () => {
  const s = seguimientoRiasec({ items: perfil([2, 10, 20, 24, 16, 6]) }, { items: perfil([2, 10, 24, 20, 16, 6]) });
  assert.equal(s.codigoAntes, "ASE"); assert.equal(s.codigoAhora, "SAE");
  assert.deepEqual(s.filas.find((f) => f.tipo === "S"), { tipo: "S", nombre: "Social", antes: 20, ahora: 24, cambio: 4 });
  assert.equal(validarRiasec({ items: Array(36).fill(0) }).ok, true);
  assert.equal(validarRiasec({ items: Array(35).fill(0) }).ok, false);
  assert.equal(validarRiasec({ items: [5, ...Array(35).fill(0)] }).ok, false);
});

console.log(`\n${ok}/6 pruebas del test vocacional correctas.`);
