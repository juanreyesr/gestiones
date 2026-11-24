import type { Metadata } from "next";
import { PreinscripcionCas } from "@/components/cas/preinscripcion-cas";

export const metadata: Metadata = {
  title: "Preinscripción de práctica · CAS UPANA",
  description:
    "Preinscripción de estudiantes de Universidad Panamericana para la práctica en consejería (4.º año) y la práctica profesional (5.º año) en el Centro de Asistencia Social.",
  robots: { index: false },
};

export default function RegistroCasPage() {
  return <PreinscripcionCas />;
}
