"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS_TESTS, CONSENTIMIENTO_CONTACTO, CONSENTIMIENTO_DATOS, EDAD_MINIMA } from "@/lib/tests/catalogo";

const campo = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none";
const etiqueta = "grid gap-1 text-sm font-medium text-slate-700";

/** Registro e inicio de sesión de la plataforma de tests. */
export function AccesoTests({ siguiente }: { siguiente: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"registro" | "ingreso">("registro");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    fechaNacimiento: "",
    pais: "Guatemala",
    telefono: "",
    genero: "",
    ocupacion: "",
    consentimiento: false,
    aceptaContacto: false,
    intereses: [] as string[],
  });
  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (modo === "registro" && !f.consentimiento) return setError("Para crear su cuenta debe aceptar el uso de sus datos.");
    setEnviando(true);
    const r = await fetch(modo === "registro" ? "/api/tests/registro" : "/api/tests/ingreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modo === "registro" ? f : { correo: f.correo, contrasena: f.contrasena }),
    }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    if (r?.ok && d?.ok) {
      router.push(siguiente);
      router.refresh();
      return;
    }
    setEnviando(false);
    setError(d?.error ?? "No se pudo completar. Revise su conexión e intente de nuevo.");
  };

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {(["registro", "ingreso"] as const).map((m) => (
          <button
            className={`rounded-lg py-2 ${modo === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            key={m}
            onClick={() => {
              setModo(m);
              setError("");
            }}
            type="button"
          >
            {m === "registro" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        ))}
      </div>

      <form className="grid gap-3" onSubmit={enviar}>
        {modo === "registro" ? (
          <label className={etiqueta}>
            Nombre completo
            <input autoComplete="name" className={campo} maxLength={160} onChange={(e) => set("nombre", e.target.value)} required value={f.nombre} />
          </label>
        ) : null}
        <label className={etiqueta}>
          Correo electrónico
          <input autoComplete="email" className={campo} maxLength={200} onChange={(e) => set("correo", e.target.value)} required type="email" value={f.correo} />
        </label>
        <label className={etiqueta}>
          Contraseña
          <input
            autoComplete={modo === "registro" ? "new-password" : "current-password"}
            className={campo}
            maxLength={200}
            minLength={modo === "registro" ? 8 : undefined}
            onChange={(e) => set("contrasena", e.target.value)}
            required
            type="password"
            value={f.contrasena}
          />
          {modo === "registro" ? <span className="text-xs font-normal text-slate-500">Mínimo 8 caracteres, con al menos una letra y un número.</span> : null}
        </label>

        {modo === "registro" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={etiqueta}>
                Fecha de nacimiento
                <input className={campo} onChange={(e) => set("fechaNacimiento", e.target.value)} required type="date" value={f.fechaNacimiento} />
              </label>
              <label className={etiqueta}>
                País
                <input autoComplete="country-name" className={campo} maxLength={60} onChange={(e) => set("pais", e.target.value)} value={f.pais} />
              </label>
              <label className={etiqueta}>
                Teléfono (opcional)
                <input autoComplete="tel" className={campo} maxLength={40} onChange={(e) => set("telefono", e.target.value)} value={f.telefono} />
              </label>
              <label className={etiqueta}>
                Género (opcional)
                <select className={campo} onChange={(e) => set("genero", e.target.value)} value={f.genero}>
                  <option value="">Prefiero no decir</option>
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>Otro</option>
                </select>
              </label>
            </div>
            <label className={etiqueta}>
              Ocupación (opcional)
              <input className={campo} maxLength={120} onChange={(e) => set("ocupacion", e.target.value)} placeholder="Estudiante, contador, docente…" value={f.ocupacion} />
            </label>
            <p className="text-xs text-slate-500">Los tests son para personas de {EDAD_MINIMA} años o más.</p>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              <input checked={f.consentimiento} className="mt-1.5 h-4 w-4 accent-emerald-600" onChange={(e) => set("consentimiento", e.target.checked)} type="checkbox" />
              <span>
                {CONSENTIMIENTO_DATOS.join(" ")}{" "}
                <Link className="font-semibold text-emerald-700 underline" href="/tests/privacidad" target="_blank">
                  Leer aviso de privacidad
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm leading-6 text-slate-700">
              <input checked={f.aceptaContacto} className="mt-1.5 h-4 w-4 accent-emerald-600" onChange={(e) => set("aceptaContacto", e.target.checked)} type="checkbox" />
              <span>
                <span className="font-medium">Opcional:</span> {CONSENTIMIENTO_CONTACTO}
              </span>
            </label>
            {f.aceptaContacto ? (
              <div className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-medium">¿Qué temas le interesan?</span>
                <div className="flex flex-wrap gap-2">
                  {AREAS_TESTS.map((a) => {
                    const activo = f.intereses.includes(a.id);
                    return (
                      <button
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${activo ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600"}`}
                        key={a.id}
                        onClick={() => set("intereses", activo ? f.intereses.filter((x) => x !== a.id) : [...f.intereses, a.id])}
                        type="button"
                      >
                        {a.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={enviando}
          type="submit"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {modo === "registro" ? "Crear mi cuenta" : "Entrar"}
        </button>
        {modo === "ingreso" ? (
          <p className="text-xs leading-5 text-slate-500">
            ¿Olvidó su contraseña? Escríbanos desde{" "}
            <Link className="underline" href="/agendar">
              el sitio
            </Link>{" "}
            y le ayudamos a recuperarla.
          </p>
        ) : null}
      </form>
    </div>
  );
}
