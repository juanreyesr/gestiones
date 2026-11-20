"use client";

import { BookOpen, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { FichaClinicaModal } from "@/components/clinica/fichas-clinicas";
import { BIBLIOTECAS } from "@/lib/bibliotecas";
import { fetchBibliotecasCurso, setBibliotecaCurso } from "@/lib/cursos/bibliotecas";
import { BTN_GHOST } from "./ui";

/**
 * Bibliotecas JJR del curso: el docente activa las que sirven a este curso; los estudiantes
 * inscritos las ven en su Aula (pestaña «Biblioteca»), sin «Cómo lo detecta el sistema».
 */
export function CursoBibliotecasTab({ cursoId }: { cursoId: string }) {
  const [activas, setActivas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [vista, setVista] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void fetchBibliotecasCurso(cursoId).then((r) => {
      if (!vivo) return;
      setActivas(r.ids);
      setError(r.error ?? "");
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [cursoId]);

  const cambiar = async (id: string, activa: boolean) => {
    setGuardando(id);
    setError("");
    const r = await setBibliotecaCurso(cursoId, id, activa);
    setGuardando(null);
    if (r.error) {
      setError(r.error);
      return;
    }
    setActivas((prev) => (activa ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  return (
    <div className="grid gap-4" data-testid="curso-bibliotecas">
      <p className="text-sm leading-6 text-slate-300">
        Active las bibliotecas que sirven a este curso. Los estudiantes inscritos las verán en su Aula, en la sección «Biblioteca», con un caso para
        analizar y una clave para recordar en cada ficha (sin la parte de cómo lo detecta su sistema). Si ninguna está activa, no ven nada.
      </p>
      {error ? <div className="border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</div> : null}
      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}
      {!cargando
        ? BIBLIOTECAS.map((b) => {
            const activa = activas.includes(b.id);
            return (
              <div className="grid gap-3 border border-white/10 bg-white/5 p-4" data-biblioteca={b.id} key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-base font-semibold text-white">
                      <BookOpen className="h-4 w-4 text-sky-300" /> {b.titulo}
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      {b.descripcion} · {b.fichas.length} fichas
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-200">
                    <input
                      checked={activa}
                      className="h-4 w-4 accent-emerald-400"
                      data-testid={`activar-biblioteca-${b.id}`}
                      disabled={guardando === b.id || Boolean(error && !activas.length && /migración 067/.test(error))}
                      onChange={(e) => void cambiar(b.id, e.target.checked)}
                      type="checkbox"
                    />
                    {guardando === b.id ? "Guardando…" : activa ? "Activa en este curso" : "Inactiva"}
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {b.fichas.map((f) => (
                    <button className={BTN_GHOST} key={f.id} onClick={() => setVista(f.id)} title="Ver como la verá el estudiante" type="button">
                      <Eye className="h-3.5 w-3.5" /> {f.nombre}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        : null}
      {vista ? <FichaClinicaModal conAcciones={false} fichaId={vista} onCerrar={() => setVista(null)} vista="estudiante" /> : null}
    </div>
  );
}
