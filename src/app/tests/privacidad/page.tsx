import type { Metadata } from "next";
import { CONSENTIMIENTO_CONTACTO, CONSENTIMIENTO_DATOS, CONSENTIMIENTO_TEST, EDAD_MINIMA, PRECIO_PRIMERA, PRECIO_REEVALUACION, VERSION_CONSENTIMIENTO } from "@/lib/tests/catalogo";

export const metadata: Metadata = { title: "Privacidad y condiciones" };

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      <div className="grid gap-2 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}

export default function Privacidad() {
  return (
    <article className="mx-auto grid max-w-3xl gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Aviso de privacidad y condiciones de uso</h1>
        <p className="text-xs text-slate-500">Versión {VERSION_CONSENTIMIENTO}</p>
      </div>
      <Bloque titulo="Qué son estos tests">
        {CONSENTIMIENTO_TEST.slice(0, 3).map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p>Los tests son para personas de {EDAD_MINIMA} años o más.</p>
      </Bloque>
      <Bloque titulo="Datos que se guardan y para qué">
        <p>
          Nombre, correo, fecha de nacimiento, país y, si los indica, teléfono, género y ocupación; además, sus respuestas, sus resultados y el registro de sus
          pagos (los datos de su tarjeta los procesa PayPal y nunca llegan a este sitio).
        </p>
        {CONSENTIMIENTO_DATOS.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p>Su contraseña se guarda cifrada: nadie, ni siquiera el administrador, puede leerla.</p>
      </Bloque>
      <Bloque titulo="Comunicaciones (opcional)">
        <p>{CONSENTIMIENTO_CONTACTO}</p>
        <p>Puede activarlo o desactivarlo cuando quiera desde «Mi cuenta».</p>
      </Bloque>
      <Bloque titulo="Pagos y reembolsos">
        <p>
          Cada test cuesta US${PRECIO_PRIMERA} y cada reevaluación del mismo test US${PRECIO_REEVALUACION}. El pago da acceso a una aplicación del test, que puede
          responder a su ritmo y continuar después.
        </p>
        <p>
          Si pagó y no pudo comenzar el test por un problema técnico, escríbanos y le devolvemos su pago. Una vez respondido el test y generado el informe, el pago
          no es reembolsable.
        </p>
      </Bloque>
      <Bloque titulo="Responsable">
        <p>M. A. Juan José Reyes, psicólogo · www.juanjreyes.org. Para consultas, ejercer sus derechos o pedir que se eliminen sus datos, escriba desde el sitio.</p>
      </Bloque>
    </article>
  );
}
