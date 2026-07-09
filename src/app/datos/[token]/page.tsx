import type { Metadata } from "next";
import { DatosPacientePage } from "@/components/booking/datos-paciente-page";

export const metadata: Metadata = {
  title: "Hoja de datos generales",
  description: "Completa tu información para tu atención psicológica.",
  robots: { index: false },
};

export default async function DatosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DatosPacientePage token={token} />;
}
