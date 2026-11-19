/**
 * Fichas terapéuticas JJR: tipos de datos y borrador, opciones del enlace,
 * validación estricta de la respuesta enviada, limpieza del avance guardado y
 * cálculo del avance. Lo usan el formulario público y el servidor: no importa
 * la guía del terapeuta ni nada clínico.
 */
import { camposDeFicha, esFichaId, fichaPorId, FICHA_IDS, type Campo, type Ficha, type FichaId } from "./catalogo";

/** Límites de longitud (caracteres) y de filas. */
export const LIMITES_FICHA = { texto: 300, parrafo: 3000, celda: 500, entradaLista: 300, otra: 300, filasLista: 20, filasTabla: 20, escalaMax: 10 } as const;

export type ValorCasillas = { marcadas: string[]; otra: string };
/** texto/párrafo: string · escala: número 0–10 o null · lista: string[] · casillas: ValorCasillas · tabla: string[][]. */
export type ValorCampo = string | number | null | string[] | ValorCasillas | string[][];
export type RespuestasFicha = Record<string, ValorCampo>;

/** Quién llenó la ficha. Ausente = la persona que recibió el enlace (paciente). */
export type AutorFicha = "terapeuta";

export type FichaRespuesta = {
  v: 1;
  instrumento: "FICHA";
  ficha: FichaId;
  respuestas: RespuestasFicha;
  ref: string;
  enviado: string;
  /** Solo «terapeuta»: la llenó el psicólogo desde el expediente (Intervención guiada). */
  autor?: AutorFicha;
};

/** ¿La respuesta guardada la llenó el terapeuta? */
export const esFichaDelTerapeuta = (datos: unknown) => esObjeto(datos) && datos.autor === "terapeuta";

export type FichaBorrador = { ficha: FichaId; respuestas: RespuestasFicha };

type Opciones = Record<string, unknown> | null | undefined;

/** Ficha elegida al asignar (la fija el enlace); si falta o no es válida, la primera. */
export function opcionesFicha(opciones: Opciones): { ficha: FichaId } {
  const f = opciones?.ficha;
  return { ficha: esFichaId(f) ? f : FICHA_IDS[0] };
}

/** Ficha del catálogo que corresponde a las opciones del enlace. */
export const fichaDeOpciones = (opciones: Opciones): Ficha => fichaPorId(opcionesFicha(opciones).ficha)!;

/** Valor vacío de un campo según su tipo. */
export function valorVacio(c: Campo): ValorCampo {
  switch (c.tipo) {
    case "texto":
    case "parrafo":
      return "";
    case "escala":
      return null;
    case "lista":
      return [];
    case "casillas":
      return { marcadas: [], otra: "" };
    case "tabla":
      return Array.from({ length: c.filasFijas ? c.filasFijas.length : c.filas }, () => c.columnas.map(() => ""));
  }
}

export const respuestasVacias = (f: Ficha): RespuestasFicha => Object.fromEntries(camposDeFicha(f).map((c) => [c.id, valorVacio(c)]));

/** ¿El campo tiene algo escrito o marcado? */
export function campoTieneContenido(c: Campo, valor: unknown): boolean {
  switch (c.tipo) {
    case "texto":
    case "parrafo":
      return typeof valor === "string" && valor.trim() !== "";
    case "escala":
      return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= LIMITES_FICHA.escalaMax;
    case "lista":
      return Array.isArray(valor) && valor.some((x) => typeof x === "string" && x.trim() !== "");
    case "casillas": {
      const v = valor as Partial<ValorCasillas> | null;
      return Boolean(v && ((Array.isArray(v.marcadas) && v.marcadas.length > 0) || (typeof v.otra === "string" && v.otra.trim() !== "")));
    }
    case "tabla":
      return Array.isArray(valor) && valor.some((fila) => Array.isArray(fila) && fila.some((x) => typeof x === "string" && x.trim() !== ""));
  }
}

const esObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const filasMaxDe = (c: Extract<Campo, { tipo: "lista" }>) => Math.min(c.maxFilas, LIMITES_FICHA.filasLista);

/** Valida y normaliza el valor de un campo. Devuelve el valor o un mensaje de error. */
function validarCampo(c: Campo, valor: unknown): { ok: true; valor: ValorCampo } | { ok: false; error: string } {
  const mal = (m: string) => ({ ok: false as const, error: `«${c.etiqueta}»: ${m}` });
  if (valor === undefined || valor === null) return { ok: true, valor: valorVacio(c) };
  switch (c.tipo) {
    case "texto":
    case "parrafo": {
      if (typeof valor !== "string") return mal("debe ser un texto.");
      const max = c.tipo === "texto" ? LIMITES_FICHA.texto : LIMITES_FICHA.parrafo;
      if (valor.length > max) return mal(`es demasiado largo (máximo ${max} caracteres).`);
      return { ok: true, valor: valor.trim() };
    }
    case "escala": {
      if (valor === "") return { ok: true, valor: null };
      if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > LIMITES_FICHA.escalaMax) return mal("debe ser un número entero de 0 a 10.");
      return { ok: true, valor };
    }
    case "lista": {
      if (!Array.isArray(valor) || !valor.every((x) => typeof x === "string")) return mal("debe ser una lista de textos.");
      if (valor.length > filasMaxDe(c)) return mal(`admite como máximo ${filasMaxDe(c)} filas.`);
      if (valor.some((x: string) => x.length > LIMITES_FICHA.entradaLista)) return mal(`cada fila admite como máximo ${LIMITES_FICHA.entradaLista} caracteres.`);
      return { ok: true, valor: (valor as string[]).map((x) => x.trim()).filter(Boolean) };
    }
    case "casillas": {
      if (!esObjeto(valor) || !Array.isArray(valor.marcadas) || !valor.marcadas.every((x) => typeof x === "string")) return mal("las opciones marcadas no son válidas.");
      if (!(valor.marcadas as string[]).every((x) => c.opciones.includes(x))) return mal("hay una opción que no existe.");
      const otra = valor.otra ?? "";
      if (typeof otra !== "string") return mal("«Otra» debe ser un texto.");
      if (otra.length > LIMITES_FICHA.otra) return mal(`«Otra» admite como máximo ${LIMITES_FICHA.otra} caracteres.`);
      if (otra.trim() && !c.conOtra) return mal("no admite «Otra».");
      return { ok: true, valor: { marcadas: c.opciones.filter((o) => (valor.marcadas as string[]).includes(o)), otra: otra.trim() } };
    }
    case "tabla": {
      if (!Array.isArray(valor) || !valor.every((f) => Array.isArray(f))) return mal("la tabla no es válida.");
      const limite = c.filasFijas ? c.filasFijas.length : Math.min(c.maxFilas, LIMITES_FICHA.filasTabla);
      if (valor.length > limite) return mal(`admite como máximo ${limite} filas.`);
      const filas: string[][] = [];
      for (const fila of valor as unknown[][]) {
        if (fila.length !== c.columnas.length || !fila.every((x) => typeof x === "string")) return mal("cada fila debe tener una celda de texto por columna.");
        if ((fila as string[]).some((x) => x.length > LIMITES_FICHA.celda)) return mal(`cada celda admite como máximo ${LIMITES_FICHA.celda} caracteres.`);
        filas.push((fila as string[]).map((x) => x.trim()));
      }
      if (c.filasFijas) while (filas.length < c.filasFijas.length) filas.push(c.columnas.map(() => ""));
      else while (filas.length && filas[filas.length - 1].every((x) => x === "")) filas.pop();
      return { ok: true, valor: filas };
    }
  }
}

/**
 * Valida la respuesta enviada. La ficha la fija el enlace (opciones.ficha), no el
 * cuerpo. Se acepta cualquier campo vacío; se rechazan tipos o longitudes inválidos.
 * `autor: "terapeuta"` solo se conserva con `permitirAutor` (lo usa el panel y la lectura de lo
 * guardado); en el envío público siempre se descarta, para que nadie se haga pasar por el terapeuta.
 */
export function validarFicha(
  datos: unknown,
  opciones: Opciones,
  { permitirAutor = false }: { permitirAutor?: boolean } = {}
): { ok: true; datos: FichaRespuesta } | { ok: false; error: string } {
  if (!esObjeto(datos)) return { ok: false, error: "Las respuestas no son válidas." };
  if (!esFichaId(opciones?.ficha)) return { ok: false, error: "Esta ficha no está disponible." };
  const ficha = fichaPorId(opciones.ficha)!;
  if (datos.ficha !== undefined && datos.ficha !== ficha.id) return { ok: false, error: "La ficha enviada no corresponde a este enlace." };
  const crudas = datos.respuestas === undefined ? {} : datos.respuestas;
  if (!esObjeto(crudas)) return { ok: false, error: "Las respuestas no son válidas." };
  const respuestas: RespuestasFicha = {};
  for (const c of camposDeFicha(ficha)) {
    const r = validarCampo(c, crudas[c.id]);
    if (!r.ok) return r;
    respuestas[c.id] = r.valor;
  }
  const texto = (k: string, max: number) => (typeof datos[k] === "string" ? (datos[k] as string).slice(0, max).trim() : "");
  return {
    ok: true,
    datos: {
      v: 1,
      instrumento: "FICHA",
      ficha: ficha.id,
      respuestas,
      ref: texto("ref", 40).replace(/[^A-Za-z0-9]/g, "").slice(0, 12),
      enviado: texto("enviado", 40),
      ...(permitirAutor && datos.autor === "terapeuta" ? { autor: "terapeuta" as const } : {}),
    },
  };
}

/** Datos de una respuesta ya guardada (null si no son válidos). */
export function datosFichaGuardados(datos: unknown): FichaRespuesta | null {
  if (!esObjeto(datos) || !esFichaId(datos.ficha)) return null;
  const v = validarFicha(datos, { ficha: datos.ficha }, { permitirAutor: true });
  return v.ok ? v.datos : null;
}

/** Versión indulgente para el guardado automático: nunca falla; descarta lo inválido y recorta lo largo. */
function limpiarValor(c: Campo, valor: unknown): ValorCampo {
  const cortar = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
  switch (c.tipo) {
    case "texto":
      return cortar(valor, LIMITES_FICHA.texto);
    case "parrafo":
      return cortar(valor, LIMITES_FICHA.parrafo);
    case "escala":
      return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= LIMITES_FICHA.escalaMax ? valor : null;
    case "lista":
      return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string").slice(0, filasMaxDe(c)).map((x) => x.slice(0, LIMITES_FICHA.entradaLista)) : [];
    case "casillas": {
      const v = esObjeto(valor) ? valor : {};
      const marcadas = Array.isArray(v.marcadas) ? c.opciones.filter((o) => (v.marcadas as unknown[]).includes(o)) : [];
      return { marcadas, otra: c.conOtra ? cortar(v.otra, LIMITES_FICHA.otra) : "" };
    }
    case "tabla": {
      const filas = Array.isArray(valor) ? valor.slice(0, c.filasFijas ? c.filasFijas.length : Math.min(c.maxFilas, LIMITES_FICHA.filasTabla)) : [];
      const out = filas.map((f) => c.columnas.map((_, j) => cortar(Array.isArray(f) ? f[j] : "", LIMITES_FICHA.celda)));
      const minimo = c.filasFijas ? c.filasFijas.length : c.filas;
      while (out.length < minimo) out.push(c.columnas.map(() => ""));
      return out;
    }
  }
}

/** Avance guardado limpio. La ficha la fija el enlace (opciones); si no hay, la del propio borrador. */
export function limpiarBorradorFicha(datos: unknown, opciones?: Opciones): FichaBorrador {
  const d = esObjeto(datos) ? datos : {};
  const id = esFichaId(opciones?.ficha) ? opciones.ficha : esFichaId(d.ficha) ? d.ficha : FICHA_IDS[0];
  const ficha = fichaPorId(id)!;
  const crudas = esObjeto(d.respuestas) ? d.respuestas : {};
  return { ficha: ficha.id, respuestas: Object.fromEntries(camposDeFicha(ficha).map((c) => [c.id, limpiarValor(c, crudas[c.id])])) };
}

/** Campos con contenido sobre el total de campos de la ficha. */
export function avanceFicha(b: { ficha: FichaId; respuestas: RespuestasFicha }) {
  const ficha = fichaPorId(b.ficha);
  if (!ficha) return { respondidas: 0, total: 0 };
  const campos = camposDeFicha(ficha);
  return { respondidas: campos.filter((c) => campoTieneContenido(c, b.respuestas?.[c.id])).length, total: campos.length };
}
