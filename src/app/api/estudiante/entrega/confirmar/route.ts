import { after, NextResponse } from "next/server";
import { requireEstudiante } from "@/lib/server/auth";
import {
  BUCKET_ENTREGAS,
  MAX_BYTES_ENTREGA,
  UUID_RE,
  carpetaEntrega,
  registrarEntrega,
  validarArchivo,
  validarTareaParaEntrega,
} from "@/lib/server/entregas";
import { rateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { avisarEntrega } from "@/lib/server/telegram-avisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paso 2 de la subida directa: el archivo ya está en Storage. Se comprueba
 * que la ruta sea de la carpeta de este estudiante para esta tarea, que el
 * objeto exista y que su tamaño real respete el límite; luego se registra la
 * entrega y se avisa por Telegram.
 */
export async function POST(request: Request) {
  if (!rateLimit(request, { key: "estudiante-entrega-confirmar", limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const auth = await requireEstudiante(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "El servicio no está disponible." }, { status: 500 });

  const body = await request.json().catch(() => null);
  const actividadId = typeof body?.actividadId === "string" ? body.actividadId : "";
  const path = typeof body?.path === "string" ? body.path : "";
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const mime = typeof body?.mime === "string" && body.mime ? body.mime.slice(0, 120) : null;
  if (!UUID_RE.test(actividadId)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });

  const carpeta = carpetaEntrega(actividadId, auth.estudianteId);
  const archivoEnCarpeta = path.startsWith(`${carpeta}/`) ? path.slice(carpeta.length + 1) : "";
  if (!archivoEnCarpeta || archivoEnCarpeta.includes("/")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 422 });
  }

  // Confirmar dos veces (doble clic, reintento) no duplica el archivo.
  const { data: yaRegistrado } = await admin
    .from("gestionesjj_curso_entrega_archivos")
    .select("id")
    .eq("archivo_path", path)
    .maybeSingle();
  if (yaRegistrado) return NextResponse.json({ ok: true, tardia: false });

  const { data: objetos, error: listError } = await admin.storage
    .from(BUCKET_ENTREGAS)
    .list(carpeta, { search: archivoEnCarpeta, limit: 10 });
  const objeto = objetos?.find((item) => item.name === archivoEnCarpeta);
  if (listError || !objeto) {
    return NextResponse.json({ error: "El archivo no llegó completo. Intenta de nuevo." }, { status: 422 });
  }
  const tamanoReal = Number((objeto.metadata as { size?: number } | null)?.size ?? 0);

  const errorArchivo = validarArchivo(nombre, tamanoReal);
  if (errorArchivo || tamanoReal > MAX_BYTES_ENTREGA) {
    await admin.storage.from(BUCKET_ENTREGAS).remove([path]);
    return NextResponse.json({ error: errorArchivo ?? "El archivo no puede pesar más de 20 MB." }, { status: 422 });
  }

  const tarea = await validarTareaParaEntrega(admin, actividadId, auth.estudianteId);
  if (!tarea.ok) {
    await admin.storage.from(BUCKET_ENTREGAS).remove([path]);
    return NextResponse.json({ error: tarea.error }, { status: tarea.status });
  }

  const registro = await registrarEntrega(admin, {
    actividadId,
    estudianteId: auth.estudianteId,
    fechaLimite: tarea.fechaLimite,
    path,
    nombre,
    mime,
  });
  if (!registro.ok) {
    await admin.storage.from(BUCKET_ENTREGAS).remove([path]);
    return NextResponse.json({ error: registro.error }, { status: registro.status });
  }

  const { cursoId } = tarea;
  after(() =>
    avisarEntrega({ actividadId, estudianteId: auth.estudianteId, cursoId, archivoNombre: nombre, tardia: registro.tardia }).catch(
      () => undefined,
    ),
  );

  return NextResponse.json({ ok: true, tardia: registro.tardia });
}
