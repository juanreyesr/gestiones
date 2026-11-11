// Pruebas del cuestionario de temperamento · versión JJ. Ejecutar: pnpm test:temperamentos
import assert from "node:assert/strict";
import { calificarTemperamentos, ladoDeItem, seguimientoTemperamentos } from "../src/lib/evaluaciones/temperamentos/calificacion.ts";
import { avanceTemperamentos, limpiarBorradorTemperamentos, validarTemperamentos } from "../src/lib/evaluaciones/temperamentos/codigo.ts";
import { COMBINACIONES, TEMPERAMENTOS_INFO } from "../src/lib/evaluaciones/temperamentos/contenido.ts";
import { TEMPERAMENTOS_IDS, TEMPERAMENTOS_ITEMS, temperamentoDeItem } from "../src/lib/evaluaciones/temperamentos/escalas.ts";
import { informeTemperamentosHtml } from "../src/lib/evaluaciones/temperamentos/informe-html.ts";
import { AREAS_TEMPERAMENTOS, informePacienteTemperamentos, opcionesPorDefectoTemperamentos } from "../src/lib/evaluaciones/temperamentos/informe-paciente.ts";
import { leerInformePaciente } from "../src/lib/evaluaciones/informe-paciente.ts";
import { instrumentoPorId } from "../src/lib/evaluaciones/instrumentos.ts";
import { REGISTRO } from "../src/lib/evaluaciones/registro.ts";
import { REGISTRO_SERVIDOR } from "../src/lib/evaluaciones/registro-servidor.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
/**
 * 40 respuestas a partir de la suma de cada temperamento (orden S, C, M, F), repartida en sus 10 ítems.
 * El ítem n (1–40) es del temperamento (n - 1) % 4.
 */
const perfil = (sumas) => {
  const items = Array(40).fill(0);
  sumas.forEach((s, k) => {
    for (let j = 0; j < 10; j++) items[j * 4 + k] = Math.floor(s / 10) + (j < s % 10 ? 1 : 0);
  });
  return items;
};
const califica = (sumas, extra = {}) => calificarTemperamentos({ items: perfil(sumas), ...extra });

caso("40 ítems, 10 por temperamento, orden intercalado y lados 6 fuertes + 4 difíciles", () => {
  assert.equal(TEMPERAMENTOS_ITEMS.length, 40);
  assert.equal(new Set(TEMPERAMENTOS_ITEMS).size, 40);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(temperamentoDeItem), ["S", "C", "M", "F", "S", "C", "M", "F"]);
  for (const id of TEMPERAMENTOS_IDS) {
    const suyos = Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => temperamentoDeItem(n) === id);
    assert.equal(suyos.length, 10);
    assert.equal(suyos.filter((n) => ladoDeItem(n) === "fuerte").length, 6);
    assert.equal(suyos.filter((n) => ladoDeItem(n) === "dificil").length, 4);
  }
  // Lados mezclados: ningún temperamento tiene sus 3 primeros ítems del mismo lado.
  for (const id of TEMPERAMENTOS_IDS) {
    const l = Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => temperamentoDeItem(n) === id).map(ladoDeItem).slice(0, 3);
    assert.ok(new Set(l).size > 1);
  }
});

caso("Ningún ítem contiene el nombre de un temperamento", () => {
  for (const t of TEMPERAMENTOS_ITEMS) assert.doesNotMatch(t, /sangu[ií]ne|c[oó]leric|melanc[oó]lic|flem[aá]tic/i, t);
});

caso("Validación (longitud y rango 0–4) y borrador", () => {
  const items = perfil([20, 20, 20, 20]);
  assert.equal(validarTemperamentos({ items }).ok, true);
  assert.equal(validarTemperamentos({ items: items.slice(0, 39) }).ok, false);
  assert.equal(validarTemperamentos({ items: [...items, 1] }).ok, false);
  assert.equal(validarTemperamentos({ items: [...items.slice(0, 39), 5] }).ok, false);
  assert.equal(validarTemperamentos({ items: [...items.slice(0, 39), -1] }).ok, false);
  assert.equal(validarTemperamentos({ items: [...items.slice(0, 39), 2.5] }).ok, false);
  assert.equal(validarTemperamentos({ items: [...items.slice(0, 39), "3"] }).ok, false);
  assert.equal(validarTemperamentos(null).ok, false);
  const b = limpiarBorradorTemperamentos({ items: [1, 2, "x", 9], situacion: "Trabajando" });
  assert.equal(b.items.length, 40);
  assert.deepEqual(b.items.slice(0, 5), [1, 2, null, null, null]);
  assert.deepEqual(avanceTemperamentos(b), { respondidas: 2, total: 40 });
});

caso("Puntajes por temperamento, porcentaje y orden (empates: S, C, M, F)", () => {
  const c = califica([30, 22, 14, 6]);
  assert.deepEqual(c.temperamentos.map((t) => t.suma), [30, 22, 14, 6]);
  assert.equal(c.temperamentos[0].pct, 75);
  assert.deepEqual(c.orden, ["S", "C", "M", "F"]);
  const e = califica([10, 25, 25, 18]);
  assert.deepEqual(e.orden, ["C", "M", "F", "S"]);
});

caso("Perfil predominante (primero − segundo ≥ 8)", () => {
  const c = califica([14, 30, 20, 12]);
  assert.equal(c.tipo, "predominante");
  assert.equal(c.principal, "C");
  assert.equal(c.perfil, "Predominantemente colérico");
  assert.equal(c.combinacion, null);
  assert.equal(c.tercero, null);
  assert.equal(califica([8, 20, 28, 10]).tipo, "predominante"); // brecha exacta de 8
});

caso("Perfil combinado: el orden importa (C-S ≠ S-C)", () => {
  const cs = califica([24, 30, 12, 8]);
  assert.equal(cs.tipo, "combinado");
  assert.equal(cs.combinacion, "C-S");
  assert.equal(cs.perfil, "Colérico con rasgos de sanguíneo");
  const sc = califica([30, 24, 12, 8]);
  assert.equal(sc.combinacion, "S-C");
  assert.equal(sc.perfil, "Sanguíneo con rasgos de colérico");
  assert.notEqual(COMBINACIONES["C-S"].nombre, COMBINACIONES["S-C"].nombre);
  assert.equal(califica([23, 30, 12, 8]).tipo, "combinado"); // brecha de 7
  assert.equal(Object.keys(COMBINACIONES).length, 12);
});

caso("Perfil codominantes", () => {
  const c = califica([12, 28, 28, 10]);
  assert.equal(c.tipo, "codominantes");
  assert.equal(c.combinacion, "C-M");
  assert.match(c.perfil, /Codominante: colérico y melancólico/);
});

caso("Perfil poco diferenciado (mayor − menor ≤ 5): no hay dominante", () => {
  const c = califica([22, 20, 19, 17]);
  assert.equal(c.tipo, "poco-diferenciado");
  assert.equal(c.principal, null);
  assert.equal(c.perfil, "Perfil poco diferenciado");
  assert.equal(c.destacados.length, 0);
  assert.equal(califica([22, 20, 19, 16]).tipo, "combinado"); // rango 6: ya no es poco diferenciado
});

caso("Tercera influencia (segundo − tercero ≤ 3, solo en combinado)", () => {
  const c = califica([30, 25, 23, 8]);
  assert.equal(c.tipo, "combinado");
  assert.equal(c.tercero, "M");
  assert.equal(califica([30, 25, 21, 8]).tercero, null);
  assert.equal(califica([38, 20, 19, 8]).tercero, null); // predominante: no aplica
});

caso("Dimensiones y sus etiquetas", () => {
  const c = califica([30, 28, 8, 6]); // (S + C) − (M + F) = 44; (C + M) − (S + F) = 0
  assert.equal(c.dimensiones.afuera.valor, 44);
  assert.equal(c.dimensiones.afuera.k, "alto");
  assert.equal(c.dimensiones.intensa.valor, 0);
  assert.equal(c.dimensiones.intensa.k, "medio");
  const d = califica([6, 8, 28, 30]);
  assert.equal(d.dimensiones.afuera.k, "bajo");
  assert.equal(d.dimensiones.afuera.valor, -44);
  assert.equal(califica([20, 24, 26, 18]).dimensiones.intensa.valor, 12); // 50 − 38
  assert.equal(califica([20, 24, 26, 18]).dimensiones.intensa.k, "alto");
  assert.equal(califica([20, 20, 20, 20]).dimensiones.afuera.valor, 0);
  assert.equal(califica([20, 22, 26, 24]).dimensiones.afuera.valor, -8); // intermedio (−9 a 9)
  assert.equal(califica([20, 22, 26, 24]).dimensiones.afuera.k, "medio");
});

caso("Estilo de respuesta: todas iguales, media alta y media baja", () => {
  const iguales = calificarTemperamentos({ items: Array(40).fill(3) });
  assert.equal(iguales.flags[0].lvl, "alert");
  assert.match(iguales.flags[0].t, /iguales/);
  const altas = califica([36, 35, 36, 35]);
  assert.ok(altas.flags.some((f) => f.lvl === "warn" && /3,5/.test(f.t)));
  const bajas = califica([4, 5, 3, 2]);
  assert.ok(bajas.flags.some((f) => f.lvl === "warn" && /0,5/.test(f.t)));
  assert.equal(califica([30, 24, 12, 8]).flags.filter((f) => f.lvl !== "").length, 0);
});

caso("Ítems destacados: 4 (o 3 si no hay ninguno con 4) del principal y del secundario", () => {
  const items = perfil([36, 29, 12, 8]); // S: seis 4 y cuatro 3
  const c = calificarTemperamentos({ items });
  assert.deepEqual(c.destacados.map((g) => g.id), ["S", "C"]);
  assert.ok(c.destacados[0].items.length > 0 && c.destacados[0].items.every((i) => i.valor === 4 && temperamentoDeItem(i.n) === "S"));
  // Sin ningún 4: solo se destacan los 3.
  const solo3 = Array(40).fill(0);
  for (let j = 0; j < 10; j++) { solo3[j * 4] = j < 6 ? 3 : 2; solo3[j * 4 + 1] = j < 3 ? 3 : 2; }
  const d = calificarTemperamentos({ items: solo3 });
  assert.equal(d.destacados[0].id, "S");
  assert.ok(d.destacados[0].items.length === 6 && d.destacados[0].items.every((i) => i.valor === 3));
});

caso("Seguimiento frente a la aplicación anterior", () => {
  const s = seguimientoTemperamentos({ items: perfil([24, 30, 12, 8]) }, { items: perfil([30, 24, 12, 8]) });
  assert.equal(s.cambioDeTipo, true);
  assert.equal(s.perfilAntes, "Sanguíneo con rasgos de colérico");
  assert.equal(s.perfilAhora, "Colérico con rasgos de sanguíneo");
  assert.deepEqual(s.filas.map((f) => f.cambio), [-6, 6, 0, 0]);
  const html = informeTemperamentosHtml({ datos: { items: perfil([24, 30, 12, 8]) }, nombre: "Prueba", fecha: "2026-11-01" }, { datos: { items: perfil([30, 24, 12, 8]) }, nombre: "Prueba", fecha: "2026-06-01" }, "nota");
  assert.match(html, /Seguimiento: comparación con la aplicación anterior/);
  assert.match(html, /cambió el perfil/);
  assert.match(html, /Fundamento y límites/);
  assert.match(html, /no un diagnóstico ni una medida validada con baremos/);
  assert.match(html, /Implicaciones para la terapia/);
});

caso("Informe profesional de todos los tipos de perfil", () => {
  for (const sumas of [[14, 30, 20, 12], [24, 30, 12, 8], [12, 28, 28, 10], [22, 20, 19, 17], [30, 25, 23, 8]]) {
    const html = informeTemperamentosHtml({ datos: { items: perfil(sumas) }, nombre: "Prueba", fecha: "2026-11-01" });
    assert.match(html, /<!doctype html>/);
    assert.match(html, /Dimensiones/);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
});

caso("Informe al paciente: válido, sin siglas ni puntajes por defecto", () => {
  const extra = { paciente: "P", fechaAplicacion: "2026-11-01", notas: "", profesional: "X" };
  for (const sumas of [[14, 30, 20, 12], [24, 30, 12, 8], [12, 28, 28, 10], [22, 20, 19, 17], [30, 25, 23, 8]]) {
    const inf = informePacienteTemperamentos({ items: perfil(sumas) }, opcionesPorDefectoTemperamentos(), extra);
    const leido = leerInformePaciente(JSON.parse(JSON.stringify(inf)));
    assert.ok(leido, "pasa leerInformePaciente");
    assert.equal(leido.ayuda, null);
    assert.ok(leido.destacado.titulo.length > 0);
    assert.equal(leido.grafica.barras.length, 4);
    assert.equal(leido.grafica.max, 40);
    const valores = leido.grafica.barras.map((b) => b.valor);
    assert.deepEqual(valores, [...valores].sort((a, b) => b - a), "de mayor a menor");
    assert.ok(leido.resultados.every((r) => r.puntuacion === undefined));
    const texto = JSON.stringify([leido.destacado, leido.resultados, leido.grafica.barras.map((b) => [b.etiqueta, b.texto]), leido.intro, leido.aviso]);
    assert.doesNotMatch(texto, /\bTEMP\b|\b[SCMF]-[SCMF]\b|\b\d+ de 40\b|\b\d+\/40\b/);
    assert.match(leido.aviso, /no es un diagnóstico/);
  }
  const pred = informePacienteTemperamentos({ items: perfil([14, 30, 20, 12]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.equal(pred.destacado.titulo, "Su temperamento: Predominantemente colérico");
  assert.equal(pred.grafica.barras.filter((b) => b.destacada).length, 1);
  assert.equal(pred.grafica.barras[0].etiqueta, "Colérico");
  assert.ok(!pred.resultados.some((r) => /segundo temperamento/i.test(r.area)));
  const comb = informePacienteTemperamentos({ items: perfil([24, 30, 12, 8]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.equal(comb.destacado.titulo, "Su temperamento: Colérico con rasgos de sanguíneo");
  assert.deepEqual(comb.resultados.map((r) => r.area).slice(0, 2), ["Cómo suele ser usted", "Sus fortalezas"]);
  assert.ok(comb.resultados.some((r) => /^Su segundo temperamento: Sanguíneo/.test(r.area)));
  assert.equal(comb.resultados.length, AREAS_TEMPERAMENTOS.length);
  assert.ok(comb.resultados.some((r) => r.texto.includes("• ")));
  const poco = informePacienteTemperamentos({ items: perfil([22, 20, 19, 17]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.match(poco.destacado.titulo, /equilibrado/);
  assert.equal(poco.grafica.barras.filter((b) => b.destacada).length, 0);
});

caso("Informe al paciente: quitar tarjetas y mostrar puntuaciones", () => {
  const extra = { paciente: "P", fechaAplicacion: "2026-11-01", notas: " hola ", profesional: "X" };
  const o = opcionesPorDefectoTemperamentos();
  o.incluir.estres = false; o.incluir.trabajo = false; o.mostrarPuntuaciones = true;
  const inf = informePacienteTemperamentos({ items: perfil([24, 30, 12, 8]) }, o, extra);
  assert.ok(!inf.resultados.some((r) => r.area === "Cuando hay estrés" || r.area === "En el trabajo o el estudio"));
  assert.equal(inf.resultados[0].puntuacion, "30 de 40");
  assert.equal(inf.grafica.barras[0].texto, "30 de 40");
  assert.equal(inf.notas, "hola");
});

caso("Contenido por temperamento completo", () => {
  for (const id of TEMPERAMENTOS_IDS) {
    const i = TEMPERAMENTOS_INFO[id];
    assert.ok(i.caracteristicas.length >= 6 && i.caracteristicas.length <= 8);
    assert.equal(i.fortalezas.length, 6);
    assert.equal(i.cuidar.length, 6);
    assert.equal(i.crecer.length, 4);
    for (const k of ["resumen", "relaciones", "trabajo", "estres"]) assert.ok(i[k].length > 40);
    for (const k of ["alianza", "ritmo", "tareas", "riesgos"]) assert.ok(i.terapia[k].length > 20);
  }
  for (const [k, v] of Object.entries(COMBINACIONES)) assert.ok(v.texto.length > 100 && k.length === 3);
});

caso("Registro único: instrumento declarado en todos los registros", () => {
  assert.ok(instrumentoPorId("temperamentos"));
  assert.equal(instrumentoPorId("temperamentos").edadMinima, 14);
  assert.ok(REGISTRO.temperamentos && REGISTRO_SERVIDOR.temperamentos);
  assert.equal(REGISTRO.temperamentos.sigla, "TEMP");
  const fila = { id: "1", instrumento: "temperamentos", datos: { items: perfil([24, 30, 12, 8]) }, createdAt: "2026-11-01T10:00:00Z", fecha: "2026-11-01", respondienteNombre: "P" };
  const r = REGISTRO.temperamentos.resumen(fila);
  assert.equal(r.insignia, "Colérico con rasgos de sanguíneo");
  assert.equal(r.alarma, false);
  assert.match(r.puntuaciones.join(" "), /Colérico 30/);
  const e = REGISTRO.temperamentos.evolucion(fila);
  assert.deepEqual(e.puntos, []);
  assert.equal(e.hito.tipo, "temperamentos");
  assert.equal(e.hito.titulo, "Temperamento: Colérico con rasgos de sanguíneo");
  assert.match(e.hito.detalle, /Sanguíneo 24/);
  assert.equal(REGISTRO.temperamentos.resumen({ ...fila, datos: { items: [1] } }), null);
  const v = REGISTRO_SERVIDOR.temperamentos.validar({ items: perfil([24, 30, 12, 8]) }, null);
  assert.equal(v.ok, true);
  assert.equal(REGISTRO_SERVIDOR.temperamentos.validar({ items: [1, 2] }, null).ok, false);
  assert.deepEqual(REGISTRO.temperamentos.avance({ items: [1, 2, 3] }, null), { respondidas: 3, total: 40 });
});

console.log(`\n${ok}/${ok} casos correctos.`);
