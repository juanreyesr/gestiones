# GestionesJJ

Centro personal para gestionar areas de trabajo y vida: Iglesia, Clinica, Coordinacion, Cursos y CAEDUC.

## Primera fase

- Interfaz moderna, minimalista, con fondo negro e ingreso privado.
- Modulo inicial de Coordinacion para evaluacion docente.
- Seleccion de docente, curso, ano, trimestre y fecha.
- Rubrica por categorias de planeacion, docencia, metodologia, sesiones, evaluacion y plataforma.
- Evaluacion 360 con dos entrevistas estudiantiles y dos fortalezas destacadas.
- Dashboard preliminar con rendimiento, avance, areas de mejora y analisis por categoria.
- Conexion preparada para Supabase con correo y contrasena mediante Supabase Auth.

## Modulo Clinica

Centro de gestion de pacientes y sesiones de terapia:

- **Pacientes**: hoja de datos generales guardable de forma incremental (basta nombre y telefono), expediente con historial completo de sesiones, ficha clinica y compromisos pendientes.
- **Sesiones**: al iniciar pregunta "¿De que quiere hablar hoy: algo especifico o seguimiento de la sesion anterior?". En seguimiento muestra el resumen previo; en tema nuevo muestra solo los compromisos/tareas anteriores. Notas con autoguardado, checklist de compromisos, y cierre con resumen (generado con IA si hay `ANTHROPIC_API_KEY`, editable siempre), aspectos de seguimiento, compromisos y tareas para la proxima sesion.
- **Agenda**: vista semanal y de lista, estados de cita (pendiente, confirmada, completada, cancelada, no asistio), proteccion contra doble reserva a nivel de base de datos.
- **Reservas de Calendly (u otros sistemas) vía Google Calendar**: cada 10 minutos se revisan los eventos de tus calendarios y los que traen datos de un formulario de reserva (Calendly: "Nombre del evento", preguntas y respuestas, telefono, consentimiento) se leen solos (`src/lib/clinica/reserva-google.ts`). Cada reserva se busca contra tus pacientes por telefono (ultimos 8 digitos), correo o nombre completo (`src/lib/clinica/coincidencias.ts`) y se resuelve desde **Telegram** (botones) o desde **Clinica → Solicitudes** (lo primero que se haga): vincular al paciente existente, crear el paciente con los datos del formulario (motivo, notas y consentimiento aceptado), o ignorar. Resolver crea la cita en la agenda de la clinica enlazada al mismo evento de Google, sin duplicarlo. Si el evento se borra en Google, la reserva pendiente se marca cancelada. Tabla `gestionesjj_google_reservas` (migracion `036`).
- **Pacientes de otros paises**: cada expediente tiene **Pais** y, en paises con varias zonas (Mexico, EE. UU., Canada, Espana), **Zona horaria** (migracion `037`). Ambos son opcionales: "Automatico" deduce el pais del `+codigo` del telefono y, si no lo trae, asume Guatemala, asi los expedientes existentes no se tocan (`src/lib/paises.ts`). Con eso el enlace de WhatsApp lleva el codigo correcto, el recordatorio al paciente dice la hora en SU zona ("11:00 p. m., hora de Espana; en Guatemala seran las 3:00 p. m.") y la busqueda de pacientes compara el numero completo con codigo de pais. El formulario publico de datos del paciente (`/datos/...`) tambien pide **Pais** (y zona si aplica) junto al telefono, que se guarda con `+codigo` (migracion `038`). En `/agendar` el telefono tiene selector de pais (se preselecciona segun la zona del navegador) y, si el visitante no esta en la hora de Guatemala, se aclara que los horarios se muestran en su hora local y a que hora son en Guatemala.
- **Auto-agendamiento** (`/agendar`): pagina publica tipo Calendly donde los pacientes solicitan cita en los espacios libres; cada solicitud requiere aprobacion. Se activa desde Configuracion.
- **Google Calendar** (opcional): las citas se sincronizan a tu calendario y los eventos ocupados de **todos tus calendarios visibles** en Google (el principal, compartidos, suscritos o sincronizados desde otros sistemas) se restan de la disponibilidad de `/agendar`. La verificacion se repite al enviar la solicitud, asi que un horario que se ocupo despues de abrir la pagina ya no se puede pedir. Los eventos marcados como "Disponible" en Google (cumpleanos, feriados) no bloquean. Requiere `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

### Dominio publico

La app responde en `www.juanjreyes.org` (dominio propio; `juanjreyes.org` redirige a `www`) y en `gestionesjj.vercel.app`. Define `NEXT_PUBLIC_APP_URL=https://www.juanjreyes.org`: los enlaces que se comparten (agendar, encuestas, QR de sesiones en vivo, asignacion a cursos, datos del paciente, resumen para jefatura) salen siempre con ese dominio aunque estes navegando desde el de Vercel (`src/lib/url-publica.ts`), y el webhook de Telegram se registra ahi al vincular.

### Configurar Google Calendar (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto y habilita la **Google Calendar API**.
2. En "Credenciales" crea un **ID de cliente OAuth 2.0** tipo "Aplicacion web" con **una URI de redireccion por cada dominio** desde el que vayas a conectar: `https://www.juanjreyes.org/api/google/oauth/callback` y `https://gestionesjj.vercel.app/api/google/oauth/callback` (y `http://localhost:3000/api/google/oauth/callback` para desarrollo). La conexion vuelve al mismo dominio donde se inicio.
3. Define `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` y `SUPABASE_SECRET_KEY` (service role de Supabase) en Vercel.
4. En Clinica → Configuracion pulsa "Conectar Google Calendar".

Importante: en la **pantalla de consentimiento OAuth** usa tipo "Externo" y, al terminar, pasa el estado de publicacion de "Testing" a **"In production"**. En modo Testing Google emite tokens que vencen a los 7 dias y el calendario se desconectaria cada semana. Como la app no esta verificada por Google, al conectar aparece "Google no verificó esta app": entra a *Configuracion avanzada → Ir a GestionesJJ (no seguro)*; es tu propia app y solo la usa tu cuenta.

Sin estas variables todo funciona igual; cada cita ofrece un enlace manual "Añadir a Google Calendar".

### Resumenes con IA (opcional)

Define `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`) en Vercel. Sin la clave, el cierre de sesion se llena manualmente con el mismo formulario.

## Telegram (avisos y control desde el chat)

Un bot privado de Telegram que avisa de lo que pasa en la plataforma y deja actuar sin abrir la app. Solo el chat vinculado por el owner puede darle ordenes; cualquier otro chat recibe "Este bot es privado".

**Avisos que llegan** (cada uno se activa o desactiva desde el panel):

- 🩺 **Solicitud de cita** desde `/agendar`, con botones **Aprobar** / **Rechazar**. Aprobar crea el paciente y la cita igual que desde la app (misma funcion `gestionesjj_aprobar_solicitud`) y, si Google Calendar esta conectado, crea el evento.
- 💬 **Mensaje de un estudiante** (texto y nombre del adjunto). **Responder** a ese aviso en Telegram le contesta al estudiante: el mensaje aparece en su panel y los suyos quedan como leidos.
- 📥 **Entrega de tarea** (marca si fue tardia), 🎓 **solicitud de inscripcion** a un curso y 📊 **respuestas de encuestas** (esta ultima apagada por defecto).
- ☀️ **Resumen diario a las 7:00 a. m.** (Guatemala): citas del dia, pendientes que vencen hoy o vencidos, solicitudes y mensajes por atender, con un boton **📲 Recordar a …** por cada cita de hoy que abre WhatsApp con el recordatorio listo para el paciente.
- ⏰ **Aviso 1 hora antes de tus compromisos de Google Calendar** (de cualquier calendario visible; no los de todo el dia ni las citas de la clinica, que tienen su propio aviso), con hora, calendario, lugar y boton **🎥 Unirse** si tiene Google Meet. Usa el mismo job de `pg_cron` y la tabla `gestionesjj_telegram_recordatorios_google` (migracion `035`).
- ⏰ **Recordatorio 1 hora antes de cada cita** (paciente, hora, modalidad y motivo) con boton para mandarle el recordatorio por WhatsApp. Cada cita se avisa una vez; si se reprograma, se vuelve a avisar.

**Comandos del bot**: `/agenda` (citas de la clinica + compromisos de Google Calendar; acepta `hoy`, `mañana`, `viernes`, `15/10`, `esta semana`, `próxima semana`, `14 días`; tambien responde a preguntas escritas normal como "¿qué tengo mañana?"), `/hoy` (resumen, que ya incluye los compromisos de Google del dia), `/citas` (proximos 7 dias), `/solicitudes` (con botones para aprobar), `/pendientes` (vencidos y de los proximos 3 dias, con boton ✅ Listo), `/nuevo texto` (anota un pendiente en el primer grupo del primer tablero), `/agendar` (enlace de la pagina de citas con mensaje listo y boton para compartir por WhatsApp), `/datos nombre` (enlace para que el paciente llene sus datos generales, con boton de WhatsApp a su numero; si ya los lleno ofrece reabrirlo; tambien entiende "pasame el enlace de datos de Ana"), `/mensajes` (mensajes de estudiantes sin leer, cada uno respondible) y `/ayuda`.

### Configurar Telegram

1. En Telegram abre **@BotFather**, envia `/newbot`, elige nombre y usuario, y copia el token.
2. En Vercel define `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` y `CRON_SECRET` (ver `.env.example`), ademas de `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_APP_URL`, y vuelve a desplegar.
3. Aplica las migraciones `033_gestionesjj_telegram.sql` y `034_gestionesjj_telegram_recordatorios.sql`.
4. Para los recordatorios antes de cada cita: en Supabase → Project Settings → **Vault** crea un secreto llamado `gestionesjj_cron_secret` con el **mismo valor** de `CRON_SECRET`. Vercel Hobby solo permite cron diario, asi que el disparador cada 10 minutos es `pg_cron` + `pg_net` de Supabase (job `gestionesjj_recordatorios_citas`), que llama a `POST /api/telegram/recordatorios` con ese secreto. Sin el secreto la ruta responde 401 y simplemente no hay recordatorios.
5. En el panel pulsa **Conectar Telegram → Vincular Telegram**: registra el webhook, fija los comandos del bot y genera un enlace de un solo uso (vence en 15 minutos, con QR). Abrelo en tu telefono y pulsa **Iniciar**.

Seguridad: el webhook rechaza toda peticion sin el header `X-Telegram-Bot-Api-Secret-Token` correcto; el codigo de vinculacion se guarda solo como SHA-256; las tablas `gestionesjj_telegram_config` y `gestionesjj_telegram_hilos` tienen RLS sin politicas (solo el servidor con service role las toca), y `gestionesjj_telegram_aprobar_solicitud` solo la puede ejecutar `service_role`. Si Telegram falla, la accion que origino el aviso no se ve afectada (los avisos se envian con `after()`, despues de responder).

## Modulo Cursos

Centro de gestion de los cursos que se imparten en distintas universidades:

- **Universidades**: tarjetas con logo (o iniciales sobre un color de acento), siglas y contador de cursos. CRUD completo con confirmacion antes de borrar (borra en cascada sus cursos y todo su contenido).
- **Cursos reutilizables**: al crear un curso se puede reutilizar un curso anterior de cualquier universidad; se clonan automaticamente sus planificaciones, semanas, contenidos y tareas (no se clonan estudiantes, asistencias ni calificaciones, para que el curso nuevo inicie limpio en esos aspectos).
- **Semanas**: cada semana agrupa contenidos, materiales extra, tareas/actividades (con o sin punteo) y asistencia. Se puede marcar una semana como examen parcial o final al programarla.
- **Estudiantes**: alta, retiro y reincorporacion con historial completo de movimientos (fecha y nota opcional en cada evento).
- **Seguimiento de asistencia**: al gestionar la asistencia de una semana se muestra automaticamente la asistencia y nota de la semana anterior de cada estudiante ("Semana pasada: Ausente con excusa — mando justificante"), y un banner resalta las tareas que corresponde entregar segun lo programado la semana previa.
- **Modo presentacion**: los archivos de contenido (PDF, Office, imagenes) se pueden abrir en un visor de pantalla completa con boton de pantalla completa nativa del navegador.
- **Reporte final**: por curso, un PDF con resumen general, historial de estudiantes, matriz de asistencia con porcentaje por estudiante, y el detalle de actividades y calificaciones por semana.

La migracion de este modulo esta en `supabase/migrations/008_gestionesjj_area_cursos.sql`, que ademas crea el bucket privado de storage `gestionesjj-cursos` (con politicas RLS equivalentes a las del resto de tablas del modulo) para logos de universidades y archivos de curso.

### Area de estudiantes (Fase 0)

Acceso real de estudiantes al curso, con cuenta propia (correo + contrasena, ambos asignados por el owner desde el panel, sin auto-registro):

- **Checkbox "Dar acceso a estudiantes"** en cada curso (pestaña Semanas del curso): controla si ese curso es visible en `/estudiante`.
- **Boton "Ver como estudiante"** en el curso: previsualiza exactamente lo que vera un estudiante (por ahora, en esta fase, solo el estado vacio; las semanas y contenidos habilitados llegan en la siguiente fase).
- **Pestaña Estudiantes**: por cada estudiante se puede "Dar acceso" (crea su cuenta real de Supabase Auth y la identidad global en `gestionesjj_estudiantes`, o la reutiliza si el mismo correo ya tiene acceso en otro curso), regenerar su contraseña, reimprimir su ficha o desactivar/reactivar su cuenta. Un boton aparte imprime en PDF las fichas de credenciales de todo el curso (una tarjeta recortable por estudiante, nunca una sola hoja con todos los usuarios y contraseñas juntos).
- **Portada** (`/`): dos accesos igual de visibles, "Acceso a estudiantes" (`/estudiante`) y "Acceso administrativo" (`/admin`, el panel de siempre, sin cambios).
- **Panel del estudiante** (`/estudiante`): login, bienvenida con su nombre, cambio de contraseña opcional, y la lista de cursos donde tiene acceso activo.

Decisiones de seguridad relevantes: la contraseña que asigna el owner se guarda cifrada (AES-256-GCM, llave en `ESTUDIANTES_ENC_KEY`, nunca en texto plano) para poder reimprimir la ficha cuando haga falta; los estudiantes nunca leen las tablas del modulo Cursos directo, solo a traves de RPCs `SECURITY DEFINER` (`gestionesjj_estudiante_mi_perfil`, `gestionesjj_estudiante_mis_cursos`) que exponen unicamente lo suyo. La migracion es `supabase/migrations/021_gestionesjj_area_estudiantes.sql`. Requiere `SUPABASE_SECRET_KEY` y `ESTUDIANTES_ENC_KEY` configuradas (ver `.env.example`).

## Enlace del resumen general para jefatura (dentro de Coordinacion)

El "Resumen general" de Coordinacion se puede compartir con jefatura en un enlace de **solo lectura**, sin cuenta y sin poder tocar nada:

- **Crear el enlace**: en Coordinacion → Resumen general, boton "Compartir con jefatura". Se le pone una etiqueta ("Decanatura", "Rectoria"...) para saber a quien se le dio cada enlace.
- **Lo que ve quien lo abre** (`/resumen/[token]`): exactamente los mismos bloques que ve la coordinacion — promedios, areas sobresalientes y de oportunidad, lo mas valorado y lo que hay que reforzar segun los estudiantes, comparativo por curso, tendencia por area y el listado de evaluaciones — con filtro de **trimestre (1, 2, 3 o todo el ano) y de ano, incluyendo "todos los anos"**. Tambien puede descargar el informe completo en PDF.
- **Solo lectura de verdad**: la pagina publica no expone ninguna escritura y la unica funcion que consulta (`gestionesjj_public_resumen_coordinacion`) solo lee. No hay botones de ver detalle, editar ni borrar.
- **Privacidad por defecto**: el enlace no comparte el nombre del docente (igual que el comparativo por curso, que se diseno sin nombres justamente para poder mostrarse), ni su correo, ni las observaciones escritas de cada observacion de clase. Al crear el enlace se puede marcar "Incluir nombres de docentes" si la jefatura si debe verlos; en ese caso el PDF tambien incluye el comparativo por docente.
- **Control del enlace**: se puede desactivar (deja de abrir, sin borrarlo), reactivar o borrar, y cada uno lleva la cuenta de cuantas veces se ha abierto y cuando fue la ultima vez.

La migracion es `020_gestionesjj_coordinacion_resumen_publico.sql` (tabla `gestionesjj_coordinacion_resumen_enlaces` con RLS owner-lock, sin grants para `anon`, y la RPC publica `SECURITY DEFINER` que entrega los datos ya despersonalizados). Esta aplicada en el proyecto de Supabase.

## Encuesta estudiantil (dentro de Coordinacion)

Mide, año contra año, por que los estudiantes de primer ingreso eligieron la universidad y la carrera, y que esperan de ambas — pensada para detectar el cambio de paradigma con el tiempo:

- **Campañas**: cada encuesta se lanza como una campaña con un año asignable (permite captura retroactiva de años anteriores) y, opcionalmente, una carrera. Cada campaña genera un **QR/enlace publico** (`/encuesta/[token]`) para compartir con los estudiantes; se puede cerrar y reabrir cuando se desee.
- **Formulario publico**: anonimo, sin cuenta, en 6 pasos cortos (como conocio la universidad, por que esta universidad, por que esta carrera, expectativas, perfil opcional, satisfaccion/NPS). Las preguntas de opcion multiple usan catalogos cerrados (con "otro" como escape) para que el dashboard pueda graficarlas de inmediato.
- **Captura rapida**: para transcribir encuestas en papel de años anteriores; el owner llena el mismo formulario en una sola pantalla y sigue con la siguiente sin perder el progreso.
- **Dashboard**: filtros por año(s) y carrera; metricas (respuestas, % primera opcion, satisfaccion promedio, NPS), graficas de barras por cada dimension (razones de universidad/carrera, fuente de conocimiento, quien influyo, expectativas), una **tabla de tendencia interanual** que muestra el % de cada razon de universidad por año (para comparar cualquier cantidad de años lado a lado), y las respuestas abiertas de "que esperas lograr".

La migracion de este modulo esta en `supabase/migrations/013_gestionesjj_encuestas_estudiantiles.sql`. El flujo publico (consultar campaña, responder) pasa por RPCs `SECURITY DEFINER`, igual que el resto de flujos publicos de la app; no requiere `SUPABASE_SECRET_KEY`.

## Modulo Pendientes (tareas y proyectos)

Un gestor de tareas propio inspirado en Monday, reducido a lo que se usa de verdad y con la estetica del resto de la app (fondo oscuro, esquinas rectas) pero conservando el lenguaje visual de Monday: franjas de color por grupo y pastillas de color por estado.

Es un boton del menu principal, no parte de un area: los mismos tableros sirven para la iglesia, la clinica, los cursos, la coordinacion o lo personal.

- **Tableros → grupos → pendientes → subtareas**: cada tablero es un frente de trabajo (un ministerio, un proyecto, el mes en curso); los grupos son las franjas de colores dentro del tablero. Al crear un tablero vienen tres grupos listos ("Esta semana", "Proximamente", "En espera").
- **Columnas editables en el sitio**: titulo, responsable (avatar con iniciales y autocompletado de los nombres ya usados), estado (Sin empezar / Trabajando en ello / Atorado / En revision / Listo), prioridad (Critica a Baja), fecha de inicio y fecha limite (en rojo si vencio, ambar si vence hoy o manana) y etiquetas libres.
- **Cuatro vistas de los mismos datos**: **Tabla** (con arrastrar y soltar para reordenar y mover entre grupos), **Kanban** (arrastrar una tarjeta a otra columna cambia su estado), **Calendario** (arrastrar a otro dia reprograma la fecha limite) y **Cronograma** (barras de inicio a limite, con el dia de hoy marcado).
- **Busqueda, filtros y orden**: por texto, estado, prioridad, responsable, ocultar los que ya estan listos; orden manual (arrastrando) o automatico por fecha, prioridad, estado o alfabetico.
- **Acciones en lote**: seleccionar varias filas para marcarlas listas, cambiarles el estado, moverlas de grupo o eliminarlas.
- **Panel del pendiente**: detalle completo, subtareas con su contador (2/5) e hilo de **actualizaciones** (la bitacora de lo que se fue haciendo).
- **Exportar a Word**: el tablero completo, agrupado, con estado, responsable, prioridad y fechas.

Sus tablas (`gestionesjj_pendientes_*`) nacieron en `014_gestionesjj_iglesia.sql`, cuando el modulo vivia dentro de Iglesia, y se renombraron en `016_gestionesjj_pendientes_renombrar.sql` al pasar al menu principal. Los disparadores sellan la fecha de completado al pasar un pendiente a "Listo", impiden subtareas de subtareas y hacen que las subtareas sigan a su pendiente cuando cambia de grupo.

## Area Iglesia

El area funciona como una rejilla de "botones": cada recurso es independiente y se van sumando sin tocar los anteriores.

### Predicas del mes

Arma el calendario mensual de predicadores. Cada domingo tiene tres celebraciones (7:30, 9:30 y 11:30) y el martes una (7:00 PM); el mes se genera completo con sus fechas al crearlo.

- **Dos catalogos independientes**: **Predicadores** y **Personas de cierre**. El segundo se precargo con los mismos nombres del primero, pero agregar o quitar en uno no toca al otro. En ambos se puede editar, inactivar (deja de aparecer al asignar pero conserva los meses ya armados) y eliminar.
- **Invitados**: al final de cada lista esta la opcion "Invitado…", que abre un espacio para escribir el nombre. Ese nombre vale solo para esa celebracion y no entra a ningun catalogo.
- **Cierre del domingo bajo casilla**: como normalmente no se designa a nadie, el domingo solo muestra "Asignar persona de cierre"; al marcarla aparece el selector. Si no se designa a nadie, el documento exportado dice **"No asignado"** (que es cuando cierra el pastor de la celebracion). El martes si lleva el cierre siempre a la vista.
- **Control de repeticiones**: junto a cada nombre aparece entre parentesis cuantas veces lleva asignado ese mes, y la celda se pinta en ambar cuando repite a alguien en el mismo horario dentro del mes, con un resumen arriba. Es un aviso, nunca un bloqueo.
- **Temas del ano**: los doce temas se definen una vez por ano y quedan precargados al crear cada mes. La seccion muestra primero el ano en curso, permite saltar a los demas anos cargados, editarlos todos de una vez, ver una tabla comparativa de todos los anos y exportar el listado a **PDF** ("Temas de Predicas" con su ano).
- **Texto para enviar**: genera el calendario en el mismo formato plano que se comparte por mensaje (Domingo N con sus tres predicadores, Martes N con predica y cierre, tema e instrucciones), editable antes de copiarlo, con boton de copiar y de descargar `.txt`.
- **Autoguardado**: cada cambio se guarda solo y todo sigue editable.
- **Exportar a Excel**: el calendario con el mes y el tema en el encabezado, una fila por celebracion agrupada por fecha, las instrucciones extra al pie y una hoja de resumen con cuantas predicas y cierres lleva cada persona (los invitados aparecen marcados como tales).

### Protocolos para actividades

El paso a paso de cada actividad del ministerio (la santa cena, un bautizo, una vigilia...), pensado para seguirse en vivo desde el telefono o proyectado.

- **Portada con los ya creados**: tarjetas con el titulo y las primeras lineas; se toca una para abrirla. Boton de crear arriba y buscador cuando hay muchos.
- **Editor sencillo**: titulo (el que se ve en la lista) y el texto del protocolo con negrita, cursiva, subrayado, cuatro tamanos, color, vinetas y numeracion. Guarda solo mientras se escribe.
- **Lectura con zoom**: botones de mas y menos que agrandan todo el documento; el tamano elegido se recuerda en el dispositivo. Los tamanos del editor se guardan en `em` justamente para que el zoom escale el documento completo sin romper las proporciones.
- **Pantalla completa propia**: una capa `position: fixed`, no la API de pantalla completa del navegador — esa se sale sola al cambiar de app o girar el telefono. Aqui solo se sale con la X de la esquina, que queda fija arriba y siempre visible, o con Escape.
- **Duplicar** un protocolo para partir de el sin tocar el original.

El HTML que produce el editor pasa siempre por `src/lib/iglesia/html-seguro.ts`, que deja unicamente las etiquetas y estilos de formato permitidos (nada de scripts, iframes ni manejadores de eventos), tanto al guardar como al mostrar. Al pegar texto se pega en plano, para no arrastrar los estilos de Word o del navegador.

### Bodas, cumpleanos y eventos

- **Doce tipos de evento** con su propio documento y sus roles: boda religiosa, matrimonio civil, aniversario de bodas, cumpleanos, quince anos, bautizo, presentacion de ninos, dedicacion, funeral, culto de accion de gracias, graduacion y otro.
- **Participantes por rol** (novio, novia, contrayente, festejado, bautizado, padres, padrinos, testigos, oficiante...) con documento y telefono; el titulo se sugiere solo ("Boda de Ana y Luis").
- **Ficha completa**: fecha, hora, lugar, direccion, oficiante, estado (planificado / confirmado / realizado / cancelado), contacto, asistentes estimados, programa u orden del culto y notas internas.
- **Descarga en Word (.docx real)**: constancia o programa con el encabezado de la iglesia, los datos generales, la tabla de participantes, el programa y las lineas de firma de quienes corresponde segun el tipo de evento. El nombre de la iglesia se configura desde el boton "Encabezado" y se guarda en el dispositivo.
- **Generar pendientes**: vuelca los preparativos tipicos del tipo de evento (consejeria prematrimonial, reservar el templo, ensayo...) como pendientes reales en el tablero que elijas, enlazados al evento. Es el puente entre esta area y el modulo Pendientes.

Las migraciones de estos modulos son `017_gestionesjj_iglesia_predicas.sql` y `018_gestionesjj_iglesia_predicas_cierres_temas.sql` (predicas del mes), `019_gestionesjj_iglesia_protocolos.sql` (protocolos), `014_gestionesjj_iglesia.sql` (tablas, RLS y disparadores), `015_gestionesjj_iglesia_indices_fk.sql` (indices de llave foranea) y `016_gestionesjj_pendientes_renombrar.sql` (renombra las tablas de pendientes al salir del area). Siguen el mismo patron de seguridad del resto: RLS owner-lock, sin acceso anonimo. Las tres estan aplicadas en el proyecto de Supabase.

## Modulo Recursos

Herramientas interactivas propias, estilo Mentimeter/Kahoot pero en tu propio entorno cerrado:

- **Mis recursos**: crea encuestas o quizzes reutilizables con preguntas de opcion multiple (barras), nube de palabras, pregunta abierta o escala de valoracion.
- **Lanzar en vivo**: genera una sesion con PIN de 6 digitos + QR + enlace publico (`/vivo/[pin]`). Los participantes entran desde su celular sin necesidad de cuenta, solo con un apodo.
- **Vista de presentador**: pantalla para proyectar con el QR grande, el PIN, el contador de participantes conectados y los resultados de la pregunta activa actualizandose en vivo (Supabase Realtime) segun el tipo de pregunta.
- **Historial**: al finalizar una sesion, sus resultados quedan guardados y consultables por separado.
- **Quiz tipo concurso (fase 2)**: al crear un recurso de tipo "Quiz", cada pregunta de opcion multiple marca su respuesta correcta, tiene un temporizador y un puntaje maximo. Los participantes ven la cuenta regresiva y, al responder, su resultado (correcto/incorrecto, puntos ganados) de inmediato. El presentador ve un ranking en vivo y, al finalizar la sesion, un podio con los primeros lugares. El tiempo transcurrido y los puntos se calculan siempre en el servidor (nunca con datos enviados por el participante) para que nadie pueda falsear su velocidad de respuesta.
- **Preguntas del publico / Q&A (fase 3)**: al crear un recurso de tipo "Q&A", el contenido lo genera el propio publico: cada asistente escribe sus preguntas en vivo desde su celular y vota las de los demas (las mas votadas suben). Aparecen de inmediato (moderacion abierta); el presentador puede marcarlas como respondidas, destacar una para proyectarla en grande, u ocultar las inapropiadas. El anonimato de quien pregunta es configurable por cada Q&A.
- **Reconexion de participantes**: si un participante recarga la pagina o pierde la senal a mitad de una actividad, `/vivo` recuerda su participante (localStorage) y lo reconecta automaticamente en vez de crear uno nuevo (evita perder el puntaje del quiz o inflar el contador de participantes). Puede salir manualmente con "¿No eres tú? Entrar con otro apodo".
- **Consultas de estado adaptables**: el celular del participante consulta el servidor cada 1.5s solo mientras hay una pregunta activa, cada 4s mientras espera, y se pausa por completo si la pestana queda en segundo plano (retomando de inmediato al volver) — reduce el consumo de datos y las llamadas al servidor en grupos grandes.

Las migraciones de este modulo estan en `supabase/migrations/009_gestionesjj_recursos.sql` (encuestas), `010_gestionesjj_recursos_quiz.sql` (quiz) y `011_gestionesjj_recursos_qa.sql` (preguntas del publico). El flujo publico (unirse, consultar estado, responder, enviar/votar preguntas) pasa por RPCs `SECURITY DEFINER` con validaciones anti-abuso, igual que el agendamiento de Clinica; no requiere `SUPABASE_SECRET_KEY`.

## Seguridad

- **Limite de peticiones (rate limiting)**: las rutas publicas (`/api/recursos/*`, `/api/booking/*`, `/api/datos/[token]`) limitan cuantas solicitudes acepta una misma IP por minuto (`src/lib/server/rate-limit.ts`), ademas de las validaciones que ya hacen las funciones de base de datos.
- **Cabeceras de seguridad**: `next.config.ts` agrega `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` y `Permissions-Policy` a toda la app.
- **RPCs de un solo uso (owner)**: `gestionesjj_crear_sesion` y `gestionesjj_activar_pregunta` estan restringidas a la cuenta autorizada a nivel de permisos de Postgres (`supabase/migrations/012_gestionesjj_seguridad_rpcs_owner.sql`), ademas de la validacion que ya hacian por dentro.
- Se recomienda activar "Leaked password protection" en el panel de Supabase (Authentication → Policies) para bloquear contrasenas filtradas conocidas; es una opcion del proyecto, no requiere cambios de codigo.

## Rendimiento

Las librerias pesadas (`jspdf` para exportar PDFs, `exceljs` para Excel, `docx` para los documentos Word del area Iglesia) se cargan solo cuando realmente se usan (import dinamico / `next/dynamic` con `ssr: false`) en vez de ir en el paquete inicial de la app — confirmado revisando que no aparecen en el manifiesto de carga inmediata del build de produccion.

## Supabase

Crear un archivo `.env.local` usando `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_LLAVE_PUBLICA
```

La migracion inicial esta en:

```bash
supabase/migrations/001_gestionesjj_evaluacion_docente.sql
```

Por seguridad, no se guarda ninguna contrasena en el repositorio. El usuario `lic.juanreyesr@gmail.com` debe existir en Supabase Auth con su contrasena configurada desde el panel de Supabase o mediante un flujo seguro de invitacion/creacion.

## Desarrollo local

```bash
pnpm install
pnpm dev
```

## Siguiente paso recomendado

El proyecto quedo preparado para conectarse a la base Ventasrr mediante Supabase. En el conector de Codex aparece como `juanreyesr's Project` con ref `ehxrsgfzegaxxdmxqqeg`.
