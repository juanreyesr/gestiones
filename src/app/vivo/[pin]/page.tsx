import type { Metadata } from "next";
import { VivoPage } from "@/components/vivo/vivo-page";

export const metadata: Metadata = {
  title: "Unirse a la actividad",
  description: "Ingresa tu apodo para participar en la actividad en vivo.",
  robots: { index: false },
};

export default async function VivoConPin({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  return <VivoPage pinInicial={pin} />;
}
