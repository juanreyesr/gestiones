import type { Metadata } from "next";
import { VivoPage } from "@/components/vivo/vivo-page";

export const metadata: Metadata = {
  title: "Unirse a la actividad",
  description: "Ingresa el PIN para participar en la actividad en vivo.",
  robots: { index: false },
};

export default function Vivo() {
  return <VivoPage />;
}
