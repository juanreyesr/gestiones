/**
 * Lo que el servidor necesita de cada instrumento para el enlace público
 * (/api/evaluacion/<token>): limpiar el avance guardado y validar la respuesta
 * completa. Para un instrumento nuevo basta con agregarlo aquí (además de su
 * formulario, su informe y su entrada en instrumentos.ts).
 */
import { validarBBreve, limpiarBorradorBBreve } from "./b-breve/codigo";
import { B_BREVE_RELACIONES } from "./b-breve/contenido";
import { limpiarBorradorEapi, modulosDeOpciones, validarEapi } from "./eapi/codigo";
import { limpiarBorradorRiasec, validarRiasec } from "./riasec/codigo";
import { limpiarBorradorValores, validarValores } from "./valores/codigo";

export type RespuestaValidada =
  | {
      ok: true;
      /** Datos a guardar (el nombre, la fecha y la edad los completa la base de datos desde el expediente). */
      datos: Record<string, unknown>;
      /** Nombre de quien responde; vacío = el del paciente. */
      nombre: string;
      relacion: string;
      /** ≥ 1 si marcó la pregunta de seguridad (aviso urgente por Telegram). */
      alertaSeguridad: number;
    }
  | { ok: false; error: string };

type DefinicionServidor = {
  limpiarBorrador: (datos: unknown) => unknown;
  validar: (cuerpo: unknown, opciones: Record<string, unknown> | null | undefined) => RespuestaValidada;
};

const delPaciente = (v: { ok: true; datos: object } | { ok: false; error: string }, alertaSeguridad = 0): RespuestaValidada =>
  v.ok ? { ok: true, datos: { ...v.datos }, nombre: "", relacion: "Paciente", alertaSeguridad } : v;

export const REGISTRO_SERVIDOR: Record<string, DefinicionServidor> = {
  "b-breve": {
    limpiarBorrador: limpiarBorradorBBreve,
    validar: (cuerpo) => {
      const v = validarBBreve(cuerpo);
      if (!v.ok) return v;
      if (!v.datos.nombre) return { ok: false, error: "Escriba el nombre de quien responde." };
      if (!(B_BREVE_RELACIONES as readonly string[]).includes(v.datos.relacion ?? "")) {
        return { ok: false, error: "Seleccione su relación con el niño o niña." };
      }
      return { ok: true, datos: { ...v.datos }, nombre: v.datos.nombre, relacion: v.datos.relacion ?? "", alertaSeguridad: 0 };
    },
  },
  eapi: {
    limpiarBorrador: limpiarBorradorEapi,
    validar: (cuerpo, opciones) => {
      const v = validarEapi(cuerpo, modulosDeOpciones(opciones));
      return delPaciente(v, v.ok ? v.datos.safety : 0);
    },
  },
  riasec: { limpiarBorrador: limpiarBorradorRiasec, validar: (cuerpo) => delPaciente(validarRiasec(cuerpo)) },
  valores: { limpiarBorrador: limpiarBorradorValores, validar: (cuerpo) => delPaciente(validarValores(cuerpo)) },
};

export const definicionServidor = (instrumento: string | null | undefined) => (instrumento ? REGISTRO_SERVIDOR[instrumento] ?? null : null);
