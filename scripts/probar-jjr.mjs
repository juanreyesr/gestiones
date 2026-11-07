// Pruebas de Intereses Vocacionales JJR (JJR-84 y JJR-INV-176). Ejecutar: pnpm test:jjr
import assert from "node:assert/strict";
import { BANCO_JJR, CAMPOS_PRINCIPALES } from "../src/lib/evaluaciones/jjr/banco.ts";
import { calificarJjr } from "../src/lib/evaluaciones/jjr/calificacion.ts";
import { avanceJjr, datosJjrGuardados, itemsJjr, limpiarBorradorJjr, validarJjr } from "../src/lib/evaluaciones/jjr/codigo.ts";
import { informeJjrHtml } from "../src/lib/evaluaciones/jjr/informe-html.ts";
import { informePacienteJjr, opcionesPorDefectoJjr } from "../src/lib/evaluaciones/jjr/informe-paciente.ts";
import { perfilesJjr } from "../src/lib/evaluaciones/jjr/evolucion.ts";
import { informeVencido, leerInformePaciente, sumarMeses } from "../src/lib/evaluaciones/informe-paciente.ts";
import { INSTRUMENTOS } from "../src/lib/evaluaciones/instrumentos.ts";
import { evolucionDelPaciente } from "../src/lib/evaluaciones/evolucion-paciente.ts";
import { nombreConOpciones, REGISTRO } from "../src/lib/evaluaciones/registro.ts";
import { REGISTRO_SERVIDOR } from "../src/lib/evaluaciones/registro-servidor.ts";
import { resumenRespuesta } from "../src/lib/evaluaciones/resumen-respuesta.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
const todas = (items, v) => Object.fromEntries(items.map((i) => [i.id, typeof v === "function" ? v(i) : v]));
const extra = { paciente: "Ana", fechaAplicacion: "2026-11-07", notas: "", profesional: "Lic." };

caso("Banco: 176 IDs únicos, 6 anclas por campo principal, formas de 130", () => {
  assert.equal(BANCO_JJR.length, 176);
  assert.equal(new Set(BANCO_JJR.map((i) => i.id)).size, 176);
  for (const c of CAMPOS_PRINCIPALES) assert.equal(BANCO_JJR.filter((i) => i.campo === c && i.grupo === "ancla").length, 6);
  for (const f of ["A", "B"]) {
    const it = itemsJjr("jjr176", f);
    assert.equal(it.length, 130);
    assert.equal(new Set(it.map((i) => i.id)).size, 130);
    assert.equal(it.filter((i) => i.grupo === "candidato").length, 28);
    assert.equal(it.filter((i) => i.grupo === "exploratorio").length, 18);
  }
});

caso("Orden intercalado de JJR-84 = tabla del documento (6 rondas × 14)", () => {
  const o = itemsJjr("jjr84", null).map((i) => i.id);
  assert.equal(o.length, 84);
  assert.deepEqual(o.slice(0, 3), ["ING01", "CIE01", "SAL01"]);
  assert.equal(o[10], "COM01");
  assert.deepEqual(o.slice(80), ["COM06", "VIS06", "MUS06", "JUR06"]);
  const a = itemsJjr("jjr176", "A").map((i) => i.id);
  assert.equal(a[0], "ING01"); assert.equal(a[14], "TUR01"); assert.equal(a[19], "AGR01");
});

caso("Validación estricta: rechaza 5, -1, 2.5, \"3\", true e IDs ajenos", () => {
  for (const malo of [5, -1, 2.5, "3", true]) assert.equal(validarJjr({ respuestas: { ING01: malo } }, "jjr84", null).ok, false);
  assert.equal(validarJjr({ respuestas: { TUR01: 2 } }, "jjr84", null).ok, false);
  assert.equal(validarJjr({ respuestas: { ING07: 2 } }, "jjr176", "B").ok, false, "ING07 es de la forma A");
  assert.equal(validarJjr({ respuestas: {} }, "jjr84", null).ok, false, "al menos una");
  assert.equal(validarJjr({ respuestas: { ING01: 1 } }, "jjr176", null).ok, false, "sin forma");
  const v = validarJjr({ respuestas: { ING01: 3, CIE01: "NC", SAL01: null } }, "jjr84", null);
  assert.ok(v.ok); assert.equal(v.datos.respuestas.DAT01, null); assert.equal(v.datos.version, "0.2.0-experimental");
});

caso("Ejemplo de control: ING = [4,3,2,1,0,NC] → parcial, media 2, suma 10", () => {
  const r = todas(itemsJjr("jjr84", null), 2);
  Object.assign(r, { ING01: 4, ING02: 3, ING03: 2, ING04: 1, ING05: 0, ING06: "NC" });
  const c = calificarJjr(validarJjr({ respuestas: r }, "jjr84", null).datos);
  const ing = c.campos.find((x) => x.campo === "ING");
  assert.equal(ing.estado, "parcial"); assert.equal(ing.media, 2); assert.equal(ing.suma_observada, 10);
  assert.equal(ing.suma_completa, null); assert.equal(ing.n_no_comprende, 1);
  assert.equal(c.perfilCompleto, false); assert.equal(c.uniforme, null);
});

caso("4 válidas → insuficiente sin media; completo uniforme detectado", () => {
  const r = todas(itemsJjr("jjr84", null), 4);
  const c = calificarJjr(validarJjr({ respuestas: r }, "jjr84", null).datos);
  assert.equal(c.perfilCompleto, true); assert.equal(c.uniforme, true); assert.equal(c.campos[0].media, 4);
  Object.assign(r, { CIE01: null, CIE02: "NC" });
  const c2 = calificarJjr(validarJjr({ respuestas: r }, "jjr84", null).datos);
  const cie = c2.campos.find((x) => x.campo === "CIE");
  assert.equal(cie.estado, "insuficiente"); assert.equal(cie.media, null); assert.equal(cie.n_omitidas, 1);
});

caso("JJR-INV-176: anclas completas pero NC en candidato → forma incompleta", () => {
  const items = itemsJjr("jjr176", "A");
  const r = todas(items, (i) => (i.grupo === "candidato" && i.id === "ING07" ? "NC" : 3));
  const d = validarJjr({ respuestas: r }, "jjr176", "A").datos;
  const c = calificarJjr(d);
  assert.equal(c.perfilCompleto, true); assert.equal(c.protocoloFormaCompleto, false);
  assert.equal(c.candidatos.reduce((n, g) => n + g.items.length, 0), 28);
  assert.equal(c.exploratorias.length, 6);
  assert.equal(d.orden_ids.length, 130); assert.equal(d.forma, "A");
  assert.ok(datosJjrGuardados(d));
});

caso("Borrador y avance", () => {
  const b = limpiarBorradorJjr({ respuestas: { ING01: 2, XXX01: 3, CIE01: 9, SAL01: "NC" }, otras: "x" });
  assert.deepEqual(b.respuestas, { ING01: 2, SAL01: "NC" });
  assert.deepEqual(avanceJjr(b, "jjr84", null), { respondidas: 2, total: 84 });
});

caso("Informes ordenados por inclinación, con gráfica y sin «experimental»", () => {
  const r = todas(itemsJjr("jjr176", "B"), (i) => (i.campo === "TEC" ? 4 : i.campo === "MUS" ? 3 : 1));
  const d = validarJjr({ respuestas: r, abiertas: { otras: "Robótica" } }, "jjr176", "B").datos;
  const html = informeJjrHtml({ datos: d, nombre: "Ana", fecha: "2026-11-07", edad: 15 }, null, "", { codigo: "IRC", fecha: "2026-10-01" });
  assert.doesNotMatch(html, /xperimental/); assert.match(html, /16 años o más/); assert.match(html, /Robótica/);
  assert.match(html, /Mayor inclinación: TEC Software/); assert.match(html, /M\. A\. Juan J\. Reyes/);
  assert.ok(html.indexOf("<strong>TEC</strong>") < html.indexOf("<strong>MUS</strong>"), "tabla de mayor a menor");
  const p = informePacienteJjr(d, opcionesPorDefectoJjr(true), extra);
  assert.equal(p.resultados.length, 15);
  assert.equal(p.resultados[0].area, "Software, sistemas digitales y seguridad");
  assert.equal(p.resultados[1].area, "Música y creación sonora");
  assert.equal(p.resultados[0].periodo, "Tu mayor inclinación");
  assert.match(p.resultados[0].texto, /Escribir instrucciones para que un programa/);
  assert.doesNotMatch(JSON.stringify(p), /xperimental|Si este campo aparece entre los más preferidos/);
  assert.match(p.destacado.titulo, /Tu mayor inclinación: Software/);
  assert.equal(p.grafica.barras.length, 14); assert.equal(p.grafica.barras[0].texto, "4,00"); assert.equal(p.grafica.barras[0].destacada, true);
  assert.equal(p.resultados[0].puntuacion, undefined);
  // Empate en el primer lugar: ambas destacadas y mismo puesto.
  const r2 = todas(itemsJjr("jjr84", null), (i) => (i.campo === "ING" || i.campo === "JUR" ? 4 : 2));
  const p2 = informePacienteJjr(validarJjr({ respuestas: r2 }, "jjr84", null).datos, opcionesPorDefectoJjr(false), extra);
  assert.match(p2.destacado.titulo, /Tus mayores inclinaciones: Ingeniería.* y Derecho/);
  assert.equal(p2.resultados[1].periodo, "Tu mayor inclinación");
  assert.equal(p2.resultados[2].periodo, "3.º lugar");
});

caso("Informe publicado: conserva gráfica, todas las áreas y textos; vigencia de 6 meses", () => {
  const r = todas(itemsJjr("jjr176", "A"), (i) => (i.campo === "TEC" ? 4 : 3));
  const p = informePacienteJjr(validarJjr({ respuestas: r }, "jjr176", "A").datos, opcionesPorDefectoJjr(true), extra);
  const leido = leerInformePaciente(JSON.parse(JSON.stringify(p)));
  assert.equal(leido.grafica.barras.length, 14, "la gráfica sobrevive a la publicación");
  assert.equal(leido.resultados.length, 15, "todas las áreas, no solo 12");
  assert.equal(leido.resultados[0].texto, p.resultados[0].texto, "texto completo");
  assert.equal(leido.vigenteHasta, "2027-05-07");
  assert.match(leido.aviso, /validez de 6 meses \(hasta el 7 de mayo de 2027\)/);
  assert.equal(informeVencido(leido, new Date(2027, 4, 7)), false);
  assert.equal(informeVencido(leido, new Date(2027, 4, 8)), true);
  assert.equal(sumarMeses("2026-08-31", 6), "2027-02-28");
});

caso("Redacción ajustada: SAL04 y SAL07 sin «sanitaria», con el texto original guardado", () => {
  const sal04 = BANCO_JJR.find((i) => i.id === "SAL04");
  assert.doesNotMatch(sal04.actividad, /sanitari|procedimiento/);
  assert.match(sal04.original, /atención sanitaria/);
  assert.doesNotMatch(BANCO_JJR.find((i) => i.id === "SAL07").actividad, /procedimiento/);
});

caso("Registro único: cada instrumento declarado en todos los registros", () => {
  for (const i of INSTRUMENTOS) {
    assert.ok(REGISTRO[i.id], `registro ${i.id}`);
    assert.ok(REGISTRO_SERVIDOR[i.id], `servidor ${i.id}`);
  }
  assert.equal(nombreConOpciones("jjr176", { forma: "B" }), "Intereses Vocacionales JJR, banco ampliado de investigación (JJR-INV-176) · forma B");
  assert.deepEqual(REGISTRO.jjr176.opcionesPublicas({ forma: "A", asignacion: "azar-v1" }), { forma: "A" });
});

caso("Servidor: la forma la fija el enlace; resumen, PDF y evolución vía registro", () => {
  const r = todas(itemsJjr("jjr176", "A"), 3);
  assert.equal(REGISTRO_SERVIDOR.jjr176.validar({ respuestas: r }, { forma: "B" }).ok, false, "IDs de A en enlace B");
  const v = REGISTRO_SERVIDOR.jjr176.validar({ respuestas: r }, { forma: "A" });
  assert.ok(v.ok); assert.equal(v.relacion, "Paciente");
  const fila = { id: "r1", instrumento: "jjr176", datos: v.datos, fecha: "2026-11-07", createdAt: "2026-11-07T10:00:00Z", respondienteNombre: "Ana" };
  const res = resumenRespuesta(fila);
  assert.match(res.puntuaciones[0], /Mayor inclinación/);
  assert.equal(REGISTRO.jjr176.resumen(fila).alarma, false);
  assert.deepEqual(REGISTRO.jjr176.opcionesNueva(fila, {}), { forma: "A", asignacion: "seguimiento" });
  const ev = evolucionDelPaciente([fila]);
  assert.equal(ev.hitos.length, 1); assert.match(ev.hitos[0].detalle, /Ingeniería/);
});

caso("Perfiles en el tiempo: solo mismo protocolo, versión y forma; últimas 3", () => {
  const fila = (id, inst, forma, fecha, v) => {
    const items = itemsJjr(inst, forma);
    const d = validarJjr({ respuestas: todas(items, v) }, inst, forma).datos;
    return { id, instrumento: inst, datos: d, fecha, createdAt: fecha + "T10:00:00Z", respondienteNombre: "Ana" };
  };
  const filas = [
    fila("a", "jjr84", null, "2026-01-01", 1), fila("b", "jjr84", null, "2026-02-01", 2),
    fila("c", "jjr84", null, "2026-03-01", 3), fila("d", "jjr84", null, "2026-04-01", 4),
    fila("e", "jjr176", "A", "2026-03-15", 2), fila("f", "jjr176", "B", "2026-04-15", 2),
  ];
  const p = perfilesJjr(filas);
  assert.equal(p.length, 3, "JJR-84, forma A y forma B por separado");
  const j84 = p.find((x) => x.clave.startsWith("JJR-84"));
  assert.equal(j84.total, 4);
  assert.deepEqual(j84.aplicaciones.map((a) => a.respuestaId), ["b", "c", "d"]);
  assert.deepEqual(j84.campos[0].puntos.map((x) => x.media), [2, 3, 4]);
  assert.equal(j84.campos.length, 14);
});

console.log(`\n${ok} pruebas correctas.`);
