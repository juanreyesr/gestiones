import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trimestre } from "@/data/evaluacion";
import { construirPlanSupervision, estadoItem, type CursoBase, type EvaluacionMinima } from "@/lib/supervision";
import { appUrl, enviarMensaje, esc, fechaLocal, hora, type TelegramConfig } from "./telegram";

/** Minutos de anticipacion del aviso. */
export const ANTICIPACION_SUPERVISION_MIN = 5;
/** Margen para no perder un aviso si el cron de cada minuto se atrasa un poco. */
const VENTANA_MIN = ANTICIPACION_SUPERVISION_MIN + 1;

type RawPeriodo = {
  anio: number;
  trimestre: Trimestre;
  inicio_clases: string;
  inicio_plan: string;
  fin: string;
  semana_parcial: number | null;
};

type RawCurso = {
  id: string;
  nombre: string;
  horario: string | null;
  edificio: string | null;
  virtual: boolean | null;
  activo: boolean;
  anio: number;
  trimestre: Trimestre;
  docente_id: string | null;
  gestionesjj_docentes: { nombre: string } | null;
};

/**
 * Avisa por Telegram de las supervisiones del plan que empiezan en los
 * proximos 5 minutos, con un enlace que abre la evaluacion con docente y
 * curso cargados. El plan se calcula igual que en la vista (misma funcion y
 * las fechas del periodo guardadas en la base). Lo dispara pg_cron cada
 * minuto (migracion 040); cada supervision se avisa una sola vez.
 */
export async function enviarRecordatoriosSupervision(admin: SupabaseClient, config: TelegramConfig) {
  if (!config.chatId || !config.preferencias.supervision_recordatorio) return 0;

  const hoy = fechaLocal();
  const { data: periodos } = await admin
    .from("gestionesjj_supervision_periodos")
    .select("anio,trimestre,inicio_clases,inicio_plan,fin,semana_parcial")
    .lte("inicio_clases", hoy)
    .gte("fin", hoy);
  if (!periodos?.length) return 0;

  const [{ data: cursosRaw }, { data: docentesRaw }] = await Promise.all([
    admin
      .from("gestionesjj_cursos")
      .select("id,nombre,horario,edificio,virtual,activo,anio,trimestre,docente_id,gestionesjj_docentes(nombre)"),
    admin.from("gestionesjj_docentes").select("id,nombre").eq("activo", true),
  ]);
  const cursos: CursoBase[] = ((cursosRaw ?? []) as unknown as RawCurso[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    horario: c.horario,
    edificio: c.edificio,
    virtual: c.virtual ?? false,
    activo: c.activo,
    anio: c.anio,
    trimestre: c.trimestre,
    docenteId: c.docente_id,
    docenteNombre: c.gestionesjj_docentes?.nombre ?? null,
  }));
  const docentesActivos = new Map(((docentesRaw ?? []) as Array<{ id: string; nombre: string }>).map((d) => [d.id, d.nombre]));

  const ahora = Date.now();
  let enviados = 0;

  for (const periodo of periodos as RawPeriodo[]) {
    const { data: evaluacionesRaw } = await admin
      .from("evaluaciones_docentes")
      .select("id,docente_id,curso_id,fecha_observacion")
      .eq("anio", periodo.anio)
      .eq("trimestre", periodo.trimestre);
    const evaluaciones = (evaluacionesRaw ?? []) as EvaluacionMinima[];

    const { plan } = construirPlanSupervision({
      anio: periodo.anio,
      trimestre: periodo.trimestre,
      cursos,
      docentesActivos,
      evaluaciones,
      rango: {
        inicioClases: periodo.inicio_clases,
        inicio: periodo.inicio_plan,
        fin: periodo.fin,
        parcial: periodo.semana_parcial,
      },
    });

    const deHoy = plan.semanas.flatMap((s) => s.items).filter((item) => item.fecha === hoy);
    for (const item of deHoy) {
      // Guatemala es UTC-6 todo el ano (sin horario de verano).
      const inicio = new Date(`${item.fecha}T${item.inicio}:00-06:00`);
      const faltan = inicio.getTime() - ahora;
      if (faltan <= 0 || faltan > VENTANA_MIN * 60_000) continue;
      if (estadoItem(item, evaluaciones, hoy) === "realizada") continue;

      // Se registra antes de enviar: si dos ejecuciones se cruzan, solo una gana.
      const { data: registrado } = await admin
        .from("gestionesjj_telegram_recordatorios_supervision")
        .upsert(
          { curso_id: item.cursoId, inicio: inicio.toISOString() },
          { onConflict: "curso_id,inicio", ignoreDuplicates: true },
        )
        .select("curso_id");
      if (!registrado?.length) continue;

      const minutos = Math.max(1, Math.round(faltan / 60_000));
      const lugar = item.virtual ? "💻 Virtual" : item.edificio ? `🏫 Salón ${esc(item.edificio)}` : null;
      const texto = [
        `🎓 <b>Supervisión en ${minutos} min</b> — ${esc(hora(inicio.toISOString()))}`,
        `📚 ${esc(item.cursoNombre)}`,
        `👤 ${esc(item.docenteNombre)}`,
        lugar,
      ]
        .filter((linea) => linea !== null)
        .join("\n");

      const enlace = appUrl(`/?supervision=${encodeURIComponent(item.cursoId)}`);
      const res = await enviarMensaje(
        config.chatId,
        texto,
        enlace ? { botones: [[{ text: "▶️ Abrir la supervisión", url: enlace }]] } : undefined,
      );
      if (res.ok) enviados += 1;
    }
  }
  return enviados;
}
