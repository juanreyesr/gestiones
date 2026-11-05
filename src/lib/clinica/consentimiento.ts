/**
 * Consentimiento informado para la atención psicológica (presencial y virtual)
 * que se acepta en la hoja de datos generales (/datos/<token>).
 *
 * Marco de referencia (sin citar artículos para no atribuir numeraciones no
 * verificadas): Código de Ética del Colegio de Psicólogos de Guatemala;
 * Declaración Universal de Principios Éticos para Psicólogas y Psicólogos
 * (IUPsyS/IAAP, 2008); Código de Ética de la APA (normas 3.10, 4.02 y 10.01);
 * Guías de Telepsicología de la APA (2013, revisadas en 2024); Convención sobre
 * los Derechos del Niño (art. 12, derecho a ser escuchado) y Ley de Protección
 * Integral de la Niñez y Adolescencia de Guatemala (Decreto 27-2003).
 *
 * Al cambiar el texto, subir CONSENTIMIENTO_VERSION: cada aceptación guarda el
 * texto completo y la versión en gestionesjj_consentimientos.
 */

export const CONSENTIMIENTO_VERSION = "2026-11";

export const PROFESIONAL = "Lic. Juan J. Reyes, psicólogo";

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

export type DatosConsentimiento = {
  esMenor: boolean;
  /** Nombre del paciente (el niño, niña o adolescente si es menor). */
  pacienteNombre: string;
  /** Documento del paciente adulto (opcional). */
  pacienteIdentificacion?: string;
  responsables?: Responsable[];
};

export type SeccionConsentimiento = { titulo: string; parrafos: string[] };

const nombreO = (v: string, alterno: string) => (v.trim() ? v.trim() : alterno);

function identificacionDe(r: Responsable) {
  return r.identificacion.trim() ? `${r.tipoIdentificacion || "documento"} ${r.identificacion.trim()}` : "documento pendiente";
}

/** Secciones del consentimiento, adaptadas a adulto o menor de edad. */
export function seccionesConsentimiento(d: DatosConsentimiento): SeccionConsentimiento[] {
  const menor = d.esMenor;
  const paciente = nombreO(d.pacienteNombre, menor ? "el niño, niña o adolescente" : "la persona consultante");
  const firmantes = (d.responsables ?? []).filter((r) => r.nombre.trim());
  const plural = menor && firmantes.length > 1;
  // "usted" para adultos; "ustedes / su hijo(a)" para padres.
  const quien = menor ? (plural ? "ustedes" : "usted") : "usted";
  const elPaciente = menor ? `su hijo, hija o representado(a) ${paciente}` : "usted";

  const secciones: SeccionConsentimiento[] = [];

  secciones.push({
    titulo: "Identificación",
    parrafos: menor
      ? [
          `Paciente (menor de edad): ${paciente}.`,
          firmantes.length
            ? `Firman en calidad de padre, madre o tutor(a) legal: ${firmantes
                .map((r) => `${r.nombre.trim()} (${nombreO(r.parentesco, "parentesco por indicar")}, ${identificacionDe(r)})`)
                .join("; ")}.`
            : "Firman en calidad de padre, madre o tutor(a) legal: (datos por completar en el formulario).",
          `Profesional: ${PROFESIONAL}.`,
        ]
      : [
          `Paciente: ${paciente}${d.pacienteIdentificacion?.trim() ? `, documento ${d.pacienteIdentificacion.trim()}` : ""}.`,
          `Profesional: ${PROFESIONAL}.`,
        ],
  });

  secciones.push({
    titulo: "1. Naturaleza del servicio",
    parrafos: [
      `La atención psicológica consiste en entrevistas, evaluación (incluidos cuestionarios en línea) e intervención con base en métodos reconocidos por la psicología, con el fin de comprender el motivo de consulta y trabajar objetivos acordados con ${quien}.`,
      "Al inicio se realiza una evaluación; con sus resultados se propone un plan de tratamiento, su duración aproximada y la frecuencia de las sesiones, que se revisan periódicamente.",
      "La psicoterapia puede traer beneficios (alivio de síntomas, mejores recursos personales y familiares), pero también puede generar incomodidad temporal al abordar temas difíciles. No se puede garantizar un resultado específico.",
      "La atención psicológica no sustituye la valoración médica o psiquiátrica. Cuando se considere necesario, se recomendará una interconsulta o referencia.",
    ],
  });

  secciones.push({
    titulo: "2. Participación voluntaria",
    parrafos: [
      `La participación es voluntaria. ${menor ? "Ustedes pueden" : "Usted puede"} hacer preguntas en cualquier momento, rechazar una técnica o evaluación propuesta y retirar este consentimiento cuando lo deseen, sin perjuicio alguno. Se recomienda conversarlo en sesión para cerrar el proceso de forma adecuada.`,
    ],
  });

  secciones.push({
    titulo: "3. Confidencialidad y sus límites",
    parrafos: [
      "Todo lo que se comparte en la atención es confidencial y se usa únicamente para la atención psicológica. No se entrega información a terceros sin autorización escrita, salvo en estos casos:",
      "a) Riesgo grave e inminente para la vida o la integridad del paciente o de otras personas. b) Sospecha o conocimiento de maltrato, abuso o negligencia contra un niño, niña, adolescente u otra persona vulnerable, que la ley obliga a denunciar ante las autoridades. c) Orden de una autoridad judicial competente. d) Supervisión o consulta clínica con otros profesionales, en la que no se revela la identidad del paciente.",
      "En esos casos se comparte solo la información estrictamente necesaria y, cuando sea posible y seguro, se informa antes.",
    ],
  });

  secciones.push({
    titulo: "4. Expediente y uso de herramientas digitales",
    parrafos: [
      "Se lleva un expediente clínico con los datos generales, notas de sesión, cuestionarios y evaluaciones. Se resguarda en un sistema protegido con contraseña, al que solo tiene acceso el psicólogo tratante, y en servidores que cifran la información almacenada.",
      "Los cuestionarios que se envían por enlace se integran al expediente. Sus resultados los interpreta el psicólogo y se conversan en sesión; no constituyen por sí solos un diagnóstico.",
      "Para apoyar la redacción de resúmenes de sesión pueden usarse herramientas de inteligencia artificial, siempre bajo revisión del psicólogo. Ninguna decisión clínica se toma de forma automática.",
      `${menor ? "Ustedes pueden" : "Usted puede"} solicitar información sobre el contenido del expediente; se entregará un informe en los términos que la ética profesional y la ley permitan.`,
    ],
  });

  secciones.push({
    titulo: "5. Citas, honorarios y cancelaciones",
    parrafos: [
      "Las sesiones duran aproximadamente 50 minutos. Los honorarios y la forma de pago se acuerdan antes de iniciar.",
      "Si no puede asistir, se solicita avisar con al menos 24 horas de anticipación. Las inasistencias sin aviso o las llegadas tarde pueden cobrarse y no extienden la sesión.",
      "Se autoriza el contacto por teléfono, WhatsApp o correo electrónico para confirmar, recordar o reprogramar citas y enviar cuestionarios o tareas.",
    ],
  });

  secciones.push({
    titulo: "6. Comunicación fuera de sesión y emergencias",
    parrafos: [
      "Los mensajes por WhatsApp o correo se usan para asuntos administrativos y de seguimiento breve; no son un medio de atención en crisis y pueden no responderse de inmediato.",
      "En una emergencia o crisis (riesgo de hacerse daño o de dañar a otros) se debe acudir al servicio de emergencias más cercano o llamar a los números de emergencia del lugar donde se encuentre.",
    ],
  });

  secciones.push({
    titulo: "7. Atención presencial",
    parrafos: [
      "Las sesiones presenciales se realizan en el consultorio, en un espacio privado. Se solicita puntualidad.",
      ...(menor
        ? [
            "Un padre, madre o tutor(a) debe acompañar al menor a la cita, permanecer en las instalaciones durante la sesión y recogerlo al terminar.",
          ]
        : []),
    ],
  });

  secciones.push({
    titulo: "8. Atención virtual (en línea)",
    parrafos: [
      "Las sesiones virtuales se realizan por videollamada en una plataforma segura. Tienen beneficios (acceso desde cualquier lugar) y limitaciones (calidad de la conexión, menor información no verbal, menor control de la privacidad del entorno).",
      `Se solicita conectarse desde un lugar privado y tranquilo, con audífonos si es posible, sin otras personas presentes salvo acuerdo previo, y no conducir ni realizar otras actividades durante la sesión.${
        menor
          ? " Un adulto responsable debe estar en casa durante la sesión del menor, disponible pero fuera de la habitación salvo que se le pida participar."
          : ""
      }`,
      "Al inicio de cada sesión virtual se puede confirmar la identidad y el lugar donde se encuentra el paciente, para saber a quién acudir en una emergencia. Debe mantenerse actualizado el contacto de emergencia.",
      "Si la conexión se interrumpe, el psicólogo intentará reconectar y, si no es posible, llamará al teléfono registrado para continuar o reprogramar.",
      "Ninguna de las partes graba la sesión (audio, video o capturas) sin el consentimiento expreso y por escrito de la otra.",
      "Si el psicólogo considera que la modalidad virtual no es adecuada para la situación (por ejemplo, ante riesgo elevado), recomendará la atención presencial o una referencia.",
      "Si el paciente se encuentra fuera de Guatemala, la atención se brinda desde Guatemala; puede ser necesario identificar recursos de emergencia del país donde se encuentra.",
    ],
  });

  if (menor) {
    secciones.push({
      titulo: "9. Atención de menores de edad",
      parrafos: [
        `Por tratarse de una persona menor de edad, este consentimiento lo otorga${plural ? "n" : ""} quien${plural ? "es" : ""} ejerce${plural ? "n" : ""} la patria potestad o la tutela legal. Se recomienda que ambos padres estén informados y de acuerdo con la atención; si existe una resolución judicial sobre custodia o tutela, debe informarse al psicólogo.`,
        `Además del consentimiento de los padres, se explicará a ${paciente}, con palabras adecuadas a su edad, en qué consiste la atención, y se tomará en cuenta su opinión (asentimiento), conforme a su derecho a ser escuchado.`,
        "Para que la terapia funcione, lo que el menor comparte en sesión se mantiene en reserva. Los padres o tutores reciben información general sobre el avance, las recomendaciones y las tareas, pero no el detalle de lo conversado, salvo en las situaciones del punto 3 (en particular, riesgo para el menor), en las que se informará a los padres o a las autoridades según corresponda.",
        "Los padres o tutores se comprometen a participar en las sesiones de orientación que se les soliciten y a responder los cuestionarios que se les envíen, que forman parte de la evaluación.",
      ],
    });
  }

  secciones.push({
    titulo: `${menor ? "10" : "9"}. Declaración`,
    parrafos: [
      menor
        ? `${plural ? "Declaramos" : "Declaro"} que ${plural ? "hemos" : "he"} leído y comprendido este consentimiento, que ${plural ? "hemos" : "he"} podido hacer preguntas, que la información proporcionada es verdadera y que ${plural ? "ejercemos" : "ejerzo"} la patria potestad o tutela legal de ${paciente}. ${plural ? "Autorizamos" : "Autorizo"} de forma libre y voluntaria la atención psicológica presencial y/o virtual de ${elPaciente} en los términos aquí descritos.`
        : "Declaro que he leído y comprendido este consentimiento, que he podido hacer preguntas, que la información que proporciono es verdadera y que acepto de forma libre y voluntaria recibir atención psicológica presencial y/o virtual en los términos aquí descritos.",
      "La aceptación electrónica de este documento (casilla de aceptación, nombre e identificación) tiene el mismo valor que una firma; se registran la fecha y la hora.",
    ],
  });

  return secciones;
}

/** Texto plano completo (lo que se guarda como constancia de lo aceptado). */
export function consentimientoComoTexto(d: DatosConsentimiento) {
  const titulo = `CONSENTIMIENTO INFORMADO PARA ATENCIÓN PSICOLÓGICA PRESENCIAL Y VIRTUAL${d.esMenor ? " (MENOR DE EDAD)" : ""} · versión ${CONSENTIMIENTO_VERSION}`;
  return [
    titulo,
    ...seccionesConsentimiento(d).map((s) => `${s.titulo.toUpperCase()}\n${s.parrafos.join("\n")}`),
  ].join("\n\n");
}
