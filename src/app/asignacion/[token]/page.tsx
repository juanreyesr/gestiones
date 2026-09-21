import type { Metadata } from "next";
import { AsignacionCursoPage } from "@/components/cursos/asignacion-curso-page";

export const metadata: Metadata = {
  title: "Asignación al curso",
  description: "Solicita tu asignación a este curso.",
  robots: { index: false },
};

export default async function AsignacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AsignacionCursoPage token={token} />;
}
