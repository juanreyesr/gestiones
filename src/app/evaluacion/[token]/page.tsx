import type { Metadata } from "next";
import { EvaluacionPublica } from "@/components/evaluaciones/evaluacion-publica";

export const metadata: Metadata = {
  title: "Cuestionario",
  description: "Cuestionario para su atención psicológica.",
  robots: { index: false },
};

export default async function EvaluacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <EvaluacionPublica token={token} />;
}
