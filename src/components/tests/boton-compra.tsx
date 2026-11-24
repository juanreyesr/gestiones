"use client";

import { Loader2, Lock, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PayPalBotones = { render: (el: HTMLElement) => Promise<void>; close?: () => void };
type PayPalSdk = {
  Buttons: (o: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (d: { orderID: string }) => Promise<void>;
    onError?: (e: unknown) => void;
  }) => PayPalBotones;
};
declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

/** Carga el SDK de PayPal una sola vez (botón de PayPal y de tarjeta de débito o crédito). */
function cargarSdk(clientId: string) {
  return new Promise<PayPalSdk>((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&enable-funding=card&disable-funding=paylater,venmo`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("sin sdk")));
    s.onerror = () => reject(new Error("no cargó"));
    document.head.appendChild(s);
  });
}

export function BotonCompra({
  instrumento,
  logueado,
  monto,
  pendienteId,
  tipo,
}: {
  instrumento: string;
  logueado: boolean;
  monto: number;
  pendienteId: string | null;
  tipo: "primera" | "reevaluacion";
}) {
  const router = useRouter();
  const contenedor = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "procesando" | "no-disponible">("cargando");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!logueado || pendienteId) return;
    let vivo = true;
    let botones: PayPalBotones | null = null;
    (async () => {
      try {
        const cfg = (await (await fetch("/api/tests/config")).json()) as { paypalClientId: string | null };
        if (!cfg.paypalClientId) {
          if (vivo) setEstado("no-disponible");
          return;
        }
        const paypal = await cargarSdk(cfg.paypalClientId);
        if (!vivo || !contenedor.current) return;
        botones = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay" },
          createOrder: async () => {
            setError("");
            const r = await fetch("/api/tests/compras", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ instrumento }),
            });
            const d = (await r.json().catch(() => ({}))) as { orderId?: string; aplicacionId?: string; error?: string };
            if (d.aplicacionId) {
              router.push(`/tests/aplicar/${d.aplicacionId}`);
              throw new Error("pendiente");
            }
            if (!r.ok || !d.orderId) {
              setError(d.error ?? "No se pudo iniciar el pago.");
              throw new Error("orden");
            }
            return d.orderId;
          },
          onApprove: async ({ orderID }) => {
            setEstado("procesando");
            const r = await fetch("/api/tests/compras/capturar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: orderID }),
            });
            const d = (await r.json().catch(() => ({}))) as { aplicacionId?: string; error?: string };
            if (r.ok && d.aplicacionId) {
              router.push(`/tests/aplicar/${d.aplicacionId}`);
              return;
            }
            setEstado("listo");
            setError(d.error ?? "No se pudo confirmar el pago.");
          },
          onError: () => setError((e) => e || "Hubo un problema con el pago. Intente de nuevo."),
        });
        await botones.render(contenedor.current);
        if (vivo) setEstado("listo");
      } catch {
        if (vivo) setEstado("no-disponible");
      }
    })();
    return () => {
      vivo = false;
      botones?.close?.();
    };
  }, [instrumento, logueado, pendienteId, router]);

  if (!logueado) {
    return (
      <Link
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        href={`/tests/cuenta?siguiente=${encodeURIComponent(`/tests/${instrumento}`)}`}
      >
        <Lock className="h-4 w-4" /> Crear cuenta o iniciar sesión para comenzar
      </Link>
    );
  }
  if (pendienteId) {
    return (
      <Link
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        href={`/tests/aplicar/${pendienteId}`}
      >
        <Play className="h-4 w-4" /> Continuar el test que ya pagó
      </Link>
    );
  }
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-slate-900">
        {tipo === "reevaluacion" ? "Reevaluación" : "Pago único"}: US${monto.toFixed(2)}
      </p>
      {estado === "cargando" || estado === "procesando" ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {estado === "procesando" ? "Confirmando su pago…" : "Cargando medios de pago…"}
        </p>
      ) : null}
      {estado === "no-disponible" ? <p className="text-sm text-amber-800">El pago en línea no está disponible en este momento. Intente más tarde.</p> : null}
      <div className={estado === "procesando" ? "pointer-events-none opacity-50" : ""} ref={contenedor} />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <p className="text-xs leading-5 text-slate-500">
        Puede pagar con su cuenta de PayPal o con tarjeta de débito o crédito, sin crear cuenta de PayPal. El pago es seguro y lo procesa PayPal.
      </p>
    </div>
  );
}
