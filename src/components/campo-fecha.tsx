"use client";

import { CampoHora } from "./campo-hora";

/**
 * Fecha con tres listas (dia, mes, año) en lugar de <input type="date"> o
 * <input type="datetime-local">: en algunos telefonos (navegador o app
 * instalada) esos campos nativos no abren teclado ni calendario y no dejan
 * cambiar la fecha. Las listas abren el selector del sistema en cualquier
 * dispositivo. `value` y `onChange` usan "AAAA-MM-DD", igual que el campo nativo.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dos = (n: number) => String(n).padStart(2, "0");
const diasDelMes = (anio: number, mes: number) => new Date(anio, mes, 0).getDate();

function partes(valor: string) {
  const [a, m, d] = (valor || "").slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  return { anio: a, mes: m, dia: d };
}

function hoy() {
  const ahora = new Date();
  return {
    anio: ahora.getFullYear(),
    mes: ahora.getMonth() + 1,
    dia: ahora.getDate(),
  };
}

export function CampoFecha({
  value,
  onChange,
  className = "field",
  etiqueta,
  opcional = false,
  disabled = false,
  anioDesde,
  anioHasta,
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  /** Texto para lectores de pantalla, por ejemplo "Fecha límite". */
  etiqueta?: string;
  /** Agrega la opcion "—" para dejar la fecha vacia (onChange recibe ""). */
  opcional?: boolean;
  disabled?: boolean;
  /** Rango de años de la lista; por defecto, 10 años atras y 5 adelante. */
  anioDesde?: number;
  anioHasta?: number;
}) {
  const actual = partes(value);
  const base = actual ?? hoy();
  const anioHoy = new Date().getFullYear();
  const desde = anioDesde ?? anioHoy - 10;
  const hasta = anioHasta ?? anioHoy + 5;
  const anios: number[] = [];
  for (let a = hasta; a >= desde; a--) anios.push(a);
  // Si la fecha guardada cae fuera del rango, se conserva en la lista.
  if (actual && !anios.includes(actual.anio)) anios.push(actual.anio);
  anios.sort((a, b) => b - a);

  const cambiar = (nueva: Partial<{ anio: number; mes: number; dia: number }>) => {
    const p = { ...base, ...nueva };
    // Al cambiar de mes o año, el dia no puede pasar del ultimo del mes (31 -> 30, 29 de febrero...).
    const dia = Math.min(p.dia, diasDelMes(p.anio, p.mes));
    onChange(`${p.anio}-${dos(p.mes)}-${dos(dia)}`);
  };
  const vaciar = (texto: string) => {
    if (texto === "") {
      onChange("");
      return true;
    }
    return false;
  };

  const totalDias = diasDelMes(base.anio, base.mes);
  const estilo = `${className} w-auto px-2`;
  const vacio = opcional && !actual;

  return (
    <span aria-label={etiqueta} className="inline-flex flex-wrap items-center gap-1" role="group">
      <select
        aria-label="Día"
        className={estilo}
        disabled={disabled}
        onChange={(e) => vaciar(e.target.value) || cambiar({ dia: Number(e.target.value) })}
        value={vacio ? "" : base.dia}
      >
        {opcional ? <option value="">—</option> : null}
        {Array.from({ length: totalDias }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        aria-label="Mes"
        className={estilo}
        disabled={disabled}
        onChange={(e) => vaciar(e.target.value) || cambiar({ mes: Number(e.target.value) })}
        value={vacio ? "" : base.mes}
      >
        {opcional ? <option value="">—</option> : null}
        {MESES.map((nombre, i) => (
          <option key={nombre} value={i + 1}>
            {nombre}
          </option>
        ))}
      </select>
      <select
        aria-label="Año"
        className={estilo}
        disabled={disabled}
        onChange={(e) => vaciar(e.target.value) || cambiar({ anio: Number(e.target.value) })}
        value={vacio ? "" : base.anio}
      >
        {opcional ? <option value="">—</option> : null}
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * Fecha y hora con listas, en lugar de <input type="datetime-local">.
 * `value` y `onChange` usan "AAAA-MM-DDTHH:MM", igual que el campo nativo.
 * Con `opcional`, la fecha puede quedar vacia ("") y la hora se muestra al elegirla.
 */
export function CampoFechaHora({
  value,
  onChange,
  className = "field",
  etiqueta,
  opcional = false,
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  etiqueta?: string;
  opcional?: boolean;
}) {
  const hora = value.slice(11, 16) || "09:00";
  let fecha = value.slice(0, 10);
  if (!partes(fecha) && !opcional) {
    const h = hoy();
    fecha = `${h.anio}-${dos(h.mes)}-${dos(h.dia)}`;
  }
  const conFecha = Boolean(partes(fecha));

  return (
    <span aria-label={etiqueta} className="flex flex-wrap items-center gap-2" role="group">
      <CampoFecha
        className={className}
        onChange={(f) => onChange(f ? `${f}T${hora}` : "")}
        opcional={opcional}
        value={conFecha ? fecha : ""}
      />
      {conFecha ? <CampoHora className={className} onChange={(h) => onChange(`${fecha}T${h}`)} value={hora} /> : null}
    </span>
  );
}
