// Fichas de credenciales para imprimir y entregar a cada estudiante.
//
// Deliberadamente NO se arma una sola hoja con todos los usuarios y
// contraseñas juntos (es el documento más peligroso que podría existir en
// un escritorio): cada estudiante ocupa su propia página, recortable, para
// poder entregarla por separado.

export type FichaImpresion = {
  nombre: string;
  correo: string;
  contrasena: string;
  debeCambiarContrasena?: boolean;
};

const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const ACCENT: [number, number, number] = [16, 130, 100];
const CARD_BORDER: [number, number, number] = [203, 213, 225];

export async function exportFichasCredencialesPdf(fichas: FichaImpresion[], cursoNombre: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cardWidth = pageWidth - 120;
  const cardX = 60;
  const cardTop = pageHeight / 2 - 170;
  const sitioUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/estudiante` : "el sitio · Acceso a estudiantes";

  fichas.forEach((ficha, index) => {
    if (index > 0) doc.addPage();

    // Marco recortable en punteado, para que se note que es una ficha aparte.
    doc.setDrawColor(...CARD_BORDER);
    doc.setLineDashPattern([4, 3], 0);
    doc.roundedRect(cardX, cardTop, cardWidth, 340, 14, 14, "S");
    doc.setLineDashPattern([], 0);

    let y = cardTop + 50;
    const centerX = pageWidth / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT);
    doc.text(cursoNombre.toUpperCase(), centerX, y, { align: "center" });
    y += 26;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text("Acceso a estudiantes", centerX, y, { align: "center" });
    y += 40;

    const campo = (label: string, valor: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(label, centerX, y, { align: "center" });
      y += 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...INK);
      doc.text(valor, centerX, y, { align: "center" });
      y += 34;
    };

    campo("Estudiante", ficha.nombre);
    campo("Usuario (correo)", ficha.correo);
    campo("Contraseña", ficha.contrasena);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Ingresa en: ${sitioUrl}`, centerX, y, { align: "center" });
    y += 16;
    if (ficha.debeCambiarContrasena !== false) {
      doc.text("Te pedirá crear tu propia contraseña la primera vez que entres.", centerX, y, { align: "center" });
    }
  });

  doc.save(`fichas-credenciales-${cursoNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
