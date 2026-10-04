import type { Metadata, Viewport } from "next";
import { AvisoVersionNueva } from "@/components/aviso-version-nueva";
import "./globals.css";

export const metadata: Metadata = {
  title: "GestionesJJ",
  description: "Centro personal de gestion, coordinacion academica y evaluacion docente.",
  // Icono de la firma para la pestana y para los accesos directos ("Agregar a
  // pantalla de inicio"). El manifiesto no fija start_url: el acceso directo
  // abre la pagina desde la que se creo (por ejemplo /admin).
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "Juan J. Reyes", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#171918",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AvisoVersionNueva />
      </body>
    </html>
  );
}
