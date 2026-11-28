import { after, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { appUrl, esc, notificar } from "@/lib/server/telegram";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * «Actualizar mis datos» del CAS UPANA (/cas/mis-datos). El estudiante se
 * identifica con su carné y su correo institucional; las RPC (migración 075)
 * solo devuelven o cambian el registro si los dos coinciden. El límite por IP
 * frena a quien intente adivinar combinaciones.
 */

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const faltaFuncion = (e: { code?: string; message: string }) =>
  e.code === "PGRST202" || /could not find the function/i.test(e.message);

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "cas-mis-datos", limit: 10, windowMs: 10 * 60_000 })) {
    return rateLimitResponse();
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ estado: "invalido" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "error" }, { status: 503 });

  const carne = texto(cuerpo.carne, 60).trim();
  const correo = texto(cuerpo.correoInstitucional, 220).trim().toLowerCase();
  if (!carne || !correo) return NextResponse.json({ estado: "no_encontrado" });
  const sinCache = { headers: { "Cache-Control": "no-store" } };

  if (cuerpo.accion === "actualizar") {
    const datos = {
      p_carne: carne,
      p_correo_institucional: correo,
      p_nombre: texto(cuerpo.nombre, 200),
      p_telefono: texto(cuerpo.telefono, 60),
      p_correo_personal: texto(cuerpo.correoPersonal, 220),
      p_campus: texto(cuerpo.campus, 80),
      p_disponibilidad: texto(cuerpo.disponibilidad, 1000),
    };
    const { data, error } = await supabase.rpc("gestionesjj_public_cas_actualizar_datos", datos);
    if (error) {
      return NextResponse.json({ estado: faltaFuncion(error) ? "no_disponible" : "error" }, sinCache);
    }
    const estado = data === "ok" || data === "no_encontrado" ? data : "invalido";
    if (estado === "ok") {
      after(async () => {
        const panel = appUrl("/admin");
        await notificar(
          "cas_preinscripciones",
          [
            "✏️ <b>CAS UPANA: un estudiante actualizó sus datos</b>",
            `${esc(datos.p_nombre.trim())} · ID ${esc(carne.toUpperCase())}`,
            `📞 ${esc(datos.p_telefono.trim())}`,
          ].join("\n"),
          panel ? { botones: [[{ text: "Abrir GestionesJJ", url: panel }]] } : undefined,
        );
      });
    }
    return NextResponse.json({ estado }, sinCache);
  }

  const { data, error } = await supabase.rpc("gestionesjj_public_cas_mis_datos", {
    p_carne: carne,
    p_correo_institucional: correo,
  });
  if (error) {
    return NextResponse.json({ estado: faltaFuncion(error) ? "no_disponible" : "error" }, sinCache);
  }
  if (!data) return NextResponse.json({ estado: "no_encontrado" }, sinCache);
  return NextResponse.json({ estado: "ok", datos: data }, sinCache);
}
