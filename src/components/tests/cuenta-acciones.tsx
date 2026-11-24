"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS_TESTS, CONSENTIMIENTO_CONTACTO } from "@/lib/tests/catalogo";

export function BotonSalir() {
  const router = useRouter();
  return (
    <button
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      onClick={async () => {
        await fetch("/api/tests/salir", { method: "POST" });
        router.push("/tests");
        router.refresh();
      }}
      type="button"
    >
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </button>
  );
}

/** Permiso de contacto e intereses (se pueden cambiar en cualquier momento). */
export function PreferenciasContacto({ acepta, intereses }: { acepta: boolean; intereses: string[] }) {
  const [p, setP] = useState({ aceptaContacto: acepta, intereses });
  const [estado, setEstado] = useState("");
  const guardar = async (nuevo: typeof p) => {
    setP(nuevo);
    setEstado("Guardando…");
    const r = await fetch("/api/tests/preferencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nuevo) });
    setEstado(r.ok ? "Guardado" : "No se pudo guardar");
  };
  return (
    <div className="grid gap-2 text-sm text-slate-700">
      <label className="flex items-start gap-2">
        <input
          checked={p.aceptaContacto}
          className="mt-1 h-4 w-4 accent-emerald-600"
          onChange={(e) => void guardar({ ...p, aceptaContacto: e.target.checked })}
          type="checkbox"
        />
        <span>{CONSENTIMIENTO_CONTACTO}</span>
      </label>
      {p.aceptaContacto ? (
        <div className="flex flex-wrap gap-2">
          {AREAS_TESTS.map((a) => {
            const activo = p.intereses.includes(a.id);
            return (
              <button
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${activo ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600"}`}
                key={a.id}
                onClick={() => void guardar({ ...p, intereses: activo ? p.intereses.filter((x) => x !== a.id) : [...p.intereses, a.id] })}
                type="button"
              >
                {a.nombre}
              </button>
            );
          })}
        </div>
      ) : null}
      {estado ? <span className="text-xs text-slate-500">{estado}</span> : null}
    </div>
  );
}

/** Cambio de contraseña (pide la actual). */
export function CambiarContrasena() {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ actual: "", nueva: "" });
  const [estado, setEstado] = useState("");
  if (!abierto) {
    return (
      <button className="text-sm font-semibold text-emerald-700 hover:underline" onClick={() => setAbierto(true)} type="button">
        Cambiar mi contraseña
      </button>
    );
  }
  const campo = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  return (
    <form
      className="grid gap-2 sm:max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setEstado("Guardando…");
        const r = await fetch("/api/tests/contrasena", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        if (r.ok) {
          setEstado("Contraseña cambiada.");
          setF({ actual: "", nueva: "" });
        } else setEstado(d.error ?? "No se pudo cambiar.");
      }}
    >
      <input autoComplete="current-password" className={campo} onChange={(e) => setF({ ...f, actual: e.target.value })} placeholder="Contraseña actual" required type="password" value={f.actual} />
      <input autoComplete="new-password" className={campo} minLength={8} onChange={(e) => setF({ ...f, nueva: e.target.value })} placeholder="Nueva contraseña (8+ con letra y número)" required type="password" value={f.nueva} />
      <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700" type="submit">
        Guardar contraseña
      </button>
      {estado ? <span className="text-xs text-slate-600">{estado}</span> : null}
    </form>
  );
}
