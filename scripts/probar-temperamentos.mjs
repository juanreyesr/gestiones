// Pruebas del cuestionario de temperamento · versión JJ. Ejecutar: pnpm test:temperamentos
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  assert.equal(c.combinacion, "C-M"); // segundo con presencia (20 ≥ 16): también se describe la mezcla
  assert.equal(califica([14, 30, 15, 12]).combinacion, null); // segundo muy bajo: sin mezcla
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
  assert.deepEqual(c.dominantes, ["C", "M"]);
});

caso("Perfil poco diferenciado (mayor − menor ≤ 5): SIEMPRE hay dominante, aclarando que la diferencia es pequeña", () => {
  const c = califica([22, 20, 19, 17]);
  assert.equal(c.tipo, "poco-diferenciado");
  assert.equal(c.principal, "S");
  assert.deepEqual(c.dominantes, ["S"]);
  assert.equal(c.secundario, null);
  assert.equal(c.combinacion, null);
  assert.equal(c.perfil, "Dominante sanguíneo (perfil poco diferenciado)");
  assert.deepEqual(c.destacados.map((g) => g.id), ["S"]);
  assert.ok(c.flags.some((f) => /dominante \(Sanguíneo\).*diferencia con los demás es pequeña/.test(f.t)));
  assert.equal(califica([22, 20, 19, 16]).tipo, "combinado"); // rango 6: ya no es poco diferenciado
  // Empate total: dominante por el orden fijo S, C, M, F.
  assert.equal(califica([20, 20, 20, 20]).principal, "S");
  assert.equal(califica([18, 20, 20, 19]).principal, "C");
  assert.equal(califica([18, 19, 20, 20]).principal, "M");
});

caso("SIEMPRE hay temperamento dominante, en todos los tipos de perfil", () => {
  const casos = [[14, 30, 20, 12], [24, 30, 12, 8], [12, 28, 28, 10], [22, 20, 19, 17], [20, 20, 20, 20], [10, 10, 10, 10], [36, 35, 36, 35]];
  for (const sumas of casos) {
    const c = califica(sumas);
    assert.ok(["S", "C", "M", "F"].includes(c.principal), `principal en ${sumas}`);
    assert.equal(c.principal, c.orden[0]);
    assert.ok(c.dominantes.length >= 1 && c.dominantes[0] === c.principal);
    assert.equal(c.dominantes.length, c.tipo === "codominantes" ? 2 : 1);
  }
  assert.deepEqual(califica([12, 28, 28, 10]).dominantes, ["C", "M"]);
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
    assert.match(html, /Temperament(o|os) dominantes?/);
    assert.match(html, /Características positivas \(fortalezas\)/);
    assert.match(html, /Características negativas o aspectos a cuidar/);
    assert.match(html, /Cómo aprovechar sus puntos fuertes/);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
  // Combinado: perfil combinado detallado para el profesional.
  const comb = informeTemperamentosHtml({ datos: { items: perfil([24, 30, 12, 8]) }, nombre: "Prueba", fecha: "2026-11-01" });
  assert.match(comb, /<div class="n">Colérico<\/div>/);
  for (const t of ["Perfil combinado: Colérico-sanguíneo", "Características principales de la mezcla", "Cómo se comporta", "Trato con los demás", "Decisiones:", "Conflicto:", "De qué debe cuidarse", "En qué ser más observador de sí mismo", "Cómo aprovechar lo positivo de su combinación", "Implicaciones para la terapia"])
    assert.ok(comb.includes(t), t);
  // Poco diferenciado: nombra el dominante y aclara que la diferencia es pequeña.
  const poco = informeTemperamentosHtml({ datos: { items: perfil([22, 20, 19, 17]) }, nombre: "Prueba", fecha: "2026-11-01" });
  assert.match(poco, /<div class="n">Sanguíneo<\/div>/);
  assert.match(poco, /la diferencia con los demás temperamentos es pequeña/);
  assert.match(poco, /Implicaciones para la terapia/);
  // Codominantes: los dos.
  const co = informeTemperamentosHtml({ datos: { items: perfil([12, 28, 28, 10]) }, nombre: "Prueba", fecha: "2026-11-01" });
  assert.match(co, /Temperamentos dominantes/);
  assert.match(co, /<div class="n">Colérico y melancólico<\/div>/);
});

caso("Informe al paciente: válido, abre con el dominante, sin siglas ni puntajes por defecto", () => {
  const extra = { paciente: "P", fechaAplicacion: "2026-11-01", notas: "", profesional: "X" };
  for (const sumas of [[14, 30, 20, 12], [24, 30, 12, 8], [12, 28, 28, 10], [22, 20, 19, 17], [30, 25, 23, 8]]) {
    const inf = informePacienteTemperamentos({ items: perfil(sumas) }, opcionesPorDefectoTemperamentos(), extra);
    const leido = leerInformePaciente(JSON.parse(JSON.stringify(inf)));
    assert.ok(leido, "pasa leerInformePaciente");
    assert.equal(leido.ayuda, null);
    assert.match(leido.destacado.titulo, /^Sus? temperamentos? dominantes? (es|son): /);
    assert.equal(leido.grafica.barras.length, 4);
    assert.equal(leido.grafica.max, 40);
    const valores = leido.grafica.barras.map((b) => b.valor);
    assert.deepEqual(valores, [...valores].sort((a, b) => b - a), "de mayor a menor");
    assert.ok(leido.resultados.every((r) => r.puntuacion === undefined));
    const texto = JSON.stringify([leido.destacado, leido.resultados, leido.grafica.barras.map((b) => [b.etiqueta, b.texto]), leido.intro, leido.aviso]);
    assert.doesNotMatch(texto, /\bTEMP\b|\b[SCMF]-[SCMF]\b|\b\d+ de 40\b|\b\d+\/40\b/);
    assert.match(leido.aviso, /no es un diagnóstico/);
    assert.equal(leido.resultados[0].area.startsWith("Su"), true);
    assert.equal(leido.resultados[0].area.includes("dominante"), true);
  }
  const pred = informePacienteTemperamentos({ items: perfil([14, 30, 15, 12]) }, opcionesPorDefectoTemperamentos(), extra);
  // Dominante claro con un segundo presente: también trae el perfil combinado.
  const predMezcla = informePacienteTemperamentos({ items: perfil([14, 30, 20, 12]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.ok(predMezcla.resultados.some((r) => r.area === "Su perfil combinado: Colérico con rasgos de melancólico"));
  assert.ok(predMezcla.resultados.some((r) => r.area === "Cómo suele comportarse"));
  assert.equal(pred.destacado.titulo, "Su temperamento dominante es: Colérico");
  assert.equal(pred.grafica.barras.filter((b) => b.destacada).length, 1);
  assert.equal(pred.grafica.barras[0].etiqueta, "Colérico");
  assert.ok(!pred.resultados.some((r) => /perfil combinado|Cómo suele comportarse/i.test(r.area)));
  // En predominante, las tarjetas de la mezcla usan el contenido del dominante.
  const cuidarPred = pred.resultados.find((r) => r.area === "De qué debe cuidarse");
  assert.ok(TEMPERAMENTOS_INFO.C.cuidar.every((x) => cuidarPred.texto.includes(`• ${x}`)));
  assert.ok(TEMPERAMENTOS_INFO.C.observar.every((x) => pred.resultados.find((r) => r.area.startsWith("En qué conviene")).texto.includes(`• ${x}`)));
  const comb = informePacienteTemperamentos({ items: perfil([24, 30, 12, 8]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.equal(comb.destacado.titulo, "Su temperamento dominante es: Colérico");
  assert.match(comb.destacado.texto, /Colérico con rasgos de sanguíneo/);
  assert.equal(comb.grafica.barras.filter((b) => b.destacada).length, 1);
  // Orden de las tarjetas (ids estables de AREAS_TEMPERAMENTOS) y títulos.
  assert.deepEqual(comb.resultados.map((r) => r.area), [
    "Su temperamento dominante",
    "Aspectos positivos de su temperamento",
    "Aspectos negativos o a cuidar",
    "Su perfil combinado: Colérico con rasgos de sanguíneo",
    "Cómo suele comportarse",
    "De qué debe cuidarse",
    "En qué conviene que sea más observador",
    "Cómo aprovechar sus puntos fuertes",
    "En sus relaciones",
    "En el trabajo o el estudio",
    "Cuando hay estrés",
    "Ideas para crecer",
  ]);
  assert.deepEqual(AREAS_TEMPERAMENTOS.map((a) => a.id), ["dominante", "positivos", "negativos", "mezcla", "comportamiento", "cuidarse", "observador", "aprovechar", "relaciones", "trabajo", "estres", "crecer"]);
  assert.equal(comb.resultados.length, AREAS_TEMPERAMENTOS.length);
  const mezcla = comb.resultados[3].texto;
  assert.ok(mezcla.startsWith(COMBINACIONES["C-S"].resumen));
  assert.ok(COMBINACIONES["C-S"].caracteristicas.every((x) => mezcla.includes(`• ${x}`)));
  assert.match(comb.resultados[4].texto, /^En el trato con los demás:\n/);
  assert.match(comb.resultados[4].texto, /\nAl tomar decisiones:\n.*\nAnte un desacuerdo:\n.*\nEn el trabajo o el estudio:\n/s);
  // Viñetas «• » al inicio de línea; subtítulos como línea propia terminada en «:».
  for (const r of comb.resultados) {
    for (const l of r.texto.split("\n")) {
      if (l.includes("•")) assert.ok(l.startsWith("• "), `viñeta mal colocada: ${l}`);
    }
  }
  assert.ok(comb.resultados[1].texto.split("\n").some((l) => l.endsWith(":") && !l.startsWith("•")));
  // Codominantes: nombra los dos.
  const co = informePacienteTemperamentos({ items: perfil([12, 28, 28, 10]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.equal(co.destacado.titulo, "Sus temperamentos dominantes son: Colérico y melancólico");
  assert.equal(co.grafica.barras.filter((b) => b.destacada).length, 2);
  assert.match(co.resultados[0].texto, /^Colérico:\n/);
  assert.match(co.resultados[0].texto, /\nMelancólico:\n/);
  // Poco diferenciado: nombra el dominante y aclara que la diferencia es pequeña.
  const poco = informePacienteTemperamentos({ items: perfil([22, 20, 19, 17]) }, opcionesPorDefectoTemperamentos(), extra);
  assert.equal(poco.destacado.titulo, "Su temperamento dominante es: Sanguíneo");
  assert.match(poco.destacado.texto, /diferencia con los demás es pequeña/);
  assert.equal(poco.grafica.barras.filter((b) => b.destacada).length, 1);
  assert.ok(poco.resultados.some((r) => /poco diferenciado/.test(r.area) && /tendencia suave/.test(r.texto)));
  assert.equal(poco.resultados[0].nivel, "Sanguíneo");
});

caso("Informe al paciente: quitar tarjetas y mostrar puntuaciones", () => {
  const extra = { paciente: "P", fechaAplicacion: "2026-11-01", notas: " hola ", profesional: "X" };
  const o = opcionesPorDefectoTemperamentos();
  o.incluir.estres = false; o.incluir.trabajo = false; o.mostrarPuntuaciones = true;
  const inf = informePacienteTemperamentos({ items: perfil([24, 30, 12, 8]) }, o, extra);
  assert.ok(!inf.resultados.some((r) => r.area === "Cuando hay estrés" || r.area === "En el trabajo o el estudio"));
  assert.equal(inf.resultados[0].puntuacion, "30 de 40");
  assert.equal(inf.resultados[3].puntuacion, "24 de 40");
  assert.equal(inf.grafica.barras[0].texto, "30 de 40");
  assert.equal(inf.notas, "hola");
});

const frases = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;
const SIGLA_GENERO = /\busted (es|está|se siente|se muestra) (impulsivo|impulsiva|[a-záéíóú]+(o|a)\b)/i;

caso("Contenido por temperamento completo (v1.1)", () => {
  for (const id of TEMPERAMENTOS_IDS) {
    const i = TEMPERAMENTOS_INFO[id];
    const fr = frases(i.resumen);
    assert.ok(fr >= 4 && fr <= 5, `${id}: resumen de 4–5 frases (${fr})`);
    assert.ok(i.caracteristicas.length >= 8 && i.caracteristicas.length <= 10, `${id}: características`);
    assert.equal(i.fortalezas.length, 8);
    assert.equal(i.cuidar.length, 8);
    assert.equal(i.observar.length, 5);
    assert.equal(i.aprovechar.length, 5);
    assert.equal(i.crecer.length, 4);
    for (const l of [i.caracteristicas, i.fortalezas, i.cuidar, i.observar, i.aprovechar]) assert.equal(new Set(l).size, l.length, "sin repetidos");
    for (const k of ["relaciones", "trabajo", "estres"]) assert.ok(i[k].length > 40);
    for (const k of ["alianza", "ritmo", "tareas", "riesgos"]) assert.ok(i.terapia[k].length > 20);
    assert.ok(i.observar.every((x) => x.length > 30));
  }
});

caso("Las 12 combinaciones son perfiles propios y completos (v1.1)", () => {
  const claves = Object.keys(COMBINACIONES);
  assert.equal(claves.length, 12);
  for (const [k, v] of Object.entries(COMBINACIONES)) {
    assert.match(k, /^[SCMF]-[SCMF]$/);
    assert.ok(k[0] !== k[2]);
    const [a, b] = [k[0], k[2]];
    assert.equal(v.nombre, `${TEMPERAMENTOS_INFO[a].nombre}-${TEMPERAMENTOS_INFO[b].nombre.toLowerCase()}`);
    const fr = frases(v.resumen);
    assert.ok(fr >= 3 && fr <= 4, `${k}: resumen de 3–4 frases (${fr})`);
    assert.ok(v.resumen.length > 250, `${k}: resumen`);
    assert.ok(v.caracteristicas.length >= 6 && v.caracteristicas.length <= 7, `${k}: características`);
    for (const c of ["trato", "decisiones", "conflicto", "trabajo"]) {
      const f = frases(v.comportamiento[c]);
      assert.ok(f >= 2 && f <= 3, `${k}.${c}: 2–3 frases (${f})`);
      assert.ok(v.comportamiento[c].length > 150, `${k}.${c}`);
    }
    assert.equal(v.cuidar.length, 5, `${k}: cuidar`);
    assert.equal(v.observar.length, 4, `${k}: observar`);
    assert.equal(v.aprovechar.length, 5, `${k}: aprovechar`);
    for (const l of [v.caracteristicas, v.cuidar, v.observar, v.aprovechar]) {
      assert.equal(new Set(l).size, l.length, `${k}: sin repetidos`);
      assert.ok(l.every((x) => x.length > 25), `${k}: ítems con sustancia`);
    }
    // Es la mezcla: no repite literalmente las listas de ningún temperamento.
    for (const id of [a, b]) {
      const t = TEMPERAMENTOS_INFO[id];
      const propias = new Set([...t.caracteristicas, ...t.fortalezas, ...t.cuidar, ...t.observar, ...t.aprovechar]);
      for (const x of [...v.caracteristicas, ...v.cuidar, ...v.observar, ...v.aprovechar]) assert.ok(!propias.has(x), `${k}: repite «${x}»`);
    }
  }
  // El orden importa: C-S ≠ S-C (resumen, características, comportamiento y listas), y lo mismo en todas las inversas.
  for (const [x, y] of [["S", "C"], ["S", "M"], ["S", "F"], ["C", "M"], ["C", "F"], ["M", "F"]]) {
    const ab = COMBINACIONES[`${x}-${y}`];
    const ba = COMBINACIONES[`${y}-${x}`];
    assert.notEqual(ab.resumen, ba.resumen);
    assert.notEqual(ab.nombre, ba.nombre);
    assert.deepEqual(ab.caracteristicas.filter((c) => ba.caracteristicas.includes(c)), []);
    for (const c of ["trato", "decisiones", "conflicto", "trabajo"]) assert.notEqual(ab.comportamiento[c], ba.comportamiento[c]);
    assert.deepEqual(ab.cuidar.filter((c) => ba.cuidar.includes(c)), []);
    assert.deepEqual(ab.aprovechar.filter((c) => ba.aprovechar.includes(c)), []);
  }
  assert.notEqual(COMBINACIONES["C-S"].resumen, COMBINACIONES["S-C"].resumen);
  assert.notDeepEqual(COMBINACIONES["C-S"].caracteristicas, COMBINACIONES["S-C"].caracteristicas);
});

caso("Redacción: de usted, sin etiquetas clínicas ni «usted es + adjetivo con género»", () => {
  const textos = [];
  for (const i of Object.values(TEMPERAMENTOS_INFO)) textos.push(i.resumen, ...i.caracteristicas, ...i.fortalezas, ...i.cuidar, ...i.observar, ...i.aprovechar, i.relaciones, i.trabajo, i.estres, ...i.crecer);
  for (const v of Object.values(COMBINACIONES)) textos.push(v.resumen, ...v.caracteristicas, ...Object.values(v.comportamiento), ...v.cuidar, ...v.observar, ...v.aprovechar);
  for (const t of textos) {
    assert.doesNotMatch(t, SIGLA_GENERO, t);
    assert.doesNotMatch(t, /\b(trastorno|diagn[oó]stic|patolog|psicopat|depresi[oó]n cl[ií]nica|neur[oó]tic)/i, t);
    assert.doesNotMatch(t, /\b(tu|tus|ti|contigo)\b/i, t);
  }
});

caso("Los 40 ítems del formulario no cambiaron", () => {
  const h = createHash("sha256").update(JSON.stringify(TEMPERAMENTOS_ITEMS)).digest("hex");
  assert.equal(h, "93e994658a36359d722288ae29a099816f30341eb1328bf3f7d833b29788c49c");
  assert.equal(TEMPERAMENTOS_ITEMS.length, 40);
});

caso("Informe al paciente: sin recortes de leerInformePaciente y por debajo de 60 000 bytes (peor caso)", () => {
  const extra = { paciente: "Paciente de prueba con un nombre largo", fechaAplicacion: "2026-11-01", notas: "", profesional: "X" };
  const o = opcionesPorDefectoTemperamentos();
  o.mostrarPuntuaciones = true; // el peor caso añade puntajes
  /** Puntajes que dan una combinación dada, con o sin tercera influencia. */
  const para = (p, s, conTercero) => {
    const [x, y] = ["SCMF".indexOf(p), "SCMF".indexOf(s)];
    const arr = [0, 0, 0, 0];
    const resto = [0, 1, 2, 3].filter((k) => k !== x && k !== y);
    arr[x] = 30; arr[y] = 25;
    arr[resto[0]] = conTercero ? 23 : 12; arr[resto[1]] = 8;
    return arr;
  };
  const casos = [];
  for (const k of Object.keys(COMBINACIONES)) {
    casos.push([`combinado ${k}`, para(k[0], k[2], false), "combinado", k]);
    casos.push([`combinado ${k} con tercera influencia`, para(k[0], k[2], true), "combinado", k]);
  }
  [[38, 12, 10, 8], [10, 38, 12, 8], [8, 10, 38, 12], [8, 10, 12, 38]].forEach((s, n) => casos.push([`predominante ${"SCMF"[n]}`, s, "predominante", null]));
  [["S", "C"], ["S", "M"], ["S", "F"], ["C", "M"], ["C", "F"], ["M", "F"]].forEach(([a, b]) => {
    const arr = [12, 10, 8, 6]; arr["SCMF".indexOf(a)] = 28; arr["SCMF".indexOf(b)] = 28;
    casos.push([`codominantes ${a}-${b}`, arr, "codominantes", `${a}-${b}`]);
  });
  [[22, 20, 19, 17], [17, 22, 20, 19], [19, 17, 22, 20], [20, 19, 17, 22], [20, 20, 20, 20]].forEach((s) => casos.push([`poco diferenciado ${s}`, s, "poco-diferenciado", null]));
  assert.equal(casos.length, 24 + 4 + 6 + 5);
  let maxBytes = 0, maxTarjeta = 0, maxNombre = "";
  for (const [nombre, sumas, tipo, clave] of casos) {
    const c = califica(sumas);
    assert.equal(c.tipo, tipo, nombre);
    assert.equal(c.combinacion, clave, nombre);
    const inf = informePacienteTemperamentos({ items: perfil(sumas) }, o, extra);
    const json = JSON.stringify(inf);
    const bytes = Buffer.byteLength(json, "utf8");
    assert.ok(bytes < 60000, `${nombre}: ${bytes} bytes`);
    assert.ok(inf.resultados.length <= 30);
    const leido = leerInformePaciente(JSON.parse(json));
    assert.ok(leido, nombre);
    // Sin recortes: las longitudes antes y después de leerInformePaciente son iguales.
    assert.equal(leido.resultados.length, inf.resultados.length, nombre);
    inf.resultados.forEach((r, i) => {
      assert.ok(r.texto.length < 4000, `${nombre} · ${r.area}: ${r.texto.length} caracteres`);
      for (const k of ["area", "periodo", "nivel", "texto", "puntuacion"]) assert.equal((leido.resultados[i][k] ?? "").length, (r[k] ?? "").length, `${nombre} · ${r.area} · ${k}`);
      if (r.texto.length > maxTarjeta) { maxTarjeta = r.texto.length; }
    });
    for (const k of ["titulo", "texto"]) assert.equal(leido.destacado[k].length, inf.destacado[k].length, `${nombre} · destacado.${k}`);
    assert.equal(leido.intro.length, inf.intro.length);
    assert.equal(leido.aviso.length, inf.aviso.length);
    assert.equal(leido.grafica.nota.length, inf.grafica.nota.length);
    assert.equal(leido.grafica.barras.length, 4);
    assert.deepEqual(leido.resultados.map((r) => r.texto), inf.resultados.map((r) => r.texto), nombre);
    if (bytes > maxBytes) { maxBytes = bytes; maxNombre = nombre; }
  }
  console.log(`   peor caso: ${maxBytes} bytes (${maxNombre}); tarjeta más larga: ${maxTarjeta} caracteres`);
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
