"use client";

import type { Biblioteca, FichaBiblioteca, FichaClinica, FichaTecnica, VistaFicha } from "@/lib/bibliotecas/tipos";
import { FichaClinicaVista, type TemaFichaClinica } from "./ficha-clinica-vista";
import { FichaTecnicaVista } from "./ficha-tecnica-vista";

/** Ficha de cualquier biblioteca: elige el visor según el tipo de biblioteca (trastornos o técnicas). */
export function FichaBibliotecaVista({
  biblioteca,
  ficha,
  vista,
  tema = "panel",
  accionesFicha,
}: {
  biblioteca: Biblioteca;
  ficha: FichaBiblioteca;
  vista: VistaFicha;
  tema?: TemaFichaClinica;
  accionesFicha?: (fichaId: string) => React.ReactNode;
}) {
  return biblioteca.tipo === "tecnicas" ? (
    <FichaTecnicaVista accionesFicha={accionesFicha} ficha={ficha as FichaTecnica} tema={tema} vista={vista} />
  ) : (
    <FichaClinicaVista accionesFicha={accionesFicha} ficha={ficha as FichaClinica} tema={tema} vista={vista} />
  );
}

/** Subtítulo corto de una ficha en las listas (códigos o modelo). */
export const subtituloFicha = (biblioteca: Biblioteca, ficha: FichaBiblioteca) =>
  biblioteca.tipo === "tecnicas" ? (ficha as FichaTecnica).modelo : `DSM-5-TR ${(ficha as FichaClinica).codigos.dsm} · CIE-11 ${(ficha as FichaClinica).codigos.cie}`;
