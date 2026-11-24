import type { Metadata } from "next";
import { PreinscripcionCas } from "@/components/cas/preinscripcion-cas";
import { estadoFormularioCas } from "@/lib/server/cas-formulario";

export const metadata: Metadata = {
  title: "Preinscripción de práctica · CAS UPANA",
  description:
    "Preinscripción de estudiantes de Universidad Panamericana para la práctica en consejería (4.º año) y la práctica profesional (5.º año) en el Centro de Asistencia Social.",
  robots: { index: false },
};

// Se consulta en cada visita: el interruptor de /admin debe notarse al instante.
export const dynamic = "force-dynamic";

export default async function RegistroCasPage() {
  const { abierto, mensaje } = await estadoFormularioCas();
  return <PreinscripcionCas abierto={abierto} mensajeCerrado={mensaje} />;
}
