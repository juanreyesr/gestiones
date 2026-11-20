// Pruebas de las Bibliotecas JJR (fichas clínicas de referencia). Ejecutar: pnpm test:bibliotecas
import assert from "node:assert/strict";
import fs from "node:fs";
import { BIBLIOTECAS, FICHA_DE_DX_EAPI, fichaClinicaPorId, fichasDeEapi, fichasDeMcea } from "../src/lib/bibliotecas/index.ts";
import { FICHA_IDS } from "../src/lib/evaluaciones/fichas/catalogo.ts";
import { calificarEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
const leer = (ruta) => fs.readFileSync(new URL(ruta, import.meta.url), "utf8");
const entre = (arr, min, max, que) => assert.ok(arr.length >= min && arr.length <= max, `${que}: ${arr.length} (esperado ${min}–${max})`);

caso("Biblioteca «Psicopatología»: 6 fichas con ids estables y únicos", () => {
  const b = BIBLIOTECAS.find((x) => x.id === "psicopatologia");
  assert.ok(b);
  assert.deepEqual(b.fichas.map((f) => f.id), ["ansiedad-generalizada", "panico", "depresion-mayor", "adaptacion", "toc", "rumiacion-estres"]);
  const todos = BIBLIOTECAS.flatMap((x) => x.fichas.map((f) => f.id));
  assert.equal(new Set(todos).size, todos.length);
});

caso("Cada ficha cumple la estructura (cantidades, textos no vacíos y < 600 caracteres)", () => {
  for (const f of BIBLIOTECAS.flatMap((b) => b.fichas)) {
    entre(f.sintomasClave, 5, 8, `${f.id} síntomas`);
    entre(f.noConfundir, 3, 5, `${f.id} no confundir`);
    entre(f.preguntas, 6, 8, `${f.id} preguntas`);
    entre(f.alertas, 3, 5, `${f.id} alertas`);
    entre(f.plan, 3, 5, `${f.id} plan`);
    entre(f.deteccion, 2, 4, `${f.id} detección`);
    entre(f.referencias, 2, 4, `${f.id} referencias`);
    const textos = [f.nombre, f.codigos.dsm, f.codigos.cie, f.enPocasPalabras, f.duracion, f.caso, f.clave, ...f.sintomasClave, ...f.preguntas, ...f.alertas, ...f.deteccion, ...f.referencias, ...f.noConfundir.flatMap((d) => [d.con, d.diferencia]), ...f.plan.map((p) => p.texto)];
    for (const t of textos) {
      assert.equal(typeof t, "string");
      assert.ok(t.trim().length > 0, `${f.id}: texto vacío`);
      assert.ok(t.length < 600, `${f.id}: texto de ${t.length} caracteres`);
    }
  }
});

caso("El plan solo enlaza fichas terapéuticas que existen y las etapas van de 1 a 5", () => {
  for (const f of BIBLIOTECAS.flatMap((b) => b.fichas)) {
    for (const p of f.plan) {
      assert.ok([1, 2, 3, 4, 5].includes(p.etapa), `${f.id}: etapa ${p.etapa}`);
      for (const id of p.fichas) assert.ok(FICHA_IDS.includes(id), `${f.id}: ficha ${id} no existe`);
    }
    assert.ok(f.plan.some((p) => p.etapa === 2 && p.fichas.length), `${f.id}: debe enlazar alguna ficha de psicoeducación (etapa 2)`);
  }
});

caso("Riesgo: depresión y adaptación mencionan riesgo suicida; depresión, manía o hipomanía", () => {
  const txt = (id) => JSON.stringify(fichaClinicaPorId(id).ficha.alertas).toLowerCase();
  assert.match(txt("depresion-mayor"), /suicid/);
  assert.match(txt("depresion-mayor"), /man[ií]a|hipoman/);
  assert.match(txt("adaptacion"), /suicid|riesgo/);
});

caso("Hipótesis del EAPI → fichas (todas las hipótesis con ficha apuntan a una que existe)", () => {
  for (const [dx, id] of Object.entries(FICHA_DE_DX_EAPI)) if (id) assert.ok(fichaClinicaPorId(id), `${dx} → ${id}`);
  assert.equal(FICHA_DE_DX_EAPI.safety, null);
  assert.deepEqual(fichasDeEapi([{ id: "tag" }, { id: "tag_sub" }, { id: "safety" }, { id: "dep" }]), ["ansiedad-generalizada", "depresion-mayor"]);
  // Con una calificación real: GAD-7 alto → TAG.
  const c = calificarEapi({ gad: [3, 3, 3, 3, 3, 3, 3], dass: null, ptq: null, docs: null, func: 2, safety: 0 });
  assert.ok(fichasDeEapi(c.dx).includes("ansiedad-generalizada"));
});

caso("MCEA → fichas con las mismas reglas que sus hipótesis", () => {
  const p = (raw, lvl = 0) => ({ id: "x", raw, max: 27, lvl });
  assert.deepEqual(fichasDeMcea({ PHQ9: p(12), GAD7: p(9), PTQ: p(20, 1) }), ["depresion-mayor"]);
  assert.deepEqual(fichasDeMcea({ PHQ9: p(4), GAD7: p(11), PTQ: p(40, 2) }), ["ansiedad-generalizada", "panico", "rumiacion-estres"]);
  assert.deepEqual(fichasDeMcea({}), []);
});

caso("Vistas: el estudiante no ve «Cómo lo detecta el sistema»; el paciente nunca ve las fichas clínicas", () => {
  const vista = leer("../src/components/bibliotecas/ficha-clinica-vista.tsx");
  assert.match(vista, /vista === "terapeuta" \? \(\s*<Seccion t=\{t\} titulo="Cómo lo detecta el sistema">/);
  // Nada del formulario público ni de los informes al paciente importa las bibliotecas.
  for (const ruta of ["../src/components/evaluaciones/formularios.tsx", "../src/components/evaluaciones/ficha-form.tsx", "../src/lib/evaluaciones/informe-paciente.ts", "../src/lib/evaluaciones/eapi/informe-paciente.ts", "../src/lib/evaluaciones/mcea/informe-paciente.ts"]) {
    assert.doesNotMatch(leer(ruta), /bibliotecas/, ruta);
  }
});

caso("Integración en el panel: informes EAPI y MCEA, e «Intervención guiada» ejecuta las acciones", () => {
  assert.match(leer("../src/components/clinica/informe-eapi.tsx"), /<FichasClinicasRelacionadas ids=\{fichasDeEapi\(calificarEapi\(efectivos\)\.dx\)\} \/>/);
  assert.match(leer("../src/components/clinica/informe-mcea.tsx"), /<FichasClinicasRelacionadas ids=\{fichasDeMcea\(scoreAll\(datos\)\)\} \/>/);
  const ig = leer("../src/components/clinica/intervencion-guiada.tsx");
  assert.match(ig, /addEventListener\(EVENTO_ACCION_FICHA/);
  assert.match(ig, /if \(modo !== "completo"\) return;/);
  assert.match(ig, /<BotonBibliotecaClinica \/>/);
});

console.log(`\n${ok} pruebas correctas.`);
