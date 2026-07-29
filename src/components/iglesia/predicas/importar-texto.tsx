"use client";

import { ClipboardPaste, TriangleAlert, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner, INPUT, Modal } from "@/components/ui-comun";
import { leerTextoDelMes, type FilaImportada } from "@/lib/iglesia/predicas-importar";
import { insertPredicador } from "@/lib/iglesia/predicas";
import {
  HORARIO_LABEL,
  mesLabel,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PredicadorRow,
} from "@/lib/iglesia/types";

const EJEMPLO = `Tema del mes: Protejamos a nuestra familia

Domingo 5
Juan Reyes Urízar
Luis Velásquez
Deylyd Reyes

Martes 7
Dulce Orozco
Manolo Montufar`;

/**
 * Pega el texto que se comparte cada mes y arma el calendario. Antes de tocar
 * nada muestra que entendio: dia, horario, a quien reconocio del catalogo y a
 * quien no. Los desconocidos se pueden crear en el momento.
 */
export function ImportarTexto({
  asignaciones,
  mes,
  onAplicar,
  onCerrar,
  onPredicadoresCambiados,
  predicadores,
}: {
  asignaciones: AsignacionPredicaRow[];
  mes: MesPredicasRow;
  onAplicar: (cambios: {
    tema: string | null;
    asignaciones: Array<{ id: string; predicador_id?: string | null; cierre_predicador_id?: string | null }>;
  }) => Promise<void>;
  onCerrar: () => void;
  onPredicadoresCambiados: () => Promise<void>;
  predicadores: PredicadorRow[];
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const lectura = useMemo(() => leerTextoDelMes(texto, predicadores), [predicadores, texto]);

  // Cada fila leida se ancla a la celebracion real del mes por dia y horario.
  const conDestino = useMemo(
    () =>
      lectura.filas.map((fila) => {
        const asignacion = asignaciones.find(
          (candidata) => Number(candidata.fecha.slice(8, 10)) === fila.dia && candidata.horario === fila.horario,
        );
        return { fila, asignacion: asignacion ?? null };
      }),
    [asignaciones, lectura.filas],
  );

  const sinDestino = conDestino.filter((entrada) => !entrada.asignacion);
  const desconocidos = useMemo(() => {
    const nombres = new Map<string, FilaImportada>();
    for (const { fila } of conDestino) {
      if (!fila.predicadorId) nombres.set(fila.nombre.toLowerCase(), fila);
    }
    return [...nombres.values()];
  }, [conDestino]);

  const aplicar = async () => {
    setTrabajando(true);
    const cambios = conDestino
      .filter((entrada) => entrada.asignacion && entrada.fila.predicadorId)
      .map((entrada) => ({
        id: entrada.asignacion!.id,
        ...(entrada.fila.rol === "predica"
          ? { predicador_id: entrada.fila.predicadorId }
          : { cierre_predicador_id: entrada.fila.predicadorId, cierre_texto: null }),
      }));

    await onAplicar({ tema: lectura.tema, asignaciones: cambios });
    setTrabajando(false);
    onCerrar();
  };

  const crearFaltantes = async () => {
    setTrabajando(true);
    for (const fila of desconocidos) {
      const { error: insertError } = await insertPredicador({ nombre: fila.nombre });
      if (insertError && !insertError.includes("Ya existe")) {
        setError(insertError);
        setTrabajando(false);
        return;
      }
    }
    await onPredicadoresCambiados();
    setTrabajando(false);
  };

  return (
    <Modal ancho="max-w-3xl" onClose={onCerrar} titulo={`Importar ${mesLabel(mes.mes)} ${mes.anio} desde texto`}>
      <div className="grid gap-4">
        <ErrorBanner message={error} />

        <p className="text-sm text-slate-400">
          Pega la lista tal como la compartes. Se entienden las líneas <strong>Domingo N</strong> (tres predicadores:
          7:30, 9:30 y 11:30) y <strong>Martes N</strong> (el primero predica y el segundo cierra), más la línea{" "}
          <strong>Tema del mes:</strong>.
        </p>

        <textarea
          autoFocus
          className={`${INPUT} min-h-[180px] font-mono text-xs`}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={EJEMPLO}
          value={texto}
        />

        {texto.trim() ? (
          <div className="grid gap-3">
            {lectura.tema ? (
              <p className="text-sm text-slate-200">
                <span className="text-slate-500">Tema detectado:</span> <strong>{lectura.tema}</strong>
              </p>
            ) : null}

            <div className="max-h-64 overflow-y-auto border border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Día</th>
                    <th className="px-2 py-1.5 text-left">Horario</th>
                    <th className="px-2 py-1.5 text-left">Función</th>
                    <th className="px-2 py-1.5 text-left">Nombre leído</th>
                    <th className="px-2 py-1.5 text-left">Se asignará a</th>
                  </tr>
                </thead>
                <tbody>
                  {conDestino.map(({ asignacion, fila }, indice) => {
                    const encontrado = predicadores.find((predicador) => predicador.id === fila.predicadorId);
                    return (
                      <tr className="border-t border-white/8" key={`${fila.dia}-${fila.horario}-${fila.rol}-${indice}`}>
                        <td className="px-2 py-1.5 text-slate-300">{fila.dia}</td>
                        <td className="px-2 py-1.5 text-slate-300">{HORARIO_LABEL[fila.horario]}</td>
                        <td className="px-2 py-1.5 text-slate-400">{fila.rol === "predica" ? "Predica" : "Cierre"}</td>
                        <td className="px-2 py-1.5 text-slate-200">{fila.nombre}</td>
                        <td className="px-2 py-1.5">
                          {!asignacion ? (
                            <span className="text-red-300">no hay celebración ese día</span>
                          ) : encontrado ? (
                            <span className="text-emerald-300">{encontrado.nombre}</span>
                          ) : (
                            <span className="text-amber-300">no está en el catálogo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {sinDestino.length ? (
              <p className="flex items-start gap-2 border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {sinDestino.length} línea(s) apuntan a un día que no tiene esa celebración en {mesLabel(mes.mes)}{" "}
                {mes.anio}. Revisa que el mes sea el correcto.
              </p>
            ) : null}

            {lectura.ignoradas.length ? (
              <p className="text-xs text-slate-500">
                Se ignoraron {lectura.ignoradas.length} línea(s) que no correspondían a un nombre:{" "}
                {lectura.ignoradas.slice(0, 3).join(" · ")}
                {lectura.ignoradas.length > 3 ? "…" : ""}
              </p>
            ) : null}

            {desconocidos.length ? (
              <div className="flex flex-wrap items-center gap-2 border border-amber-400/30 bg-amber-400/10 p-2">
                <span className="text-xs text-amber-100">
                  {desconocidos.length} nombre(s) no están en el catálogo: {desconocidos.map((f) => f.nombre).join(", ")}
                </span>
                <button className={`${BTN_GHOST} ml-auto`} disabled={trabajando} onClick={() => void crearFaltantes()} type="button">
                  <UserPlus className="h-4 w-4" />
                  Agregarlos al catálogo
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button
            className={BTN_PRIMARY}
            disabled={trabajando || !conDestino.some((entrada) => entrada.asignacion && entrada.fila.predicadorId)}
            onClick={() => void aplicar()}
            type="button"
          >
            <ClipboardPaste className="h-4 w-4" />
            {trabajando ? "Aplicando..." : "Aplicar al calendario"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
