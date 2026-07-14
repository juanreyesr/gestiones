"use client";

import { ChevronRight, GraduationCap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchUniversidades } from "@/lib/cursos/universidades";
import type { CursoImpartidoRow, SemanaRow, UniversidadRow } from "@/lib/cursos/types";
import { CursoDetalle } from "./curso-detalle";
import { SemanaDetalle } from "./semana-detalle";
import { UniversidadDetalle } from "./universidad-detalle";
import { UniversidadesGrid } from "./universidades-grid";

type EstadoNavegacion =
  | { nivel: "universidades" }
  | { nivel: "universidad"; universidad: UniversidadRow }
  | { nivel: "curso"; universidad: UniversidadRow; curso: CursoImpartidoRow }
  | { nivel: "semana"; universidad: UniversidadRow; curso: CursoImpartidoRow; semana: SemanaRow };

export function CursosView() {
  const [universidades, setUniversidades] = useState<UniversidadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nav, setNav] = useState<EstadoNavegacion>({ nivel: "universidades" });

  const cargarUniversidades = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchUniversidades();
    setUniversidades(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de universidades al montar el modulo
    void cargarUniversidades();
  }, [cargarUniversidades]);

  const breadcrumbItems: Array<{ label: string; onClick: () => void }> = [
    { label: "Universidades", onClick: () => setNav({ nivel: "universidades" }) },
  ];
  if (nav.nivel === "universidad" || nav.nivel === "curso" || nav.nivel === "semana") {
    breadcrumbItems.push({
      label: nav.universidad.siglas || nav.universidad.nombre,
      onClick: () => setNav({ nivel: "universidad", universidad: nav.universidad }),
    });
  }
  if (nav.nivel === "curso" || nav.nivel === "semana") {
    breadcrumbItems.push({
      label: nav.curso.nombre,
      onClick: () => setNav({ nivel: "curso", universidad: nav.universidad, curso: nav.curso }),
    });
  }
  if (nav.nivel === "semana") {
    breadcrumbItems.push({
      label: `Semana ${nav.semana.numero}`,
      onClick: () => setNav(nav),
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
        <GraduationCap className="h-4 w-4" />
        Módulo Cursos
      </div>

      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        {breadcrumbItems.map((item, index) => (
          <span className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : null}
            <button
              className={`font-semibold transition ${
                index === breadcrumbItems.length - 1 ? "text-white" : "text-slate-400 hover:text-emerald-200"
              }`}
              disabled={index === breadcrumbItems.length - 1}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          </span>
        ))}
      </nav>

      {error ? <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}

      {nav.nivel === "universidades" ? (
        <UniversidadesGrid
          loading={loading}
          onOpen={(universidad) => setNav({ nivel: "universidad", universidad })}
          onRefresh={cargarUniversidades}
          universidades={universidades}
        />
      ) : null}

      {nav.nivel === "universidad" ? (
        <UniversidadDetalle
          onOpenCurso={(curso) => setNav({ nivel: "curso", universidad: nav.universidad, curso })}
          onUniversidadesChanged={cargarUniversidades}
          universidad={nav.universidad}
        />
      ) : null}

      {nav.nivel === "curso" ? (
        <CursoDetalle
          curso={nav.curso}
          onOpenSemana={(semana) => setNav({ nivel: "semana", universidad: nav.universidad, curso: nav.curso, semana })}
          onVolver={() => setNav({ nivel: "universidad", universidad: nav.universidad })}
          universidad={nav.universidad}
        />
      ) : null}

      {nav.nivel === "semana" ? (
        <SemanaDetalle
          curso={nav.curso}
          onVolver={() => setNav({ nivel: "curso", universidad: nav.universidad, curso: nav.curso })}
          semana={nav.semana}
        />
      ) : null}
    </div>
  );
}
