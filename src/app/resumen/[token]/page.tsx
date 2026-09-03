import type { Metadata } from "next";
import { ResumenPublicoView } from "@/components/resumen-publico-view";

export const metadata: Metadata = {
  title: "Resumen general de coordinacion",
  description: "Resultados de la evaluacion docente por trimestre y ano.",
  robots: { index: false },
};

export default async function ResumenPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResumenPublicoView token={token} />;
}
