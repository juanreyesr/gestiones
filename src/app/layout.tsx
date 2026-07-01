import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GestionesJJ",
  description: "Centro personal de gestion, coordinacion academica y evaluacion docente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
