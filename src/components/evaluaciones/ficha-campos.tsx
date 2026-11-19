"use client";

import { Plus } from "lucide-react";
import {
  rotuloFila,
  type Campo,
  type CampoCasillas,
  type CampoEscala,
  type CampoLista,
  type CampoTabla,
} from "@/lib/evaluaciones/fichas/catalogo";
import type { RespuestasFicha, ValorCampo, ValorCasillas } from "@/lib/evaluaciones/fichas/codigo";

// Renderizado de los campos de una ficha, compartido por el formulario público
// (tema claro) y el editor del panel (tema oscuro). No importa la guía del
// terapeuta ni ninguna calificación.

export type Poner = (id: string, valor: ValorCampo) => void;
export type TemaFicha = "claro" | "panel";

type Clases = {
  etiqueta: string;
  ayuda: string;
  ejemplo: string;
  entrada: string;
  boton: string;
  activo: string;
  inactivo: string;
  borde: string;
  cabecera: string;
  rotulo: string;
  tarjeta: string;
  texto: string;
  suave: string;
};

const CLASES: Record<TemaFicha, Clases> = {
  claro: {
    etiqueta: "text-slate-800",
    ayuda: "text-slate-500",
    ejemplo: "text-slate-400",
    entrada: "field-light",
    boton: "border-slate-200 text-slate-600 hover:bg-slate-50",
    activo: "border-teal-600 bg-teal-50 text-teal-900",
    inactivo: "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
    borde: "border-slate-200",
    cabecera: "bg-slate-50 text-slate-600",
    rotulo: "bg-slate-50 text-slate-700",
    tarjeta: "border-slate-200 bg-slate-50/60",
    texto: "text-slate-700",
    suave: "text-slate-500",
  },
  panel: {
    etiqueta: "text-slate-100",
    ayuda: "text-slate-400",
    ejemplo: "text-slate-500",
    entrada: "field",
    boton: "border-white/10 text-slate-300 hover:bg-white/8",
    activo: "border-emerald-300 bg-emerald-300/15 text-emerald-100",
    inactivo: "border-white/10 bg-white/4 text-slate-300 hover:border-white/30",
    borde: "border-white/10",
    cabecera: "bg-white/6 text-slate-300",
    rotulo: "bg-white/6 text-slate-200",
    tarjeta: "border-white/10 bg-white/4",
    texto: "text-slate-300",
    suave: "text-slate-400",
  },
};

const Etiqueta = ({ c, t }: { c: Campo; t: Clases }) => (
  <div className="grid gap-0.5">
    <span className={`text-sm font-semibold ${t.etiqueta}`}>
      {c.etiqueta}
      {c.requerido ? <span className="text-red-600"> *</span> : null}
    </span>
    {c.ayuda ? <span className={`text-xs leading-5 ${t.ayuda}`}>{c.ayuda}</span> : null}
    {c.ejemplo && c.tipo !== "tabla" && c.tipo !== "escala" && c.tipo !== "casillas" ? (
      <span className={`text-xs italic leading-5 ${t.ejemplo}`}>Ejemplo: {c.ejemplo}</span>
    ) : null}
  </div>
);

function EscalaCampo({ c, valor, onCambio, t }: { c: CampoEscala; valor: number | null; onCambio: (v: number | null) => void; t: Clases }) {
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="radiogroup" aria-label={c.etiqueta}>
        {Array.from({ length: 11 }, (_, i) => (
          <button
            aria-checked={valor === i}
            className={`h-10 rounded-lg border-2 text-sm font-bold transition ${valor === i ? t.activo : t.inactivo}`}
            key={i}
            onClick={() => onCambio(valor === i ? null : i)}
            role="radio"
            type="button"
          >
            {i}
          </button>
        ))}
      </div>
      <div className={`flex justify-between gap-3 text-xs ${t.suave}`}>
        <span>{c.extremos[0]}</span>
        <span className="text-right">{c.extremos[1]}</span>
      </div>
    </div>
  );
}

function ListaCampo({ c, valor, onCambio, t }: { c: CampoLista; valor: string[]; onCambio: (v: string[]) => void; t: Clases }) {
  const filas = Math.max(c.minFilas, valor.length);
  const cambiar = (i: number, texto: string) => {
    const nuevo = Array.from({ length: filas }, (_, j) => valor[j] ?? "");
    nuevo[i] = texto;
    onCambio(nuevo);
  };
  return (
    <div className="grid gap-2">
      {Array.from({ length: filas }, (_, i) => (
        <div className="flex items-center gap-2" key={i}>
          <span className="w-5 text-right text-sm text-slate-400">{i + 1}.</span>
          <input aria-label={`${c.etiqueta} Respuesta ${i + 1}`} className={`${t.entrada} w-full`} maxLength={300} onChange={(e) => cambiar(i, e.target.value)} value={valor[i] ?? ""} />
        </div>
      ))}
      {filas < Math.min(c.maxFilas, 20) ? (
        <button className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${t.boton}`} onClick={() => onCambio([...valor, ""])} type="button">
          <Plus className="h-4 w-4" />
          Agregar otra
        </button>
      ) : null}
    </div>
  );
}

function CasillasCampo({ c, valor, onCambio, t }: { c: CampoCasillas; valor: ValorCasillas; onCambio: (v: ValorCasillas) => void; t: Clases }) {
  const alternar = (o: string) => onCambio({ ...valor, marcadas: valor.marcadas.includes(o) ? valor.marcadas.filter((x) => x !== o) : [...valor.marcadas, o] });
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {c.opciones.map((o) => {
          const activo = valor.marcadas.includes(o);
          return (
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm leading-5 transition ${activo ? t.activo : t.inactivo}`} key={o}>
              <input checked={activo} className="mt-1" onChange={() => alternar(o)} type="checkbox" />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
      {c.conOtra ? (
        <label className={`grid gap-1 text-sm ${t.suave}`}>
          Otra (escríbala si lo desea)
          <input className={t.entrada} maxLength={300} onChange={(e) => onCambio({ ...valor, otra: e.target.value })} value={valor.otra} />
        </label>
      ) : null}
    </div>
  );
}

function TablaCampo({ c, valor, onCambio, t }: { c: CampoTabla; valor: string[][]; onCambio: (v: string[][]) => void; t: Clases }) {
  const fijas = Boolean(c.filasFijas);
  const filas = fijas ? c.filasFijas!.length : Math.max(c.filas, valor.length);
  const celda = (i: number, j: number) => valor[i]?.[j] ?? "";
  const cambiar = (i: number, j: number, texto: string) => {
    const nuevo = Array.from({ length: filas }, (_, a) => c.columnas.map((_, b) => celda(a, b)));
    nuevo[i][j] = texto;
    onCambio(nuevo);
  };
  const ejemploDe = (i: number, j: number) => (i === 0 && !fijas ? c.columnas[j].ejemplo : undefined);
  const rotulo = (i: number) => rotuloFila(c, i);
  return (
    <div className="grid gap-2">
      {/* Pantallas anchas: tabla. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`w-32 border p-2 ${t.borde} ${t.cabecera}`} />
              {c.columnas.map((k) => (
                <th className={`border p-2 text-left align-top text-xs font-semibold ${t.borde} ${t.cabecera}`} key={k.id}>
                  {k.titulo}
                  {k.ayuda ? <span className={`block font-normal ${t.ayuda}`}>{k.ayuda}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: filas }, (_, i) => (
              <tr key={i}>
                <td className={`border p-2 align-top text-xs font-semibold ${t.borde} ${t.rotulo}`}>{rotulo(i)}</td>
                {c.columnas.map((k, j) => (
                  <td className={`border p-1 align-top ${t.borde}`} key={k.id}>
                    <textarea
                      aria-label={`${rotulo(i)}: ${k.titulo}`}
                      className={`${t.entrada} min-h-16 w-full resize-y`}
                      maxLength={500}
                      onChange={(e) => cambiar(i, j, e.target.value)}
                      placeholder={ejemploDe(i, j)}
                      value={celda(i, j)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Teléfono: cada fila como tarjeta. */}
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: filas }, (_, i) => (
          <div className={`grid gap-2 rounded-xl border p-3 ${t.tarjeta}`} key={i}>
            <p className={`text-xs font-bold ${t.suave}`}>{rotulo(i)}</p>
            {c.columnas.map((k, j) => (
              <label className="grid gap-1" key={k.id}>
                <span className={`text-xs font-semibold ${t.etiqueta}`}>
                  {k.titulo}
                  {k.ayuda ? <span className={`block font-normal ${t.ayuda}`}>{k.ayuda}</span> : null}
                </span>
                <textarea className={`${t.entrada} min-h-14 resize-y`} maxLength={500} onChange={(e) => cambiar(i, j, e.target.value)} placeholder={ejemploDe(i, j)} value={celda(i, j)} />
              </label>
            ))}
          </div>
        ))}
      </div>
      {!fijas && filas < Math.min(c.maxFilas, 20) ? (
        <button
          className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${t.boton}`}
          onClick={() => onCambio([...Array.from({ length: filas }, (_, a) => c.columnas.map((_, b) => celda(a, b))), c.columnas.map(() => "")])}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Agregar {c.generoFila === "f" ? "otra" : "otro"} {c.etiquetaFila}
        </button>
      ) : null}
    </div>
  );
}

/** Un campo de la ficha: pregunta, ayuda, ejemplo y el control según su tipo. */
export function CampoFicha({
  c,
  respuestas,
  poner,
  falta = false,
  tema = "claro",
  origen,
  nota,
}: {
  c: Campo;
  respuestas: RespuestasFicha;
  poner: Poner;
  falta?: boolean;
  tema?: TemaFicha;
  /** Panel: de dónde salió lo prellenado (se muestra bajo la pregunta). */
  origen?: string;
  /** Nota visible para quien responde, sobre el control (p. ej. «Esto es lo que nos contó al inicio…»). */
  nota?: string;
}) {
  const t = CLASES[tema];
  const v = respuestas[c.id];
  let control;
  switch (c.tipo) {
    case "texto":
      control = <input aria-label={c.etiqueta} className={`${t.entrada} w-full`} maxLength={300} onChange={(e) => poner(c.id, e.target.value)} value={typeof v === "string" ? v : ""} />;
      break;
    case "parrafo":
      control = (
        <textarea aria-label={c.etiqueta} className={`${t.entrada} min-h-28 w-full resize-y`} maxLength={3000} onChange={(e) => poner(c.id, e.target.value)} value={typeof v === "string" ? v : ""} />
      );
      break;
    case "escala":
      control = <EscalaCampo c={c} onCambio={(x) => poner(c.id, x)} t={t} valor={typeof v === "number" ? v : null} />;
      break;
    case "lista":
      control = <ListaCampo c={c} onCambio={(x) => poner(c.id, x)} t={t} valor={Array.isArray(v) ? (v as string[]) : []} />;
      break;
    case "casillas":
      control = (
        <CasillasCampo c={c} onCambio={(x) => poner(c.id, x)} t={t} valor={v && typeof v === "object" && !Array.isArray(v) ? (v as ValorCasillas) : { marcadas: [], otra: "" }} />
      );
      break;
    case "tabla":
      control = <TablaCampo c={c} onCambio={(x) => poner(c.id, x)} t={t} valor={Array.isArray(v) ? (v as string[][]) : []} />;
      break;
  }
  return (
    <div
      className={`grid gap-2 rounded-xl border p-3 ${falta ? "border-red-300 bg-red-50/60" : "border-transparent"}`}
      data-falta={falta ? "si" : undefined}
      id={`ficha-${c.id}`}
    >
      <Etiqueta c={c} t={t} />
      {origen ? <span className="w-fit rounded bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200" data-testid="ficha-origen">Prellenado: {origen}</span> : null}
      {nota ? (
        <span className={`w-fit rounded-lg px-2.5 py-1 text-xs leading-5 ${tema === "claro" ? "bg-teal-50 text-teal-800" : "bg-teal-400/10 text-teal-200"}`} data-testid="ficha-nota">
          {nota}
        </span>
      ) : null}
      {control}
    </div>
  );
}
