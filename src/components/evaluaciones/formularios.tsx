"use client";

import type { ReactNode } from "react";
import type { BBreveBorrador } from "@/lib/evaluaciones/b-breve/codigo";
import { modulosDeOpciones, type EapiBorrador } from "@/lib/evaluaciones/eapi/codigo";
import { formaDeOpciones, type JjrBorrador } from "@/lib/evaluaciones/jjr/codigo";
import type { MceaBorrador } from "@/lib/evaluaciones/mcea/codigo";
import type { RiasecBorrador } from "@/lib/evaluaciones/riasec/codigo";
import type { TemperamentosBorrador } from "@/lib/evaluaciones/temperamentos/codigo";
import type { ValoresBorrador } from "@/lib/evaluaciones/valores/codigo";
import { BBreveForm } from "./b-breve-form";
import { EapiForm } from "./eapi-form";
import { JjrForm } from "./jjr-form";
import { MceaForm } from "./mcea-form";
import { RiasecForm } from "./riasec-form";
import { TemperamentosForm } from "./temperamentos-form";
import { ValoresForm } from "./valores-form";

/** Lo que recibe el formulario de la página pública /evaluacion/<token>. */
export type PropsFormulario = {
  /** Avance guardado (ya limpiado por el servidor según el instrumento). */
  borrador: unknown;
  codigoCaso: string;
  opciones: Record<string, unknown> | null | undefined;
  token: string;
};

/**
 * Registro de formularios públicos: un instrumento nuevo solo agrega aquí su
 * formulario (la página pública no tiene ramas por instrumento). Sin
 * calificación: quien responde no ve puntuaciones.
 */
export const FORMULARIOS: Record<string, (p: PropsFormulario) => ReactNode> = {
  "b-breve": (p) => <BBreveForm borradorInicial={(p.borrador as BBreveBorrador | null) ?? null} codigoCaso={p.codigoCaso} token={p.token} />,
  eapi: (p) => (
    <EapiForm borradorInicial={(p.borrador as EapiBorrador | null) ?? null} codigoCaso={p.codigoCaso} modulos={modulosDeOpciones(p.opciones)} token={p.token} />
  ),
  riasec: (p) => <RiasecForm borradorInicial={(p.borrador as RiasecBorrador | null) ?? null} codigoCaso={p.codigoCaso} token={p.token} />,
  valores: (p) => <ValoresForm borradorInicial={(p.borrador as ValoresBorrador | null) ?? null} codigoCaso={p.codigoCaso} token={p.token} />,
  temperamentos: (p) => (
    <TemperamentosForm borradorInicial={(p.borrador as TemperamentosBorrador | null) ?? null} codigoCaso={p.codigoCaso} token={p.token} />
  ),
  jjr84: (p) => <JjrForm borradorInicial={(p.borrador as JjrBorrador | null) ?? null} forma={null} instrumento="jjr84" token={p.token} />,
  jjr176: (p) => (
    <JjrForm borradorInicial={(p.borrador as JjrBorrador | null) ?? null} forma={formaDeOpciones(p.opciones)} instrumento="jjr176" token={p.token} />
  ),
  mcea: (p) => <MceaForm borradorInicial={(p.borrador as MceaBorrador | null) ?? null} opciones={p.opciones} token={p.token} />,
};
