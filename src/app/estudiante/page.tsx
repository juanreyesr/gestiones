import type { Metadata } from "next";
import { EstudianteView } from "@/components/estudiante/estudiante-view";

export const metadata: Metadata = {
  title: "Acceso a estudiantes · GestionesJJ",
  robots: { index: false },
};

export default function EstudiantePage() {
  return <EstudianteView />;
}
