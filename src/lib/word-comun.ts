// Utilidades compartidas por los documentos Word de la app.
//
// La libreria "docx" pesa varios cientos de KB, por eso cada generador la
// importa de forma dinamica: solo se descarga cuando el usuario pulsa
// "Descargar Word", no en el paquete inicial.

export const AZUL_DOCUMENTO = "1F3864";
export const GRIS_DOCUMENTO = "444444";

/** Nombre de archivo seguro a partir de un titulo con tildes y espacios. */
export function nombreArchivo(base: string) {
  const limpio = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpio || "documento"}.docx`;
}

export async function descargarBlob(blob: Blob, archivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // El objeto URL se libera en el siguiente tick: revocarlo de inmediato
  // cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
