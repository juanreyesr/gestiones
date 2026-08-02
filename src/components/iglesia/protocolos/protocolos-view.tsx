"use client";

import {
  Check,
  ChevronLeft,
  ClipboardList,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT } from "@/components/ui-comun";
import { fechaHoraLegible } from "@/lib/fechas";
import { limpiarHtml, resumenDeHtml } from "@/lib/iglesia/html-seguro";
import {
  deleteProtocolo,
  duplicarProtocolo,
  fetchProtocolos,
  insertProtocolo,
  updateProtocolo,
  type ProtocoloRow,
} from "@/lib/iglesia/protocolos";
import { EditorRico } from "./editor-rico";
import { ProtocoloLectura } from "./protocolo-lectura";

type Vista = { modo: "lista" } | { modo: "ver"; id: string } | { modo: "editar"; id: string };

/**
 * Protocolos para actividades: el paso a paso de cada actividad del ministerio.
 * La portada lista los creados, se abre uno para leerlo (con zoom y pantalla
 * completa) y desde ahi se edita.
 */
export function ProtocolosView() {
  const [protocolos, setProtocolos] = useState<ProtocoloRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<Vista>({ modo: "lista" });
  const [aEliminar, setAEliminar] = useState<ProtocoloRow | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: fetchError } = await fetchProtocolos();
    setProtocolos(data);
    setError(fetchError ?? "");
    setCargando(false);
    return data;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de los protocolos
    void cargar();
  }, [cargar]);

  const activo = vista.modo === "lista" ? null : (protocolos.find((fila) => fila.id === vista.id) ?? null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return protocolos;
    return protocolos.filter(
      (protocolo) =>
        protocolo.titulo.toLowerCase().includes(texto) ||
        (protocolo.contenido ?? "").toLowerCase().includes(texto),
    );
  }, [busqueda, protocolos]);

  const crear = async () => {
    const { data, error: insertError } = await insertProtocolo({ titulo: "Protocolo sin título" });
    if (insertError || !data) {
      setError(insertError ?? "No se pudo crear el protocolo.");
      return;
    }
    setProtocolos((previos) => [...previos, data]);
    setVista({ modo: "editar", id: data.id });
  };

  // ----------------------------------------------------------------
  // Detalle: lectura y edicion
  // ----------------------------------------------------------------

  if (activo) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={BTN_GHOST}
            onClick={async () => {
              setVista({ modo: "lista" });
              await cargar();
            }}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
            Protocolos
          </button>

          <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-white">{activo.titulo}</h3>

          {vista.modo === "ver" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button className={BTN_PRIMARY} onClick={() => setVista({ modo: "editar", id: activo.id })} type="button">
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                className={BTN_GHOST}
                onClick={async () => {
                  const { data, error: dupError } = await duplicarProtocolo(activo);
                  if (dupError || !data) {
                    setError(dupError ?? "No se pudo duplicar.");
                    return;
                  }
                  await cargar();
                  setVista({ modo: "editar", id: data.id });
                }}
                title="Duplicar este protocolo"
                type="button"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                className="inline-flex items-center gap-2 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-300"
                onClick={() => setAEliminar(activo)}
                title="Eliminar este protocolo"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <ErrorBanner message={error} />

        {vista.modo === "ver" ? (
          <ProtocoloLectura protocolo={activo} />
        ) : (
          <EditorProtocolo
            onListo={async () => {
              await cargar();
              setVista({ modo: "ver", id: activo.id });
            }}
            onProtocoloActualizado={(cambios) =>
              setProtocolos((previos) =>
                previos.map((fila) => (fila.id === activo.id ? { ...fila, ...cambios } : fila)),
              )
            }
            protocolo={activo}
          />
        )}

        <ConfirmDialog
          message={`Se eliminará el protocolo "${aEliminar?.titulo ?? ""}" y su contenido.`}
          onCancel={() => setAEliminar(null)}
          onConfirm={async () => {
            if (!aEliminar) return;
            const { error: deleteError } = await deleteProtocolo(aEliminar.id);
            setAEliminar(null);
            if (deleteError) {
              setError(deleteError);
              return;
            }
            setVista({ modo: "lista" });
            await cargar();
          }}
          open={Boolean(aEliminar)}
          title="Eliminar protocolo"
        />
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Portada: los protocolos ya creados
  // ----------------------------------------------------------------

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <ClipboardList className="h-5 w-5 text-emerald-200" />
          Protocolos para actividades
        </h3>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {protocolos.length > 4 ? (
            <div className="flex items-center gap-1.5 border border-white/10 bg-white/8 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                className="w-36 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:w-48"
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar"
                value={busqueda}
              />
              {busqueda ? (
                <button className="text-slate-500 hover:text-white" onClick={() => setBusqueda("")} type="button">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          <button className={BTN_PRIMARY} onClick={() => void crear()} type="button">
            <Plus className="h-4 w-4" />
            Crear nuevo
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        El paso a paso de cada actividad. Toca uno para leerlo; adentro puedes agrandar el texto y abrirlo a pantalla
        completa, que se cierra con la X de la esquina.
      </p>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando protocolos...</p>
      ) : filtrados.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((protocolo) => (
            <button
              className="group border border-white/10 bg-white/8 p-4 text-left backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
              key={protocolo.id}
              onClick={() => setVista({ modo: "ver", id: protocolo.id })}
              type="button"
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center bg-emerald-300/15">
                <ClipboardList className="h-4 w-4 text-emerald-200" />
              </span>
              <h4 className="text-base font-semibold text-white">{protocolo.titulo}</h4>
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-400">
                {resumenDeHtml(protocolo.contenido ?? "") || "Sin contenido todavía."}
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Actualizado {fechaHoraLegible(protocolo.updated_at)}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState>
          <ClipboardList className="mx-auto mb-2 h-6 w-6 text-slate-500" />
          {busqueda
            ? "Ningún protocolo coincide con la búsqueda."
            : "Todavía no hay protocolos. Crea el primero con el botón de arriba."}
        </EmptyState>
      )}
    </div>
  );
}

/** Edicion de un protocolo: titulo y contenido, guardando solo. */
function EditorProtocolo({
  onListo,
  onProtocoloActualizado,
  protocolo,
}: {
  onListo: () => void | Promise<void>;
  onProtocoloActualizado: (cambios: Partial<ProtocoloRow>) => void;
  protocolo: ProtocoloRow;
}) {
  const [titulo, setTitulo] = useState(protocolo.titulo);
  const [contenido, setContenido] = useState(protocolo.contenido ?? "");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  // El contenido inicial se congela: el editor es no controlado y volver a
  // pasarle el HTML en cada tecleo movería el cursor al principio.
  const [contenidoInicial] = useState(protocolo.contenido ?? "");

  useEffect(() => {
    const limpio = titulo.trim();
    if ((limpio || "Protocolo sin título") === protocolo.titulo && contenido === (protocolo.contenido ?? "")) return;

    const temporizador = setTimeout(async () => {
      const { error: updateError } = await updateProtocolo(protocolo.id, {
        titulo: limpio || "Protocolo sin título",
        contenido: limpiarHtml(contenido) || null,
      });
      setGuardando(false);
      if (updateError) {
        setError(updateError);
        return;
      }
      onProtocoloActualizado({ titulo: limpio || "Protocolo sin título", contenido });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    }, 800);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onProtocoloActualizado cambia en cada render del padre
  }, [contenido, protocolo.contenido, protocolo.id, protocolo.titulo, titulo]);

  return (
    <div className="grid gap-4">
      <ErrorBanner message={error} />

      <Field label="Título (es el que se ve en la lista)">
        <input
          className={INPUT}
          onChange={(evento) => {
            setTitulo(evento.target.value);
            setGuardando(true);
          }}
          placeholder="Ej. Protocolo de la santa cena"
          value={titulo}
        />
      </Field>

      <Field label="Protocolo">
        <EditorRico
          contenidoInicial={contenidoInicial}
          onChange={(html) => {
            setContenido(html);
            setGuardando(true);
          }}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          {guardando ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              <span className="text-slate-400">Guardando...</span>
            </>
          ) : guardado ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-emerald-300">Guardado</span>
            </>
          ) : (
            <span className="text-slate-600">Se guarda solo mientras escribes</span>
          )}
        </span>

        <button className={`${BTN_PRIMARY} ml-auto`} onClick={() => void onListo()} type="button">
          <Check className="h-4 w-4" />
          Listo
        </button>
      </div>
    </div>
  );
}
