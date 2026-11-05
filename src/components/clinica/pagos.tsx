"use client";

import { CircleDollarSign, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { actualizarMontoCita, fetchCobroCita, marcarCitaPagada } from "@/lib/clinica/citas";
import { MONEDAS, formatoMonto, parsearMonto } from "@/lib/clinica/dinero";
import { actualizarTarifa } from "@/lib/clinica/pacientes";
import { formatoFechaHora } from "@/lib/clinica/slots";
import type { CitaRow, Moneda, PacienteRow } from "@/lib/clinica/types";
import { BTN_ACCENT, BTN_GHOST } from "./ui";

type Cobro = NonNullable<Awaited<ReturnType<typeof fetchCobroCita>>>;

/** "abonado Q50 en sesión anterior" / "pendiente Q50 de sesión anterior". */
function textoSaldo(saldo: number, moneda: Moneda) {
  if (saldo > 0) return `abonado ${formatoMonto(saldo, moneda)} en sesión anterior`;
  if (saldo < 0) return `pendiente ${formatoMonto(-saldo, moneda)} de sesión anterior`;
  return "";
}

/**
 * Casilla "Pagada" de una cita (control de pagos), con "Otro monto" para
 * registrar lo que el paciente entregó realmente. La diferencia queda como
 * abono a favor o pendiente para la siguiente sesión.
 */
export function PagadaCheckbox({
  cita,
  label = "Pagada",
  onChanged,
}: {
  cita: CitaRow;
  label?: string;
  onChanged: (pagada: boolean) => void;
}) {
  const [pagada, setPagada] = useState(cita.pagada);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [otroMonto, setOtroMonto] = useState(false);
  const [recibido, setRecibido] = useState("");

  useEffect(() => {
    let vivo = true;
    // Sin pagar: para mostrar el saldo. Pagada: solo al corregir el monto recibido.
    if (!cita.pacienteId || (cita.pagada && !otroMonto)) return;
    void fetchCobroCita(cita).then((r) => {
      if (vivo) setCobro(r);
    });
    return () => {
      vivo = false;
    };
  }, [cita, otroMonto]);

  const registrar = async (nuevo: boolean, monto: number | null) => {
    setGuardando(true);
    setError("");
    setPagada(nuevo);
    const { error: err } = await marcarCitaPagada(cita.id, nuevo, monto);
    setGuardando(false);
    if (err) {
      setPagada(!nuevo);
      setError(err);
      return;
    }
    setOtroMonto(false);
    setRecibido("");
    onChanged(nuevo);
  };

  const registrarOtroMonto = () => {
    const valor = parsearMonto(recibido);
    if (valor === null) {
      setError("Escribe el monto que recibiste, por ejemplo 200.");
      return;
    }
    void registrar(true, valor);
  };

  const moneda: Moneda = cobro?.moneda ?? cita.moneda ?? "GTQ";
  const saldoTexto = cobro && cobro.saldo !== 0 ? textoSaldo(cobro.saldo, cobro.moneda) : "";
  // Vista previa de lo que pasará a la siguiente sesión con el monto escrito.
  const valorEscrito = parsearMonto(recibido);
  const diferencia = cobro?.aPagar !== null && cobro?.aPagar !== undefined && valorEscrito !== null ? valorEscrito - cobro.aPagar : null;
  // Pagada con otro monto: lo que recibió.
  const recibidoTexto =
    pagada && cita.montoPagado !== null && cita.monto !== null && cita.montoPagado !== cita.monto
      ? `recibido ${formatoMonto(cita.montoPagado, cita.moneda)}`
      : "";

  return (
    <span className="inline-flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <label
        className={`inline-flex cursor-pointer select-none items-center gap-2 border px-2.5 py-1.5 text-xs font-semibold transition ${
          pagada
            ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
            : "border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300/15"
        } ${guardando ? "opacity-60" : ""}`}
        title={error || undefined}
      >
        <input
          checked={pagada}
          className="h-4 w-4 accent-emerald-300"
          disabled={guardando}
          onChange={() => void registrar(!pagada, null)}
          type="checkbox"
        />
        {pagada ? "Pagada" : label}
      </label>

      {!pagada && cobro?.aPagar !== null && cobro?.aPagar !== undefined && saldoTexto ? (
        <span className="text-xs text-slate-300">
          A pagar <b className="text-white">{formatoMonto(cobro.aPagar, moneda)}</b>{" "}
          <span className={cobro.saldo > 0 ? "text-emerald-300" : "text-amber-300"}>({saldoTexto})</span>
        </span>
      ) : null}

      {recibidoTexto ? <span className="text-xs text-slate-400">{recibidoTexto}</span> : null}

      {pagada && !otroMonto ? (
        <button
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
          disabled={guardando}
          onClick={() => {
            setOtroMonto(true);
            setError("");
          }}
          title="Si el paciente entregó otro monto (más o menos), la diferencia pasa a la siguiente sesión"
          type="button"
        >
          <Pencil className="h-3 w-3" />
          Corregir monto recibido
        </button>
      ) : null}

      {!pagada ? (
        <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-300">
          <input
            checked={otroMonto}
            className="h-3.5 w-3.5"
            disabled={guardando}
            onChange={(event) => {
              setOtroMonto(event.target.checked);
              setError("");
            }}
            type="checkbox"
          />
          Otro monto
        </label>
      ) : null}

      {otroMonto ? (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <input
            aria-label="Monto recibido"
            autoFocus
            className="field w-24 py-1 text-sm"
            inputMode="decimal"
            onChange={(event) => setRecibido(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") registrarOtroMonto();
            }}
            placeholder={cobro?.aPagar !== null && cobro?.aPagar !== undefined ? String(cobro.aPagar) : "0.00"}
            value={recibido}
          />
          <button
            className="border border-emerald-300/50 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-60"
            disabled={guardando}
            onClick={registrarOtroMonto}
            type="button"
          >
            {pagada ? "Guardar" : "Registrar pago"}
          </button>
          {pagada ? (
            <button className="px-1 text-xs text-slate-400" onClick={() => setOtroMonto(false)} type="button">
              ✕
            </button>
          ) : null}
          {diferencia !== null && diferencia !== 0 ? (
            <span className={`text-xs ${diferencia > 0 ? "text-emerald-300" : "text-amber-300"}`}>
              {diferencia > 0
                ? `Quedan ${formatoMonto(diferencia, moneda)} a favor para la siguiente sesión`
                : `Quedan ${formatoMonto(-diferencia, moneda)} pendientes para la siguiente sesión`}
            </span>
          ) : null}
        </span>
      ) : null}

      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </span>
  );
}

/** Aviso "tiene N cita(s) sin pagar" con casilla para marcar cada una como pagada. */
export function CitasSinPagarAviso({ citas, onChanged }: { citas: CitaRow[]; onChanged: () => void }) {
  if (citas.length === 0) return null;
  return (
    <div className="grid gap-2 border border-amber-300/40 bg-amber-300/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <CircleDollarSign className="h-4 w-4" />
        {citas.length === 1 ? "Tiene una cita sin pagar" : `Tiene ${citas.length} citas sin pagar`}
      </div>
      <ul className="grid gap-1.5">
        {citas.map((cita) => (
          <li key={cita.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-200">
            <span className="flex flex-wrap items-center gap-2">
              {formatoFechaHora(cita.inicio)}
              <MontoCita key={`${cita.id}-${cita.monto}-${cita.moneda}`} cita={cita} onChanged={onChanged} />
            </span>
            <PagadaCheckbox cita={cita} label="Marcar pagada" onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Campos monto + moneda reutilizados por la tarifa del paciente y el monto de una cita. */
function MontoInputs({
  moneda,
  monto,
  onMoneda,
  onMonto,
}: {
  moneda: Moneda;
  monto: string;
  onMoneda: (value: Moneda) => void;
  onMonto: (value: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        aria-label="Moneda"
        className="field w-auto py-1.5 text-sm"
        onChange={(event) => onMoneda(event.target.value as Moneda)}
        value={moneda}
      >
        {MONEDAS.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.value === "GTQ" ? "Q" : "US$"}
          </option>
        ))}
      </select>
      <input
        aria-label="Monto"
        className="field w-28 py-1.5 text-sm"
        inputMode="decimal"
        onChange={(event) => onMonto(event.target.value)}
        placeholder="0.00"
        value={monto}
      />
    </span>
  );
}

/**
 * Tarifa por sesion del paciente (cada persona paga distinto). Se copia a cada
 * cita al atenderla o pagarla; cambiarla no altera las citas ya cobradas.
 */
export function TarifaEditor({
  aviso = false,
  onSaved,
  paciente,
}: {
  /** Muestra el recordatorio destacado cuando aun no hay tarifa (p. ej. en la sesion). */
  aviso?: boolean;
  onSaved: () => void;
  paciente: Pick<PacienteRow, "id" | "tarifa" | "tarifaMoneda">;
}) {
  const [editando, setEditando] = useState(paciente.tarifa === null);
  const [monto, setMonto] = useState(paciente.tarifa === null ? "" : String(paciente.tarifa));
  const [moneda, setMoneda] = useState<Moneda>(paciente.tarifaMoneda);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    const valor = parsearMonto(monto);
    if (monto.trim() && valor === null) {
      setError("Escribe un monto válido, por ejemplo 350.");
      return;
    }
    setGuardando(true);
    setError("");
    const { error: err } = await actualizarTarifa(paciente.id, valor, moneda);
    setGuardando(false);
    if (err) {
      setError(err);
      return;
    }
    setEditando(valor === null);
    onSaved();
  };

  if (!editando && paciente.tarifa !== null) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-300">
          Tarifa por sesión:{" "}
          <b className="text-white">{formatoMonto(paciente.tarifa, paciente.tarifaMoneda)}</b>
        </span>
        <button
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
          onClick={() => setEditando(true)}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-2 ${aviso ? "border border-amber-300/40 bg-amber-300/10 p-3" : ""}`}
    >
      <span className={`text-sm ${aviso ? "font-semibold text-amber-200" : "text-slate-300"}`}>
        {paciente.tarifa === null
          ? "Este paciente aún no tiene tarifa. ¿Cuánto cobras por sesión?"
          : "Nueva tarifa por sesión"}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <MontoInputs moneda={moneda} monto={monto} onMoneda={setMoneda} onMonto={setMonto} />
        <button className={BTN_ACCENT} disabled={guardando} onClick={() => void guardar()} type="button">
          Guardar
        </button>
        {paciente.tarifa !== null ? (
          <button className={BTN_GHOST} onClick={() => setEditando(false)} type="button">
            Cancelar
          </button>
        ) : null}
      </div>
      <span className="text-xs text-slate-500">
        Se aplica a las citas atendidas sin monto y a las siguientes; las ya cobradas no cambian.
      </span>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}

/** Monto de una cita, editable para casos puntuales (descuento, sesion mas larga...). */
export function MontoCita({ cita, onChanged }: { cita: CitaRow; onChanged: () => void }) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(cita.monto === null ? "" : String(cita.monto));
  const [moneda, setMoneda] = useState<Moneda>(cita.moneda ?? "GTQ");
  const [error, setError] = useState("");

  const guardar = async () => {
    const valor = parsearMonto(monto);
    if (monto.trim() && valor === null) {
      setError("Monto inválido");
      return;
    }
    const { error: err } = await actualizarMontoCita(cita.id, valor, moneda);
    if (err) {
      setError(err);
      return;
    }
    setEditando(false);
    onChanged();
  };

  if (editando) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
        <MontoInputs moneda={moneda} monto={monto} onMoneda={setMoneda} onMonto={setMonto} />
        <button
          className="border border-emerald-300/50 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-200"
          onClick={() => void guardar()}
          type="button"
        >
          OK
        </button>
        <button className="px-1 text-xs text-slate-400" onClick={() => setEditando(false)} type="button">
          ✕
        </button>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </span>
    );
  }

  return (
    <button
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold transition ${
        cita.monto === null
          ? "border-dashed border-white/20 text-slate-400 hover:text-slate-200"
          : "border-white/10 bg-white/6 text-slate-100 hover:border-white/30"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        setEditando(true);
      }}
      title="Cambiar el monto de esta cita"
      type="button"
    >
      {cita.monto === null ? "Sin monto" : formatoMonto(cita.monto, cita.moneda)}
      <Pencil className="h-3 w-3" />
    </button>
  );
}

/** Saldo del paciente entre sesiones (abonos a favor o pendientes), para el expediente. */
export function SaldoPaciente({ pacienteId, moneda }: { pacienteId: string; moneda: Moneda }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    void fetchCobroCita({ id: "00000000-0000-0000-0000-000000000000", pacienteId, monto: 0, moneda }).then((r) => {
      if (vivo) setSaldo(r ? r.saldo : null);
    });
    return () => {
      vivo = false;
    };
  }, [pacienteId, moneda]);
  if (!saldo) return null;
  return (
    <p className={`text-sm font-semibold ${saldo > 0 ? "text-emerald-300" : "text-amber-300"}`}>
      {saldo > 0
        ? `Saldo a favor: ${formatoMonto(saldo, moneda)} (se descuenta en la siguiente sesión)`
        : `Pendiente de sesiones anteriores: ${formatoMonto(-saldo, moneda)} (se suma a la siguiente sesión)`}
    </p>
  );
}
