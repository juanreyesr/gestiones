import { getSupabaseAdmin } from "./supabase-admin";
import { esc, isTelegramConfigured, notificar, recortar } from "./telegram";
import { botonesSolicitudCita, textoMensajeEstudiante, textoSolicitudCita } from "./telegram-bot";

/**
 * Avisos al owner por Telegram desde las rutas de la app. Se llaman dentro
 * de after() (despues de responder al usuario) y nunca lanzan: si Telegram
 * no esta configurado o falla, la accion original no se entera.
 */

export async function avisarSolicitudCita(solicitudId: string) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data: sol } = await admin
    .from("gestionesjj_solicitudes_cita")
    .select("nombre,telefono,email,motivo,inicio,ya_es_paciente,primera_sesion,dar_seguimiento")
    .eq("id", solicitudId)
    .maybeSingle();
  if (!sol) return;
  await notificar("citas_solicitudes", textoSolicitudCita(sol), { botones: botonesSolicitudCita(solicitudId) });
}

export async function avisarMensajeEstudiante(estudianteId: string, contenido: string | null, archivoNombre: string | null) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data: estudiante } = await admin.from("gestionesjj_estudiantes").select("nombre").eq("id", estudianteId).maybeSingle();
  await notificar("estudiantes_mensajes", textoMensajeEstudiante(estudiante?.nombre ?? "Estudiante", contenido, archivoNombre), {
    hilo: { tipo: "mensaje_estudiante", refId: estudianteId },
  });
}

export async function avisarEntrega(input: {
  actividadId: string;
  estudianteId: string;
  cursoId: string;
  archivoNombre: string;
  tardia: boolean;
}) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const [{ data: actividad }, { data: estudiante }, { data: curso }] = await Promise.all([
    admin.from("gestionesjj_curso_actividades").select("titulo").eq("id", input.actividadId).maybeSingle(),
    admin.from("gestionesjj_estudiantes").select("nombre").eq("id", input.estudianteId).maybeSingle(),
    admin.from("gestionesjj_cursos_impartidos").select("nombre").eq("id", input.cursoId).maybeSingle(),
  ]);
  await notificar(
    "estudiantes_entregas",
    [
      `📥 <b>Entrega${input.tardia ? " tardía" : ""}</b>`,
      `${esc(estudiante?.nombre ?? "Estudiante")} entregó <b>${esc(actividad?.titulo ?? "una tarea")}</b>`,
      curso?.nombre ? `📚 ${esc(curso.nombre)}` : null,
      `📎 ${esc(input.archivoNombre)}`,
    ]
      .filter((linea) => linea !== null)
      .join("\n"),
  );
}

export async function avisarSolicitudCurso(input: { cursoId: string; nombre: string; correo: string }) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data: curso } = await admin.from("gestionesjj_cursos_impartidos").select("nombre").eq("id", input.cursoId).maybeSingle();
  await notificar(
    "cursos_solicitudes",
    [
      "🎓 <b>Nueva solicitud de inscripción</b>",
      `${esc(input.nombre)} (${esc(input.correo)})`,
      curso?.nombre ? `📚 ${esc(curso.nombre)}` : null,
      "",
      "<i>Apruébala desde Cursos → Estudiantes en GestionesJJ.</i>",
    ]
      .filter((linea) => linea !== null)
      .join("\n"),
  );
}

export async function avisarRespuestaEncuesta(token: string, expectativa: string | null) {
  const admin = getSupabaseAdmin();
  if (!isTelegramConfigured() || !admin) return;
  const { data: campana } = await admin
    .from("gestionesjj_encuestas_campanas")
    .select("id,titulo,anio")
    .eq("token", token)
    .maybeSingle();
  if (!campana) return;
  const { count } = await admin
    .from("gestionesjj_encuestas_respuestas")
    .select("id", { count: "exact", head: true })
    .eq("campana_id", campana.id);
  await notificar(
    "encuestas_respuestas",
    [
      `📊 <b>Nueva respuesta</b> en «${esc(campana.titulo)}» (${campana.anio})`,
      `Van ${count ?? "?"} respuestas.`,
      expectativa ? `💭 “${esc(recortar(expectativa, 500))}”` : null,
    ]
      .filter((linea) => linea !== null)
      .join("\n"),
  );
}
