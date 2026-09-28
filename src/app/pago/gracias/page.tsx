import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Gracias por tu pago · Ps. Juan J. Reyes",
  robots: { index: false },
};

/**
 * Pagina de retorno de PayPal (Auto Return). Solo agradece: el aviso por
 * Telegram lo manda el webhook verificado de PayPal, no esta pagina, porque
 * cualquiera podria abrirla sin haber pagado y porque el paciente puede cerrar
 * PayPal antes de volver.
 */
export default function GraciasPagoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-slate-900">
      <div className="w-full max-w-md text-center">
        <Image
          alt="Juan J. Reyes"
          className="mx-auto mb-6 h-24 w-24"
          height={96}
          priority
          src="/assets/logo-juanjreyes.png"
          width={96}
        />
        <h1 className="text-2xl font-semibold sm:text-3xl">¡Gracias por tu pago!</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
          Tu pago se realizó y la transacción quedó completada. PayPal te envió por correo electrónico el detalle de la
          transacción. Si tienes alguna duda sobre tu consulta, escríbeme por WhatsApp.
        </p>
        <a
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-8 text-sm font-semibold text-white transition hover:bg-slate-700"
          href="/es"
        >
          Aceptar
        </a>
        <p className="mt-10 text-xs text-slate-400">Ps. Juan J. Reyes · Atención psicológica profesional</p>
      </div>
    </main>
  );
}
