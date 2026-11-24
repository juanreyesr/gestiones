import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { catalogoParaPrompt, RECURSO_IDS, type ContextoPlan, type PlanIA } from "@/lib/clinica/plan-ia-catalogo";
import { requireOwner } from "@/lib/server/auth";
import { modeloIA, registrarError, registrarLlamada } from "@/lib/server/ia-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    sintesis: {
      type: "string",
      description: "Formulación breve del caso y momento del proceso (3 a 5 frases), para el psicólogo.",
    },
    etapa: {
      type: "integer",
      description: "Etapa TCC en la que conviene trabajar ahora: 1 evaluación y formulación, 2 psicoeducación, 3 técnicas cognitivas, 4 técnicas conductuales, 5 prevención de recaídas.",
    },
    metas: {
      type: "array",
      description: "De 1 a 4 metas terapéuticas concretas y observables. Parte de las metas del paciente (ficha 1.1) si existen.",
      items: {
        type: "object",
        properties: {
          meta: { type: "string", description: "Meta concreta y observable, en lenguaje del paciente." },
          indicador: { type: "string", description: "Cómo se medirá el avance (algo que se pueda contar o puntuar)." },
          plazo: { type: "string", description: "Plazo realista (p. ej. «6 semanas»)." },
          estado: { type: "string", enum: ["nueva", "en_curso", "lograda", "estancada"] },
        },
        required: ["meta", "indicador", "plazo", "estado"],
        additionalProperties: false,
      },
    },
    recursos: {
      type: "array",
      description: "De 1 a 4 recursos de la plataforma (fichas o instrumentos del catálogo) a usar, en orden de prioridad.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: [...RECURSO_IDS] },
          para_que: { type: "string", description: "Para qué sirve en este caso, en una frase." },
          cuando: { type: "string", enum: ["ahora", "proxima_sesion", "reevaluacion"] },
        },
        required: ["id", "para_que", "cuando"],
        additionalProperties: false,
      },
    },
    tareas_semana: {
      type: "array",
      items: { type: "string" },
      description: "De 1 a 4 tareas concretas para el paciente esta semana (qué, cuándo, cuántas veces), ligadas a las metas.",
    },
    mensaje_paciente: {
      type: "string",
      description: "Mensaje de WhatsApp para el paciente (sin saludo ni nombre), de tú, cálido y claro.",
    },
    foco_proxima_sesion: { type: "string", description: "Qué revisar y trabajar en la próxima sesión, en viñetas que empiecen con «- »." },
    alertas: {
      type: "array",
      items: { type: "string" },
      description: "Riesgos o señales a vigilar según los datos (vacía si no hay).",
    },
  },
  required: ["sintesis", "etapa", "metas", "recursos", "tareas_semana", "mensaje_paciente", "foco_proxima_sesion", "alertas"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Eres un asistente de apoyo clínico para un psicólogo que trabaja con terapia cognitivo-conductual (TCC) en Guatemala. Con el expediente que te comparten, propones un plan de seguimiento de metas terapéuticas usando SOLO los recursos de su plataforma.

${catalogoParaPrompt()}

Reglas:
- Escribe en español de Guatemala, profesional y conciso. No emitas diagnósticos; puedes hablar de hipótesis o áreas a explorar.
- Usa únicamente datos del expediente. No inventes resultados, metas ni acuerdos.
- Metas: concretas, observables y con indicador medible. Si hay metas de la ficha 1.1, respétalas y mejóralas; si no hay, propónlas a partir del motivo de consulta (estado «nueva»). Juzga «en_curso», «lograda» o «estancada» solo con evidencia de las sesiones o evaluaciones.
- Recursos: elige del catálogo lo más útil para la etapa actual. No recomiendes fichas ya respondidas ni enlaces que ya están abiertos, salvo como reevaluación justificada. Si no hay evaluación de base (EAPI o MCEA) o la última tiene más de 4 semanas, considera aplicarla («reevaluacion»). Respeta la edad mínima y quién responde cada instrumento. Si no hay ficha 1.1, prioriza la 1.1.
- Tareas de la semana: pequeñas, específicas (qué, cuándo, cuántas veces) y ligadas a una meta; incluye cómo registrar el avance (p. ej. puntuar de 0 a 10).
- Mensaje al paciente: de tú, cálido, sin tecnicismos ni resultados de pruebas, máximo 900 caracteres. Estructura: 1) en qué estamos trabajando (las metas en palabras sencillas), 2) qué hacer esta semana (lista con «•»), 3) cómo anotar su avance, 4) que puede escribir si algo se complica. Sin saludo inicial ni nombre (se agregan aparte). Si hay señales de riesgo, no las menciones en el mensaje: van en «alertas».
- Alertas: si hay ideación suicida, autolesión, riesgo o deterioro fiable en los datos, indícalo primero y con claridad.
- Es una propuesta para el criterio del psicólogo, que decide qué aplicar.`;

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ia] ANTHROPIC_API_KEY no configurada: el plan con IA no está disponible.");
    return NextResponse.json({ noConfigurado: true }, { status: 503 });
  }

  const contexto = (await request.json().catch(() => null)) as ContextoPlan | null;
  if (!contexto?.paciente) return NextResponse.json({ error: "Falta el contexto del paciente." }, { status: 400 });
  const tieneBase =
    texto(contexto.paciente.motivoConsulta, 10) ||
    texto(contexto.paciente.motivoPaciente, 10) ||
    (contexto.sesiones?.length ?? 0) > 0 ||
    (contexto.evaluaciones?.length ?? 0) > 0 ||
    (contexto.metasFicha?.length ?? 0) > 0;
  if (!tieneBase) {
    return NextResponse.json(
      { error: "Aún no hay datos para un plan: registra el motivo de consulta, una sesión o una evaluación." },
      { status: 422 }
    );
  }

  const enfoque = texto(contexto.enfoque, 600);
  const contenido = [
    enfoque ? `Lo que el psicólogo quiere priorizar: ${enfoque}` : null,
    `Fecha de hoy: ${new Date().toISOString().slice(0, 10)}`,
    `Expediente (JSON):\n${JSON.stringify({ ...contexto, enfoque: undefined }).slice(0, 60000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const modelo = modeloIA();
  const inicio = Date.now();
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: modelo,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contenido }],
      output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    });
    const plan = response.parsed_output as PlanIA | null;
    registrarLlamada("plan", inicio, response, Boolean(plan));
    if (!plan) return NextResponse.json({ error: "La IA no devolvió un plan válido. Intenta de nuevo." }, { status: 502 });

    // Recorta a lo útil y descarta recursos repetidos.
    const vistos = new Set<string>();
    return NextResponse.json({
      ...plan,
      etapa: Math.min(5, Math.max(1, Math.round(plan.etapa) || 1)),
      metas: plan.metas.slice(0, 4),
      recursos: plan.recursos.filter((r) => !vistos.has(r.id) && vistos.add(r.id)).slice(0, 4),
      tareas_semana: plan.tareas_semana.slice(0, 4),
      alertas: plan.alertas.slice(0, 5),
    });
  } catch (error) {
    registrarError("plan", modelo, inicio, error);
    return NextResponse.json({ error: "No se pudo generar el plan con IA. Intenta de nuevo en un momento." }, { status: 502 });
  }
}
