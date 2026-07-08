import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";
import { deleteEvent, getStoredTokens, insertEvent, isGoogleConfigured, patchEvent } from "@/lib/server/google-calendar";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type RawCitaSync = {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
  contacto_nombre: string | null;
  gcal_event_id: string | null;
  gestionesjj_pacientes: { nombre: string } | null;
};

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as {
    citaId?: string;
    action?: "create" | "update" | "delete";
  } | null;

  if (!body?.citaId || !body.action) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  if (!isGoogleConfigured() || !admin) {
    return NextResponse.json({ status: "no_configurado" });
  }

  const tokens = await getStoredTokens();
  if (!tokens || tokens.estado !== "conectado") {
    return NextResponse.json({ status: "no_configurado" });
  }

  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,fin,motivo,contacto_nombre,gcal_event_id,gestionesjj_pacientes(nombre)")
    .eq("id", body.citaId)
    .maybeSingle();

  const cita = data as RawCitaSync | null;

  const setStatus = async (status: string, extra?: Record<string, unknown>) => {
    if (!cita) return;
    await admin.from("gestionesjj_citas").update({ gcal_sync_status: status, ...(extra ?? {}) }).eq("id", cita.id);
  };

  if (body.action === "delete") {
    if (!cita?.gcal_event_id) {
      return NextResponse.json({ status: "sin_evento" });
    }
    const { error } = await deleteEvent(cita.gcal_event_id);
    if (error) {
      await setStatus("error");
      return NextResponse.json({ status: "error", error });
    }
    await setStatus("sincronizada", { gcal_event_id: null });
    return NextResponse.json({ status: "eliminado" });
  }

  if (!cita) {
    return NextResponse.json({ error: "La cita no existe." }, { status: 404 });
  }

  const citaParaEvento = {
    id: cita.id,
    inicio: cita.inicio,
    fin: cita.fin,
    motivo: cita.motivo,
    nombre: cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "Paciente",
  };

  if (body.action === "update" && cita.gcal_event_id) {
    const result = await patchEvent(cita.gcal_event_id, citaParaEvento);
    if (result.error) {
      await setStatus("error");
      return NextResponse.json({ status: "error", error: result.error });
    }
    if ("nuevoEventId" in result && result.nuevoEventId) {
      await setStatus("sincronizada", { gcal_event_id: result.nuevoEventId });
    } else {
      await setStatus("sincronizada");
    }
    return NextResponse.json({ status: "sincronizada" });
  }

  // create (o update de una cita que nunca se sincronizo)
  const { eventId, error } = await insertEvent(citaParaEvento);
  if (error || !eventId) {
    await setStatus("error");
    return NextResponse.json({ status: "error", error });
  }
  await setStatus("sincronizada", { gcal_event_id: eventId });
  return NextResponse.json({ status: "sincronizada" });
}
