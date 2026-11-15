import { enlaceWhatsApp } from "./recordatorio";

/** Cuentas para transferencias (se envían al paciente por WhatsApp). */
export const CUENTAS_BANCARIAS = [
  { banco: "Banrural", numero: "3530029468" },
  { banco: "Bi", numero: "3350015495" },
  { banco: "Bac", numero: "962658597" },
] as const;

const saludoPorHora = (ahora = new Date()) => {
  const h = Number(new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", hour: "numeric", hourCycle: "h23" }).format(ahora));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

/** Mensaje con los números de cuenta, listo para enviar al paciente. */
export function mensajeCuentas(nombreCompleto: string | null, ahora = new Date()) {
  const nombre = (nombreCompleto ?? "").trim().split(" ")[0];
  return [
    `${saludoPorHora(ahora)}${nombre ? ` ${nombre}` : ""}, te comparto mis números de cuenta:`,
    ...CUENTAS_BANCARIAS.map((c) => `${c.banco}: ${c.numero}`),
    "Todas monetarias a nombre de Juan Reyes.",
    "",
    "Te agradezco me compartas cualquier detalle o la constancia de la transferencia por temas de control interno.",
  ].join("\n");
}

export const enlaceCuentasWhatsApp = (nombre: string | null, telefono: string | null | undefined, pais?: string | null) =>
  enlaceWhatsApp(telefono, mensajeCuentas(nombre), pais);
