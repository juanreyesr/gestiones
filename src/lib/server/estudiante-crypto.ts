import crypto from "node:crypto";

// Cifrado de la contraseña de cada estudiante para poder reimprimir su
// ficha de credenciales cuando el owner lo pida (decisión de producto:
// prioriza poder reimprimir sobre nunca guardarla en texto plano). La
// llave nunca vive en el repo ni en el navegador, solo en la variable de
// entorno del servidor.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.ESTUDIANTES_ENC_KEY;
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

export function cifrarContrasena(texto: string): { valor: string | null; error: string | null } {
  const key = getKey();
  if (!key) return { valor: null, error: "Falta configurar ESTUDIANTES_ENC_KEY en el servidor." };

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { valor: Buffer.concat([iv, tag, cifrado]).toString("base64"), error: null };
}

export function descifrarContrasena(valor: string): { texto: string | null; error: string | null } {
  const key = getKey();
  if (!key) return { texto: null, error: "Falta configurar ESTUDIANTES_ENC_KEY en el servidor." };

  try {
    const buffer = Buffer.from(valor, "base64");
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const cifrado = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const texto = Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
    return { texto, error: null };
  } catch {
    return { texto: null, error: "No se pudo descifrar la contraseña." };
  }
}

const PALABRAS = ["azul", "verde", "rojo", "sol", "luna", "rio", "monte", "cielo", "mar", "flor", "nube", "roca"];

/** Contraseña fácil de dictar/escribir en el teléfono, ej. "monte4821". */
export function generarContrasena(): string {
  const palabra = PALABRAS[crypto.randomInt(PALABRAS.length)];
  const numero = crypto.randomInt(1000, 9999);
  return `${palabra}${numero}`;
}
