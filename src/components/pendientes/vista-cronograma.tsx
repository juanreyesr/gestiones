"use client";

import { fechaISO, formatoLargo, parseFecha } from "@/lib/fechas";
import { estadoInfo, type GrupoRow, type ItemRow } from "@/lib/pendientes/types";
import { EmptyState } from "@/components/ui-comun";
import type { AccionesTablero } from "./tipos";

const ANCHO_DIA = 26;

/**
 * Cronograma (la vista de linea de tiempo de Monday). Cada pendiente con
 * fechas dibuja una barra del inicio al limite; los que solo tienen una fecha
 * se dibujan como un bloque de un dia. Es solo lectura por diseno: mover
 * barras con el raton en pantallas pequenas es fragil, y la fecha ya se edita
 * en la tabla y en el calendario.
 */
export function VistaCronograma({
  acciones,
  grupos,
  items,
}: {
  acciones: AccionesTablero;
  grupos: GrupoRow[];
  items: ItemRow[];
}) {
  const conFechas = items.filter((item) => item.fecha_inicio || item.fecha_limite);
  const sinFechas = items.filter((item) => !item.fecha_inicio && !item.fecha_limite);

  if (!conFechas.length) {
    return <EmptyState>Ningún pendiente tiene fechas todavía. Asigna una fecha límite para verlo aquí.</EmptyState>;
  }

  const fechas = conFechas.flatMap((item) =>
    [item.fecha_inicio, item.fecha_limite].filter(Boolean).map((valor) => parseFecha(valor as string) as Date),
  );
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const minimo = new Date(Math.min(...fechas.map((fecha) => fecha.getTime()), hoy.getTime()));
  const maximo = new Date(Math.max(...fechas.map((fecha) => fecha.getTime()), hoy.getTime()));
  minimo.setDate(minimo.getDate() - 2);
  maximo.setDate(maximo.getDate() + 2);

  const totalDias = Math.round((maximo.getTime() - minimo.getTime()) / 86_400_000) + 1;
  const dias = Array.from({ length: totalDias }, (_, indice) => {
    const dia = new Date(minimo);
    dia.setDate(minimo.getDate() + indice);
    return dia;
  });

  const indiceDe = (fecha: Date) => Math.round((fecha.getTime() - minimo.getTime()) / 86_400_000);

  // Cabecera de meses: un bloque por mes con el ancho de sus dias visibles.
  const meses: Array<{ etiqueta: string; dias: number }> = [];
  for (const dia of dias) {
    const etiqueta = new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(dia);
    const ultimo = meses[meses.length - 1];
    if (ultimo && ultimo.etiqueta === etiqueta) ultimo.dias += 1;
    else meses.push({ etiqueta, dias: 1 });
  }

  const nombreGrupo = (grupoId: string) => grupos.find((grupo) => grupo.id === grupoId)?.nombre ?? "";

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 240 + totalDias * ANCHO_DIA }}>
          <div className="flex">
            <div className="w-60 shrink-0" />
            <div className="flex">
              {meses.map((mes) => (
                <div
                  className="border-l border-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"
                  key={mes.etiqueta}
                  style={{ width: mes.dias * ANCHO_DIA }}
                >
                  <span className="truncate">{mes.etiqueta}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex border-b border-white/10">
            <div className="w-60 shrink-0 px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Pendiente
            </div>
            <div className="flex">
              {dias.map((dia) => {
                const finDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
                return (
                  <div
                    className={`text-center text-[10px] font-semibold ${
                      finDeSemana ? "bg-white/5 text-slate-600" : "text-slate-500"
                    }`}
                    key={fechaISO(dia)}
                    style={{ width: ANCHO_DIA }}
                  >
                    {dia.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {conFechas.map((item) => {
            const inicio = parseFecha(item.fecha_inicio) ?? (parseFecha(item.fecha_limite) as Date);
            const fin = parseFecha(item.fecha_limite) ?? inicio;
            const desde = Math.min(indiceDe(inicio), indiceDe(fin));
            const hasta = Math.max(indiceDe(inicio), indiceDe(fin));
            const info = estadoInfo(item.estado);

            return (
              <div className="flex items-center border-b border-white/5 hover:bg-white/4" key={item.id}>
                <button
                  className="w-60 shrink-0 truncate px-2 py-1.5 text-left text-sm text-slate-200 transition hover:text-emerald-200"
                  onClick={() => acciones.abrirItem(item.id)}
                  title={`${item.titulo}${nombreGrupo(item.grupo_id) ? ` · ${nombreGrupo(item.grupo_id)}` : ""}`}
                  type="button"
                >
                  {item.titulo}
                </button>

                <div className="relative flex h-8 items-center" style={{ width: totalDias * ANCHO_DIA }}>
                  <div className="absolute inset-0 flex">
                    {dias.map((dia) => (
                      <div
                        className={`h-full border-l border-white/5 ${
                          fechaISO(dia) === fechaISO(hoy) ? "bg-emerald-300/12" : ""
                        }`}
                        key={fechaISO(dia)}
                        style={{ width: ANCHO_DIA }}
                      />
                    ))}
                  </div>

                  <button
                    className="absolute flex h-5 items-center overflow-hidden px-2 text-[10px] font-bold text-slate-950 transition hover:brightness-110"
                    onClick={() => acciones.abrirItem(item.id)}
                    style={{
                      backgroundColor: info.color,
                      color: info.texto,
                      left: desde * ANCHO_DIA + 2,
                      width: Math.max((hasta - desde + 1) * ANCHO_DIA - 4, 18),
                    }}
                    title={`${item.titulo} · ${info.label}${
                      item.fecha_limite ? ` · vence ${formatoLargo(item.fecha_limite)}` : ""
                    }`}
                    type="button"
                  >
                    <span className="truncate">{item.responsable ?? item.titulo}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sinFechas.length ? (
        <p className="text-xs text-slate-500">
          {sinFechas.length} {sinFechas.length === 1 ? "pendiente sin fechas" : "pendientes sin fechas"} — no aparecen
          en el cronograma.
        </p>
      ) : null}
    </div>
  );
}
