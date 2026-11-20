// Pruebas de las Bibliotecas JJR (fichas clínicas de referencia). Ejecutar: pnpm test:bibliotecas
import assert from "node:assert/strict";
import fs from "node:fs";
import { BIBLIOTECAS, FICHAS_DE_DX_EAPI, fichaBibliotecaPorId, fichaClinicaPorId, fichasDeEapi, fichasDeMcea } from "../src/lib/bibliotecas/index.ts";
import { FICHA_IDS } from "../src/lib/evaluaciones/fichas/catalogo.ts";
import { calificarEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { fichaBibliotecaHtml, fichaClinicaHtml } from "../src/lib/bibliotecas/html.ts";
import { traducir } from "../src/lib/estudiante/i18n.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
const clinicas = () => BIBLIOTECAS.filter((b) => b.tipo === "clinica").flatMap((b) => b.fichas);
const tecnicas = () => BIBLIOTECAS.filter((b) => b.tipo === "tecnicas").flatMap((b) => b.fichas);
const leer = (ruta) => fs.readFileSync(new URL(ruta, import.meta.url), "utf8");
const entre = (arr, min, max, que) => assert.ok(arr.length >= min && arr.length <= max, `${que}: ${arr.length} (esperado ${min}–${max})`);

caso("Biblioteca «Psicopatología»: 12 fichas con ids estables y únicos", () => {
  const b = BIBLIOTECAS.find((x) => x.id === "psicopatologia");
  assert.ok(b);
  assert.deepEqual(b.fichas.map((f) => f.id), [
    "ansiedad-generalizada", "panico", "depresion-mayor", "adaptacion", "toc", "rumiacion-estres",
    "ansiedad-social", "fobia-especifica", "estres-postraumatico", "duelo-prolongado", "insomnio", "depresion-persistente",
  ]);
  const todos = BIBLIOTECAS.flatMap((x) => x.fichas.map((f) => f.id));
  assert.equal(new Set(todos).size, todos.length);
});

caso("Cada ficha cumple la estructura (cantidades, textos no vacíos y < 600 caracteres)", () => {
  for (const f of clinicas()) {
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
  for (const f of clinicas()) {
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
  for (const [dx, ids] of Object.entries(FICHAS_DE_DX_EAPI)) for (const id of ids) assert.ok(fichaClinicaPorId(id), `${dx} → ${id}`);
  assert.deepEqual(FICHAS_DE_DX_EAPI.safety, []);
  assert.deepEqual(fichasDeEapi([{ id: "tag" }, { id: "tag_sub" }, { id: "safety" }, { id: "dep" }]), ["ansiedad-generalizada", "depresion-mayor"]);
  assert.deepEqual(fichasDeEapi([{ id: "panic" }]), ["panico", "ansiedad-social"], "la hipótesis de pánico del EAPI incluye ansiedad social");
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

caso("PR 2 · Migración 067: tabla con RLS del propietario y RPC que valida inscripción activa", () => {
  const sql = leer("../supabase/migrations/067_gestionesjj_curso_bibliotecas.sql");
  assert.match(sql, /enable row level security/);
  for (const op of ["select", "insert", "delete"]) assert.match(sql, new RegExp(`for ${op} to authenticated (using|with check) \\(public\\.gestionesjj_is_owner\\(\\)\\)`), op);
  assert.match(sql, /references public\.gestionesjj_cursos_impartidos\(id\) on delete cascade/);
  assert.match(sql, /biblioteca_id ~ '\^\[a-z0-9-\]\{1,60\}\$'/);
  for (const cond of ["c.acceso_estudiantes = true", "ce.estado = 'activo'", "e.auth_user_id = auth.uid()", "e.activo"]) assert.ok(sql.includes(cond), cond);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /revoke all on function public\.gestionesjj_estudiante_bibliotecas_curso\(uuid\) from anon/);
  assert.match(leer("../supabase/PENDIENTES.md"), /067_gestionesjj_curso_bibliotecas\.sql/);
});

caso("PR 2 · PDF: el estudiante recibe caso y clave, nunca «Cómo lo detecta el sistema»; el terapeuta al revés", () => {
  const { ficha, biblioteca } = fichaClinicaPorId("ansiedad-generalizada");
  const est = fichaClinicaHtml(ficha, biblioteca, "estudiante");
  const ter = fichaClinicaHtml(ficha, biblioteca, "terapeuta");
  assert.doesNotMatch(est, /Cómo lo detecta el sistema/);
  assert.ok(!est.includes(ficha.deteccion[0].replace(/[&<>"']/g, "")) || !ficha.deteccion[0].length);
  assert.match(est, /Caso para analizar/);
  assert.match(est, /Clave para recordar/);
  assert.match(ter, /Cómo lo detecta el sistema/);
  assert.doesNotMatch(ter, /Caso para analizar/);
  // Escapa el HTML.
  const raro = { ...ficha, nombre: "<script>x</script>" };
  assert.doesNotMatch(fichaClinicaHtml(raro, biblioteca, "estudiante"), /<script>x/);
});

caso("PR 2 · Aula: el estudiante solo ve las bibliotecas de su curso (RPC) y en vista de estudiante", () => {
  const cli = leer("../src/lib/estudiante/estudiante-client.ts");
  assert.match(cli, /rpc\("gestionesjj_estudiante_bibliotecas_curso", \{ p_curso_id: cursoId \}\)/);
  assert.match(cli, /if \(error\) return \[\];/, "sin la migración: lista vacía, el Aula sigue igual");
  const comp = leer("../src/components/estudiante/biblioteca-curso.tsx");
  assert.match(comp, /<FichaBibliotecaVista biblioteca=\{biblioteca\} ficha=\{ficha\} tema="claro" vista="estudiante" \/>/);
  assert.match(comp, /fichaBibliotecaHtml\(ficha, biblioteca, "estudiante"\)/);
  assert.doesNotMatch(comp, /vista="terapeuta"|"terapeuta"/);
  assert.match(leer("../src/components/estudiante/curso-estudiante-detalle.tsx"), /<BibliotecaCurso cursoId=\{curso\.cursoId\} \/>/);
  // Docente: pestaña «Bibliotecas» y vista previa como estudiante.
  assert.match(leer("../src/components/cursos/curso-detalle.tsx"), /tab === "bibliotecas" \? <CursoBibliotecasTab cursoId=\{curso\.id\} \/>/);
  assert.match(leer("../src/components/cursos/curso-bibliotecas-tab.tsx"), /vista="estudiante"/);
});

caso("PR 2 · Textos de la interfaz del Aula en español, inglés y portugués", () => {
  for (const clave of ["biblioteca_titulo", "biblioteca_intro", "biblioteca_fichas", "biblioteca_descargar", "biblioteca_generando", "biblioteca_cerrar", "biblioteca_error_pdf"]) {
    const textos = ["es", "en", "pt"].map((i) => traducir(i, clave));
    for (const t of textos) assert.ok(t && t !== clave, `${clave}: falta traducción`);
  }
  assert.equal(traducir("en", "biblioteca_titulo"), "Library");
});

caso("Lote 2: las fichas clínicas enlazan las técnicas cognitivas (3.x), y el TOC no usa 3.1–3.3", () => {
  const etapa3 = (id) => fichaClinicaPorId(id).ficha.plan.filter((p) => p.etapa === 3).flatMap((p) => p.fichas);
  assert.deepEqual(etapa3("ansiedad-generalizada"), ["3.3", "3.4"]);
  assert.deepEqual(etapa3("depresion-mayor"), ["3.1", "3.2", "3.3"]);
  assert.deepEqual(etapa3("rumiacion-estres"), ["3.4"]);
  assert.ok(!etapa3("toc").some((f) => ["3.1", "3.2", "3.3"].includes(f)), "con obsesiones, examinar pruebas puede volverse comprobación");
});

caso("Lote 3: las fichas clínicas enlazan las técnicas conductuales (4.x)", () => {
  const etapa4 = (id) => fichaClinicaPorId(id).ficha.plan.filter((p) => p.etapa === 4).flatMap((p) => p.fichas);
  assert.ok(etapa4("panico").includes("4.4") && etapa4("panico").includes("4.2"));
  assert.ok(etapa4("depresion-mayor").includes("4.1"));
  assert.deepEqual(etapa4("toc"), ["4.4"]);
  assert.ok(etapa4("ansiedad-generalizada").includes("4.3"));
});

caso("Lote 4: todas las fichas clínicas cierran con prevención de recaídas (5.1 y 5.3)", () => {
  for (const f of clinicas()) {
    const etapa5 = f.plan.filter((p) => p.etapa === 5).flatMap((p) => p.fichas);
    assert.ok(etapa5.includes("5.1") && etapa5.includes("5.3"), f.id);
  }
});

caso("Lote 2 de la biblioteca: seguridad en TEPT, insomnio y duelo", () => {
  const txt = (id) => JSON.stringify(fichaClinicaPorId(id).ficha).toLowerCase();
  assert.match(txt("estres-postraumatico"), /formación en trauma|formacion en trauma/);
  assert.match(txt("estres-postraumatico"), /suicid/);
  assert.match(txt("insomnio"), /bipolar|manía|mania/);
  assert.match(txt("insomnio"), /apnea/);
  assert.match(txt("duelo-prolongado"), /12 meses/);
  assert.match(txt("depresion-persistente"), /2 años|dos años/);
});

caso("Biblioteca «Psicoterapia del adulto»: 8 fichas de técnica con su estructura", () => {
  const b = BIBLIOTECAS.find((x) => x.id === "psicoterapia-adulto");
  assert.ok(b && b.tipo === "tecnicas");
  assert.deepEqual(b.fichas.map((f) => f.id), [
    "formulacion-caso", "alianza-terapeutica", "entrevista-motivacional", "psicoeducacion",
    "dialogo-socratico", "activacion-conductual", "exposicion", "cierre-recaidas",
  ]);
  for (const f of tecnicas()) {
    entre(f.indicaciones, 4, 6, `${f.id} indicaciones`);
    entre(f.precauciones, 3, 5, `${f.id} precauciones`);
    entre(f.pasos, 5, 8, `${f.id} pasos`);
    entre(f.dialogo, 4, 8, `${f.id} diálogo`);
    entre(f.errores, 4, 6, `${f.id} errores`);
    entre(f.preguntas, 3, 4, `${f.id} preguntas`);
    entre(f.referencias, 2, 4, `${f.id} referencias`);
    for (const l of f.dialogo) assert.match(l, /^(Terapeuta|Paciente): /, `${f.id}: turno de diálogo`);
    for (const id of f.fichas) assert.ok(FICHA_IDS.includes(id), `${f.id}: ficha ${id} no existe`);
    const textos = [f.nombre, f.modelo, f.enPocasPalabras, f.evidencia, f.caso, f.clave, ...f.indicaciones, ...f.precauciones, ...f.pasos, ...f.dialogo, ...f.errores, ...f.preguntas, ...f.referencias];
    for (const t of textos) assert.ok(typeof t === "string" && t.trim() && t.length < 600, `${f.id}: texto inválido`);
  }
  // Ids únicos entre todas las bibliotecas.
  const todos = BIBLIOTECAS.flatMap((x) => x.fichas.map((f) => f.id));
  assert.equal(new Set(todos).size, todos.length);
  // La exposición pide formulación y formación en trauma; las fichas clínicas no se confunden con técnicas.
  assert.match(JSON.stringify(fichaBibliotecaPorId("exposicion").ficha.precauciones).toLowerCase(), /trauma/);
  assert.equal(fichaClinicaPorId("exposicion"), null);
});

caso("Técnicas: vista y PDF del estudiante con caso, preguntas y clave; el terapeuta sin ellos", () => {
  const { ficha, biblioteca } = fichaBibliotecaPorId("entrevista-motivacional");
  const est = fichaBibliotecaHtml(ficha, biblioteca, "estudiante");
  const ter = fichaBibliotecaHtml(ficha, biblioteca, "terapeuta");
  assert.match(est, /Caso para practicar/);
  assert.match(est, /Preguntas para practicar/);
  assert.doesNotMatch(ter, /Caso para practicar|Preguntas para practicar|Clave para recordar/);
  assert.match(ter, /Ejemplo de diálogo/);
  const vista = leer("../src/components/bibliotecas/ficha-tecnica-vista.tsx");
  assert.match(vista, /vista === "estudiante" \? \(/);
  // Aula y panel usan el visor común (elige por tipo de biblioteca).
  assert.match(leer("../src/components/estudiante/biblioteca-curso.tsx"), /<FichaBibliotecaVista biblioteca=\{biblioteca\}/);
  assert.match(leer("../src/components/clinica/fichas-clinicas.tsx"), /<FichaBibliotecaVista/);
});

console.log(`\n${ok} pruebas correctas.`);
