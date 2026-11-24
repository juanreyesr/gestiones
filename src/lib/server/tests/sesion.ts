/**
 * Cuentas de la plataforma de tests: NO usan Supabase Auth (ver migración 072).
 * Contraseña con scrypt y sesión en una cookie httpOnly firmada con HMAC.
 * La clave de firma se deriva de SUPABASE_SERVICE_ROLE_KEY (o TESTS_SESION_SECRET si se define),
 * así no hace falta configurar nada nuevo en Vercel.
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>;

export const COOKIE_SESION = "tests_sesion";
const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

function clave(): Buffer | null {
  const base = process.env.TESTS_SESION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  return createHmac("sha256", "gestionesjj-tests-sesion").update(base).digest();
}

/* ------------------------------ contraseñas ------------------------------ */

export async function cifrarContrasena(contrasena: string) {
  const sal = randomBytes(16);
  const hash = await scrypt(contrasena, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function verificarContrasena(contrasena: string, guardado: string) {
  const [alg, salB64, hashB64] = guardado.split("$");
  if (alg !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(contrasena, Buffer.from(salB64, "base64"), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/** Reglas mínimas: 8 caracteres con al menos una letra y un número. */
export function errorContrasena(c: string) {
  if (c.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (c.length > 200) return "La contraseña es demasiado larga.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(c) || !/\d/.test(c)) return "La contraseña debe tener al menos una letra y un número.";
  return null;
}

/* -------------------------------- sesión -------------------------------- */

type Carga = { u: string; v: number; e: number };

function firmar(carga: Carga) {
  const k = clave();
  if (!k) return null;
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  const firma = createHmac("sha256", k).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

function leerFirmado(valor: string | undefined): Carga | null {
  const k = clave();
  if (!k || !valor) return null;
  const [cuerpo, firma] = valor.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", k).update(cuerpo).digest();
  const recibida = Buffer.from(firma, "base64url");
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const c = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as Carga;
    if (typeof c.u !== "string" || typeof c.v !== "number" || typeof c.e !== "number" || c.e < Date.now()) return null;
    return c;
  } catch {
    return null;
  }
}

export async function iniciarSesion(usuarioId: string, version: number) {
  const valor = firmar({ u: usuarioId, v: version, e: Date.now() + DURACION_MS });
  if (!valor) return false;
  (await cookies()).set(COOKIE_SESION, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_MS / 1000,
  });
  return true;
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export type UsuarioTests = {
  id: string;
  correo: string;
  nombre: string;
  fechaNacimiento: string;
  pais: string | null;
  telefono: string | null;
  aceptaContacto: boolean;
  intereses: string[];
};

/** Usuario de la sesión actual (o null). Verifica firma, vencimiento y versión de la contraseña. */
export async function usuarioActual(): Promise<UsuarioTests | null> {
  const carga = leerFirmado((await cookies()).get(COOKIE_SESION)?.value);
  const admin = getSupabaseAdmin();
  if (!carga || !admin) return null;
  const { data } = await admin
    .from("tests_usuarios")
    .select("id,correo,nombre,fecha_nacimiento,pais,telefono,acepta_contacto,intereses,sesion_version")
    .eq("id", carga.u)
    .maybeSingle();
  const u = data as {
    id: string;
    correo: string;
    nombre: string;
    fecha_nacimiento: string;
    pais: string | null;
    telefono: string | null;
    acepta_contacto: boolean;
    intereses: string[];
    sesion_version: number;
  } | null;
  if (!u || u.sesion_version !== carga.v) return null;
  return {
    id: u.id,
    correo: u.correo,
    nombre: u.nombre,
    fechaNacimiento: u.fecha_nacimiento,
    pais: u.pais,
    telefono: u.telefono,
    aceptaContacto: u.acepta_contacto,
    intereses: u.intereses ?? [],
  };
}

/** Edad en años cumplidos a hoy. */
export function edadDe(fechaNacimiento: string) {
  const [a, m, d] = fechaNacimiento.split("-").map(Number);
  const hoy = new Date();
  let e = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e -= 1;
  return e;
}
