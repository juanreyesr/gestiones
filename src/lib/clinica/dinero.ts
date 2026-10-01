import type { Moneda } from "./types";

export const MONEDAS: Array<{ value: Moneda; label: string }> = [
  { value: "GTQ", label: "Q (quetzales)" },
  { value: "USD", label: "US$ (dólares)" },
];

/** "Q350.00" / "US$40.00". */
export function formatoMonto(monto: number, moneda: Moneda | null | undefined) {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: moneda ?? "GTQ" }).format(monto);
}

/** Suma montos por moneda y los presenta: "Q700.00 + US$40.00" (o "Q0.00" si no hay). */
export function totalPorMoneda(items: Array<{ monto: number | null; moneda: Moneda | null }>) {
  const totales = new Map<Moneda, number>();
  for (const item of items) {
    if (item.monto === null) continue;
    const moneda = item.moneda ?? "GTQ";
    totales.set(moneda, (totales.get(moneda) ?? 0) + item.monto);
  }
  if (totales.size === 0) return formatoMonto(0, "GTQ");
  return Array.from(totales.entries())
    .map(([moneda, total]) => formatoMonto(total, moneda))
    .join(" + ");
}

/** Convierte lo escrito por el usuario ("350", "350.50", "1,200") a numero; null si esta vacio o es invalido. */
export function parsearMonto(texto: string) {
  const limpio = texto.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : null;
}
