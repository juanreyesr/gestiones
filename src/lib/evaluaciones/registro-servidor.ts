/**
 * Lo que el servidor necesita de cada instrumento para el enlace público
 * (/api/evaluacion/<token>): limpiar el avance guardado y validar la respuesta
 * completa. Para un instrumento nuevo: agregarlo aquí y en el registro único
 * (registro.ts; ver la guía en instrumentos.ts).
 */
import { validarBBreve, limpiarBorradorBBreve } from "./b-breve/codigo";
import { B_BREVE_RELACIONES } from "./b-breve/contenido";
import { limpiarBorradorEapi, modulosDeOpciones, validarEapi } from "./eapi/codigo";
import { formaDeOpciones, limpiarBorradorJjr, validarJjr } from "./jjr/codigo";
import { limpiarBorradorMcea, validarMcea } from "./mcea/codigo";
import { limpiarBorradorRiasec, validarRiasec } from "./riasec/codigo";
import { limpiarBorradorTemperamentos, validarTemperamentos } from "./temperamentos/codigo";
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
  temperamentos: { limpiarBorrador: limpiarBorradorTemperamentos, validar: (cuerpo) => delPaciente(validarTemperamentos(cuerpo)) },
  jjr84: { limpiarBorrador: limpiarBorradorJjr, validar: (cuerpo) => delPaciente(validarJjr(cuerpo, "jjr84", null)) },
  // La forma (A o B) la fija el enlace, no el cuerpo enviado.
  jjr176: { limpiarBorrador: limpiarBorradorJjr, validar: (cuerpo, opciones) => delPaciente(validarJjr(cuerpo, "jjr176", formaDeOpciones(opciones))) },
  // El modo y los módulos anclados los fija el enlace. Alerta: ítem 9 del PHQ-9 ≥ 1.
  mcea: {
    limpiarBorrador: (datos) => limpiarBorradorMcea(datos),
    validar: (cuerpo, opciones) => {
      const v = validarMcea(cuerpo, opciones);
      return delPaciente(v, v.ok ? (v.datos.answers.PHQ9_9?.v ?? 0) : 0);
    },
  },
};

export const definicionServidor = (instrumento: string | null | undefined) => (instrumento ? REGISTRO_SERVIDOR[instrumento] ?? null : null);
