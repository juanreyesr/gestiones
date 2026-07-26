"use client";

import { HeartPulse, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Segunda barrera del area Clinica. La sesion de Supabase ya autentico al
 * dueno; este codigo evita que alguien mas abra los expedientes en un
 * dispositivo que quedo desatendido con la sesion iniciada.
 *
 * El area vuelve a bloquearse cada vez que se sale de ella.
 */
export function ClinicaLock({ codigo, onUnlock }: { codigo: string | null; onUnlock: () => void }) {
  const largo = codigo && codigo.length > 0 ? codigo.length : 4;
  const [digitos, setDigitos] = useState<string[]>(() => Array(largo).fill(""));
  const [error, setError] = useState("");
  const [sacudir, setSacudir] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const reiniciar = () => {
    setDigitos(Array(largo).fill(""));
    inputsRef.current[0]?.focus();
  };

  const verificar = (intento: string[]) => {
    if (intento.some((valor) => valor === "")) return;
    if (codigo && intento.join("") === codigo) {
      onUnlock();
      return;
    }
    setError("Código incorrecto. Inténtalo de nuevo.");
    setSacudir(true);
    window.setTimeout(() => {
      setSacudir(false);
      reiniciar();
    }, 430);
  };

  const escribir = (indice: number, valor: string) => {
    const limpio = valor.replace(/\D/g, "");
    if (!limpio) return;
    const siguientes = [...digitos];
    // Permite pegar el codigo completo desde el primer recuadro.
    for (let i = 0; i < limpio.length && indice + i < largo; i += 1) {
      siguientes[indice + i] = limpio[i];
    }
    setDigitos(siguientes);
    setError("");
    const posicion = Math.min(indice + limpio.length, largo - 1);
    inputsRef.current[posicion]?.focus();
    verificar(siguientes);
  };

  const retroceder = (indice: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace") return;
    event.preventDefault();
    const siguientes = [...digitos];
    if (siguientes[indice]) {
      siguientes[indice] = "";
    } else if (indice > 0) {
      siguientes[indice - 1] = "";
      inputsRef.current[indice - 1]?.focus();
    }
    setDigitos(siguientes);
    setError("");
  };

  return (
    <div className="flex min-h-[540px] items-center justify-center px-4 py-10">
      <div className="rise w-full max-w-md border border-white/12 bg-white/8 p-7 text-center backdrop-blur-xl sm:p-9">
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-300/12 shadow-[0_0_36px_-6px_rgba(253,164,175,0.45)]">
          <span className="absolute inset-0 rounded-2xl border border-rose-200/30" />
          <HeartPulse className="h-7 w-7 text-rose-200" />
        </div>

        <h2 className="text-2xl font-semibold text-white">Área protegida</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
          {codigo
            ? "Ingresa el código de Clínica para abrir los expedientes de tus pacientes."
            : "Aún no has configurado un código para esta área."}
        </p>

        {codigo ? (
          <>
            <div className={`mt-7 flex justify-center gap-3${sacudir ? " shake" : ""}`}>
              {digitos.map((digito, indice) => (
                <input
                  aria-label={`Dígito ${indice + 1}`}
                  autoComplete="off"
                  className={`h-14 w-12 rounded-xl border bg-slate-950/70 text-center text-2xl font-semibold text-white outline-none transition ${
                    error
                      ? "border-red-400/60 shadow-[0_0_0_3px_rgba(248,113,113,0.15)]"
                      : digito
                        ? "border-emerald-300/60 shadow-[0_0_0_3px_rgba(110,231,183,0.14)]"
                        : "border-white/12 focus:border-emerald-300/70 focus:shadow-[0_0_0_3px_rgba(110,231,183,0.15)]"
                  }`}
                  inputMode="numeric"
                  key={indice}
                  onChange={(event) => escribir(indice, event.target.value)}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => retroceder(indice, event)}
                  ref={(elemento) => {
                    inputsRef.current[indice] = elemento;
                  }}
                  type="password"
                  value={digito}
                />
              ))}
            </div>

            <p
              aria-live="polite"
              className={`mt-4 text-sm font-semibold transition ${error ? "text-red-300" : "text-transparent"}`}
            >
              {error || "."}
            </p>
          </>
        ) : (
          <button
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
            onClick={onUnlock}
            type="button"
          >
            Entrar a Clínica
          </button>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Información clínica confidencial
        </p>
      </div>
    </div>
  );
}
