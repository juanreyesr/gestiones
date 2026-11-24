"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiFormularioContext } from "@/components/evaluaciones/formulario-comun";
import { FORMULARIOS } from "@/components/evaluaciones/formularios";
import { CONSENTIMIENTO_TEST, RECURSOS_CRISIS, testPorId } from "@/lib/tests/catalogo";

type Info = {
  estado: "cargando" | "ok" | "completa" | "invalido" | "sin-sesion";
  instrumento?: string;
  consentimiento?: boolean;
  opciones?: Record<string, unknown>;
  borrador?: unknown;
};

export function AplicarTest({ id }: { id: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<Info>({ estado: "cargando" });
  const [acepto, setAcepto] = useState(false);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/tests/aplicacion/${id}`)
      .then(async (r) => ({ status: r.status, d: (await r.json()) as Info }))
      .then(({ status, d }) => {
        if (!vivo) return;
        if (status === 401) {
          setInfo({ estado: "sin-sesion" });
          router.replace(`/tests/cuenta?siguiente=${encodeURIComponent(`/tests/aplicar/${id}`)}`);
          return;
        }
        setInfo(d.estado ? d : { estado: "invalido" });
      })
      .catch(() => vivo && setInfo({ estado: "invalido" }));
    return () => {
      vivo = false;
    };
  }, [id, router]);

  const api = useMemo(() => ({ base: "/api/tests/aplicacion", alEnviar: () => router.push(`/tests/resultado/${id}`) }), [id, router]);
  const test = testPorId(info.instrumento);

  if (info.estado === "cargando" || info.estado === "sin-sesion") return <p className="py-10 text-center text-sm text-slate-500">Cargando…</p>;
  if (info.estado === "completa") {
    return (
      <div className="grid gap-3 py-8 text-center">
        <p className="text-base font-semibold text-slate-900">Este test ya fue respondido</p>
        <Link className="font-semibold text-emerald-700 underline" href={`/tests/resultado/${id}`}>
          Ver mi resultado
        </Link>
      </div>
    );
  }
  if (info.estado !== "ok" || !info.instrumento || !FORMULARIOS[info.instrumento]) {
    return <p className="py-10 text-center text-sm text-slate-600">Este test no está disponible. Revise «Mi cuenta».</p>;
  }

  if (!info.consentimiento) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold text-slate-900">Antes de comenzar · {test?.nombre}</h1>
        </div>
        <ul className="grid gap-2 text-sm leading-6 text-slate-700">
          {CONSENTIMIENTO_TEST.map((t) => (
            <li className="rounded-xl bg-slate-50 p-3" key={t}>
              {t}
            </li>
          ))}
        </ul>
        {test?.conSeguridad ? (
          <div className="grid gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Si necesita ayuda inmediata</p>
            <ul className="list-disc pl-5">
              {RECURSOS_CRISIS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
          <input checked={acepto} className="mt-1 h-4 w-4 accent-emerald-600" onChange={(e) => setAcepto(e.target.checked)} type="checkbox" />
          He leído y acepto. Entiendo que este test no es un diagnóstico clínico.
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={!acepto || firmando}
          onClick={async () => {
            setFirmando(true);
            const r = await fetch(`/api/tests/aplicacion/${id}/consentimiento`, { method: "POST" });
            setFirmando(false);
            if (r.ok) {
              setInfo((p) => ({ ...p, consentimiento: true }));
              window.scrollTo({ top: 0 });
            }
          }}
          type="button"
        >
          {firmando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Comenzar el test
        </button>
      </div>
    );
  }

  return (
    <ApiFormularioContext.Provider value={api}>
      {FORMULARIOS[info.instrumento]({ borrador: info.borrador ?? null, codigoCaso: "", opciones: info.opciones, token: id })}
    </ApiFormularioContext.Provider>
  );
}
