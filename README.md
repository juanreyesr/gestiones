# GestionesJJ

Centro personal para gestionar areas de trabajo y vida: Iglesia, Clinica, Coordinacion, Cursos y CAEDUC.

## Primera fase

- Interfaz moderna con fondo 3D e ingreso privado.
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
- **Auto-agendamiento** (`/agendar`): pagina publica tipo Calendly donde los pacientes solicitan cita en los espacios libres; cada solicitud requiere aprobacion. Se activa desde Configuracion.
- **Google Calendar** (opcional): las citas se sincronizan a tu calendario y tus eventos ocupados se restan de la disponibilidad. Requiere `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

### Configurar Google Calendar (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto y habilita la **Google Calendar API**.
2. En "Credenciales" crea un **ID de cliente OAuth 2.0** tipo "Aplicacion web" con URI de redireccion `https://TU-DOMINIO/api/google/oauth/callback` (y `http://localhost:3000/api/google/oauth/callback` para desarrollo).
3. Define `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` y `SUPABASE_SECRET_KEY` (service role de Supabase) en Vercel.
4. En Clinica → Configuracion pulsa "Conectar Google Calendar".

Sin estas variables todo funciona igual; cada cita ofrece un enlace manual "Añadir a Google Calendar".

### Resumenes con IA (opcional)

Define `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`) en Vercel. Sin la clave, el cierre de sesion se llena manualmente con el mismo formulario.

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

Las librerias pesadas (`jspdf` para exportar PDFs, `exceljs` para Excel, `docx` para los documentos Word del area Iglesia, y `three`/`@react-three` del fondo 3D) se cargan solo cuando realmente se usan (import dinamico / `next/dynamic` con `ssr: false`) en vez de ir en el paquete inicial de la app — confirmado revisando que no aparecen en el manifiesto de carga inmediata del build de produccion.

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
