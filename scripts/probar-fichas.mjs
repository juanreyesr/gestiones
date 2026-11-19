// Pruebas de las Fichas terapéuticas JJR (lote 1, id interno «ficha»). Ejecutar: pnpm test:fichas
import assert from "node:assert/strict";
import fs from "node:fs";
import { calificarEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { FORMA_MODULOS } from "../src/lib/evaluaciones/eapi/codigo.ts";
import { camposDeFicha, ETAPAS_FICHAS, FICHA_IDS, FICHAS, fichaPorId, rotuloFila, TIPOS_CAMPO } from "../src/lib/evaluaciones/fichas/catalogo.ts";
import { avanceFicha, campoTieneContenido, datosFichaGuardados, esFichaDelTerapeuta, fichaDeOpciones, limpiarBorradorFicha, opcionesFicha, respuestasVacias, validarFicha } from "../src/lib/evaluaciones/fichas/codigo.ts";
import { GUIA_TERAPEUTA } from "../src/lib/evaluaciones/fichas/guia-terapeuta.ts";
import { fichaEnBlancoHtml, fichaRespondidaHtml } from "../src/lib/evaluaciones/fichas/informe-html.ts";
import { detectarRiesgo, riesgoFicha } from "../src/lib/evaluaciones/fichas/riesgo.ts";
import { fichasRespondidas, fichasSugeridas } from "../src/lib/evaluaciones/fichas/sugeridas.ts";
import { borradorInicialFicha, datosFichaTerapeuta, estadosFichas, fechaLegible, prellenado, resumenIntervencion, siguientesEnRuta, sugerenciasIntervencion, tareaDeFicha } from "../src/lib/evaluaciones/fichas/intervencion.ts";
import { baseMotivo, comparativaMotivo, diffPalabras, FUENTE_CITA, FUENTE_EXPEDIENTE, historialMotivo, lineasComparativa, camposMotivoPresentes } from "../src/lib/evaluaciones/fichas/motivo.ts";
import { enlaceFicha } from "../src/lib/evaluaciones/fichas/intervencion.ts";
import { INSTRUMENTOS, instrumentoPorId } from "../src/lib/evaluaciones/instrumentos.ts";
import { buildPlan, etiquetas } from "../src/lib/evaluaciones/mcea/motor.ts";
import { TEXTOS_REGISTRO } from "../src/lib/evaluaciones/mcea/textos-registro.ts";
import { validarMcea } from "../src/lib/evaluaciones/mcea/codigo.ts";
import { nombreConOpciones, REGISTRO } from "../src/lib/evaluaciones/registro.ts";
import { REGISTRO_SERVIDOR } from "../src/lib/evaluaciones/registro-servidor.ts";
import { resumenRespuesta } from "../src/lib/evaluaciones/resumen-respuesta.ts";

let ok = 0;
const caso = (n, fn) => { fn(); ok++; console.log(`✔ ${n}`); };
const leer = (ruta) => fs.readFileSync(new URL(ruta, import.meta.url), "utf8");

/** Texto de muestra para cada tipo de campo (respuesta completa). */
const valorDeMuestra = (c) => {
  switch (c.tipo) {
    case "texto": return `Texto de ${c.id}`;
    case "parrafo": return `Párrafo de ${c.id} <b>con html</b> & «comillas»`;
    case "escala": return 7;
    case "lista": return [`Uno de ${c.id}`, "Dos"];
    case "casillas": return { marcadas: [c.opciones[0], c.opciones[2]], otra: c.conOtra ? "Otra cosa" : "" };
    case "tabla": return Array.from({ length: c.filasFijas ? c.filasFijas.length : 2 }, (_, i) => c.columnas.map((k) => `${k.id} ${i + 1}`));
  }
};
const respuestasDeMuestra = (f) => Object.fromEntries(camposDeFicha(f).map((c) => [c.id, valorDeMuestra(c)]));
const fila = (instrumento, datos, fecha = "2026-11-10", id = Math.random().toString(36).slice(2)) => ({ id, instrumento, datos, fecha, createdAt: `${fecha}T10:00:00Z`, respondienteNombre: "Ana" });

caso("Catálogo: 8 fichas, números únicos «etapa.n», etapa válida", () => {
  assert.equal(FICHAS.length, 8);
  assert.deepEqual(FICHAS.map((f) => f.id), [...FICHA_IDS]);
  assert.equal(new Set(FICHAS.map((f) => f.id)).size, 8);
  assert.deepEqual(FICHAS.map((f) => f.id), ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4"]);
  for (const f of FICHAS) {
    assert.equal(Number(f.id.split(".")[0]), f.etapa, f.id);
    assert.ok(ETAPAS_FICHAS[f.etapa], f.id);
    assert.ok(f.titulo && f.paraQue && f.tiempo, f.id);
  }
  assert.equal(fichaPorId("1.3").titulo, "Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta");
  assert.equal(fichaPorId("9.9"), null);
});

caso("Catálogo: cada ficha con explicación (2–4 párrafos), sección y cierre", () => {
  for (const f of FICHAS) {
    assert.ok(f.explicacion.length >= 2 && f.explicacion.length <= 4, `explicación ${f.id}`);
    assert.ok(f.explicacion.every((p) => p.length > 40), f.id);
    assert.ok(f.secciones.length >= 1, f.id);
    assert.ok(f.secciones.every((s) => s.titulo && s.intro && s.campos.length >= 1), f.id);
    assert.equal(f.cierre.titulo, "Qué haremos con esto en la próxima sesión");
    assert.ok(f.cierre.texto.length > 40 && f.cierre.campos.length >= 1, `cierre ${f.id}`);
  }
});

caso("Catálogo: campos con id único por ficha, tipo válido y configuración coherente", () => {
  for (const f of FICHAS) {
    const campos = camposDeFicha(f);
    assert.equal(new Set(campos.map((c) => c.id)).size, campos.length, `ids únicos ${f.id}`);
    for (const c of campos) {
      assert.ok(TIPOS_CAMPO.includes(c.tipo), `${f.id}/${c.id}`);
      assert.ok(c.etiqueta.length > 3, `${f.id}/${c.id}`);
      if (c.tipo === "escala") assert.equal(c.extremos.length, 2);
      if (c.tipo === "lista") assert.ok(c.minFilas >= 0 && c.minFilas <= c.maxFilas && c.maxFilas <= 20, `${f.id}/${c.id}`);
      if (c.tipo === "casillas") assert.ok(c.opciones.length >= 2 && new Set(c.opciones).size === c.opciones.length, `${f.id}/${c.id}`);
      if (c.tipo === "tabla") {
        assert.ok(c.columnas.length >= 2 && new Set(c.columnas.map((k) => k.id)).size === c.columnas.length, `${f.id}/${c.id}`);
        assert.ok(c.filas <= c.maxFilas && c.maxFilas <= 20, `${f.id}/${c.id}`);
        if (c.filasFijas) assert.equal(c.filasFijas.length, c.filas);
      }
    }
  }
  // Se usan todos los tipos de campo en el lote.
  const usados = new Set(FICHAS.flatMap((f) => camposDeFicha(f).map((c) => c.tipo)));
  for (const t of TIPOS_CAMPO) assert.ok(usados.has(t), `tipo ${t} sin usar`);
  // El ciclo de 1.3 tiene las 5 columnas de la especificación.
  const ciclo = camposDeFicha(fichaPorId("1.3")).find((c) => c.id === "ciclo");
  assert.deepEqual(ciclo.columnas.map((k) => k.id), ["situacion", "pensamiento", "emocion", "cuerpo", "conducta"]);
  // 1.4: las 7 áreas de valores.
  assert.equal(camposDeFicha(fichaPorId("1.4")).find((c) => c.id === "valores").filasFijas.length, 7);
});

caso("Redacción: de usted, sin siglas ni etiquetas diagnósticas, sin promesas", () => {
  const texto = JSON.stringify(FICHAS);
  assert.doesNotMatch(texto, /\b(tú|tienes|puedes|quieres|debes|eres|estás|tu |tus )\b/i, "trato de tú");
  assert.doesNotMatch(texto, /\b(TCC|DSM|CIE|TAG|TOC|PHQ|GAD|DASS|PTQ|trastorno|depresión|diagnóstico)\b/, "siglas o etiquetas");
  assert.doesNotMatch(texto, /va a curarse|se curar|desaparecerá|garantiz|siempre funciona/i, "promesas");
  assert.doesNotMatch(texto, /\b(medicación|medicamento|pastilla|dosis)\b/i, "indicaciones médicas");
});

caso("2.4: solo observar y listar, sin exposición por cuenta propia", () => {
  const f = fichaPorId("2.4");
  const t = JSON.stringify(f);
  assert.match(f.explicacion.join(" "), /No tiene que hacer nada distinto por su cuenta/);
  assert.match(f.cierre.texto, /No intente enfrentar nada por su cuenta/);
  assert.doesNotMatch(t, /enfrente|exponga|tarea de exposición/i);
});

/* ---------------- v1.1 A: instrucciones guiadas ---------------- */

/** Todos los textos que ve el paciente en una ficha (incluidos los rótulos de las filas de las tablas). */
const textosDeFicha = (f) => {
  const out = [f.titulo, f.paraQue, ...f.explicacion, f.cierre.titulo, f.cierre.texto];
  for (const s of f.secciones) out.push(s.titulo, s.intro);
  for (const c of camposDeFicha(f)) {
    out.push(c.etiqueta, c.ayuda ?? "", c.ejemplo ?? "");
    if (c.tipo === "tabla") {
      for (const k of c.columnas) out.push(k.titulo, k.ayuda ?? "", k.ejemplo ?? "");
      for (let i = 0; i < Math.max(c.filas, c.maxFilas); i++) out.push(rotuloFila(c, i));
    }
  }
  return out.filter(Boolean);
};

/**
 * Regla de «pregunta» (v1.1, A.2): la etiqueta de cada campo (y el título de cada columna de una tabla) es
 * una pregunta directa —contiene «¿…?», a veces tras una breve entrada («Hoy, ¿cuánto…?»)— o una instrucción imperativa clara de usted, que
 * empieza con uno de estos verbos. Una etiqueta suelta («Situación», «Fila 1») no cumple.
 */
const IMPERATIVOS = /^(Escriba|Anote|Marque|Cuente|Piense|Describa|Mencione|Elija|Indique|Enumere|Recuerde|Imagine|Complete|Señale)\b/;
const esPregunta = (t) => /¿[^?]+\?/.test(t) || IMPERATIVOS.test(t);
/** Regla de invitación (A.1): la introducción de cada sección empieza con un verbo en imperativo de usted o una invitación («Comencemos…»). */
const INVITACION = /^(Comencemos|Empecemos|Veamos|Pensemos|Ahora|Para terminar|Piense|Recuerde|Recorra|Escriba|Anote|Marque|Cuente|Describa|Imagine|Mire|Observe|Revise|Elija)\b/;

caso("v1.1 A: ninguna ficha usa «Fila» ni «Fila n»", () => {
  for (const f of FICHAS) {
    for (const t of textosDeFicha(f)) assert.doesNotMatch(t, /\bfilas?\s*\d*\b/i, `${f.id}: «${t}»`);
  }
  assert.doesNotMatch(leer("../src/components/evaluaciones/ficha-campos.tsx"), /Fila \$\{|"Fila|Fila \{/);
});

caso("v1.1 A: cada sección abre con una invitación concreta de usted (verbo o invitación)", () => {
  for (const f of FICHAS) {
    for (const s of f.secciones) {
      assert.ok(s.intro && s.intro.length > 80, `${f.id}/${s.id}: introducción`);
      assert.match(s.intro, INVITACION, `${f.id}/${s.id}: «${s.intro.slice(0, 40)}…»`);
      assert.doesNotMatch(s.intro, /\b(tú|tu|tus|tienes|puedes)\b/i, `${f.id}/${s.id}: trato de tú`);
    }
  }
  const i13 = fichaPorId("1.3").secciones[0].intro;
  assert.equal(i13, "Comencemos recordando un momento reciente que le haya causado ansiedad o malestar. Piense dónde estaba y qué estaba pasando; con eso iremos identificando, paso a paso, lo que pasó por su mente y su cuerpo.");
});

caso("v1.1 A: cada campo es una pregunta directa (o una instrucción imperativa clara); también las columnas", () => {
  assert.ok(esPregunta("¿Qué pasó?") && esPregunta("Marque todas las que correspondan") && !esPregunta("Situación") && !esPregunta("Fila 1") && !esPregunta("Lo que sentí"));
  for (const f of FICHAS) {
    for (const c of camposDeFicha(f)) {
      assert.ok(esPregunta(c.etiqueta), `${f.id}/${c.id}: «${c.etiqueta}»`);
      if (c.tipo === "tabla") for (const k of c.columnas) assert.ok(esPregunta(k.titulo), `${f.id}/${c.id}/${k.id}: «${k.titulo}»`);
    }
  }
  // Una sola pregunta por campo: sin dos signos «?» seguidos en una etiqueta de texto libre.
  for (const f of FICHAS) for (const c of camposDeFicha(f)) if (c.tipo === "parrafo" || c.tipo === "texto") assert.ok((c.etiqueta.match(/\?/g) ?? []).length <= 1, `${f.id}/${c.id}: dos preguntas en una`);
});

caso("v1.1 A: tablas con etiquetaFila y filaOpcionalDesde; rótulos por sentido, primera fila principal", () => {
  for (const f of FICHAS) {
    for (const c of camposDeFicha(f).filter((x) => x.tipo === "tabla")) {
      assert.ok(c.etiquetaFila && /^[a-záéíóúñ ]+$/.test(c.etiquetaFila), `${f.id}/${c.id}: etiquetaFila`);
      assert.ok(Number.isInteger(c.filaOpcionalDesde) && c.filaOpcionalDesde >= 0 && c.filaOpcionalDesde <= (c.filasFijas?.length ?? c.filas), `${f.id}/${c.id}: filaOpcionalDesde`);
      if (!c.filasFijas) assert.equal(c.filaOpcionalDesde, 1, `${f.id}/${c.id}: la primera fila es la principal y las demás opcionales`);
      for (let i = 0; i < c.filas; i++) assert.doesNotMatch(rotuloFila(c, i), /fila/i);
    }
  }
  const ciclo = camposDeFicha(fichaPorId("1.3")).find((c) => c.id === "ciclo");
  assert.deepEqual([0, 1, 2].map((i) => rotuloFila(ciclo, i)), ["Primer momento", "Otro momento (opcional)", "Un tercer momento (opcional)"]);
  const metas = camposDeFicha(fichaPorId("1.1")).find((c) => c.id === "metas");
  assert.equal(metas.etiquetaFila, "meta");
  assert.deepEqual([0, 1, 2].map((i) => rotuloFila(metas, i)), ["Primera meta", "Otra meta (opcional)", "Una tercera meta (opcional)"]);
  const valores = camposDeFicha(fichaPorId("1.4")).find((c) => c.id === "valores");
  assert.equal(rotuloFila(valores, 2), "Trabajo o estudio", "las filas fijas conservan su rótulo");
  const evita = camposDeFicha(fichaPorId("2.4")).find((c) => c.id === "evitaciones");
  assert.equal(rotuloFila(evita, 9), "Una décima evitación (opcional)");
});

caso("v1.1 A: contador «N de M preguntas respondidas» y ejemplo bajo la pregunta (formulario público y MCEA)", () => {
  assert.match(leer("../src/components/evaluaciones/ficha-form.tsx"), /unidad="preguntas respondidas"/);
  assert.match(leer("../src/components/evaluaciones/mcea-form.tsx"), /unidad="preguntas respondidas"/);
  const comun = leer("../src/components/evaluaciones/formulario-comun.tsx");
  assert.match(comun, /\$\{respondidas\} de \$\{total\} \$\{unidad\}/);
  assert.match(comun, /unidad = "respondidas"/, "los demás formularios no cambian");
  assert.match(leer("../src/components/evaluaciones/ficha-campos.tsx"), /Ejemplo: \{c\.ejemplo\}/);
});

caso("v1.1 A.7 MCEA: textos de presentación del mapa con las mismas reglas, sin tocar el motor ni lo generado", () => {
  const T = TEXTOS_REGISTRO;
  assert.match(T.intro, INVITACION);
  for (const k of ["sit", "emo", "int", "pen", "f1", "f2", "beh", "dis"]) assert.ok(esPregunta(T[k].pregunta), `${k}: «${T[k].pregunta}»`);
  for (const k of ["sit", "pen", "f1", "f2"]) assert.ok(T[k].ejemplo, `${k}: ejemplo`);
  assert.ok(/usted|le |su /.test(T.intro) && !/\b(tú|tu|tus)\b/i.test(JSON.stringify(T)));
  const form = leer("../src/components/evaluaciones/mcea-form.tsx");
  assert.doesNotMatch(form, /Piense en un momento reciente en que se sintió mal|¿Qué pasó por su mente en ese momento\?|Un momento reciente</, "los textos viven en la capa propia");
  assert.match(form, /textos-registro/);
  assert.match(leer("../src/lib/evaluaciones/mcea/textos-registro.ts"), /^\/\*\*[\s\S]*NO se guarda nada de aquí/);
  assert.doesNotMatch(leer("../src/lib/evaluaciones/mcea/textos-registro.ts"), /^import /m, "sin imports");
});

caso("Guía del terapeuta para cada ficha, completa", () => {
  for (const id of FICHA_IDS) {
    const g = GUIA_TERAPEUTA[id];
    assert.ok(g, id);
    assert.ok(g.base && g.objetivo, id);
    assert.ok(g.cuandoUsarla.length >= 2 && g.cuandoNoUsarla.length >= 2, id);
    assert.ok(g.presentar.length >= 3 && g.presentar.length <= 5, `pasos ${id}`);
    assert.ok(g.errores.length >= 2 && g.revisar.length >= 2, id);
  }
});

caso("El catálogo y el formulario público no contienen la guía del terapeuta", () => {
  const cat = leer("../src/lib/evaluaciones/fichas/catalogo.ts");
  assert.doesNotMatch(cat, /guia-terapeuta|GUIA_TERAPEUTA|cuandoNoUsarla|Errores frecuentes/);
  assert.doesNotMatch(JSON.stringify(FICHAS), /Errores frecuentes|Cuándo no usarla|errores|presentar/);
  for (const id of FICHA_IDS) {
    const g = GUIA_TERAPEUTA[id];
    assert.ok(!JSON.stringify(FICHAS).includes(g.objetivo), `objetivo de ${id} en el catálogo`);
  }
  for (const ruta of ["../src/components/evaluaciones/ficha-form.tsx", "../src/components/evaluaciones/ficha-campos.tsx", "../src/lib/evaluaciones/fichas/codigo.ts", "../src/lib/evaluaciones/fichas/riesgo.ts"]) {
    const src = leer(ruta);
    assert.doesNotMatch(src, /guia-terapeuta|sugeridas|calificacion|registro"/, ruta);
  }
});

caso("Validación: acepta respuestas completas y campos vacíos", () => {
  for (const f of FICHAS) {
    const v = validarFicha({ ficha: f.id, respuestas: respuestasDeMuestra(f) }, { ficha: f.id });
    assert.ok(v.ok, `${f.id}: ${v.error}`);
    assert.equal(v.datos.ficha, f.id);
    assert.equal(avanceFicha(v.datos).respondidas, camposDeFicha(f).length, f.id);
    const vacia = validarFicha({ respuestas: {} }, { ficha: f.id });
    assert.ok(vacia.ok, `vacía ${f.id}`);
    assert.deepEqual(avanceFicha(vacia.datos), { respondidas: 0, total: camposDeFicha(f).length });
    assert.ok(validarFicha({}, { ficha: f.id }).ok);
  }
  const v = validarFicha({ respuestas: { motivo: "  hola  ", afecta_hoy: 4, areas: { marcadas: ["Pareja", "Familia"], otra: "" } } }, { ficha: "1.1" });
  assert.equal(v.datos.respuestas.motivo, "hola");
  assert.deepEqual(v.datos.respuestas.areas.marcadas, ["Familia", "Pareja"], "orden del catálogo");
  assert.equal(v.datos.respuestas.desde_cuando, "");
  assert.equal(v.datos.instrumento, "FICHA");
});

caso("Validación: rechaza tipos y longitudes inválidos", () => {
  const mal = (ficha, respuestas, motivo) => {
    const v = validarFicha({ respuestas }, { ficha });
    assert.equal(v.ok, false, motivo);
    assert.match(v.error, /«/, motivo);
  };
  mal("1.1", { motivo: 5 }, "párrafo numérico");
  mal("1.1", { motivo: "x".repeat(3001) }, "párrafo > 3000");
  assert.ok(validarFicha({ respuestas: { motivo: "x".repeat(3000) } }, { ficha: "1.1" }).ok, "3000 es válido");
  mal("1.1", { desde_cuando: "x".repeat(301) }, "texto > 300");
  mal("1.1", { desde_cuando: ["a"] }, "texto como lista");
  mal("1.1", { afecta_hoy: 11 }, "escala 11");
  mal("1.1", { afecta_hoy: -1 }, "escala -1");
  mal("1.1", { afecta_hoy: 2.5 }, "escala decimal");
  mal("1.1", { afecta_hoy: "7" }, "escala texto");
  mal("1.1", { areas: ["Familia"] }, "casillas como lista");
  mal("1.1", { areas: { marcadas: ["Inventada"], otra: "" } }, "opción inexistente");
  mal("1.1", { areas: { marcadas: [], otra: "x".repeat(301) } }, "otra larga");
  mal("1.1", { metas: [["a", "b"]] }, "fila con menos columnas");
  mal("1.1", { metas: [["a", "b", "c"], ["a", "b", "c"], ["a", "b", "c"], ["a", "b", "c"]] }, "más filas que el máximo");
  mal("1.1", { metas: [["a", "b", "x".repeat(501)]] }, "celda > 500");
  mal("1.1", { metas: [["a", "b", 3]] }, "celda numérica");
  mal("1.1", { metas: "texto" }, "tabla como texto");
  mal("1.2", { empeora: Array(7).fill("a") }, "lista sobre su máximo");
  mal("1.2", { empeora: [1, 2] }, "lista de números");
  mal("1.2", { empeora: ["x".repeat(301)] }, "entrada larga");
  mal("2.2", { dejado: Array(21).fill("a") }, "lista > 20");
  assert.equal(validarFicha(null, { ficha: "1.1" }).ok, false);
  assert.equal(validarFicha("x", { ficha: "1.1" }).ok, false);
  assert.equal(validarFicha({ respuestas: [] }, { ficha: "1.1" }).ok, false);
  assert.equal(validarFicha({ respuestas: {} }, {}).ok, false, "sin ficha en el enlace");
  assert.equal(validarFicha({ respuestas: {} }, { ficha: "7.7" }).ok, false, "ficha inexistente");
  assert.equal(validarFicha({ ficha: "2.1", respuestas: {} }, { ficha: "1.1" }).ok, false, "el enlace manda sobre el cuerpo");
});

caso("Validación: tabla con filas fijas (1.4) se completa; las vacías del final se recortan", () => {
  const v = validarFicha({ respuestas: { valores: [["Estar presente", "9", "Cenar sin celular"]] } }, { ficha: "1.4" });
  assert.ok(v.ok);
  assert.equal(v.datos.respuestas.valores.length, 7);
  assert.deepEqual(v.datos.respuestas.valores[6], ["", "", ""]);
  const c = validarFicha({ respuestas: { ciclo: [["a", "b", "c", "d", "e"], ["", "", "", "", ""], ["", "", "", "", ""]] } }, { ficha: "1.3" });
  assert.equal(c.datos.respuestas.ciclo.length, 1);
});

caso("Opciones, datos guardados y borrador", () => {
  assert.deepEqual(opcionesFicha({ ficha: "2.3" }), { ficha: "2.3" });
  assert.deepEqual(opcionesFicha({ ficha: "9.9" }), { ficha: "1.1" });
  assert.deepEqual(opcionesFicha(null), { ficha: "1.1" });
  assert.equal(fichaDeOpciones({ ficha: "1.4" }).titulo, "Lo que me importa: mis valores");
  const v = validarFicha({ respuestas: { motivo: "hola" } }, { ficha: "1.1" });
  assert.equal(datosFichaGuardados(v.datos).ficha, "1.1");
  assert.equal(datosFichaGuardados({ ficha: "x" }), null);
  assert.equal(datosFichaGuardados(null), null);
  const b = limpiarBorradorFicha({ ficha: "2.1", respuestas: { motivo: 1, momento: "x".repeat(5000), cuerpo: { marcadas: ["Temblor", "No existe"], otra: 3 }, fuerza: 99, extra: "no" } }, { ficha: "2.1" });
  assert.equal(b.ficha, "2.1");
  assert.equal(b.respuestas.momento.length, 3000);
  assert.deepEqual(b.respuestas.cuerpo, { marcadas: ["Temblor"], otra: "" });
  assert.equal(b.respuestas.fuerza, null);
  assert.equal("extra" in b.respuestas, false);
  assert.equal(limpiarBorradorFicha({ ficha: "1.4" }, { ficha: "2.1" }).ficha, "2.1", "el enlace manda");
  assert.equal(limpiarBorradorFicha({ ficha: "1.4" }).ficha, "1.4");
  assert.equal(limpiarBorradorFicha(null).ficha, "1.1");
  assert.equal(limpiarBorradorFicha({ respuestas: { valores: "x" } }, { ficha: "1.4" }).respuestas.valores.length, 7);
  assert.deepEqual(Object.keys(respuestasVacias(fichaPorId("1.2"))), camposDeFicha(fichaPorId("1.2")).map((c) => c.id));
});

caso("Avance: campos con contenido sobre el total", () => {
  const f = fichaPorId("1.1");
  const total = camposDeFicha(f).length;
  assert.deepEqual(avanceFicha(limpiarBorradorFicha(null, { ficha: "1.1" })), { respondidas: 0, total });
  const b = limpiarBorradorFicha({ respuestas: { motivo: "  ", desde_cuando: "hace un año", afecta_hoy: 0, areas: { marcadas: ["Pareja"], otra: "" }, metas: [["", "", ""], ["meta", "", ""]] } }, { ficha: "1.1" });
  assert.deepEqual(avanceFicha(b), { respondidas: 4, total }, "espacios no cuentan; el 0 de la escala sí; la tabla cuenta si alguna celda tiene texto");
  assert.equal(campoTieneContenido({ tipo: "lista" }, ["", " "]), false);
  assert.equal(campoTieneContenido({ tipo: "casillas" }, { marcadas: [], otra: "algo" }), true);
  assert.deepEqual(avanceFicha({ ficha: "9.9", respuestas: {} }), { respondidas: 0, total: 0 });
});

caso("Riesgo: detecta frases de riesgo", () => {
  const si = [
    "A veces pienso en el suicidio",
    "Ya no quiero vivir así",
    "Quiero matarme",
    "Me quiero matar",
    "Pienso en quitarme la vida",
    "Tengo ganas de hacerme daño",
    "No quiero seguir viviendo",
    "me hago daño cuando me siento mal",
    "No vale la pena vivir",
    "Quisiera desaparecer para siempre",
    "Quiero desaparecer.",
    "Quiero morir",
    "Quisiera morirme",
    "ME QUIERO MORIR",
    "Ojalá me muriera",
    "Estaría mejor muerto",
    "No puedo más y quiero matarme",
    "Tengo pensamientos de muerte",
    "Pienso en cortarme las venas",
    "Me quiero morir de tristeza",
    "Tengo ideas suicidas",
    "no quiero hacerme daño pero a veces quiero morir",
    "Quiero morirme.",
  ];
  for (const t of si) assert.ok(detectarRiesgo(t).length > 0, `debía detectar: ${t}`);
  assert.deepEqual(detectarRiesgo("Quiero matarme, no puedo más"), ["matarme"]);
  assert.match(detectarRiesgo("Estoy cansado y quiero MORIRME ya")[0], /MORIRME/i, "devuelve el fragmento original");
});

caso("Riesgo: no marca frases normales ni expresiones coloquiales", () => {
  const no = [
    "Me muero de risa con mis hijos",
    "Me muero de hambre a esta hora",
    "Me quiero morir de la vergüenza",
    "Me quiero morir de la pena",
    "Me muero de sueño",
    "Me muero por ir a la playa",
    "Se murió mi abuelo el año pasado",
    "Le tengo miedo a morir en un accidente",
    "Quiero desaparecer el dolor de cabeza",
    "Quiero desaparecer mis deudas",
    "No quiero hacerme daño",
    "No tengo ideas suicidas",
    "Nunca he pensado en matarme",
    "No pienso hacerme daño",
    "Mi jefe me va a matar si llego tarde",
    "Estoy muerto de cansancio",
    "El estrés me está matando el sueño",
    "Voy a desaparecer un rato de las redes",
    "Quiero terminar con todo el trabajo pendiente",
    "No quiero vivir lejos de mi familia",
    "",
    "   ",
  ];
  for (const t of no) assert.deepEqual(detectarRiesgo(t), [], `no debía marcar: ${t}`);
});

caso("Riesgo en una ficha: revisa texto, párrafo, listas, celdas de tabla y «Otra»", () => {
  const f = fichaPorId("1.1");
  assert.equal(riesgoFicha(f, respuestasVacias(f)).riesgo, false);
  assert.equal(riesgoFicha(f, {}).riesgo, false);
  assert.equal(riesgoFicha(f, null).riesgo, false);
  const en = (campoId, valor) => riesgoFicha(f, { ...respuestasVacias(f), [campoId]: valor });
  assert.equal(en("motivo", "Quiero morir").riesgo, true);
  assert.equal(en("desde_cuando", "Desde que pienso en suicidarme").riesgo, true);
  assert.equal(en("areas", { marcadas: [], otra: "ganas de hacerme daño" }).riesgo, true);
  assert.equal(en("metas", [["no quiero vivir", "", ""]]).riesgo, true);
  const r = en("motivo", "Quiero morir");
  assert.equal(r.coincidencias[0].campo, "¿Qué le hizo buscar ayuda en este momento?");
  const f12 = fichaPorId("1.2");
  assert.equal(riesgoFicha(f12, { ...respuestasVacias(f12), empeora: ["el trabajo", "quisiera desaparecer para siempre"] }).riesgo, true);
});

caso("Servidor: la ficha la fija el enlace y el riesgo avisa como alerta", () => {
  const s = REGISTRO_SERVIDOR.ficha;
  assert.ok(s);
  const normal = s.validar({ respuestas: { motivo: "Duermo mal" } }, { ficha: "1.1" });
  assert.ok(normal.ok); assert.equal(normal.alertaSeguridad, 0); assert.equal(normal.relacion, "Paciente");
  const riesgo = s.validar({ respuestas: { motivo: "Quiero morir" } }, { ficha: "1.1" });
  assert.ok(riesgo.ok); assert.equal(riesgo.alertaSeguridad, 1);
  assert.equal(s.validar({ ficha: "2.1", respuestas: {} }, { ficha: "1.1" }).ok, false);
  assert.equal(s.limpiarBorrador({ ficha: "1.4", respuestas: {} }, { ficha: "2.2" }).ficha, "2.2");
});

/* --------- evaluaciones de ejemplo para las sugeridas --------- */
const eapi = (gad, dass, ptq, fecha = "2026-11-01") => fila("eapi", { v: 1, instrumento: "AEI", gad: Array(FORMA_MODULOS.gad.items).fill(gad), dass: Array(FORMA_MODULOS.dass.items).fill(dass), ptq: Array(FORMA_MODULOS.ptq.items).fill(ptq), docs: null, safety: 0, func: null }, fecha);
function mcea(valorTope, focus, fecha = "2026-11-02", registro = null) {
  const e = { modo: "full", anchor: [], focus, gate: "no", answers: {}, risk: { self: "no" }, tr: null };
  for (let pos = 0, g = 0; g < 400; g++, pos++) {
    const st = buildPlan(e)[pos];
    if (!st || st.t === "end") break;
    if (st.t === "item") e.answers[`${st.ins}_${st.i}`] = { v: valorTope ? etiquetas(st.ins).length - 1 : 0, t: 1000 };
    else if (st.t === "tr") e.tr = registro ?? { skip: true };
  }
  const v = validarMcea(e, { modo: "full", anchor: [] });
  assert.ok(v.ok, v.error);
  return fila("mcea", v.datos, fecha);
}

caso("Sugeridas: sin evaluaciones solo 1.1 y 1.3", () => {
  assert.deepEqual(fichasSugeridas([]).map((s) => s.ficha), ["1.1", "1.3"]);
  assert.ok(fichasSugeridas([]).every((s) => s.motivos.includes("Recomendada para empezar: aún no la ha respondido")));
});

caso("Sugeridas: EAPI alto → 2.1, 2.4, 2.2, 2.3 con sus motivos", () => {
  const alto = eapi(3, 3, 4);
  assert.ok(calificarEapi({ gad: Array(7).fill(3), dass: Array(21).fill(3), ptq: Array(15).fill(4), docs: null, safety: 0, func: null }).gad.total >= 10);
  const s = fichasSugeridas([alto]);
  assert.deepEqual(s.map((x) => x.ficha), ["1.1", "1.3", "2.1", "2.2", "2.3", "2.4"]);
  assert.match(s.find((x) => x.ficha === "2.1").motivos.join(" "), /^Recomendada por resultados de su EAPI \(1 nov\): (preocupación y ansiedad|tensión y palpitaciones)/);
  assert.match(s.find((x) => x.ficha === "2.2").motivos.join(" "), /tristeza y desgano/);
  assert.match(s.find((x) => x.ficha === "2.3").motivos.join(" "), /pensamientos que vuelven/);
  assert.deepEqual(s.find((x) => x.ficha === "2.4").motivos, s.find((x) => x.ficha === "2.1").motivos);
});

caso("Sugeridas: EAPI bajo no sugiere fichas de psicoeducación", () => {
  assert.deepEqual(fichasSugeridas([eapi(0, 0, 0)]).map((x) => x.ficha), ["1.1", "1.3"]);
});

caso("Sugeridas: solo cuenta el último EAPI (el más reciente manda)", () => {
  const viejoAlto = eapi(3, 3, 4, "2026-09-01");
  const nuevoBajo = eapi(0, 0, 0, "2026-11-01");
  assert.deepEqual(fichasSugeridas([viejoAlto, nuevoBajo]).map((x) => x.ficha), ["1.1", "1.3"]);
  assert.deepEqual(fichasSugeridas([nuevoBajo, viejoAlto]).map((x) => x.ficha), ["1.1", "1.3"], "el orden de entrada no importa");
  assert.ok(fichasSugeridas([eapi(0, 0, 0, "2026-09-01"), eapi(3, 3, 4, "2026-11-01")]).some((x) => x.ficha === "2.1"));
});

caso("Sugeridas: MCEA alto → ánimo, ansiedad y pensamientos; MCEA bajo → nada extra", () => {
  const s = fichasSugeridas([mcea(true, ["ansiedad", "pensamientos"])]);
  assert.deepEqual(s.map((x) => x.ficha), ["1.1", "1.3", "2.1", "2.2", "2.3", "2.4"]);
  assert.match(s.find((x) => x.ficha === "2.2").motivos.join(" "), /MCEA/);
  assert.deepEqual(fichasSugeridas([mcea(false, [])]).map((x) => x.ficha), ["1.1", "1.3"]);
});

caso("Sugeridas: 1.1 y 1.3 dejan de sugerirse al responderlas; filas inválidas se ignoran", () => {
  const r11 = fila("ficha", { v: 1, instrumento: "FICHA", ficha: "1.1", respuestas: {} });
  const r13 = fila("ficha", { v: 1, instrumento: "FICHA", ficha: "1.3", respuestas: {} });
  assert.deepEqual(fichasSugeridas([r11]).map((x) => x.ficha), ["1.3"]);
  assert.deepEqual(fichasSugeridas([r11, r13]).map((x) => x.ficha), []);
  assert.deepEqual([...fichasRespondidas([r11, r13, fila("ficha", { ficha: "9.9" }), fila("eapi", { ficha: "2.1" })])].sort(), ["1.1", "1.3"]);
  assert.deepEqual(fichasSugeridas([fila("eapi", { gad: "x" }), fila("mcea", { version: 1 })]).map((x) => x.ficha), ["1.1", "1.3"]);
});

caso("HTML: ficha en blanco de cada ficha (sin guía, con renglones y tablas vacías)", () => {
  for (const f of FICHAS) {
    const html = fichaEnBlancoHtml(f);
    assert.match(html, /^<!doctype html>/);
    assert.ok(html.includes(`Ficha ${f.id} · `) && html.includes(f.titulo.replace(/&/g, "&amp;")), f.id);
    assert.match(html, /size:A4/);
    assert.ok(html.includes("class=\"linea\""), `renglones ${f.id}`);
    assert.ok(html.includes(f.cierre.titulo), f.id);
    assert.doesNotMatch(html, /Cuándo no usarla|Errores frecuentes|Para el terapeuta|undefined|\[object/, f.id);
    if (camposDeFicha(f).some((c) => c.tipo === "tabla")) assert.ok(html.includes("<table"), `tabla ${f.id}`);
  }
  const h13 = fichaEnBlancoHtml(fichaPorId("1.3"));
  assert.equal((h13.match(/class="vacia"/g) ?? []).length, 15, "tabla del ciclo: 3 filas × 5 columnas vacías");
  assert.match(fichaEnBlancoHtml(fichaPorId("1.4")), /Espiritualidad o sentido de vida/);
  assert.match(fichaEnBlancoHtml(fichaPorId("1.1")), /class="escala"/);
  assert.match(fichaEnBlancoHtml(fichaPorId("2.1")), /class="caja"/);
});

caso("v1.1 A.6: PDF en blanco con las mismas reglas (invitación por sección, rótulos por sentido, sin «Fila»)", () => {
  for (const f of FICHAS) {
    const html = fichaEnBlancoHtml(f);
    assert.doesNotMatch(html.replace(/<style>[\s\S]*<\/style>/, ""), /\bfilas?\b\s*\d*/i, `${f.id}: «Fila» en el PDF`);
    for (const s of f.secciones) assert.ok(html.includes(s.intro.replace(/&/g, "&amp;")), `${f.id}/${s.id}: invitación`);
    for (const c of camposDeFicha(f)) assert.ok(html.includes(c.etiqueta.replace(/&/g, "&amp;")), `${f.id}/${c.id}: pregunta`);
  }
  const h = fichaEnBlancoHtml(fichaPorId("1.3"));
  assert.match(h, /<td class="fija">Primer momento<\/td>/);
  assert.match(h, /<td class="fija">Otro momento \(opcional\)<\/td>/);
  assert.match(h, /<td class="fija">Un tercer momento \(opcional\)<\/td>/);
  assert.match(h, /<th>¿Qué pasó\?<br>/);
  assert.match(fichaEnBlancoHtml(fichaPorId("1.1")), /<td class="fija">Primera meta<\/td>/);
});

caso("HTML: ficha con respuestas (tablas como tablas, escapado, sin respuesta, alarma)", () => {
  for (const f of FICHAS) {
    const resp = respuestasDeMuestra(f);
    const html = fichaRespondidaHtml({ ficha: f, respuestas: resp, nombre: "Ana <Pérez>", fecha: "2026-11-10", riesgo: riesgoFicha(f, resp), notasPrivadas: "Nota <i>privada</i>" });
    assert.match(html, /^<!doctype html>/);
    assert.ok(html.includes("Ana &lt;Pérez&gt;"), f.id);
    assert.doesNotMatch(html, /<b>con html<\/b>/, "el HTML escrito por el paciente se escapa");
    assert.doesNotMatch(html, /undefined|\[object|Cuándo no usarla/);
    assert.ok(html.includes("Nota &lt;i&gt;privada&lt;/i&gt;"));
    assert.doesNotMatch(html, /class="flag"/, "sin riesgo no hay alarma");
    if (camposDeFicha(f).some((c) => c.tipo === "tabla")) assert.ok(html.includes("<table"), f.id);
  }
  const f = fichaPorId("1.3");
  const resp = { ...respuestasVacias(f), ciclo: [["Mensaje del jefe", "Me va a regañar", "Miedo, 80", "Estómago apretado", "Revisé el celular"]], efecto: "Quiero morir" };
  const html = fichaRespondidaHtml({ ficha: f, respuestas: resp, nombre: "Ana", fecha: "2026-11-10", riesgo: riesgoFicha(f, resp) });
  assert.match(html, /<th>¿Qué pasó\?<\/th>/);
  assert.match(html, /<td class="fija">Primer momento<\/td><td>Mensaje del jefe<\/td>/);
  assert.match(html, /<td>Mensaje del jefe<\/td>/);
  assert.match(html, /class="flag"/);
  assert.match(html, /Sin respuesta/);
  assert.match(html, /\d+ de \d+ preguntas respondidas/);
  assert.doesNotMatch(html, /Llenada por el terapeuta/);
  const valores = fichaRespondidaHtml({ ficha: fichaPorId("1.4"), respuestas: { ...respuestasVacias(fichaPorId("1.4")), valores: [["", "", ""], ["Cuidar", "8", "Salir"], ...Array(5).fill(["", "", ""])] }, nombre: "Ana", fecha: "2026-11-10" });
  assert.match(valores, /<td class="fija">Pareja<\/td><td>Cuidar<\/td>/);
});

caso("Registro único: «ficha» en INSTRUMENTOS, registro y servidor (test:jjr sigue vigente)", () => {
  const i = instrumentoPorId("ficha");
  assert.equal(i.nombre, "Fichas terapéuticas JJR (TCC)");
  assert.equal(i.tituloPublico, "Ficha de trabajo · JJR");
  assert.equal(i.responde, "paciente");
  assert.equal(i.informePaciente, undefined, "sin informe para el paciente en este lote");
  for (const x of INSTRUMENTOS) { assert.ok(REGISTRO[x.id], `registro ${x.id}`); assert.ok(REGISTRO_SERVIDOR[x.id], `servidor ${x.id}`); }
  assert.equal(INSTRUMENTOS.filter((x) => x.id === "ficha").length, 1);
});

caso("Registro: nombres, opciones, avance, resumen, alarma y nueva aplicación", () => {
  const d = REGISTRO.ficha;
  assert.equal(d.sigla, "FICHA");
  assert.equal(d.nombreCorto({ ficha: "1.3" }), "Ficha 1.3 · Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta");
  assert.equal(d.detalleOpciones({ ficha: "2.4" }), " · Ficha 2.4");
  assert.equal(nombreConOpciones("ficha", { ficha: "2.4" }), "Fichas terapéuticas JJR (TCC) · Ficha 2.4");
  assert.deepEqual(d.opcionesPublicas({ ficha: "2.2", otra: 1 }), { ficha: "2.2" });
  assert.equal(d.evolucion, undefined, "sin evolución numérica");
  assert.equal(d.escalas, undefined);
  const total = camposDeFicha(fichaPorId("1.3")).length;
  assert.deepEqual(d.avance({ respuestas: { efecto: "algo" } }, { ficha: "1.3" }), { respondidas: 1, total });
  const v = validarFicha({ respuestas: { se_repite: "El miedo", tipicos: 6 } }, { ficha: "1.3" });
  const f = fila("ficha", v.datos);
  const r = d.resumen(f);
  assert.equal(r.insignia, `Ficha 1.3 · 2 de ${total} preguntas`);
  assert.equal(r.alarma, false);
  assert.deepEqual(r.alertas, []);
  assert.deepEqual(d.opcionesNueva(f, { ficha: "1.1" }), { ficha: "1.3" });
  assert.deepEqual(d.opcionesNueva(fila("ficha", {}), { ficha: "2.1" }), { ficha: "2.1" });
  assert.equal(d.resumen(fila("ficha", { ficha: "x" })), null);
  const alarma = d.resumen(fila("ficha", validarFicha({ respuestas: { efecto: "Ya no quiero vivir" } }, { ficha: "1.3" }).datos));
  assert.equal(alarma.alarma, true);
  assert.equal(alarma.alertas.length, 1);
  assert.match(alarma.alertas[0], /«no quiero vivir»/);
  assert.match(resumenRespuesta(f).puntuaciones[0], /Ficha 1\.3/);
});

/* ---------------- v1.1 B: Intervención guiada ---------------- */

const ficha = (id, respuestas = {}, extra = {}, fecha = "2026-11-10") => fila("ficha", { v: 1, instrumento: "FICHA", ficha: id, respuestas, ...extra }, fecha);
const delTerapeuta = (id, respuestas = {}, fecha = "2026-11-10") => ficha(id, respuestas, { autor: "terapeuta" }, fecha);
const enlace = (id, estado = "abierta", fecha = "2026-11-12", borrador = null) => ({ id: `e${id}${fecha}`, instrumento: "ficha", estado, opciones: { ficha: id }, createdAt: `${fecha}T09:00:00Z`, borrador });

caso("B.1 Estado por ficha: sin usar / enviada / respondida por el paciente / llenada por el terapeuta, con fecha", () => {
  const sin = estadosFichas([], []);
  assert.equal(sin.length, 8);
  assert.deepEqual(sin.map((e) => e.estado), Array(8).fill("sin-usar"));
  assert.equal(sin[0].etiqueta, "Sin usar");
  assert.equal(sin[0].fecha, null);
  const r11 = ficha("1.1", {}, {}, "2026-11-03");
  const t13 = delTerapeuta("1.3", {}, "2026-11-05");
  const e = estadosFichas([r11, t13, fila("eapi", { ficha: "2.1" }), ficha("9.9")], [enlace("2.1"), enlace("1.4", "completa"), enlace("2.2", "cerrada"), { ...enlace("1.1"), instrumento: "eapi" }]);
  const por = (id) => e.find((x) => x.ficha === id);
  assert.deepEqual([por("1.1").estado, por("1.1").etiqueta, por("1.1").fecha, por("1.1").hecha], ["respondida", "Respondida por el paciente", "2026-11-03", true]);
  assert.deepEqual([por("1.3").estado, por("1.3").etiqueta, por("1.3").fecha], ["terapeuta", "Llenada por el terapeuta", "2026-11-05"]);
  assert.equal(por("1.3").terapeutaId, t13.id);
  assert.deepEqual([por("2.1").estado, por("2.1").etiqueta, por("2.1").fecha, por("2.1").hecha, por("2.1").enlaceId !== null], ["enviada", "Enviada al paciente", "2026-11-12", false, true]);
  assert.equal(por("1.4").estado, "sin-usar", "un enlace ya cerrado sin respuesta no cuenta como enviada");
  assert.equal(por("2.2").estado, "sin-usar");
  assert.equal(por("1.2").estado, "sin-usar");
  // La respuesta más reciente de cualquier autor manda; un enlace enviado después de ella (repetir la ficha) manda sobre ambas.
  const mix = estadosFichas([ficha("1.1", {}, {}, "2026-11-03"), delTerapeuta("1.1", {}, "2026-11-08")], []);
  assert.equal(mix.find((x) => x.ficha === "1.1").estado, "terapeuta");
  assert.equal(estadosFichas([delTerapeuta("1.1", {}, "2026-11-03"), ficha("1.1", {}, {}, "2026-11-09")], []).find((x) => x.ficha === "1.1").estado, "respondida");
  assert.equal(estadosFichas([ficha("1.1", {}, {}, "2026-11-03")], [enlace("1.1", "abierta", "2026-11-12")]).find((x) => x.ficha === "1.1").estado, "enviada");
  assert.equal(estadosFichas([ficha("1.1", {}, {}, "2026-11-20")], [enlace("1.1", "abierta", "2026-11-12")]).find((x) => x.ficha === "1.1").estado, "respondida");
  assert.equal(tareaDeFicha("1.3"), "Ficha 1.3 · Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta (enviada por enlace)");
});

caso("B.1 Siguiente en la ruta: la primera de la etapa siguiente cuando las de la etapa actual ya están hechas", () => {
  const est = (...hechas) => estadosFichas(hechas.map((id) => ficha(id)), []);
  assert.deepEqual(siguientesEnRuta(est()), ["1.1"], "sin nada hecho, se empieza por la 1.1");
  assert.deepEqual(siguientesEnRuta(est("1.1")), ["1.2"], "dentro de la etapa, la primera pendiente");
  assert.deepEqual(siguientesEnRuta(est("1.1", "1.2", "1.3")), ["1.4"]);
  assert.deepEqual(siguientesEnRuta(est("1.1", "1.2", "1.3", "1.4")), ["2.1"], "etapa 1 completa: la primera de la 2");
  assert.deepEqual(siguientesEnRuta(est("1.1", "1.2", "1.3", "1.4", "2.1", "2.2")), ["2.3"]);
  assert.deepEqual(siguientesEnRuta(est("1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "2.3", "2.4")), [], "ruta completa (este lote no tiene etapa 3)");
  assert.deepEqual(siguientesEnRuta(est("2.1")), ["2.2"], "la etapa actual es la más avanzada con alguna ficha hecha");
  // Una ficha llenada por el terapeuta también cuenta como hecha.
  assert.deepEqual(siguientesEnRuta(estadosFichas([delTerapeuta("1.1")], [])), ["1.2"]);
});

caso("B.1 Sugerencias: las de sugeridas.ts más la ruta, sin las ya hechas o enviadas", () => {
  assert.deepEqual(sugerenciasIntervencion([], []).map((s) => s.ficha), ["1.1", "1.3"]);
  const s0 = sugerenciasIntervencion([], []);
  assert.equal(s0[0].enRuta, true, "1.1 es además la siguiente en la ruta");
  assert.deepEqual(s0[0].motivos, ["Recomendada para empezar: aún no la ha respondido", "Recomendada como siguiente paso (etapa 1 · Evaluación y formulación)"]);
  assert.equal(s0[1].enRuta, false);
  // EAPI alto: 2.1, 2.2, 2.3 y 2.4 por resultados.
  const alto = eapi(3, 3, 4);
  assert.deepEqual(sugerenciasIntervencion([alto], []).map((s) => s.ficha), ["1.1", "1.3", "2.1", "2.2", "2.3", "2.4"]);
  // Con 1.1 hecha (paciente) y 1.3 llenada por el terapeuta, quedan las de resultados y la siguiente de la ruta (1.2).
  const hechas = [alto, ficha("1.1"), delTerapeuta("1.3")];
  const s = sugerenciasIntervencion(hechas, []);
  assert.deepEqual(s.map((x) => x.ficha), ["1.2", "2.1", "2.2", "2.3", "2.4"]);
  assert.deepEqual(s[0], { ficha: "1.2", motivos: ["Recomendada como siguiente paso (etapa 1 · Evaluación y formulación)"], enRuta: true });
  assert.match(s[1].motivos.join(" "), /EAPI/);
  // Las ya enviadas no se sugieren otra vez.
  assert.deepEqual(sugerenciasIntervencion(hechas, [enlace("2.1"), enlace("1.2")]).map((x) => x.ficha), ["2.2", "2.3", "2.4"]);
  // La que sigue en la ruta se suma a las de resultados cuando coincide con ellas.
  const todas1 = ["1.1", "1.2", "1.3", "1.4"].map((id) => ficha(id));
  const s2 = sugerenciasIntervencion([alto, ...todas1], []);
  assert.deepEqual(s2.map((x) => x.ficha), ["2.1", "2.2", "2.3", "2.4"]);
  assert.equal(s2[0].enRuta, true);
  assert.equal(s2[1].enRuta, false);
  assert.equal(s2[0].motivos.at(-1), "Recomendada como siguiente paso (etapa 2 · Psicoeducación)");
});

caso("B.2 Prellenado desde el expediente, con el origen legible de cada campo", () => {
  const paciente = { motivoConsulta: "  Ansiedad en el trabajo y mal dormir  ", antecedentesPsicologicos: "Tratamiento breve en 2019 por duelo." };
  const p11 = prellenado("1.1", { paciente });
  assert.equal(p11.respuestas.motivo, "Ansiedad en el trabajo y mal dormir");
  assert.deepEqual(p11.origen, { motivo: "Del motivo de consulta de la ficha clínica" });
  assert.equal(p11.respuestas.desde_cuando, "");
  assert.deepEqual(Object.keys(p11.respuestas), camposDeFicha(fichaPorId("1.1")).map((c) => c.id), "devuelve todos los campos de la ficha");
  assert.deepEqual(prellenado("1.1", { paciente: { motivoConsulta: "  " }, motivoCita: "Revisión por insomnio" }).origen, { motivo: "Del motivo de la última cita o solicitud" });
  assert.deepEqual(prellenado("1.1", { paciente: {} }).origen, {}, "sin datos no se inventa nada");
  assert.equal(prellenado("1.1", { paciente }).respuestas.metas.every((f) => f.every((x) => x === "")), true, "el expediente no tiene metas: no se prellenan");
  const p12 = prellenado("1.2", { paciente });
  assert.equal(p12.respuestas.parecido, "Tratamiento breve en 2019 por duelo.");
  assert.deepEqual(p12.origen, { parecido: "De los antecedentes psicológicos de la ficha clínica" });
  assert.deepEqual(prellenado("2.1", { paciente }).origen, {}, "las demás fichas no toman datos del expediente");
});

caso("B.2 Prellenado de 1.3 desde el último registro guiado del MCEA", () => {
  const reg = (sit, pen, emo, int, beh) => ({ sit, emo, int, pen, f1: "", f2: "", beh, dis: [] });
  const viejo = mcea(true, [], "2026-10-01", reg("Situación vieja", "Pensamiento viejo", ["Miedo"], 30, ["Me aislé"]));
  const nuevo = mcea(true, [], "2026-11-02", reg("Mi jefe me escribió", "Seguro me va a regañar", ["Miedo", "Vergüenza"], 80, ["Evité el tema", "Revisé el teléfono o las redes"]));
  const omitido = mcea(false, [], "2026-11-09");
  const p = prellenado("1.3", { respuestas: [viejo, nuevo] });
  assert.deepEqual(p.respuestas.ciclo[0], ["Mi jefe me escribió", "Seguro me va a regañar", "Miedo, Vergüenza, 80", "", "Evité el tema, Revisé el teléfono o las redes"]);
  assert.equal(p.respuestas.ciclo.length, 3);
  assert.deepEqual(p.respuestas.ciclo[1], ["", "", "", "", ""]);
  assert.match(p.origen.ciclo, /^Del registro guiado del MCEA del 2 nov 2026/);
  assert.match(p.origen.ciclo, /el cuerpo queda por completar/);
  // Un MCEA más reciente sin registro (omitido) no tapa al último que sí lo tiene.
  assert.match(prellenado("1.3", { respuestas: [nuevo, omitido] }).origen.ciclo, /2 nov 2026/);
  assert.deepEqual(prellenado("1.3", { respuestas: [omitido] }).origen, {});
  assert.deepEqual(prellenado("1.3", { respuestas: [] }).origen, {});
  // Un ciclo largo (más de 500 caracteres por celda) se recorta con las reglas del avance guardado.
  const largo = mcea(true, [], "2026-11-02", reg("x".repeat(900), "", ["Miedo"], 10, []));
  assert.equal(prellenado("1.3", { respuestas: [largo] }).respuestas.ciclo[0][0].length, 500);
});

caso("B.2 Prellenado: lo que la misma ficha ya tiene (la respuesta más reciente) manda sobre el expediente", () => {
  const paciente = { motivoConsulta: "Del expediente" };
  const delPaciente = ficha("1.1", { motivo: "Lo que escribió el paciente", desde_cuando: "Hace un año" }, {}, "2026-11-03");
  const p = prellenado("1.1", { paciente, respuestas: [delPaciente] });
  assert.equal(p.respuestas.motivo, "Lo que escribió el paciente");
  assert.equal(p.respuestas.desde_cuando, "Hace un año");
  assert.deepEqual(p.origen, { motivo: "De la respuesta del paciente del 3 nov 2026", desde_cuando: "De la respuesta del paciente del 3 nov 2026" });
  const versionTerapeuta = delTerapeuta("1.1", { motivo: "Versión del terapeuta", afecta_hoy: 6 }, "2026-11-08");
  const p2 = prellenado("1.1", { paciente, respuestas: [delPaciente, versionTerapeuta] });
  assert.equal(p2.respuestas.motivo, "Versión del terapeuta");
  assert.equal(p2.respuestas.afecta_hoy, 6);
  assert.equal(p2.respuestas.desde_cuando, "", "solo la más reciente");
  assert.equal(p2.origen.motivo, "De la versión del terapeuta del 8 nov 2026");
  // Cualquier ficha: lo que no tiene la respuesta previa lo completa el expediente.
  const p3 = prellenado("1.1", { paciente, respuestas: [ficha("1.1", { desde_cuando: "Hace un año" })] });
  assert.equal(p3.respuestas.motivo, "Del expediente");
  assert.equal(p3.origen.motivo, "Del motivo de consulta de la ficha clínica");
  assert.equal(fechaLegible("2026-11-02"), "2 nov 2026");
  // Una respuesta de otra ficha o un dato inválido no se mezcla.
  assert.deepEqual(prellenado("2.1", { respuestas: [ficha("1.1", { motivo: "x" }), fila("ficha", { ficha: "2.1", respuestas: { fuerza: 99, cuerpo: "no" } })] }).origen, {});
});

caso("B.2 Guardar como terapeuta: la validación acepta autor «terapeuta» solo en el panel; el envío público lo descarta", () => {
  const cuerpo = { ficha: "1.1", autor: "terapeuta", respuestas: { motivo: "Ansiedad" } };
  const panel = validarFicha(cuerpo, { ficha: "1.1" }, { permitirAutor: true });
  assert.ok(panel.ok);
  assert.equal(panel.datos.autor, "terapeuta");
  const publico = validarFicha(cuerpo, { ficha: "1.1" });
  assert.ok(publico.ok);
  assert.equal("autor" in publico.datos, false, "nadie se hace pasar por el terapeuta desde el enlace público");
  assert.equal(REGISTRO_SERVIDOR.ficha.validar(cuerpo, { ficha: "1.1" }).datos.autor, undefined);
  assert.equal(validarFicha({ ...cuerpo, autor: "paciente" }, { ficha: "1.1" }, { permitirAutor: true }).datos.autor, undefined, "solo se reconoce «terapeuta»");
  // Lo guardado se vuelve a leer con el autor.
  assert.equal(datosFichaGuardados(panel.datos).autor, "terapeuta");
  assert.equal(esFichaDelTerapeuta(panel.datos), true);
  assert.equal(esFichaDelTerapeuta({ ficha: "1.1" }), false);
  assert.equal(esFichaDelTerapeuta(null), false);
  // Datos listos para insertar (origen «codigo»).
  const d = datosFichaTerapeuta("1.1", { ...respuestasVacias(fichaPorId("1.1")), motivo: "  Ansiedad  ", afecta_hoy: 7 }, new Date("2026-11-15T10:00:00Z"));
  assert.ok(d.ok);
  assert.deepEqual([d.datos.autor, d.datos.ficha, d.datos.instrumento, d.datos.v, d.datos.respuestas.motivo, d.datos.enviado], ["terapeuta", "1.1", "FICHA", 1, "Ansiedad", "2026-11-15T10:00:00.000Z"]);
  assert.equal(datosFichaTerapeuta("1.1", respuestasVacias(fichaPorId("1.1"))).ok, false, "vacía no se guarda");
  assert.equal(datosFichaTerapeuta("1.1", { motivo: "x".repeat(3001) }).ok, false);
  assert.equal(datosFichaTerapeuta("1.1", { motivo: "x".repeat(3000), ya_intente: "y".repeat(3000), ya_ayudo: "z".repeat(3000), dia_distinto: "w".repeat(3000), dificultades: "v".repeat(3000), para_sesion: "u".repeat(3000), ...{ } }).ok, false, "más de 18 000 bytes no cabe en el jsonb");
});

caso("B.3 Enviar con lo ya escrito: borrador inicial del enlace {ficha, respuestas}", () => {
  const b = borradorInicialFicha("1.1", { motivo: "Ansiedad", extra: "no", afecta_hoy: 99 });
  assert.ok(b.ok);
  assert.equal(b.borrador.ficha, "1.1");
  assert.equal(b.borrador.respuestas.motivo, "Ansiedad");
  assert.equal(b.borrador.respuestas.afecta_hoy, null, "se limpia como el avance guardado");
  assert.equal("extra" in b.borrador.respuestas, false);
  assert.deepEqual(Object.keys(b.borrador.respuestas), camposDeFicha(fichaPorId("1.1")).map((c) => c.id));
  assert.equal(borradorInicialFicha("1.1", respuestasVacias(fichaPorId("1.1"))).ok, false, "sin nada escrito se envía vacía como hoy");
  // El formulario público lo lee con su limpieza y cuenta el avance: el paciente «continúa donde se quedó».
  const leido = limpiarBorradorFicha(b.borrador, { ficha: "1.1" });
  assert.deepEqual(avanceFicha(leido), { respondidas: 1, total: camposDeFicha(fichaPorId("1.1")).length });
  assert.deepEqual(REGISTRO.ficha.avance(b.borrador, { ficha: "1.1" }), avanceFicha(leido));
  assert.ok(new TextEncoder().encode(JSON.stringify(b.borrador)).length <= 18000);
  assert.equal(borradorInicialFicha("1.1", { motivo: "x".repeat(3000), ya_intente: "y".repeat(3000), ya_ayudo: "z".repeat(3000), dia_distinto: "w".repeat(3000), dificultades: "v".repeat(3000), para_sesion: "u".repeat(3000) }).ok, false);
});

caso("B.4 Integración: «Llenada por el terapeuta» en la lista, el informe y el PDF; solo informativo en «Antes de la próxima sesión»", () => {
  const f = delTerapeuta("1.3", { se_repite: "El miedo", efecto: "Quiero morir" });
  const r = REGISTRO.ficha.resumen(f);
  assert.match(r.puntuaciones[0], /Ficha 1\.3 .*preguntas respondidas\) · Llenada por el terapeuta$/);
  assert.match(r.insignia, /· Llenada por el terapeuta$/);
  assert.equal(r.alarma, true, "las frases de riesgo se marcan también en lo que llena el terapeuta (para el terapeuta)");
  assert.equal(REGISTRO.ficha.resumen(ficha("1.3", { se_repite: "El miedo" })).insignia.includes("terapeuta"), false);
  assert.match(resumenRespuesta(f).puntuaciones[0], /Llenada por el terapeuta/);
  const html = fichaRespondidaHtml({ ficha: fichaPorId("1.3"), respuestas: respuestasVacias(fichaPorId("1.3")), nombre: "Terapeuta", fecha: "2026-11-10", autor: "terapeuta" });
  assert.match(html, /<strong>Llenada por el terapeuta<\/strong>/);
  assert.doesNotMatch(html, /Respondió:/);
  assert.match(fichaRespondidaHtml({ ficha: fichaPorId("1.3"), respuestas: respuestasVacias(fichaPorId("1.3")), nombre: "Ana", fecha: "2026-11-10" }), /Respondió: <strong>Ana<\/strong>/);
  assert.deepEqual(resumenIntervencion([ficha("1.1", {}, {}, "2026-11-03"), delTerapeuta("1.3", {}, "2026-11-05"), fila("eapi", {})]), [
    "Ficha 1.1 · Mi motivo de consulta y mis metas: respondida por el paciente (3 nov 2026)",
    "Ficha 1.3 · Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta: llenada por el terapeuta (5 nov 2026)",
  ]);
  assert.deepEqual(resumenIntervencion([]), []);
  // Cableado (sin migraciones): componente, datos, expediente, PDF y «Antes de la próxima sesión».
  const comp = leer("../src/components/clinica/intervencion-guiada.tsx");
  assert.match(comp, /title="Intervención guiada"/);
  assert.match(comp, /Llenarla yo/);
  assert.match(comp, /Enviar al paciente/);
  assert.match(comp, /Enviar con lo escrito/);
  assert.match(comp, /tema="panel"/, "mismo renderizado de campos que el formulario público, en tema del panel");
  assert.match(comp, /GuiaTerapeutaFicha/);
  assert.match(comp, /guardarFichaTerapeuta/);
  assert.match(comp, /asignarEvaluacion\([^)]*borrador\)/);
  assert.match(comp, /agregarTareaASesionReciente\(paciente\.id, tareaDeFicha\(id\)\)/);
  assert.doesNotMatch(comp, /telegram|avisarEvaluacion/i, "llenarla no avisa por Telegram");
  const datos = leer("../src/lib/evaluaciones/evaluaciones.ts");
  assert.match(datos, /instrumento: "ficha",[\s\S]*origen: "codigo"/);
  assert.match(datos, /borrador \? \{ borrador, borrador_at/);
  assert.match(datos, /borrador: Record<string, unknown> \| null = null/, "asignarEvaluacion sigue siendo compatible: el borrador es opcional");
  assert.match(leer("../src/components/clinica/paciente-expediente.tsx"), /<IntervencionGuiada motivoCita=\{motivoUltimaCita\} paciente=\{paciente\} \/>/);
  assert.match(leer("../src/lib/clinica/expediente-pdf.ts"), /resumenIntervencion\(respuestas\)/);
  const antes = leer("../src/components/clinica/antes-proxima-sesion.tsx");
  assert.match(antes, /!delTerapeuta\(r\) && \(!ultimaSesion/);
  assert.match(antes, /solo informativo/);
  assert.match(leer("../src/components/clinica/evaluaciones-paciente.tsx"), /Llenada por el terapeuta/);
  assert.match(leer("../src/components/clinica/informe-ficha.tsx"), /Llenada por el terapeuta/);
  // El formulario público y el servidor no conocen la lógica del panel.
  for (const ruta of ["../src/components/evaluaciones/ficha-form.tsx", "../src/components/evaluaciones/ficha-campos.tsx", "../src/lib/evaluaciones/fichas/codigo.ts", "../src/lib/evaluaciones/registro-servidor.ts"]) assert.doesNotMatch(leer(ruta), /intervencion/i, ruta);
  // Sin migraciones: nada nuevo en supabase/migrations por esta función.
  assert.equal(fs.readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((n) => /intervencion|ficha/i.test(n)).length, 0);
});

caso("v1.2: comparación por palabras (sin cambios, agregado, quitado, mixto, vacío)", () => {
  assert.ok(diffPalabras("Duermo mal", "duermo mal.").every((t) => t.tipo === "igual"), "ignora mayúsculas, espacios y signos al borde");
  assert.deepEqual(diffPalabras("Duermo mal", "Duermo mal y tengo ansiedad"), [{ tipo: "igual", texto: "Duermo mal" }, { tipo: "agregado", texto: "y tengo ansiedad" }]);
  assert.deepEqual(diffPalabras("Ansiedad en el trabajo y en casa", "Ansiedad en casa"), [{ tipo: "igual", texto: "Ansiedad en" }, { tipo: "quitado", texto: "el trabajo y en" }, { tipo: "igual", texto: "casa" }]);
  const mixto = diffPalabras("Me siento triste por el divorcio", "Me siento ansioso por el trabajo");
  assert.ok(mixto.some((t) => t.tipo === "agregado" && /ansioso/.test(t.texto)) && mixto.some((t) => t.tipo === "quitado" && /triste/.test(t.texto)));
  assert.deepEqual(diffPalabras("", "Algo nuevo"), [{ tipo: "agregado", texto: "Algo nuevo" }]);
  assert.deepEqual(diffPalabras("Algo", ""), [{ tipo: "quitado", texto: "Algo" }]);
});

caso("v1.2: baseMotivo toma el expediente y, si no hay, la última cita", () => {
  const hoy = new Date(2026, 10, 19);
  assert.deepEqual(baseMotivo({ motivoConsulta: "  Ansiedad  " }, "Otra cosa", hoy), { motivo: "Ansiedad", fuente: FUENTE_EXPEDIENTE, fecha: "2026-11-19" });
  assert.deepEqual(baseMotivo({ motivoConsulta: "" }, "Duelo", hoy), { motivo: "Duelo", fuente: FUENTE_CITA, fecha: "2026-11-19" });
  assert.equal(baseMotivo({ motivoConsulta: null }, "  ", hoy), null);
  assert.ok(camposMotivoPresentes(), "la ficha 1.1 conserva los campos que usa la comparativa");
});

caso("v1.2: el enlace de la 1.1 lleva la base en las opciones y el motivo en el borrador", () => {
  const base = { motivo: "Ansiedad al manejar", fuente: FUENTE_EXPEDIENTE, fecha: "2026-11-19" };
  const e = enlaceFicha("1.1", null, base);
  assert.equal(e.ok, true);
  assert.deepEqual(e.opciones, { ficha: "1.1", base });
  assert.equal(e.borrador.respuestas.motivo, "Ansiedad al manejar");
  // Sin base: vacía como siempre. Otra ficha: sin base.
  const sin = enlaceFicha("1.1", null, null);
  assert.deepEqual(sin, { ok: true, opciones: { ficha: "1.1" }, borrador: null });
  assert.deepEqual(enlaceFicha("1.3", null, base), { ok: true, opciones: { ficha: "1.3" }, borrador: null });
  // Opciones públicas: solo se dice que hay motivo inicial (no se expone el texto).
  assert.deepEqual(REGISTRO.ficha.opcionesPublicas(e.opciones), { ficha: "1.1", motivoInicial: true });
  assert.deepEqual(REGISTRO.ficha.opcionesPublicas({ ficha: "1.1" }), { ficha: "1.1" });
});

caso("v1.2: el paciente no puede inyectar otra base desde el envío público", () => {
  const base = { motivo: "Ansiedad al manejar", fuente: FUENTE_EXPEDIENTE, fecha: "2026-11-19" };
  const cuerpo = { respuestas: { motivo: "Ansiedad al manejar y al salir de casa" }, base: { motivo: "INVENTADO", fuente: "x", fecha: "2020-01-01" } };
  const conEnlace = REGISTRO_SERVIDOR.ficha.validar(cuerpo, { ficha: "1.1", base });
  assert.deepEqual(conEnlace.datos.base, base, "la base sale de las opciones del enlace");
  assert.equal(REGISTRO_SERVIDOR.ficha.validar(cuerpo, { ficha: "1.1" }).datos.base, undefined, "sin base en el enlace, se descarta la del cuerpo");
  assert.equal(validarFicha(cuerpo, { ficha: "1.3", base }).datos.base, undefined, "solo la 1.1 lleva base");
  // Lo guardado (y el panel) conserva su base.
  assert.deepEqual(datosFichaGuardados(conEnlace.datos).base, base);
  const ter = datosFichaTerapeuta("1.1", { ...respuestasVacias(fichaPorId("1.1")), motivo: "Otro" }, new Date(), base);
  assert.deepEqual(ter.datos.base, base);
});

caso("v1.2: comparativa e historial de la ficha 1.1", () => {
  const base = { motivo: "Ansiedad al manejar", fuente: FUENTE_EXPEDIENTE, fecha: "2026-10-01" };
  const resp = (motivo, fecha, conBase = true) => ({
    id: fecha, instrumento: "ficha", fecha, createdAt: `${fecha}T10:00:00Z`,
    datos: { ...validarFicha({ respuestas: { motivo, desde_cuando: "Hace un año", afecta_hoy: 7, metas: [["Manejar al trabajo", "3 días", "2 meses"]] } }, { ficha: "1.1", ...(conBase ? { base } : {}) }).datos },
  });
  const igual = comparativaMotivo(resp("ansiedad al manejar.", "2026-10-05"));
  assert.equal(igual.estado, "sin-cambios");
  const nueva = comparativaMotivo(resp("Ansiedad al manejar y al salir de casa", "2026-11-10"));
  assert.equal(nueva.estado, "actualizado");
  assert.deepEqual(nueva.diff, [{ tipo: "igual", texto: "Ansiedad al manejar" }, { tipo: "agregado", texto: "y al salir de casa" }]);
  assert.equal(nueva.desdeCuando, "Hace un año");
  assert.equal(nueva.afectaHoy, 7);
  assert.deepEqual(nueva.metas, [{ meta: "Manejar al trabajo", avance: "3 días", plazo: "2 meses" }]);
  assert.equal(comparativaMotivo(resp("Algo", "2026-11-11", false)).estado, "sin-base");
  assert.equal(comparativaMotivo({ ...resp("", "2026-11-12"), datos: { ...resp("", "2026-11-12").datos } }).estado, "sin-cambios", "si no escribió el motivo, se mantiene el inicial");
  const h = historialMotivo([resp("a", "2026-10-05"), { instrumento: "eapi", datos: {}, createdAt: "2026-11-30" }, resp("Ansiedad al manejar y al salir de casa", "2026-11-10")]);
  assert.deepEqual(h.map((x) => x.fecha), ["2026-11-10", "2026-10-05"]);
  const lineas = lineasComparativa(nueva, fechaLegible).join("\n");
  assert.match(lineas, /Motivo inicial \(expediente .*1 oct 2026\): Ansiedad al manejar/);
  assert.match(lineas, /Motivo en la ficha 1\.1: Ansiedad al manejar y al salir de casa/);
  assert.match(lineas, /Cuánto le afecta hoy: 7\/10/);
  // Comparación nunca va al paciente: el formulario público no importa el módulo.
  assert.doesNotMatch(leer("../src/components/evaluaciones/ficha-form.tsx"), /motivo\.ts|comparativa/);
  assert.match(leer("../src/components/evaluaciones/ficha-form.tsx"), /Esto es lo que nos contó al inicio\. Puede dejarlo, ampliarlo o corregirlo\./);
});

console.log(`\n${ok} pruebas correctas.`);
