import type { Metadata } from "next";
import { VistaPreviaAula } from "@/components/estudiante/vista-previa-aula";

export const metadata: Metadata = {
  title: "Vista previa · Aula virtual",
  robots: { index: false },
};

export default async function VistaPreviaPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const { curso } = await searchParams;
  return <VistaPreviaAula cursoId={curso ?? ""} />;
}
