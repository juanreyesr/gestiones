import type { Metadata } from "next";
import { EncuestaPublica } from "@/components/encuestas/encuesta-publica";

export const metadata: Metadata = {
  title: "Encuesta estudiantil",
  description: "Comparte tu opinión de forma anónima.",
  robots: { index: false },
};

export default async function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <EncuestaPublica token={token} />;
}
