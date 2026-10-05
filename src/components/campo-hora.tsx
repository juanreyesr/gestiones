"use client";

/**
 * Hora con tres listas (hora, minutos, a. m./p. m.) en lugar de
 * <input type="time">: en algunos telefonos (navegador o app instalada) el
 * campo nativo no abre teclado ni reloj y no deja cambiar la hora. Las listas
 * abren el selector del sistema en cualquier dispositivo.
 * `value` y `onChange` usan "HH:MM" en 24 horas, igual que el campo nativo.
 */

const HORAS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);
const dos = (n: number) => String(n).padStart(2, "0");

function partes(valor: string) {
  const [h, m] = (valor || "09:00").split(":").map(Number);
  const hora24 = Number.isFinite(h) ? h : 9;
  const minutos = Number.isFinite(m) ? m : 0;
  return { hora12: hora24 % 12 || 12, minutos, pm: hora24 >= 12 };
}

export function CampoHora({
  value,
  onChange,
  className = "field",
  etiqueta,
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  /** Texto para lectores de pantalla, por ejemplo "Desde". */
  etiqueta?: string;
}) {
  const { hora12, minutos, pm } = partes(value);
  const cambiar = (nueva: Partial<ReturnType<typeof partes>>) => {
    const p = { hora12, minutos, pm, ...nueva };
    onChange(`${dos((p.hora12 % 12) + (p.pm ? 12 : 0))}:${dos(p.minutos)}`);
  };
  // Si la hora guardada no cae en multiplo de 5 minutos, se conserva en la lista.
  const opcionesMinutos = MINUTOS.includes(minutos) ? MINUTOS : [...MINUTOS, minutos].sort((a, b) => a - b);
  const estilo = `${className} w-auto px-2`;

  return (
    <span aria-label={etiqueta} className="inline-flex items-center gap-1" role="group">
      <select aria-label="Hora" className={estilo} onChange={(e) => cambiar({ hora12: Number(e.target.value) })} value={hora12}>
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-slate-400">:</span>
      <select aria-label="Minutos" className={estilo} onChange={(e) => cambiar({ minutos: Number(e.target.value) })} value={minutos}>
        {opcionesMinutos.map((m) => (
          <option key={m} value={m}>
            {dos(m)}
          </option>
        ))}
      </select>
      <select aria-label="a. m. o p. m." className={estilo} onChange={(e) => cambiar({ pm: e.target.value === "pm" })} value={pm ? "pm" : "am"}>
        <option value="am">a. m.</option>
        <option value="pm">p. m.</option>
      </select>
    </span>
  );
}
