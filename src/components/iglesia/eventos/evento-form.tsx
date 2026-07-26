"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchParticipantes,
  insertEvento,
  reemplazarParticipantes,
  updateEvento,
  type EventoPayload,
} from "@/lib/iglesia/eventos";
import {
  ESTADOS_EVENTO,
  ROLES,
  TIPOS_EVENTO,
  tipoEventoInfo,
  type EstadoEvento,
  type EventoRow,
  type ParticipanteBorrador,
  type RolParticipante,
  type TipoEvento,
} from "@/lib/iglesia/types";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner, Field, INPUT, Modal } from "@/components/ui-comun";

const filaVacia = (rol: RolParticipante): ParticipanteBorrador => ({
  rol,
  nombre: "",
  documento: "",
  telefono: "",
  notas: "",
});

/**
 * Sugerencia de titulo a partir de los protagonistas: "Boda de Ana y Luis",
 * "Cumpleaños de Marta". Solo se aplica mientras el titulo este vacio, para no
 * pisar lo que el usuario escriba.
 */
function tituloSugerido(tipo: TipoEvento, participantes: ParticipanteBorrador[]) {
  const info = tipoEventoInfo(tipo);
  const nombres = participantes
    .filter((participante) => info.rolesBase.includes(participante.rol) && participante.nombre.trim())
    .map((participante) => participante.nombre.trim());

  if (!nombres.length) return "";
  const etiqueta = info.label.replace(" religiosa", "").replace(" / servicio fúnebre", "");
  return `${etiqueta} de ${nombres.join(" y ")}`;
}

export function EventoForm({
  evento,
  onCerrar,
  onGuardado,
}: {
  evento: EventoRow | null;
  onCerrar: () => void;
  onGuardado: () => void | Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? "boda");
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [fecha, setFecha] = useState(evento?.fecha ?? "");
  const [hora, setHora] = useState(evento?.hora?.slice(0, 5) ?? "");
  const [lugar, setLugar] = useState(evento?.lugar ?? "");
  const [direccion, setDireccion] = useState(evento?.direccion ?? "");
  const [oficiante, setOficiante] = useState(evento?.oficiante ?? "");
  const [estado, setEstado] = useState<EstadoEvento>(evento?.estado ?? "planificado");
  const [contactoNombre, setContactoNombre] = useState(evento?.contacto_nombre ?? "");
  const [contactoTelefono, setContactoTelefono] = useState(evento?.contacto_telefono ?? "");
  const [contactoCorreo, setContactoCorreo] = useState(evento?.contacto_correo ?? "");
  const [asistentes, setAsistentes] = useState(evento?.asistentes_estimados?.toString() ?? "");
  const [programa, setPrograma] = useState(evento?.programa ?? "");
  const [notas, setNotas] = useState(evento?.notas ?? "");
  const [participantes, setParticipantes] = useState<ParticipanteBorrador[]>(() =>
    evento ? [] : tipoEventoInfo("boda").rolesBase.map(filaVacia),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarParticipantes = useCallback(async () => {
    if (!evento) return;
    const { data } = await fetchParticipantes(evento.id);
    setParticipantes(
      data.map((participante) => ({
        id: participante.id,
        rol: participante.rol,
        nombre: participante.nombre,
        documento: participante.documento ?? "",
        telefono: participante.telefono ?? "",
        notas: participante.notas ?? "",
      })),
    );
  }, [evento]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga los participantes del evento que se está editando
    void cargarParticipantes();
  }, [cargarParticipantes]);

  const cambiarTipo = (nuevoTipo: TipoEvento) => {
    setTipo(nuevoTipo);
    // Al crear, los roles base del tipo se precargan vacios para que se vea de
    // inmediato que una boda pide novio y novia, y un bautizo un bautizado.
    if (!evento && participantes.every((participante) => !participante.nombre.trim())) {
      setParticipantes(tipoEventoInfo(nuevoTipo).rolesBase.map(filaVacia));
    }
  };

  const actualizarParticipante = (indice: number, cambios: Partial<ParticipanteBorrador>) => {
    setParticipantes((previos) =>
      previos.map((participante, posicion) => (posicion === indice ? { ...participante, ...cambios } : participante)),
    );
  };

  const guardar = async () => {
    const tituloFinal = titulo.trim() || tituloSugerido(tipo, participantes) || tipoEventoInfo(tipo).label;
    if (!fecha) {
      setError("La fecha del evento es obligatoria.");
      return;
    }

    setGuardando(true);
    const payload: EventoPayload = {
      tipo,
      titulo: tituloFinal,
      fecha,
      hora: hora || null,
      lugar: lugar.trim() || null,
      direccion: direccion.trim() || null,
      oficiante: oficiante.trim() || null,
      estado,
      contacto_nombre: contactoNombre.trim() || null,
      contacto_telefono: contactoTelefono.trim() || null,
      contacto_correo: contactoCorreo.trim() || null,
      asistentes_estimados: asistentes ? Number(asistentes) : null,
      programa: programa.trim() || null,
      notas: notas.trim() || null,
    };

    const { id, error: guardarError } = evento
      ? { id: evento.id, error: (await updateEvento(evento.id, payload)).error }
      : await insertEvento(payload);

    if (guardarError || !id) {
      setGuardando(false);
      setError(guardarError ?? "No se pudo guardar el evento.");
      return;
    }

    const { error: participantesError } = await reemplazarParticipantes(id, participantes);
    setGuardando(false);
    if (participantesError) {
      setError(participantesError);
      return;
    }

    await onGuardado();
  };

  const info = tipoEventoInfo(tipo);

  return (
    <Modal ancho="max-w-3xl" onClose={onCerrar} titulo={evento ? "Editar evento" : "Nuevo evento"}>
      <form
        className="grid gap-4"
        onSubmit={(submit) => {
          submit.preventDefault();
          void guardar();
        }}
      >
        <ErrorBanner message={error} />

        <Field label="Tipo de evento">
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_EVENTO.map((opcion) => (
              <button
                className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold transition ${
                  tipo === opcion.valor
                    ? "border-transparent text-slate-950"
                    : "border-white/12 bg-white/8 text-slate-300 hover:border-white/30"
                }`}
                key={opcion.valor}
                onClick={() => cambiarTipo(opcion.valor)}
                style={tipo === opcion.valor ? { backgroundColor: opcion.color, color: "#ffffff" } : undefined}
                type="button"
              >
                <span>{opcion.emoji}</span>
                {opcion.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título">
            <input
              className={INPUT}
              onChange={(evt) => setTitulo(evt.target.value)}
              placeholder={tituloSugerido(tipo, participantes) || `Ej. ${info.label}`}
              value={titulo}
            />
          </Field>
          <Field label="Estado">
            <select className={INPUT} onChange={(evt) => setEstado(evt.target.value as EstadoEvento)} value={estado}>
              {ESTADOS_EVENTO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input className={INPUT} onChange={(evt) => setFecha(evt.target.value)} required type="date" value={fecha} />
          </Field>
          <Field label="Hora">
            <input className={INPUT} onChange={(evt) => setHora(evt.target.value)} type="time" value={hora} />
          </Field>
          <Field label="Lugar">
            <input
              className={INPUT}
              onChange={(evt) => setLugar(evt.target.value)}
              placeholder="Ej. Templo central"
              value={lugar}
            />
          </Field>
          <Field label="Dirección">
            <input
              className={INPUT}
              onChange={(evt) => setDireccion(evt.target.value)}
              placeholder="Dirección exacta"
              value={direccion}
            />
          </Field>
          <Field label="Oficiante">
            <input
              className={INPUT}
              onChange={(evt) => setOficiante(evt.target.value)}
              placeholder="Quién dirige la ceremonia"
              value={oficiante}
            />
          </Field>
          <Field label="Asistentes estimados">
            <input
              className={INPUT}
              min={0}
              onChange={(evt) => setAsistentes(evt.target.value)}
              type="number"
              value={asistentes}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Participantes
            </span>
            <span className="text-xs text-slate-500">
              Roles sugeridos: {info.rolesSugeridos.map((rol) => ROLES.find((r) => r.valor === rol)?.label).join(", ")}
            </span>
          </div>

          <div className="grid gap-2">
            {participantes.map((participante, indice) => (
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_130px_130px_32px]" key={`${participante.id ?? "nuevo"}-${indice}`}>
                <select
                  className={INPUT}
                  onChange={(evt) => actualizarParticipante(indice, { rol: evt.target.value as RolParticipante })}
                  value={participante.rol}
                >
                  {ROLES.map((rol) => (
                    <option key={rol.valor} value={rol.valor}>
                      {rol.label}
                    </option>
                  ))}
                </select>
                <input
                  className={INPUT}
                  onChange={(evt) => actualizarParticipante(indice, { nombre: evt.target.value })}
                  placeholder="Nombre completo"
                  value={participante.nombre}
                />
                <input
                  className={INPUT}
                  onChange={(evt) => actualizarParticipante(indice, { documento: evt.target.value })}
                  placeholder="DPI / documento"
                  value={participante.documento}
                />
                <input
                  className={INPUT}
                  onChange={(evt) => actualizarParticipante(indice, { telefono: evt.target.value })}
                  placeholder="Teléfono"
                  value={participante.telefono}
                />
                <button
                  className="flex items-center justify-center border border-red-400/30 bg-red-400/10 text-red-200 transition hover:border-red-300"
                  onClick={() => setParticipantes((previos) => previos.filter((_, posicion) => posicion !== indice))}
                  title="Quitar participante"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {info.rolesSugeridos.map((rol) => (
              <button
                className="flex items-center gap-1 border border-white/12 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:border-emerald-300/50"
                key={rol}
                onClick={() => setParticipantes((previos) => [...previos, filaVacia(rol)])}
                type="button"
              >
                <Plus className="h-3 w-3" />
                {ROLES.find((opcion) => opcion.valor === rol)?.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Programa u orden del culto (una línea por punto)">
          <textarea
            className={`${INPUT} min-h-[110px]`}
            onChange={(evt) => setPrograma(evt.target.value)}
            placeholder={"Bienvenida\nAlabanza\nLectura bíblica\nMensaje\nCeremonia\nOración final"}
            value={programa}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Contacto">
            <input
              className={INPUT}
              onChange={(evt) => setContactoNombre(evt.target.value)}
              placeholder="Nombre"
              value={contactoNombre}
            />
          </Field>
          <Field label="Teléfono de contacto">
            <input
              className={INPUT}
              onChange={(evt) => setContactoTelefono(evt.target.value)}
              value={contactoTelefono}
            />
          </Field>
          <Field label="Correo de contacto">
            <input
              className={INPUT}
              onChange={(evt) => setContactoCorreo(evt.target.value)}
              type="email"
              value={contactoCorreo}
            />
          </Field>
        </div>

        <Field label="Notas internas">
          <textarea
            className={`${INPUT} min-h-[80px]`}
            onChange={(evt) => setNotas(evt.target.value)}
            placeholder="Acuerdos, pagos, detalles logísticos..."
            value={notas}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onCerrar} type="button">
            Cancelar
          </button>
          <button className={BTN_PRIMARY} disabled={guardando} type="submit">
            {guardando ? "Guardando..." : "Guardar evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
