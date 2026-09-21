import type { Metadata } from "next";
import { GestionesApp } from "@/components/gestiones-app";

export const metadata: Metadata = {
  title: "Acceso administrativo · GestionesJJ",
  robots: { index: false },
};

export default function AdminPage() {
  return <GestionesApp />;
}
