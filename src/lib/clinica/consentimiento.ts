/**
 * Consentimiento informado para la atención psicológica (presencial y virtual)
 * que se acepta en la hoja de datos generales (/datos/<token>).
 *
 * El texto es una PLANTILLA EDITABLE desde Clínica → Configuración →
 * "Consentimiento informado" (tabla gestionesjj_consentimiento_plantillas,
 * migración 058). Cada vez que se guarda se crea una versión nueva; la más
 * reciente es la que se muestra. Cada aceptación guarda el texto completo y
 * la versión en gestionesjj_consentimientos, así que editar la plantilla no
 * altera lo que ya firmaron los pacientes.
 *
 * PLANTILLA_INICIAL es solo el respaldo si la tabla está vacía o no responde.
 * Marco de referencia del texto inicial (sin citar artículos para no atribuir
 * numeraciones no verificadas): Código de Ética del Colegio de Psicólogos de
 * Guatemala; Declaración Universal de Principios Éticos para Psicólogas y
 * Psicólogos (IUPsyS/IAAP, 2008); Código de Ética de la APA (3.10, 4.02,
 * 10.01); Guías de Telepsicología de la APA (2013, revisadas en 2024);
 * Convención sobre los Derechos del Niño (art. 12) y Ley de Protección
 * Integral de la Niñez y Adolescencia de Guatemala (Decreto 27-2003).
 */

export type Responsable = {
  nombre: string;
  tipoIdentificacion: string;
  identificacion: string;
  parentesco: string;
  telefono: string;
};

export const RESPONSABLE_VACIO: Responsable = {
  nombre: "",
  tipoIdentificacion: "DPI",
  identificacion: "",
  parentesco: "",
  telefono: "",
};

export const TIPOS_IDENTIFICACION = ["DPI", "Pasaporte", "Otro documento"] as const;
export const PARENTESCOS = ["Madre", "Padre", "Tutor/a legal", "Otro (con representación legal)"] as const;

export type AplicaA = "todos" | "adulto" | "menor";

export type SeccionPlantilla = {
  titulo: string;
  /** Un párrafo por línea. Admite {paciente}, {responsables} y {profesional}. */
  texto: string;
  aplica: AplicaA;
};

export type PlantillaConsentimiento = {
  /** Versión que queda registrada con cada aceptación (p. ej. "3"). */
  version: string;
  /** Nombre y título del profesional, tal como aparece en la identificación. */
  profesional: string;
  secciones: SeccionPlantilla[];
};

export const MARCADORES: { marcador: string; descripcion: string }[] = [
  { marcador: "{paciente}", descripcion: "nombre del paciente (o del niño, niña o adolescente)" },
  { marcador: "{responsables}", descripcion: "padres o tutores que firman, con parentesco y documento (solo menores)" },
  { marcador: "{profesional}", descripcion: "su nombre, como lo escriba arriba" },
];

export const PLANTILLA_INICIAL: PlantillaConsentimiento = {
  version: "1",
  profesional: "Lic. Juan J. Reyes, psicólogo",
  secciones: [
    {
      titulo: "Naturaleza del servicio",
      aplica: "todos",
      texto: [
        "La atención psicológica consiste en entrevistas, evaluación (incluidos cuestionarios en línea) e intervención con base en métodos reconocidos por la psicología, con el fin de comprender el motivo de consulta y trabajar objetivos acordados.",
        "Al inicio se realiza una evaluación; con sus resultados se propone un plan de tratamiento, su duración aproximada y la frecuencia de las sesiones, que se revisan periódicamente.",
        "La psicoterapia puede traer beneficios (alivio de síntomas, mejores recursos personales y familiares), pero también puede generar incomodidad temporal al abordar temas difíciles. No se puede garantizar un resultado específico.",
        "La atención psicológica no sustituye la valoración médica o psiquiátrica. Cuando se considere necesario, se recomendará una interconsulta o referencia.",
      ].join("\n"),
    },
    {
      titulo: "Participación voluntaria",
      aplica: "todos",
      texto:
        "La participación es voluntaria. Se pueden hacer preguntas en cualquier momento, rechazar una técnica o evaluación propuesta y retirar este consentimiento cuando se desee, sin perjuicio alguno. Se recomienda conversarlo en sesión para cerrar el proceso de forma adecuada.",
    },
    {
      titulo: "Confidencialidad y sus límites",
      aplica: "todos",
      texto: [
        "Todo lo que se comparte en la atención es confidencial y se usa únicamente para la atención psicológica. No se entrega información a terceros sin autorización escrita, salvo en estos casos:",
        "a) Riesgo grave e inminente para la vida o la integridad del paciente o de otras personas. b) Sospecha o conocimiento de maltrato, abuso o negligencia contra un niño, niña, adolescente u otra persona vulnerable, que la ley obliga a denunciar ante las autoridades. c) Orden de una autoridad judicial competente. d) Supervisión o consulta clínica con otros profesionales, en la que no se revela la identidad del paciente.",
        "En esos casos se comparte solo la información estrictamente necesaria y, cuando sea posible y seguro, se informa antes.",
      ].join("\n"),
    },
    {
      titulo: "Expediente clínico",
      aplica: "todos",
      texto: [
        "Se lleva un expediente clínico con los datos generales, notas de sesión, cuestionarios y evaluaciones. Se resguarda en un sistema protegido con contraseña, al que solo tiene acceso el psicólogo tratante, y en servidores que cifran la información almacenada.",
        "Los cuestionarios que se envían por enlace se integran al expediente. Sus resultados los interpreta el psicólogo y se conversan en sesión; no constituyen por sí solos un diagnóstico.",
        "Se puede solicitar información sobre el contenido del expediente; se entregará un informe en los términos que la ética profesional y la ley permitan.",
      ].join("\n"),
    },
    {
      titulo: "Citas, honorarios y cancelaciones",
      aplica: "todos",
      texto: [
        "Las sesiones duran aproximadamente 50 minutos. Los honorarios y la forma de pago se acuerdan antes de iniciar.",
        "Si no se puede asistir, se solicita avisar con al menos 24 horas de anticipación. Las inasistencias sin aviso o las llegadas tarde pueden cobrarse y no extienden la sesión.",
        "Se autoriza el contacto por teléfono, WhatsApp o correo electrónico para confirmar, recordar o reprogramar citas y enviar cuestionarios o tareas.",
      ].join("\n"),
    },
    {
      titulo: "Comunicación fuera de sesión y emergencias",
      aplica: "todos",
      texto: [
        "Los mensajes por WhatsApp o correo se usan para asuntos administrativos y de seguimiento breve; no son un medio de atención en crisis y pueden no responderse de inmediato.",
        "En una emergencia o crisis (riesgo de hacerse daño o de dañar a otros) se debe acudir al servicio de emergencias más cercano o llamar a los números de emergencia del lugar donde se encuentre.",
      ].join("\n"),
    },
    {
      titulo: "Atención presencial",
      aplica: "todos",
      texto: "Las sesiones presenciales se realizan en el consultorio, en un espacio privado. Se solicita puntualidad.",
    },
    {
      titulo: "Atención presencial de menores",
      aplica: "menor",
      texto:
        "Un padre, madre o tutor(a) debe acompañar al menor a la cita, permanecer en las instalaciones durante la sesión y recogerlo al terminar.",
    },
    {
      titulo: "Atención virtual (en línea)",
      aplica: "todos",
      texto: [
        "Las sesiones virtuales se realizan por videollamada en una plataforma segura. Tienen beneficios (acceso desde cualquier lugar) y limitaciones (calidad de la conexión, menor información no verbal, menor control de la privacidad del entorno).",
        "Se solicita conectarse desde un lugar privado y tranquilo, con audífonos si es posible, sin otras personas presentes salvo acuerdo previo, y no conducir ni realizar otras actividades durante la sesión.",
        "Al inicio de cada sesión virtual se puede confirmar la identidad y el lugar donde se encuentra el paciente, para saber a quién acudir en una emergencia. Debe mantenerse actualizado el contacto de emergencia.",
        "Si la conexión se interrumpe, el psicólogo intentará reconectar y, si no es posible, llamará al teléfono registrado para continuar o reprogramar.",
        "Ninguna de las partes graba la sesión (audio, video o capturas) sin el consentimiento expreso y por escrito de la otra.",
        "Si el psicólogo considera que la modalidad virtual no es adecuada para la situación (por ejemplo, ante riesgo elevado), recomendará la atención presencial o una referencia.",
        "Si el paciente se encuentra fuera de Guatemala, la atención se brinda desde Guatemala; puede ser necesario identificar recursos de emergencia del país donde se encuentra.",
      ].join("\n"),
    },
    {
      titulo: "Atención virtual de menores",
      aplica: "menor",
      texto:
        "Un adulto responsable debe estar en casa durante la sesión virtual del menor, disponible pero fuera de la habitación salvo que se le pida participar.",
    },
    {
      titulo: "Atención de menores de edad",
      aplica: "menor",
      texto: [
        "Por tratarse de una persona menor de edad, este consentimiento lo otorgan quienes ejercen la patria potestad o la tutela legal. Se recomienda que ambos padres estén informados y de acuerdo con la atención; si existe una resolución judicial sobre custodia o tutela, debe informarse al psicólogo.",
        "Además del consentimiento de los padres, se explicará a {paciente}, con palabras adecuadas a su edad, en qué consiste la atención, y se tomará en cuenta su opinión (asentimiento), conforme a su derecho a ser escuchado.",
        "Para que la terapia funcione, lo que el menor comparte en sesión se mantiene en reserva. Los padres o tutores reciben información general sobre el avance, las recomendaciones y las tareas, pero no el detalle de lo conversado, salvo en las situaciones de riesgo descritas en «Confidencialidad y sus límites», en las que se informará a los padres o a las autoridades según corresponda.",
        "Los padres o tutores se comprometen a participar en las sesiones de orientación que se les soliciten y a responder los cuestionarios que se les envíen, que forman parte de la evaluación.",
      ].join("\n"),
    },
    {
      titulo: "Declaración",
      aplica: "adulto",
      texto: [
        "Declaro que he leído y comprendido este consentimiento, que he podido hacer preguntas, que la información que proporciono es verdadera y que acepto de forma libre y voluntaria recibir atención psicológica presencial y/o virtual en los términos aquí descritos.",
        "La aceptación electrónica de este documento (casilla de aceptación, nombre e identificación) tiene el mismo valor que una firma; se registran la fecha y la hora.",
      ].join("\n"),
    },
    {
      titulo: "Declaración",
      aplica: "menor",
      texto: [
        "Quienes firmamos declaramos que hemos leído y comprendido este consentimiento, que hemos podido hacer preguntas, que la información proporcionada es verdadera y que ejercemos la patria potestad o tutela legal de {paciente}. Autorizamos de forma libre y voluntaria su atención psicológica presencial y/o virtual en los términos aquí descritos.",
        "La aceptación electrónica de este documento (casilla de aceptación, nombre e identificación) tiene el mismo valor que una firma; se registran la fecha y la hora.",
      ].join("\n"),
    },
  ],
};

export type DatosConsentimiento = {
  esMenor: boolean;
  /** Nombre del paciente (el niño, niña o adolescente si es menor). */
  pacienteNombre: string;
  /** Documento del paciente adulto (opcional). */
  pacienteIdentificacion?: string;
  responsables?: Responsable[];
};

export type SeccionConsentimiento = { titulo: string; parrafos: string[] };

const LIMITES = { secciones: 40, titulo: 120, texto: 6000, profesional: 120 };

/** Normaliza una plantilla que viene de la base de datos (o del editor). */
export function normalizarPlantilla(p: unknown): PlantillaConsentimiento | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (!Array.isArray(o.secciones)) return null;
  const secciones = (o.secciones as unknown[])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      titulo: String(s.titulo ?? "").trim().slice(0, LIMITES.titulo),
      texto: String(s.texto ?? "").trim().slice(0, LIMITES.texto),
      aplica: (["todos", "adulto", "menor"].includes(String(s.aplica)) ? s.aplica : "todos") as AplicaA,
    }))
    .filter((s) => s.titulo || s.texto)
    .slice(0, LIMITES.secciones);
  if (secciones.length === 0) return null;
  return {
    version: String(o.version ?? "").trim().slice(0, 20) || "1",
    profesional: String(o.profesional ?? "").trim().slice(0, LIMITES.profesional) || PLANTILLA_INICIAL.profesional,
    secciones,
  };
}

const identificacionDe = (r: Responsable) =>
  r.identificacion.trim() ? `${r.tipoIdentificacion || "documento"} ${r.identificacion.trim()}` : "documento pendiente";

/** Secciones del consentimiento para una persona concreta (adulto o menor). */
export function seccionesConsentimiento(
  d: DatosConsentimiento,
  plantilla: PlantillaConsentimiento = PLANTILLA_INICIAL
): SeccionConsentimiento[] {
  const menor = d.esMenor;
  const paciente = d.pacienteNombre.trim() || (menor ? "el niño, niña o adolescente" : "la persona consultante");
  const firmantes = (d.responsables ?? []).filter((r) => r.nombre.trim());
  const textoResponsables = firmantes.length
    ? firmantes
        .map((r) => `${r.nombre.trim()} (${r.parentesco.trim() || "parentesco por indicar"}, ${identificacionDe(r)})`)
        .join("; ")
    : "(datos por completar en el formulario)";
  const llenar = (t: string) =>
    t
      .replaceAll("{paciente}", paciente)
      .replaceAll("{responsables}", textoResponsables)
      .replaceAll("{profesional}", plantilla.profesional);

  const identificacion: SeccionConsentimiento = {
    titulo: "Identificación",
    parrafos: menor
      ? [
          `Paciente (menor de edad): ${paciente}.`,
          `Firman en calidad de padre, madre o tutor(a) legal: ${textoResponsables}.`,
          `Profesional: ${plantilla.profesional}.`,
        ]
      : [
          `Paciente: ${paciente}${d.pacienteIdentificacion?.trim() ? `, documento ${d.pacienteIdentificacion.trim()}` : ""}.`,
          `Profesional: ${plantilla.profesional}.`,
        ],
  };

  const aplicables = plantilla.secciones.filter((s) => s.aplica === "todos" || s.aplica === (menor ? "menor" : "adulto"));
  return [
    identificacion,
    ...aplicables.map((s, i) => ({
      titulo: `${i + 1}. ${llenar(s.titulo)}`,
      parrafos: llenar(s.texto)
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    })),
  ];
}

/** Texto plano completo (lo que se guarda como constancia de lo aceptado). */
export function consentimientoComoTexto(d: DatosConsentimiento, plantilla: PlantillaConsentimiento = PLANTILLA_INICIAL) {
  const titulo = `CONSENTIMIENTO INFORMADO PARA ATENCIÓN PSICOLÓGICA PRESENCIAL Y VIRTUAL${d.esMenor ? " (MENOR DE EDAD)" : ""} · versión ${plantilla.version}`;
  return [
    titulo,
    ...seccionesConsentimiento(d, plantilla).map((s) => `${s.titulo.toUpperCase()}\n${s.parrafos.join("\n")}`),
  ].join("\n\n");
}
