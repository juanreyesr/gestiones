// Pruebas de las Fichas terapéuticas JJR (lote 1, id interno «ficha»). Ejecutar: pnpm test:fichas
import assert from "node:assert/strict";
import fs from "node:fs";
import { calificarEapi } from "../src/lib/evaluaciones/eapi/calificacion.ts";
import { FORMA_MODULOS } from "../src/lib/evaluaciones/eapi/codigo.ts";
import { camposDeFicha, ETAPAS_FICHAS, FICHA_IDS, FICHAS, fichaPorId, TIPOS_CAMPO } from "../src/lib/evaluaciones/fichas/catalogo.ts";
import { avanceFicha, campoTieneContenido, datosFichaGuardados, fichaDeOpciones, limpiarBorradorFicha, opcionesFicha, respuestasVacias, validarFicha } from "../src/lib/evaluaciones/fichas/codigo.ts";
import { GUIA_TERAPEUTA } from "../src/lib/evaluaciones/fichas/guia-terapeuta.ts";
import { fichaEnBlancoHtml, fichaRespondidaHtml } from "../src/lib/evaluaciones/fichas/informe-html.ts";
import { detectarRiesgo, riesgoFicha } from "../src/lib/evaluaciones/fichas/riesgo.ts";
import { fichasRespondidas, fichasSugeridas } from "../src/lib/evaluaciones/fichas/sugeridas.ts";
import { INSTRUMENTOS, instrumentoPorId } from "../src/lib/evaluaciones/instrumentos.ts";
import { buildPlan, etiquetas } from "../src/lib/evaluaciones/mcea/motor.ts";
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
    assert.ok(f.secciones.every((s) => s.titulo && s.campos.length >= 1), f.id);
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
  for (const ruta of ["../src/components/evaluaciones/ficha-form.tsx", "../src/lib/evaluaciones/fichas/codigo.ts", "../src/lib/evaluaciones/fichas/riesgo.ts"]) {
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
function mcea(valorTope, focus, fecha = "2026-11-02") {
  const e = { modo: "full", anchor: [], focus, gate: "no", answers: {}, risk: { self: "no" }, tr: null };
  for (let pos = 0, g = 0; g < 400; g++, pos++) {
    const st = buildPlan(e)[pos];
    if (!st || st.t === "end") break;
    if (st.t === "item") e.answers[`${st.ins}_${st.i}`] = { v: valorTope ? etiquetas(st.ins).length - 1 : 0, t: 1000 };
    else if (st.t === "tr") e.tr = { skip: true };
  }
  const v = validarMcea(e, { modo: "full", anchor: [] });
  assert.ok(v.ok, v.error);
  return fila("mcea", v.datos, fecha);
}

caso("Sugeridas: sin evaluaciones solo 1.1 y 1.3", () => {
  assert.deepEqual(fichasSugeridas([]).map((s) => s.ficha), ["1.1", "1.3"]);
  assert.ok(fichasSugeridas([]).every((s) => s.motivos.includes("Aún no la ha respondido")));
});

caso("Sugeridas: EAPI alto → 2.1, 2.4, 2.2, 2.3 con sus motivos", () => {
  const alto = eapi(3, 3, 4);
  assert.ok(calificarEapi({ gad: Array(7).fill(3), dass: Array(21).fill(3), ptq: Array(15).fill(4), docs: null, safety: 0, func: null }).gad.total >= 10);
  const s = fichasSugeridas([alto]);
  assert.deepEqual(s.map((x) => x.ficha), ["1.1", "1.3", "2.1", "2.2", "2.3", "2.4"]);
  assert.match(s.find((x) => x.ficha === "2.1").motivos.join(" "), /Preocupación y ansiedad|Tensión y palpitaciones/);
  assert.match(s.find((x) => x.ficha === "2.2").motivos.join(" "), /Tristeza y desgano/);
  assert.match(s.find((x) => x.ficha === "2.3").motivos.join(" "), /Pensamientos que vuelven/);
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
  assert.match(html, /<th>Situación<\/th>/);
  assert.match(html, /<td>Mensaje del jefe<\/td>/);
  assert.match(html, /class="flag"/);
  assert.match(html, /Sin respuesta/);
  assert.match(html, /1 de \d+ campos|\d+ de \d+ campos respondidos/);
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
  assert.equal(r.insignia, `Ficha 1.3 · 2 de ${total} campos`);
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

console.log(`\n${ok} pruebas correctas.`);
