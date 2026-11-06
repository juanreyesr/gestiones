// Pruebas del cuestionario de valores laborales. Ejecutar: pnpm test:valores
import assert from "node:assert/strict";
import { calificarValores, integrarRiasec, seguimientoValores } from "../src/lib/evaluaciones/valores/calificacion.ts";
import { avanceValores, limpiarBorradorValores, validarValores } from "../src/lib/evaluaciones/valores/codigo.ts";
import { VALORES_IDS, VALORES_ORDEN, valorDeItem } from "../src/lib/evaluaciones/valores/escalas.ts";
import { informeValoresHtml } from "../src/lib/evaluaciones/valores/informe-html.ts";
import { informePacienteValores, opcionesPorDefectoValores } from "../src/lib/evaluaciones/valores/informe-paciente.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
/** 24 respuestas a partir de la suma de cada valor (orden de VALORES_IDS), repartida en 3 ítems. */
const perfil = (sumas) => sumas.flatMap((s) => { const b = Math.floor(s / 3), r = s % 3; return [0, 1, 2].map((i) => b + (i < r ? 1 : 0)); });
// logro, independencia, reconocimiento, relaciones, servicio, apoyo, condiciones, creatividad

caso("Orden intercalado y valor de cada ítem", () => {
  assert.equal(new Set(VALORES_ORDEN).size, 24);
  assert.deepEqual(VALORES_ORDEN.slice(0, 8).map(valorDeItem), [...VALORES_IDS]);
  assert.equal(valorDeItem(24), "creatividad"); assert.equal(valorDeItem(13), "servicio");
});

caso("Validación y borrador", () => {
  const items = perfil([10, 6, 5, 9, 12, 7, 8, 4]);
  assert.equal(validarValores({ items, elegidos: ["servicio", "logro", "relaciones"] }).ok, true);
  assert.equal(validarValores({ items, elegidos: ["servicio", "logro"] }).ok, false);
  assert.equal(validarValores({ items, elegidos: ["servicio", "servicio", "logro"] }).ok, false);
  assert.equal(validarValores({ items: items.slice(0, 23), elegidos: ["servicio", "logro", "apoyo"] }).ok, false);
  assert.equal(validarValores({ items: [...items.slice(0, 23), 5], elegidos: ["servicio", "logro", "apoyo"] }).ok, false);
  const b = limpiarBorradorValores({ items: [1, 2, "x"], elegidos: ["logro", "otro", "apoyo", "servicio", "relaciones"] });
  assert.deepEqual(b.elegidos, ["logro", "apoyo", "servicio"]);
  assert.deepEqual(avanceValores(b), { respondidas: 3, total: 25 });
});

caso("Perfil claro con alta concordancia", () => {
  const c = calificarValores({ items: perfil([10, 6, 5, 9, 12, 7, 8, 4]), elegidos: ["servicio", "logro", "relaciones"] });
  assert.deepEqual(c.principales, ["servicio", "logro", "relaciones"]);
  assert.equal(c.concordancia.n, 3);
  assert.equal(c.diferenciacion, 8);
  assert.equal(c.valores.find((v) => v.id === "servicio").nivel.label, "Esencial");
  assert.equal(c.flags.filter((f) => f.lvl !== "").length, 0);
  // Integración con RIASEC: Servicio y Relaciones ↔ S; Logro ↔ R/I.
  const integ = integrarRiasec(c, "SAE");
  assert.deepEqual(integ.map((f) => f.coinciden), [["S"], [], ["S"]]);
});

caso("Elección y puntuación discrepantes, tensión entre valores", () => {
  const c = calificarValores({ items: perfil([4, 11, 6, 5, 3, 5, 11, 10]), elegidos: ["servicio", "logro", "apoyo"] });
  assert.deepEqual(c.principales, ["independencia", "condiciones", "creatividad"]);
  assert.equal(c.concordancia.n, 0);
  assert.ok(c.flags.some((f) => f.lvl === "warn" && /Nula/.test(f.t)));
  assert.ok(c.flags.some((f) => /Eligió «Servicio a los demás»/.test(f.t)));
  assert.ok(c.flags.some((f) => /Independencia y Estabilidad/.test(f.t)));
  assert.ok(c.flags.some((f) => /Creatividad y Estabilidad/.test(f.t)));
});

caso("Estilos de respuesta", () => {
  const iguales = calificarValores({ items: Array(24).fill(4), elegidos: ["logro", "apoyo", "servicio"] });
  assert.equal(iguales.flags[0].lvl, "alert");
  const altos = calificarValores({ items: perfil([12, 11, 12, 11, 12, 11, 12, 11]), elegidos: ["logro", "apoyo", "servicio"] });
  assert.ok(altos.flags.some((f) => /Todo es imprescindible/i.test(f.t)));
  const bajos = calificarValores({ items: perfil([3, 2, 3, 4, 3, 2, 4, 3]), elegidos: ["logro", "apoyo", "servicio"] });
  assert.ok(bajos.flags.some((f) => /Perfil bajo/.test(f.t)));
  const dispar = calificarValores({ items: [4, 0, 2, ...perfil([6, 6, 9, 9, 6, 6, 6])], elegidos: ["reconocimiento", "relaciones", "logro"] });
  assert.ok(dispar.flags.some((f) => /dispares.*Logro/.test(f.t)));
  const nino = calificarValores({ items: perfil([10, 6, 5, 9, 12, 7, 8, 4]), elegidos: ["servicio", "logro", "relaciones"], edad: 13 });
  assert.ok(nino.flags.some((f) => /Edad 13/.test(f.t)));
});

caso("Seguimiento, informes y siglas desarrolladas", () => {
  const a = { items: perfil([10, 6, 5, 9, 12, 7, 8, 4]), elegidos: ["servicio", "logro", "relaciones"] };
  const p = { items: perfil([6, 6, 6, 6, 6, 6, 6, 6]), elegidos: ["logro", "apoyo", "servicio"] };
  const s = seguimientoValores(a, p);
  assert.equal(s.filas.find((f) => f.id === "servicio").cambio, 6);
  const html = informeValoresHtml({ datos: a, nombre: "Prueba", fecha: "2026-11-01" }, { datos: p, nombre: "Prueba", fecha: "2026-06-01" }, "", { codigo: "SAE", fecha: "2026-10-01", nombres: ["Social", "Artístico", "Emprendedor"] });
  assert.match(html, /Red de Información Ocupacional .*\(O\*NET/);
  assert.match(html, /Inventario de Valores Laborales de Super \(WVI/);
  assert.match(html, /RIASEC \(Realista, Investigador, Artístico, Social, Emprendedor, Convencional\)/);
  assert.ok(html.indexOf("(O*NET") < html.lastIndexOf("O*NET"));
  const inf = informePacienteValores(a, opcionesPorDefectoValores(), { paciente: "P", fechaAplicacion: "2026-11-01", notas: "", profesional: "X", codigoRiasec: "SAE" });
  assert.match(inf.destacado.titulo, /Servicio a los demás, Logro, Relaciones/);
  assert.equal(inf.resultados.length, 9);
  assert.equal(inf.resultados.at(-1).area, "Tus valores y tus intereses");
});

console.log(`\n${ok}/6 casos correctos.`);
