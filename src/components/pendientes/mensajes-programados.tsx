"use client";

import { AlarmClock, MessageSquareText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BTN_GHOST, BTN_PRIMARY, EmptyState, ErrorBanner, Field, INPUT, Modal, Pastilla } from "@/components/ui-comun";
import { enlaceWhatsApp, telefonoWhatsApp } from "@/lib/clinica/recordatorio";
import { fechaHoraLegible } from "@/lib/fechas";
import {
  deleteMensajeProgramado,
  fetchMensajesProgramados,
  insertMensajeProgramado,
  updateMensajeProgramado,
  type MensajeProgramadoRow,
} from "@/lib/pendientes/mensajes";

/** Igual que MAX_INTENTOS_MENSAJE del servidor (migracion 046). */
const MAX_INTENTOS = 5;
const MAX_MENSAJE = 2000;

type Estado = "programado" | "en_curso" | "avisado" | "fallido";

function estadoDe(fila: MensajeProgramadoRow, ahora: number): Estado {
  if (fila.avisado_at) return "avisado";
  if (fila.intentos >= MAX_INTENTOS) return "fallido";
  return Date.parse(fila.programado_para) <= ahora ? "en_curso" : "programado";
}

const PASTILLAS: Record<Estado, { titulo: string; color: string; texto: string }> = {
  programado: { titulo: "Programado", color: "#579bfc", texto: "#fff" },
  en_curso: { titulo: "Enviando aviso", color: "#fdab3d", texto: "#1e293b" },
  avisado: { titulo: "Enviado a Telegram", color: "#00c875", texto: "#0f172a" },
  fallido: { titulo: "No se pudo avisar", color: "#e2445c", texto: "#fff" },
};

/** Valor para <input type="datetime-local"> en la hora del navegador. */
function aInputLocal(fecha: Date) {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

export function MensajesProgramados() {
  const [mensajes, setMensajes] = useState<MensajeProgramadoRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [formulario, setFormulario] = useState<MensajeProgramadoRow | "nuevo" | null>(null);
  const [aEliminar, setAEliminar] = useState<MensajeProgramadoRow | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async () => {
    const res = await fetchMensajesProgramados();
    setMensajes(res.data);
    setError(res.error ?? "");
    setAhora(Date.now());
    setCargando(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de mensajes
    void cargar();
    // Refresca cada minuto para ver el paso de "Programado" a "Enviado a Telegram".
    const intervalo = window.setInterval(() => void cargar(), 60_000);
    return () => window.clearInterval(intervalo);
  }, [cargar]);

  const proximos = mensajes
    .filter((fila) => !fila.avisado_at && fila.intentos < MAX_INTENTOS)
    .sort((a, b) => a.programado_para.localeCompare(b.programado_para));
  const historial = mensajes.filter((fila) => fila.avisado_at || fila.intentos >= MAX_INTENTOS);

  const tarjeta = (fila: MensajeProgramadoRow) => {
    const estado = estadoDe(fila, ahora);
    const pastilla = PASTILLAS[estado];
    return (
      <article className="grid gap-2 border border-white/10 bg-white/8 p-4" key={fila.id}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <AlarmClock className="h-4 w-4 text-emerald-200" />
            {fechaHoraLegible(fila.programado_para)}
          </span>
          <Pastilla color={pastilla.color} texto={pastilla.texto} titulo={pastilla.titulo} />
          <span className="text-sm text-slate-300">+{telefonoWhatsApp(fila.telefono)}</span>
          <div className="ml-auto flex gap-1.5">
            <a
              className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-emerald-200 hover:border-emerald-300/50"
              href={enlaceWhatsApp(fila.telefono, fila.mensaje)}
              rel="noopener noreferrer"
              target="_blank"
              title="Abrir WhatsApp ahora"
            >
              <Send className="h-3.5 w-3.5" />
            </a>
            <button
              className="flex h-7 w-7 items-center justify-center border border-white/10 bg-slate-950/80 text-slate-200 hover:border-emerald-300/50"
              onClick={() => setFormulario(fila)}
              title={estado === "avisado" || estado === "fallido" ? "Reprogramar" : "Editar"}
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center border border-red-400/30 bg-slate-950/80 text-red-200 hover:border-red-300"
              onClick={() => setAEliminar(fila)}
              title="Eliminar"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-200">{fila.mensaje}</p>
        {fila.error && !fila.avisado_at ? <p className="text-xs text-red-300">Último error: {fila.error}</p> : null}
      </article>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-400">
          A la hora programada te llega a Telegram un botón que abre WhatsApp con el número y el mensaje listos; el
          mensaje sale cuando tú lo envías.
        </p>
        <button className={`${BTN_PRIMARY} ml-auto`} onClick={() => setFormulario("nuevo")} type="button">
          <Plus className="h-4 w-4" />
          Programar mensaje
        </button>
      </div>

      <ErrorBanner message={error} />

      {cargando ? (
        <p className="text-sm text-slate-300">Cargando mensajes...</p>
      ) : (
        <>
          <section className="grid gap-2">
            <h4 className="text-xs font-semibold uppercase text-slate-400">Próximos ({proximos.length})</h4>
            {proximos.length ? (
              proximos.map(tarjeta)
            ) : (
              <EmptyState>
                <MessageSquareText className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                No hay mensajes programados. Programa uno (por ejemplo, una felicitación de cumpleaños a las 7:00 a. m.).
              </EmptyState>
            )}
          </section>

          {historial.length ? (
            <section className="grid gap-2">
              <h4 className="text-xs font-semibold uppercase text-slate-400">Historial</h4>
              {historial.map(tarjeta)}
            </section>
          ) : null}
        </>
      )}

      {formulario ? (
        <FormularioMensaje
          mensaje={formulario === "nuevo" ? null : formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={async () => {
            setFormulario(null);
            await cargar();
          }}
        />
      ) : null}

      <ConfirmDialog
        message="Se eliminará este mensaje programado. Si todavía no llegó a Telegram, ya no se avisará."
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          if (!aEliminar) return;
          const { error: deleteError } = await deleteMensajeProgramado(aEliminar.id);
          setAEliminar(null);
          if (deleteError) setError(deleteError);
          await cargar();
        }}
        open={Boolean(aEliminar)}
        title="Eliminar mensaje programado"
      />
    </div>
  );
}

function FormularioMensaje({
  mensaje,
  onCerrar,
  onGuardado,
}: {
  mensaje: MensajeProgramadoRow | null;
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [telefono, setTelefono] = useState(mensaje?.telefono ?? "");
  const [texto, setTexto] = useState(mensaje?.mensaje ?? "");
  const [cuando, setCuando] = useState(() => {
    if (mensaje && !mensaje.avisado_at) return aInputLocal(new Date(mensaje.programado_para));
    // Por defecto, dentro de una hora en punto.
    const sugerido = new Date(Date.now() + 60 * 60_000);
    sugerido.setMinutes(0, 0, 0);
    return aInputLocal(sugerido);
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const numero = telefonoWhatsApp(telefono);
  const valido = numero.length >= 8 && texto.trim().length > 0 && Boolean(cuando);

  const guardar = async () => {
    if (!valido) return;
    const fecha = new Date(cuando);
    if (Number.isNaN(fecha.getTime())) {
      setError("La fecha y hora no es válida.");
      return;
    }
    if (fecha.getTime() < Date.now() - 60_000) {
      setError("La hora ya pasó. Elige una hora futura (o usa el botón de WhatsApp para enviarlo ahora).");
      return;
    }
    setGuardando(true);
    const payload = { telefono: telefono.trim(), mensaje: texto.trim(), programado_para: fecha.toISOString() };
    const { error: guardarError } = mensaje
      ? await updateMensajeProgramado(mensaje.id, payload)
      : await insertMensajeProgramado(payload);
    setGuardando(false);
    if (guardarError) {
      setError(guardarError);
      return;
    }
    await onGuardado();
  };

  return (
    <Modal ancho="max-w-md" onClose={onCerrar} titulo={mensaje ? "Editar mensaje programado" : "Programar mensaje"}>
      <form
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          void guardar();
        }}
      >
        <ErrorBanner message={error} />

        <Field label="Número de WhatsApp">
          <input
            autoFocus
            className={INPUT}
            inputMode="tel"
            onChange={(evento) => setTelefono(evento.target.value)}
            placeholder="Ej. 4000-1234 o +52 55 1234 5678"
            value={telefono}
          />
          <span className="text-xs text-slate-500">
            Sin código se asume Guatemala (+502).{numero ? ` Se abrirá: +${numero}` : ""}
          </span>
        </Field>

        <Field label="Mensaje">
          <textarea
            className={`${INPUT} min-h-[120px]`}
            maxLength={MAX_MENSAJE}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Escribe el mensaje tal como lo quieres enviar"
            value={texto}
          />
          <span className="text-right text-xs text-slate-500">
            {texto.length}/{MAX_MENSAJE}
          </span>
        </Field>

        <Field label="Fecha y hora del aviso">
          <input className={INPUT} onChange={(evento) => setCuando(evento.target.value)} type="datetime-local" value={cuando} />
        </Field>

        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={guardando || !valido} type="submit">
            {guardando ? "Guardando..." : "Programar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
