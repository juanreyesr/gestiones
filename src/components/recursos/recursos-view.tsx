"use client";

import { ClipboardList, History, Plus, Radio, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { deleteRecurso, fetchRecursos } from "@/lib/recursos/recursos";
import { TIPO_RECURSO_LABELS, type RecursoConConteo } from "@/lib/recursos/types";
import { ConfirmDialog } from "../confirm-dialog";
import { HistorialView } from "./historial-view";
import { PresentadorView } from "./presentador-view";
import { RecursoDetalle } from "./recurso-detalle";
import { RecursoForm } from "./recurso-form";
import { BTN_PRIMARY, CardBox, Chip, EmptyState, ErrorBanner } from "./ui";

type Pestana = "recursos" | "historial";
type Nivel =
  | { nivel: "lista" }
  | { nivel: "detalle"; recurso: RecursoConConteo }
  | { nivel: "presentador"; recurso: RecursoConConteo; sesionId: string; pin: string };

export function RecursosView() {
  const [pestana, setPestana] = useState<Pestana>("recursos");
  const [nav, setNav] = useState<Nivel>({ nivel: "lista" });
  const [recursos, setRecursos] = useState<RecursoConConteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [borrando, setBorrando] = useState<RecursoConConteo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchRecursos();
    setRecursos(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de recursos al montar el modulo
    void cargar();
  }, [cargar]);

  const handleBorrar = async () => {
    if (!borrando) return;
    const { error: deleteError } = await deleteRecurso(borrando.id);
    if (deleteError) {
      setError(deleteError);
      setBorrando(null);
      return;
    }
    setBorrando(null);
    await cargar();
  };

  if (nav.nivel === "presentador") {
    return (
      <PresentadorView
        onCerrar={() => {
          setNav({ nivel: "lista" });
          setPestana("historial");
        }}
        pin={nav.pin}
        recursoTitulo={nav.recurso.titulo}
        sesionId={nav.sesionId}
      />
    );
  }

  if (nav.nivel === "detalle") {
    return (
      <RecursoDetalle
        onLanzar={(sesionId, pin) => setNav({ nivel: "presentador", recurso: nav.recurso, sesionId, pin })}
        onVolver={() => setNav({ nivel: "lista" })}
        recurso={nav.recurso}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
        <Radio className="h-4 w-4" />
        Módulo Recursos
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
              pestana === "recursos" ? "border-emerald-300/70 bg-emerald-300/14 text-white" : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => setPestana("recursos")}
            type="button"
          >
            <ClipboardList className="h-4 w-4" />
            Mis recursos
          </button>
          <button
            className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
              pestana === "historial" ? "border-emerald-300/70 bg-emerald-300/14 text-white" : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => setPestana("historial")}
            type="button"
          >
            <History className="h-4 w-4" />
            Historial
          </button>
        </div>

        {pestana === "recursos" ? (
          <button className={BTN_PRIMARY} onClick={() => setFormAbierto(true)} type="button">
            <Plus className="h-4 w-4" />
            Nueva encuesta
          </button>
        ) : null}
      </div>

      {pestana === "historial" ? (
        <HistorialView />
      ) : (
        <div className="grid gap-4">
          <ErrorBanner message={error} />
          {loading ? (
            <p className="text-sm text-slate-400">Cargando recursos...</p>
          ) : recursos.length === 0 ? (
            <EmptyState>Aún no has creado ninguna encuesta. Usa &quot;Nueva encuesta&quot; para empezar.</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recursos.map((recurso) => (
                <CardBox key={recurso.id} onClick={() => setNav({ nivel: "detalle", recurso })}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Chip className="border-emerald-300/40 bg-emerald-300/10 text-emerald-200">
                        {TIPO_RECURSO_LABELS[recurso.tipo]}
                      </Chip>
                      <p className="mt-2 truncate text-base font-semibold text-white">{recurso.titulo}</p>
                      {recurso.descripcion ? <p className="mt-1 line-clamp-2 text-sm text-slate-400">{recurso.descripcion}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {recurso.preguntasCount} {recurso.preguntasCount === 1 ? "pregunta" : "preguntas"}
                      </p>
                    </div>
                    <button
                      className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-red-300 transition hover:border-red-400/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBorrando(recurso);
                      }}
                      title="Borrar"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardBox>
              ))}
            </div>
          )}
        </div>
      )}

      {formAbierto ? (
        <RecursoForm
          onClose={() => setFormAbierto(false)}
          onSaved={async (id) => {
            setFormAbierto(false);
            await cargar();
            const nuevo = (await fetchRecursos()).data.find((item) => item.id === id);
            if (nuevo) setNav({ nivel: "detalle", recurso: nuevo });
          }}
        />
      ) : null}

      <ConfirmDialog
        message={`¿Borrar "${borrando?.titulo ?? ""}" y todas sus preguntas, sesiones e historial? Esta acción no se puede deshacer.`}
        onCancel={() => setBorrando(null)}
        onConfirm={() => void handleBorrar()}
        open={Boolean(borrando)}
        title="Borrar encuesta"
      />
    </div>
  );
}
