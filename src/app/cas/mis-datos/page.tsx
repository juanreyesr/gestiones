import type { Metadata } from "next";
import { MisDatosCas } from "@/components/cas/mis-datos-cas";

export const metadata: Metadata = {
  title: "Actualizar mis datos · CAS UPANA Chimaltenango",
  description: "Consulta y corrige los datos de tu preinscripción a la práctica en el CAS de Campus Chimaltenango.",
  robots: { index: false },
};

export default function MisDatosCasPage() {
  return <MisDatosCas />;
}
