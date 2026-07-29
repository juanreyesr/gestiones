// Arma el calendario del mes en el formato plano que se comparte por mensaje:
//
//   Tema del mes: Protejamos a nuestra familia
//
//   Domingo 5
//   Juan Reyes Urízar
//   Luis Velásquez
//   Deylyd Reyes
//
//   Martes 7
//   Dulce Orozco
//   Manolo Montufar
//
//   Instrucciones extra:
//   ...
//
// Primero todos los domingos y despues todos los martes, como en el mensaje
// que se envia. En domingo el cierre casi nunca se designa; cuando si se
// designa se agrega entre parentesis para no perder el dato.

import { parseFecha } from "@/lib/fechas";
import {
  HORARIOS_DOMINGO,
  type AsignacionPredicaRow,
  type MesPredicasRow,
  type PersonaRow,
} from "./types";

const SIN_ASIGNAR = "Por definir";

export function calendarioComoTexto({
  asignaciones,
  cierres,
  mes,
  predicadores,
}: {
  asignaciones: AsignacionPredicaRow[];
  cierres: PersonaRow[];
  mes: MesPredicasRow;
  predicadores: PersonaRow[];
}) {
  const nombrePredicador = new Map(predicadores.map((persona) => [persona.id, persona.nombre]));
  const nombreCierre = new Map(cierres.map((persona) => [persona.id, persona.nombre]));

  const quienPredica = (asignacion: AsignacionPredicaRow) =>
    asignacion.predicador_texto?.trim() ||
    (asignacion.predicador_id ? (nombrePredicador.get(asignacion.predicador_id) ?? SIN_ASIGNAR) : SIN_ASIGNAR);

  const quienCierra = (asignacion: AsignacionPredicaRow) =>
    asignacion.cierre_texto?.trim() ||
    (asignacion.cierre_persona_id ? (nombreCierre.get(asignacion.cierre_persona_id) ?? "") : "");

  const diaDe = (fecha: string) => parseFecha(fecha)?.getDate() ?? 0;

  const ordenadas = [...asignaciones].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario),
  );

  const fechasDomingo = [...new Set(ordenadas.filter((fila) => fila.horario !== "19:00").map((fila) => fila.fecha))];
  const fechasMartes = [...new Set(ordenadas.filter((fila) => fila.horario === "19:00").map((fila) => fila.fecha))];

  const bloques: string[] = [];

  if (mes.tema?.trim()) bloques.push(`Tema del mes: ${mes.tema.trim()}`);

  for (const fecha of fechasDomingo) {
    const lineas = [`Domingo ${diaDe(fecha)}`];
    for (const horario of HORARIOS_DOMINGO) {
      const asignacion = ordenadas.find((fila) => fila.fecha === fecha && fila.horario === horario);
      if (!asignacion) continue;
      const cierre = quienCierra(asignacion);
      lineas.push(`${quienPredica(asignacion)}${cierre ? ` (cierra: ${cierre})` : ""}`);
    }
    bloques.push(lineas.join("\n"));
  }

  for (const fecha of fechasMartes) {
    const asignacion = ordenadas.find((fila) => fila.fecha === fecha && fila.horario === "19:00");
    if (!asignacion) continue;
    const lineas = [`Martes ${diaDe(fecha)}`, quienPredica(asignacion)];
    const cierre = quienCierra(asignacion);
    if (cierre) lineas.push(cierre);
    bloques.push(lineas.join("\n"));
  }

  const instrucciones = (mes.instrucciones ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (instrucciones.length) bloques.push(["Instrucciones extra:", ...instrucciones].join("\n"));

  return bloques.join("\n\n");
}
