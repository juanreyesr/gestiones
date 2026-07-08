import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/auth";

export const runtime = "nodejs";

const RESUMEN_SCHEMA = {
  type: "object",
  properties: {
    resumen: {
      type: "string",
      description: "Resumen clínico de la sesión en tercera persona, 2-4 párrafos.",
    },
    seguimiento: {
      type: "string",
      description: "Aspectos a los que se debe dar seguimiento en próximas sesiones.",
    },
    compromisos: {
      type: "array",
      items: { type: "string" },
      description: "Compromisos concretos que el paciente asumió en la sesión.",
    },
    tareas: {
      type: "array",
      items: { type: "string" },
      description: "Tareas específicas asignadas para realizar antes de la próxima sesión.",
    },
  },
  required: ["resumen", "seguimiento", "compromisos", "tareas"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Eres un asistente de un psicólogo clínico. A partir de las notas crudas que el psicólogo tomó durante una sesión de terapia, redactas la documentación clínica de la sesión.

Reglas estrictas:
- Escribe en español, en tercera persona y con tono profesional clínico ("El paciente refirió...", "Se trabajó...").
- Usa únicamente la información presente en las notas: NUNCA inventes datos, diagnósticos ni acuerdos que no estén escritos.
- El resumen debe ser fiel, conciso y útil para retomar el caso en la próxima sesión (2 a 4 párrafos).
- En "seguimiento" lista los aspectos que conviene vigilar o retomar (si no hay, devuelve una cadena vacía).
- En "compromisos" incluye solo compromisos que el paciente asumió explícitamente; en "tareas" solo tareas asignadas explícitamente. Si no hay, devuelve listas vacías.
- No incluyas el nombre completo del paciente en el texto.`;

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ noConfigurado: true }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    notas?: string;
    tema?: string | null;
    modalidad?: string | null;
    resumenAnterior?: string | null;
  } | null;

  const notas = body?.notas?.trim();
  if (!notas) {
    return NextResponse.json({ error: "No hay notas de la sesión para resumir." }, { status: 422 });
  }

  const contexto = [
    body?.modalidad === "seguimiento"
      ? "La sesión fue de SEGUIMIENTO de la sesión anterior."
      : body?.modalidad === "tema_nuevo"
        ? `La sesión abordó un tema específico: "${body?.tema ?? ""}".`
        : null,
    body?.resumenAnterior
      ? `Resumen de la sesión anterior (solo como contexto, no lo repitas):\n${body.resumenAnterior}`
      : null,
    `Notas crudas de la sesión de hoy:\n${notas.slice(0, 20000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contexto }],
      output_config: {
        format: {
          type: "json_schema",
          schema: RESUMEN_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    const parsed = response.parsed_output as {
      resumen: string;
      seguimiento: string;
      compromisos: string[];
      tareas: string[];
    } | null;

    if (!parsed) {
      return NextResponse.json({ error: "La IA no devolvió un resumen válido." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "No se pudo generar el resumen con IA. Escríbelo manualmente." },
      { status: 502 }
    );
  }
}
