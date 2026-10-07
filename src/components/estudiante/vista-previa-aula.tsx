"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMiPerfil, fetchMisCursos, type MiCurso, type MiPerfil } from "@/lib/estudiante/estudiante-client";
import { activarVistaPrevia } from "@/lib/estudiante/vista-previa";
import { getSupabaseClient } from "@/lib/supabase";
import { IdiomaProvider } from "./idioma-context";
import { PanelEstudiante } from "./panel-estudiante";

const OWNER_EMAIL = "lic.juanreyesr@gmail.com";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "error"; texto: string }
  | { tipo: "listo"; perfil: MiPerfil; cursos: MiCurso[] };

/**
 * "Ver como estudiante" en pantalla completa: el Aula virtual real (encabezado,
 * menus, notificaciones, chat, perfil, semanas y tareas) con los datos de un
 * curso, leidos con la sesion del owner. Nada se guarda: las acciones que
 * escriben avisan que es una vista previa (src/lib/estudiante/vista-previa.ts).
 */
export function VistaPreviaAula({ cursoId }: { cursoId: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    let vigente = true;
    (async () => {
      const supabase = getSupabaseClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (data.session?.user.email !== OWNER_EMAIL) {
        if (vigente) setEstado({ tipo: "error", texto: "Abre la vista previa desde GestionesJJ con tu sesión iniciada." });
        return;
      }
      if (!/^[0-9a-f-]{36}$/i.test(cursoId)) {
        if (vigente) setEstado({ tipo: "error", texto: "Falta el curso de la vista previa." });
        return;
      }
      activarVistaPrevia(cursoId);
      const [{ data: perfil }, { data: cursos }] = await Promise.all([fetchMiPerfil(), fetchMisCursos()]);
      if (!vigente) return;
      if (!perfil || !cursos.length) {
        setEstado({ tipo: "error", texto: "No se encontró el curso." });
        return;
      }
      setEstado({ tipo: "listo", perfil, cursos });
    })();
    return () => {
      vigente = false;
    };
  }, [cursoId]);

  return (
    <IdiomaProvider>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-slate-900 px-4 py-2 text-white sm:px-10">
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <Eye className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="truncate sm:hidden">Vista previa del estudiante · no se guarda nada</span>
          <span className="hidden truncate sm:inline">
            Vista previa · así ve el Aula un estudiante
            {estado.tipo === "listo" ? ` de ${estado.cursos[0].cursoNombre}` : ""} · nada de lo que hagas aquí se guarda
          </span>
        </span>
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
          onClick={() => window.close()}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
          Cerrar
        </button>
      </div>
      {estado.tipo === "cargando" ? (
        <p className="p-10 text-center text-sm text-slate-500">Cargando vista previa…</p>
      ) : estado.tipo === "error" ? (
        <p className="p-10 text-center text-sm text-slate-500">{estado.texto}</p>
      ) : (
        <PanelEstudiante cursos={estado.cursos} onCambioContrasena={() => undefined} perfil={estado.perfil} />
      )}
    </IdiomaProvider>
  );
}
