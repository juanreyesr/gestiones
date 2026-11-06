import type { Metadata } from "next";
import { InformePublico } from "@/components/evaluaciones/informe-publico";

export const metadata: Metadata = {
  title: "Resultados de su evaluación",
  description: "Informe de su evaluación psicológica.",
  robots: { index: false },
};

export default async function InformePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InformePublico token={token} />;
}
