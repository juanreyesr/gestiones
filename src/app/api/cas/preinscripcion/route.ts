import { after, NextResponse } from "next/server";
import { PRACTICAS } from "@/lib/cas/aspirantes";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { appUrl, esc, notificar } from "@/lib/server/telegram";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Preinscripción pública al CAS UPANA (/cas/registro). El navegador no habla
 * con Supabase: esta ruta limita la frecuencia por IP, descarta bots (campo
 * trampa) y llama a la RPC gestionesjj_public_cas_preinscripcion, que valida e
 * inserta sin dar acceso de lectura a la tabla.
 */

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: Request) {
  if (!rateLimit(request, { key: "cas-preinscripcion", limit: 5, windowMs: 10 * 60_000 })) {
    return rateLimitResponse();
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ estado: "invalido" }, { status: 400 });
  }

  // Campo trampa: invisible para personas; si viene lleno es un bot. Se responde
  // «ok» para no darle pistas, pero no se guarda nada.
  if (texto(cuerpo.sitio, 200).trim() !== "") {
    return NextResponse.json({ estado: "ok" });
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ estado: "error" }, { status: 503 });

  const datos = {
    p_nombre: texto(cuerpo.nombre, 200),
    p_carne: texto(cuerpo.carne, 60),
    p_practica: texto(cuerpo.practica, 40),
    p_telefono: texto(cuerpo.telefono, 60),
    p_correo_institucional: texto(cuerpo.correoInstitucional, 220),
    p_correo_personal: texto(cuerpo.correoPersonal, 220),
    p_disponibilidad: texto(cuerpo.disponibilidad, 1000),
    p_consentimiento: cuerpo.consentimiento === true,
    p_campus: texto(cuerpo.campus, 80).replace(/\s+/g, " ").trim(),
  };
  if (!datos.p_campus) return NextResponse.json({ estado: "invalido" }, { status: 400 });

  const { data, error } = await supabase.rpc("gestionesjj_public_cas_preinscripcion", datos);
  if (error) {
    console.error("[cas/preinscripcion] rpc", { ip: getClientIp(request), mensaje: error.message });
    return NextResponse.json({ estado: "error" }, { status: 500 });
  }

  // Con la migración 075 la RPC responde «ok:<número de orden>»; sin ella, «ok».
  const respuesta = typeof data === "string" ? data : "";
  const coincide = /^ok(?::(\d+))?$/.exec(respuesta);
  const numero = coincide?.[1] ? Number(coincide[1]) : null;
  const estado = coincide ? "ok" : respuesta === "duplicado" || respuesta === "cerrado" ? respuesta : "invalido";
  if (estado === "ok") {
    const practica = PRACTICAS.find((p) => p.id === datos.p_practica);
    after(async () => {
      const panel = appUrl("/admin");
      await notificar(
        "cas_preinscripciones",
        [
          `🎓 <b>CAS UPANA: nueva preinscripción${numero ? ` #${numero}` : ""}</b>`,
          `${esc(datos.p_nombre.trim())} · ID ${esc(datos.p_carne.trim().toUpperCase())}`,
          practica ? `${esc(practica.nombre)} (${esc(practica.detalle)})` : "",
          `🏫 ${esc(datos.p_campus)}`,
          `📞 ${esc(datos.p_telefono.trim())}`,
        ]
          .filter(Boolean)
          .join("\n"),
        panel ? { botones: [[{ text: "Abrir GestionesJJ", url: panel }]] } : undefined,
      );
    });
  }
  return NextResponse.json({ estado, numero }, { headers: { "Cache-Control": "no-store" } });
}
