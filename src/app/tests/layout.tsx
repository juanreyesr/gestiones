import { Brain } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Tests psicométricos en línea · Juan José Reyes", template: "%s · Tests en línea" },
  description:
    "Tests de autoevaluación en línea por áreas: ánimo y ansiedad, personalidad y vocacional. Resultados inmediatos, historial y seguimiento de su avance.",
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link className="flex items-center gap-2 text-sm font-semibold text-slate-800" href="/tests">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
              <Brain className="h-4 w-4 text-emerald-600" />
            </span>
            <span className="hidden sm:inline">Tests en línea · Juan José Reyes</span><span className="sm:hidden">Tests en línea</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100" href="/tests">
              Catálogo
            </Link>
            <Link className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700" href="/tests/cuenta">
              Mi cuenta
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500">
          <span>Los tests son herramientas de autoevaluación y no sustituyen una evaluación clínica.</span>
          <span className="flex gap-3">
            <Link className="hover:text-slate-800" href="/tests/privacidad">
              Privacidad y condiciones
            </Link>
            <Link className="hover:text-slate-800" href="/es">
              Página principal
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
