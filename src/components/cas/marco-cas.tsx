import { Roboto } from "next/font/google";

// Identidad visual de UPANA (www.upana.edu.gt): azul #00247B, verde #9FD140, Roboto.
// Compartido por las páginas públicas del CAS: /cas/registro y /cas/mis-datos.
export const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const AZUL = "#00247B";
export const VERDE = "#9FD140";
export const CAMPO =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-[#00247B] focus:ring-2 focus:ring-[#00247B]/15 sm:text-sm";
export const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Encabezado institucional (logo, CAS · Campus Chimaltenango) y pie de página. */
export function MarcoCas({ children, titulo }: { children: React.ReactNode; titulo: string }) {
  return (
    <main className={`${roboto.className} min-h-screen bg-slate-100 text-slate-800`}>
      <header style={{ backgroundColor: AZUL }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático en /public */}
          <img alt="Universidad Panamericana" className="h-12 w-auto sm:h-14" src="/cas/upana-logo-blanco.webp" />
          <div className="hidden h-12 w-px bg-white/30 sm:block" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: VERDE }}>
              Centro de Asistencia Social · CAS
            </p>
            <h1 className="text-xl font-bold text-white sm:text-2xl">{titulo}</h1>
            <p className="text-sm font-medium text-white/80">Campus Chimaltenango</p>
          </div>
        </div>
        <div className="h-1" style={{ backgroundColor: VERDE }} />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
        <footer className="mt-10 text-center text-xs text-slate-400">
          Universidad Panamericana · Facultad de Humanidades · Escuela de Ciencias Psicológicas · Campus Chimaltenango
        </footer>
      </div>
    </main>
  );
}

export function Campo({ children, etiqueta, requerido }: { children: React.ReactNode; etiqueta: string; requerido?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {etiqueta} {requerido ? <span className="text-red-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
