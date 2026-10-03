import type { Metadata } from "next";
import { EstudianteView } from "@/components/estudiante/estudiante-view";

export const metadata: Metadata = {
  title: "Aula virtual estudiantes",
  robots: { index: false },
};

export default function EstudiantePage() {
  return <EstudianteView />;
}
