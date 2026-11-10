import { after, NextResponse } from "next/server";
import { consentimientoComoTexto, type Responsable } from "@/lib/clinica/consentimiento";
import { plantillaVigente } from "@/lib/clinica/consentimiento-plantillas";
import { avisarDatosCompletados } from "@/lib/server/datos-pendientes";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawDatos = {
  estado: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  ocupacion: string | null;
  escolaridad: string | null;
  estado_civil: string | null;
  direccion: string | null;
  emergencia_nombre: string | null;
  emergencia_telefono: string | null;
  emergencia_relacion: string | null;
  referido_por: string | null;
  tiene_hijos: boolean | null;
  hijos: { nombre: string; edad: string }[] | null;
  vive_solo: boolean | null;
  convive_con: string[] | null;
  convive_otros: string | null;
  horario_trabajo: string | null;
  pais?: string | null;
  zona_horaria?: string | null;
  es_menor?: boolean | null;
  responsables?: Responsable[] | null;
  identificacion?: string | null;
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "datos-token", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "invalido" });

  const { data, error } = await supabase.rpc("gestionesjj_public_datos_get", { p_token: token });
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json({ estado: "invalido" });
  }
  const row = (Array.isArray(data) ? data[0] : data) as RawDatos;
  // Plantilla vigente del consentimiento (editable en Clínica → Configuración).
  const plantilla = await plantillaVigente(supabase);

  if (row.estado !== "ok") {
    return NextResponse.json({ estado: row.estado }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      estado: row.estado,
      nombre: row.nombre,
      telefono: row.telefono,
      email: row.email,
      fechaNacimiento: row.fecha_nacimiento,
      ocupacion: row.ocupacion,
      escolaridad: row.escolaridad,
      estadoCivil: row.estado_civil,
      direccion: row.direccion,
      emergenciaNombre: row.emergencia_nombre,
      emergenciaTelefono: row.emergencia_telefono,
      emergenciaRelacion: row.emergencia_relacion,
      referidoPor: row.referido_por,
      tieneHijos: row.tiene_hijos,
      hijos: row.hijos ?? [],
      viveSolo: row.vive_solo,
      conviveCon: row.convive_con ?? [],
      conviveOtros: row.convive_otros,
      horarioTrabajo: row.horario_trabajo,
      pais: row.pais ?? null,
      zonaHoraria: row.zona_horaria ?? null,
      esMenor: row.es_menor ?? false,
      responsables: Array.isArray(row.responsables) ? row.responsables : [],
      identificacion: row.identificacion ?? null,
      plantillaConsentimiento: plantilla,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(request, { key: "datos-token", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { token } = await params;
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ estado: "invalido" }, { status: 422 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "No disponible." }, { status: 503 });

  const str = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");
  const opt = (key: string) => {
    const v = str(key).trim();
    return v === "" ? null : v;
  };
  const bool = (key: string) => (typeof body[key] === "boolean" ? (body[key] as boolean) : null);

  const hijos = Array.isArray(body.hijos)
    ? (body.hijos as unknown[])
        .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
        .map((h) => ({
          nombre: typeof h.nombre === "string" ? h.nombre.trim().slice(0, 120) : "",
          edad: typeof h.edad === "string" ? h.edad.trim().slice(0, 20) : "",
        }))
        .filter((h) => h.nombre !== "" || h.edad !== "")
        .slice(0, 20)
    : [];

  const conviveCon = Array.isArray(body.conviveCon)
    ? (body.conviveCon as unknown[]).filter((o): o is string => typeof o === "string").slice(0, 12)
    : [];

  // El genero lo registra el terapeuta en la primera sesion, no el paciente:
  // se ignora lo que venga en el formulario y se conserva lo ya guardado
  // (la funcion de guardado reemplaza todos los campos).
  const { data: actual } = await supabase.rpc("gestionesjj_public_datos_get", { p_token: token });
  const filaActual = (Array.isArray(actual) ? actual[0] : actual) as RawDatos | null;
  const generoActual = filaActual?.estado === "ok" ? filaActual.genero : null;
  // "Menor de edad" lo marca el psicologo en el expediente; no se toma del formulario.
  const esMenor = filaActual?.estado === "ok" ? Boolean(filaActual.es_menor) : false;

  // Consentimiento informado obligatorio. El texto que queda como constancia se
  // arma aqui (no se acepta el que mande el navegador) con los mismos datos que
  // vio quien firma.
  if (body.consentimiento !== true) {
    return NextResponse.json(
      { error: "Debe aceptar el consentimiento informado para guardar su información." },
      { status: 422 }
    );
  }
  const recortar = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const responsables: Responsable[] = esMenor && Array.isArray(body.responsables)
    ? (body.responsables as unknown[])
        .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
        .map((r) => ({
          nombre: recortar(r.nombre, 120),
          tipoIdentificacion: recortar(r.tipoIdentificacion, 30),
          identificacion: recortar(r.identificacion, 40),
          parentesco: recortar(r.parentesco, 40),
          telefono: recortar(r.telefono, 30),
        }))
        .filter((r) => r.nombre !== "" || r.identificacion !== "")
        .slice(0, 2)
    : [];
  const identificacion = esMenor ? "" : recortar(body.identificacion, 40);
  const plantilla = await plantillaVigente(supabase);
  const consentimientoTexto = consentimientoComoTexto({
    esMenor,
    pacienteNombre: str("nombre"),
    pacienteIdentificacion: identificacion,
    responsables,
  }, plantilla);

  const { data, error } = await supabase.rpc("gestionesjj_public_datos_save", {
    p_token: token,
    p_nombre: str("nombre"),
    p_telefono: str("telefono"),
    p_email: opt("email"),
    p_fecha_nacimiento: opt("fechaNacimiento"),
    p_genero: generoActual,
    p_ocupacion: opt("ocupacion"),
    p_escolaridad: opt("escolaridad"),
    p_estado_civil: opt("estadoCivil"),
    p_direccion: opt("direccion"),
    p_emergencia_nombre: opt("emergenciaNombre"),
    p_emergencia_telefono: opt("emergenciaTelefono"),
    p_emergencia_relacion: opt("emergenciaRelacion"),
    p_referido_por: opt("referidoPor"),
    p_tiene_hijos: bool("tieneHijos"),
    p_hijos: hijos,
    p_vive_solo: bool("viveSolo"),
    p_convive_con: conviveCon,
    p_convive_otros: opt("conviveOtros"),
    p_horario_trabajo: opt("horarioTrabajo"),
    p_pais: opt("pais")?.toUpperCase().slice(0, 2) ?? null,
    p_zona_horaria: opt("zonaHoraria")?.slice(0, 64) ?? null,
    p_identificacion: identificacion || null,
    p_responsables: responsables,
    p_consentimiento_version: plantilla.version,
    p_consentimiento_texto: consentimientoTexto,
    p_asentimiento_menor: esMenor ? body.asentimientoMenor === true : null,
    p_declara_tutela: esMenor ? body.declaraTutela === true : null,
    p_ip: getClientIp(request).slice(0, 64),
    p_user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  // Aviso por Telegram de que la hoja de datos y el consentimiento quedaron completos.
  if (data === "guardado") after(() => avisarDatosCompletados(token).catch(() => undefined));
  return NextResponse.json({ estado: data as string });
}
