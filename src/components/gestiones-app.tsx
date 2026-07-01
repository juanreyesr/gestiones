"use client";

import type { Session } from "@supabase/supabase-js";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Church,
  GraduationCap,
  HeartPulse,
  ListChecks,
  LockKeyhole,
  LogOut,
  Mail,
  Plus,
  Printer,
  Save,
  Sparkles,
  Star,
  TrendingUp,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AREAS,
  CRITERIOS,
  ENTREVISTA_ESCALA,
  ENTREVISTA_PREGUNTAS,
  FORTALEZAS_OPCIONES,
  SCORE_LABELS,
  TRIMESTRES,
  type CursoRow,
  type DocenteRow,
  type Trimestre,
} from "@/data/evaluacion";
import { currentTrimestre } from "@/lib/evaluacion-helpers";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { ConsultasView } from "./consultas-view";
import { InformeDocenteView } from "./informe-docente-view";
import { OrbitScene } from "./orbit-scene";
import { PrintPortal } from "./print-portal";
import { ReportePrintable, type ReporteData } from "./reporte-printable";

const ALLOWED_EMAIL = "lic.juanreyesr@gmail.com";

type Scores = Record<number, number>;
type AreaId = (typeof AREAS)[number]["id"];
type Entrevistas = Record<1 | 2, Record<number, number>>;
type CoordinacionView = "resumen" | "nueva" | "informe";

const areaIcons: Record<AreaId, React.ComponentType<{ className?: string }>> = {
  iglesia: Church,
  clinica: HeartPulse,
  coordinacion: GraduationCap,
  cursos: BookOpenCheck,
  caeduc: Building2,
};

const STEP_LABELS = ["Datos generales", "Observacion de clase", "Entrevistas", "Fortalezas", "Resumen"];

const initialScores = () =>
  CRITERIOS.reduce<Scores>((acc, categoria) => {
    categoria.items.forEach((item) => {
      acc[item.id] = 0;
    });
    return acc;
  }, {});

const localDateValue = () => {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const scoreTone = (score: number) => {
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Solido";
  if (score >= 60) return "En mejora";
  return "Prioritario";
};

type RawCurso = {
  id: string;
  nombre: string;
  horario: string | null;
  grupo: string | null;
  edificio: string | null;
  anio: number;
  trimestre: Trimestre;
};

type RawDocente = {
  id: string;
  nombre: string;
  correo: string | null;
  femenino: boolean;
  gestionesjj_cursos: RawCurso[] | null;
};

export function GestionesApp() {
  const [activeArea, setActiveArea] = useState<AreaId | null>(null);
  const [coordinacionView, setCoordinacionView] = useState<CoordinacionView>("resumen");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [docentes, setDocentes] = useState<DocenteRow[]>([]);
  const [docentesLoading, setDocentesLoading] = useState(false);
  const [docentesError, setDocentesError] = useState("");
  const [selectedDocenteId, setSelectedDocenteId] = useState<string | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);

  const [addDocenteOpen, setAddDocenteOpen] = useState(false);
  const [newDocenteNombre, setNewDocenteNombre] = useState("");
  const [newDocenteCorreo, setNewDocenteCorreo] = useState("");
  const [newDocenteFemenino, setNewDocenteFemenino] = useState(false);

  const [addCursoOpen, setAddCursoOpen] = useState(false);
  const [newCursoNombre, setNewCursoNombre] = useState("");
  const [newCursoHorario, setNewCursoHorario] = useState("");
  const [newCursoGrupo, setNewCursoGrupo] = useState("");
  const [newCursoEdificio, setNewCursoEdificio] = useState("");
  const [newCursoTrimestre, setNewCursoTrimestre] = useState<Trimestre>(1);

  const [step, setStep] = useState(0);
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [trimestre, setTrimestre] = useState<Trimestre>(() => currentTrimestre());
  const [fecha, setFecha] = useState(localDateValue);
  const [scores, setScores] = useState<Scores>(() => initialScores());
  const [observaciones, setObservaciones] = useState("");
  const [entrevistas, setEntrevistas] = useState<Entrevistas>({ 1: {}, 2: {} });
  const [fortalezas, setFortalezas] = useState<string[]>([]);
  const [fortalezaOtro, setFortalezaOtro] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const docente = docentes.find((item) => item.id === selectedDocenteId) ?? docentes[0];
  const curso = docente?.cursos.find((item) => item.id === selectedCursoId) ?? docente?.cursos[0];
  const totalItems = Object.values(scores).length;
  const completed = Object.values(scores).filter(Boolean).length;
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const max = totalItems * 5;
  const pct = max ? Math.round((total / max) * 100) : 0;

  const fetchDocentes = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setDocentesLoading(true);
    setDocentesError("");
    const { data, error } = await supabase
      .from("gestionesjj_docentes")
      .select("id,nombre,correo,femenino,gestionesjj_cursos(id,nombre,horario,grupo,edificio,anio,trimestre)")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      setDocentesError(error.message);
      setDocentesLoading(false);
      return;
    }

    const rows: DocenteRow[] = ((data ?? []) as unknown as RawDocente[]).map((row) => ({
      id: row.id,
      nombre: row.nombre,
      correo: row.correo,
      femenino: row.femenino,
      cursos: (row.gestionesjj_cursos ?? []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre)) as CursoRow[],
    }));

    setDocentes(rows);
    setDocentesLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email?.toLowerCase() === ALLOWED_EMAIL) {
        setSession(data.session);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession && newSession.user.email?.toLowerCase() !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        setSession(null);
        return;
      }
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs docentes with Supabase whenever the session changes
      fetchDocentes();
    }
  }, [session, fetchDocentes]);

  const handleLogin = async () => {
    setAuthMessage("");
    const supabase = getSupabaseClient();

    if (!supabase) {
      setAuthMessage("Faltan las variables de Supabase. La interfaz queda lista para conectarse.");
      return;
    }

    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
      return;
    }

    if (data.session?.user.email?.toLowerCase() !== ALLOWED_EMAIL) {
      await supabase.auth.signOut();
      setSession(null);
      setAuthMessage("Acceso restringido a la cuenta autorizada.");
      setAuthLoading(false);
      return;
    }

    setSession(data.session);
    setAuthMessage("Sesion iniciada correctamente.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setAuthMessage("");
  };

  const handleCreateDocente = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !newDocenteNombre.trim()) return;

    const { data, error } = await supabase
      .from("gestionesjj_docentes")
      .insert({
        nombre: newDocenteNombre.trim(),
        correo: newDocenteCorreo.trim() || null,
        femenino: newDocenteFemenino,
      })
      .select("id")
      .single();

    if (error) {
      setDocentesError(error.message);
      return;
    }

    setNewDocenteNombre("");
    setNewDocenteCorreo("");
    setNewDocenteFemenino(false);
    setAddDocenteOpen(false);
    setSelectedDocenteId(data.id);
    setSelectedCursoId(null);
    await fetchDocentes();
  };

  const handleCreateCurso = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !docente || !newCursoNombre.trim()) return;

    const { data, error } = await supabase
      .from("gestionesjj_cursos")
      .insert({
        docente_id: docente.id,
        nombre: newCursoNombre.trim(),
        horario: newCursoHorario.trim() || null,
        grupo: newCursoGrupo.trim() || null,
        edificio: newCursoEdificio.trim() || null,
        anio,
        trimestre: newCursoTrimestre,
      })
      .select("id")
      .single();

    if (error) {
      setDocentesError(error.message);
      return;
    }

    setNewCursoNombre("");
    setNewCursoHorario("");
    setNewCursoGrupo("");
    setNewCursoEdificio("");
    setNewCursoTrimestre(1);
    setAddCursoOpen(false);
    setSelectedCursoId(data.id);
    await fetchDocentes();
  };

  const categoryAnalytics = useMemo(
    () =>
      CRITERIOS.map((categoria) => {
        const subtotal = categoria.items.reduce((sum, item) => sum + (scores[item.id] || 0), 0);
        const percent = Math.round((subtotal / (categoria.items.length * 5)) * 100);
        return { ...categoria, percent };
      }),
    [scores],
  );

  const improvementAreas = useMemo(
    () =>
      CRITERIOS.flatMap((categoria) =>
        categoria.items
          .filter((item) => (scores[item.id] || 0) > 0 && scores[item.id] < 4)
          .map((item) => ({ categoria: categoria.categoria, texto: item.texto, valor: scores[item.id] })),
      ).slice(0, 5),
    [scores],
  );

  const entrevistaStats = useMemo(() => {
    const porEstudiante = ([1, 2] as const).map((n) => {
      const respuestas = entrevistas[n];
      const valores = Object.values(respuestas);
      const promedio = valores.length ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length / 4) * 100) : 0;
      return { estudiante: n, promedio, respondidas: valores.length };
    });
    const totalRespondidas = porEstudiante.reduce((sum, item) => sum + item.respondidas, 0);
    const general = totalRespondidas
      ? Math.round(porEstudiante.reduce((sum, item) => sum + item.promedio * item.respondidas, 0) / totalRespondidas)
      : 0;
    return { porEstudiante, general };
  }, [entrevistas]);

  const entrevistaPreguntas = useMemo(
    () =>
      ENTREVISTA_PREGUNTAS.map((pregunta) => {
        const valores = ([1, 2] as const)
          .map((n) => entrevistas[n][pregunta.id])
          .filter((valor): valor is number => valor !== undefined);
        const promedio = valores.length ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length / 4) * 100) : null;
        return { ...pregunta, promedio, respondidas: valores.length };
      }).filter((item) => item.respondidas > 0),
    [entrevistas],
  );

  const entrevistaDestacadas = useMemo(
    () =>
      entrevistaPreguntas
        .filter((item) => (item.promedio ?? 0) >= 75)
        .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0))
        .slice(0, 2),
    [entrevistaPreguntas],
  );

  const entrevistaMejorar = useMemo(
    () =>
      entrevistaPreguntas
        .filter((item) => (item.promedio ?? 0) < 75)
        .sort((a, b) => (a.promedio ?? 0) - (b.promedio ?? 0))
        .slice(0, 2),
    [entrevistaPreguntas],
  );

  const fortalezasFinal = useMemo(
    () => (fortalezaOtro.trim() ? [...fortalezas, fortalezaOtro.trim()] : fortalezas),
    [fortalezas, fortalezaOtro],
  );

  const reportData: ReporteData | null = useMemo(() => {
    if (!docente || !curso) return null;
    return {
      docenteNombre: docente.nombre,
      cursoNombre: curso.nombre,
      anio,
      trimestre,
      fecha,
      pct,
      total,
      max,
      categoryAnalytics,
      entrevistaStats,
      fortalezas: fortalezasFinal,
      improvementAreas,
      observaciones,
    };
  }, [docente, curso, anio, trimestre, fecha, pct, total, max, categoryAnalytics, entrevistaStats, fortalezasFinal, improvementAreas, observaciones]);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const handleOpenEmailDraft = () => {
    if (!docente || !curso) return;

    const subject = `Resultados de tu evaluacion docente - ${curso.nombre} (Trimestre ${trimestre}, ${anio})`;
    const lines: string[] = [
      `Estimado/a ${docente.nombre},`,
      "",
      `Quiero agradecerte sinceramente por tu esfuerzo, dedicacion y compromiso en el desarrollo del curso "${curso.nombre}" durante este trimestre. Tu trabajo constante en el aula es muy valioso para la formacion de nuestros estudiantes.`,
      "",
      "A continuacion comparto un resumen de tu evaluacion docente:",
      "",
      `Resultado general de la observacion de clase: ${pct}% (${total}/${max} puntos).`,
    ];

    if (fortalezasFinal.length) {
      lines.push("", `Entre los aspectos en los que mas sobresaliste se destacan: ${fortalezasFinal.join(", ")}. Felicidades por estos logros.`);
    }

    if (improvementAreas.length) {
      lines.push("", "Tambien identificamos algunas areas en las que podrias seguir fortaleciendo tu labor docente:");
      improvementAreas.forEach((item) => lines.push(`- ${item.texto}`));
    } else {
      lines.push("", "No se identificaron areas criticas de mejora en esta observacion. Sigue asi.");
    }

    if (entrevistaPreguntas.length) {
      lines.push(
        "",
        `En las entrevistas realizadas a estudiantes del curso se obtuvo una valoracion favorable promedio de ${entrevistaStats.general}%.`,
      );
      if (entrevistaDestacadas.length) {
        lines.push(`Los estudiantes destacaron especialmente que: ${entrevistaDestacadas.map((item) => item.texto.toLowerCase()).join("; ")}.`);
      }
      if (entrevistaMejorar.length) {
        lines.push(`Tambien mencionaron que podrias reforzar: ${entrevistaMejorar.map((item) => item.texto.toLowerCase()).join("; ")}.`);
      }
    }

    if (observaciones.trim()) {
      lines.push("", `Observaciones adicionales de la clase: ${observaciones.trim()}`);
    }

    lines.push("", "Gracias nuevamente por tu compromiso con la excelencia academica.", "", "Saludos cordiales,", "Coordinacion Academica");

    setEmailSubject(subject);
    setEmailBody(lines.join("\n"));
    setEmailModalOpen(true);
  };

  const handleSave = async () => {
    setSaveMessage("");

    if (!docente || !curso) {
      setSaveMessage("Selecciona un docente y un curso antes de guardar.");
      return;
    }

    const entrevistasPayload = ([1, 2] as const).map((n) => {
      const respuestas = entrevistas[n];
      const valores = Object.values(respuestas);
      const promedio = valores.length ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length / 4) * 100) : 0;
      return { estudiante: n, respuestas, promedio };
    });

    const payload = {
      docente_id: docente.id,
      docente_nombre: docente.nombre,
      docente_correo: docente.correo || null,
      curso_id: curso.id,
      curso_nombre: curso.nombre,
      curso_grupo: curso.grupo,
      anio,
      trimestre,
      fecha_observacion: fecha,
      puntaje_total: total,
      puntaje_maximo: max,
      porcentaje: pct,
      scores,
      observaciones,
      entrevistas: entrevistasPayload,
      fortalezas: fortalezasFinal,
    };

    const supabase = getSupabaseClient();
    if (!supabase) {
      setSaveMessage("Registro preparado localmente. Conecta Supabase para guardarlo en la nube.");
      console.info("Evaluacion preparada", payload);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("evaluaciones_docentes").insert(payload);
    setSaveMessage(error ? error.message : "Evaluacion guardada en Supabase.");
    setSaving(false);
  };

  const resetWizard = () => {
    setScores(initialScores());
    setEntrevistas({ 1: {}, 2: {} });
    setFortalezas([]);
    setFortalezaOtro("");
    setObservaciones("");
    setSaveMessage("");
    setStep(0);
    setFecha(localDateValue());
  };

  const handleNuevaEvaluacion = () => {
    resetWizard();
  };

  const handleVolverMenu = () => {
    resetWizard();
    setCoordinacionView("resumen");
    setActiveArea(null);
  };

  if (!session) {
    return (
      <LoginGate
        authLoading={authLoading}
        authMessage={authMessage}
        email={email}
        onLogin={handleLogin}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
      />
    );
  }

  return (
    <>
      <main className="min-h-screen overflow-hidden bg-[#08111f] text-slate-50 print-hidden">
        <section className="relative min-h-screen">
          <OrbitScene />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(74,222,128,0.24),transparent_28%),linear-gradient(135deg,rgba(8,17,31,0.78),rgba(8,17,31,0.96)_58%,rgba(15,23,42,0.9))]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  GestionesJJ
                </div>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-white sm:text-5xl">
                  Centro personal de gestion y mejora continua
                </h1>
              </div>

              <div className="w-full max-w-md border border-white/12 bg-white/8 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-100">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-amber-200" />
                    Acceso privado
                  </span>
                  <button
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white"
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Salir
                  </button>
                </div>

                <p className="text-sm text-emerald-200">Sesion activa: {session.user.email}</p>
              </div>
            </header>

            <div className="flex-1">
              {activeArea === null ? (
                <AreaMenu onSelect={setActiveArea} />
              ) : (
                <div className="grid gap-5">
                  <button
                    className="inline-flex w-fit items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
                    onClick={() => setActiveArea(null)}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Volver al menu principal
                  </button>

                  {activeArea !== "coordinacion" ? (
                    <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
                      <AreaPlaceholder areaId={activeArea} />
                    </div>
                  ) : (
                    <div className="grid gap-5">
                      <CoordinacionTabs onChange={setCoordinacionView} value={coordinacionView} />

                      {coordinacionView === "resumen" ? (
                        <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
                          <ConsultasView />
                        </div>
                      ) : null}

                      {coordinacionView === "informe" ? (
                        <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
                          <InformeDocenteView docentes={docentes} />
                        </div>
                      ) : null}

                      {coordinacionView === "nueva" ? (
                        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                          <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
                            <CoordinacionPanel
                              addCursoOpen={addCursoOpen}
                              addDocenteOpen={addDocenteOpen}
                              anio={anio}
                              categoryAnalytics={categoryAnalytics}
                              completed={completed}
                              curso={curso}
                              docente={docente}
                              docentes={docentes}
                              docentesError={docentesError}
                              docentesLoading={docentesLoading}
                              entrevistas={entrevistas}
                              entrevistaStats={entrevistaStats}
                              fecha={fecha}
                              fortalezaOtro={fortalezaOtro}
                              fortalezas={fortalezas}
                              improvementAreas={improvementAreas}
                              max={max}
                              newCursoEdificio={newCursoEdificio}
                              newCursoGrupo={newCursoGrupo}
                              newCursoHorario={newCursoHorario}
                              newCursoNombre={newCursoNombre}
                              newCursoTrimestre={newCursoTrimestre}
                              newDocenteCorreo={newDocenteCorreo}
                              newDocenteFemenino={newDocenteFemenino}
                              newDocenteNombre={newDocenteNombre}
                              observaciones={observaciones}
                              onAddCurso={handleCreateCurso}
                              onAddDocente={handleCreateDocente}
                              onGenerateEmail={handleOpenEmailDraft}
                              onNuevaEvaluacion={handleNuevaEvaluacion}
                              onPrint={() => window.print()}
                              onSave={handleSave}
                              onVolverMenu={handleVolverMenu}
                              pct={pct}
                              saveMessage={saveMessage}
                              saving={saving}
                              scores={scores}
                              setAddCursoOpen={setAddCursoOpen}
                              setAddDocenteOpen={setAddDocenteOpen}
                              setAnio={setAnio}
                              setEntrevistas={setEntrevistas}
                              setFecha={setFecha}
                              setFortalezaOtro={setFortalezaOtro}
                              setFortalezas={setFortalezas}
                              setNewCursoEdificio={setNewCursoEdificio}
                              setNewCursoGrupo={setNewCursoGrupo}
                              setNewCursoHorario={setNewCursoHorario}
                              setNewCursoNombre={setNewCursoNombre}
                              setNewCursoTrimestre={setNewCursoTrimestre}
                              setNewDocenteCorreo={setNewDocenteCorreo}
                              setNewDocenteFemenino={setNewDocenteFemenino}
                              setNewDocenteNombre={setNewDocenteNombre}
                              setObservaciones={setObservaciones}
                              setScores={setScores}
                              setSelectedCursoId={setSelectedCursoId}
                              setSelectedDocenteId={setSelectedDocenteId}
                              setStep={setStep}
                              setTrimestre={setTrimestre}
                              step={step}
                              total={total}
                              totalItems={totalItems}
                              trimestre={trimestre}
                            />
                          </div>

                          <aside className="grid content-start gap-4">
                            <div className="px-1 text-xs font-semibold uppercase text-slate-400">Evaluacion en curso</div>
                            <Metric title="Rendimiento actual" value={`${pct}%`} icon={TrendingUp} detail={scoreTone(pct)} />
                            <Metric title="Criterios completados" value={`${completed}/${totalItems}`} icon={CheckCircle2} detail="Evaluacion docente" />
                            <Metric title="Periodo activo" value={`T${trimestre} ${anio}`} icon={CalendarDays} detail="Filtro de analisis" />
                            <Metric title="Entrevistas" value={`${entrevistaStats.general}%`} icon={Users} detail="Promedio estudiantil" />
                          </aside>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <PrintPortal>
        <ReportePrintable data={coordinacionView === "nueva" ? reportData : null} />
      </PrintPortal>

      <EmailDraftModal
        body={emailBody}
        correo={docente?.correo}
        onClose={() => setEmailModalOpen(false)}
        open={emailModalOpen}
        setBody={setEmailBody}
        setSubject={setEmailSubject}
        subject={emailSubject}
      />
    </>
  );
}

function LoginGate(props: {
  authLoading: boolean;
  authMessage: string;
  email: string;
  onLogin: () => void;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
      <section className="relative flex min-h-screen items-center justify-center">
        <OrbitScene />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(74,222,128,0.24),transparent_28%),linear-gradient(135deg,rgba(8,17,31,0.78),rgba(8,17,31,0.96)_58%,rgba(15,23,42,0.9))]" />

        <div className="relative z-10 w-full max-w-md border border-white/12 bg-white/8 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            GestionesJJ
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">Acceso privado</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Centro personal de gestion. Ingresa con tu correo y contrasena autorizados para continuar.
          </p>

          <div className="mt-6 grid gap-3">
            <Field label="Correo electronico">
              <input
                aria-label="Correo electronico"
                className="field"
                value={props.email}
                onChange={(event) => props.setEmail(event.target.value)}
              />
            </Field>
            <Field label="Contrasena">
              <input
                aria-label="Contrasena"
                className="field"
                type="password"
                value={props.password}
                onChange={(event) => props.setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") props.onLogin();
                }}
                placeholder="Contrasena"
              />
            </Field>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-300 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
              disabled={props.authLoading}
              onClick={props.onLogin}
              type="button"
            >
              <LockKeyhole className="h-4 w-4" />
              {props.authLoading ? "Ingresando..." : "Entrar"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {isSupabaseConfigured ? props.authMessage || "Supabase listo para autenticar." : "Pendiente: variables de Supabase."}
          </p>
        </div>
      </section>
    </main>
  );
}

function AreaMenu({ onSelect }: { onSelect: (area: AreaId) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {AREAS.map((area) => {
        const Icon = areaIcons[area.id];
        return (
          <button
            key={area.id}
            className="group flex flex-col items-start gap-4 border border-white/10 bg-white/8 p-6 text-left backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-white/12"
            onClick={() => onSelect(area.id)}
            type="button"
          >
            <span className="flex h-12 w-12 items-center justify-center bg-white/10 transition group-hover:bg-emerald-300/20">
              <Icon className="h-6 w-6 text-emerald-200" />
            </span>
            <span>
              <span className="block text-lg font-semibold text-white">{area.nombre}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">{area.descripcion}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CoordinacionTabs({ onChange, value }: { onChange: (value: CoordinacionView) => void; value: CoordinacionView }) {
  const tabs: Array<{ value: CoordinacionView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: "resumen", label: "Resumen general", icon: BarChart3 },
    { value: "nueva", label: "Nueva evaluacion", icon: Plus },
    { value: "informe", label: "Informe por docente", icon: GraduationCap },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition ${
              active
                ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                : "border-white/10 bg-white/8 text-slate-300 hover:border-white/30"
            }`}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CoordinacionPanel(props: {
  addCursoOpen: boolean;
  addDocenteOpen: boolean;
  anio: number;
  categoryAnalytics: Array<{ categoria: string; percent: number }>;
  completed: number;
  curso: CursoRow | undefined;
  docente: DocenteRow | undefined;
  docentes: DocenteRow[];
  docentesError: string;
  docentesLoading: boolean;
  entrevistas: Entrevistas;
  entrevistaStats: { porEstudiante: Array<{ estudiante: 1 | 2; promedio: number; respondidas: number }>; general: number };
  fecha: string;
  fortalezaOtro: string;
  fortalezas: string[];
  improvementAreas: Array<{ categoria: string; texto: string; valor: number }>;
  max: number;
  newCursoEdificio: string;
  newCursoGrupo: string;
  newCursoHorario: string;
  newCursoNombre: string;
  newCursoTrimestre: Trimestre;
  newDocenteCorreo: string;
  newDocenteFemenino: boolean;
  newDocenteNombre: string;
  observaciones: string;
  onAddCurso: () => void;
  onAddDocente: () => void;
  onGenerateEmail: () => void;
  onNuevaEvaluacion: () => void;
  onPrint: () => void;
  onSave: () => void;
  onVolverMenu: () => void;
  pct: number;
  saveMessage: string;
  saving: boolean;
  scores: Scores;
  setAddCursoOpen: (value: boolean) => void;
  setAddDocenteOpen: (value: boolean) => void;
  setAnio: (value: number) => void;
  setSelectedCursoId: (value: string | null) => void;
  setSelectedDocenteId: (value: string | null) => void;
  setEntrevistas: React.Dispatch<React.SetStateAction<Entrevistas>>;
  setFecha: (value: string) => void;
  setFortalezaOtro: (value: string) => void;
  setFortalezas: React.Dispatch<React.SetStateAction<string[]>>;
  setNewCursoEdificio: (value: string) => void;
  setNewCursoGrupo: (value: string) => void;
  setNewCursoHorario: (value: string) => void;
  setNewCursoNombre: (value: string) => void;
  setNewCursoTrimestre: (value: Trimestre) => void;
  setNewDocenteCorreo: (value: string) => void;
  setNewDocenteFemenino: (value: boolean) => void;
  setNewDocenteNombre: (value: string) => void;
  setObservaciones: (value: string) => void;
  setScores: React.Dispatch<React.SetStateAction<Scores>>;
  setStep: (value: number) => void;
  setTrimestre: (value: Trimestre) => void;
  step: number;
  total: number;
  totalItems: number;
  trimestre: Trimestre;
}) {
  const { docente, docentes, docentesLoading, docentesError, step, setStep } = props;

  const canGoNext = step < STEP_LABELS.length - 1;
  const canGoBack = step > 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-200">
            <UserRoundCog className="h-4 w-4" />
            Coordinacion academica
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Evaluacion docente 360</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Registro guiado por pasos: datos generales, observacion de clase, entrevistas estudiantiles y fortalezas.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-amber-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
          disabled={props.saving}
          onClick={props.onSave}
          type="button"
        >
          <Save className="h-4 w-4" />
          {props.saving ? "Guardando..." : "Guardar evaluacion"}
        </button>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEP_LABELS.map((label, index) => (
          <li key={label}>
            <button
              className={`w-full border px-2 py-2 text-center text-xs font-semibold transition ${
                index === step
                  ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                  : index < step
                    ? "border-emerald-300/30 bg-emerald-300/5 text-emerald-200"
                    : "border-white/8 bg-slate-950/32 text-slate-400"
              }`}
              onClick={() => setStep(index)}
              type="button"
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {docentesError ? (
        <p className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{docentesError}</p>
      ) : null}

      {docentesLoading ? (
        <p className="text-sm text-slate-300">Cargando docentes...</p>
      ) : docentes.length === 0 ? (
        <p className="border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
          Aun no hay docentes registrados. Usa &quot;Datos generales&quot; para agregar el primero.
        </p>
      ) : null}

      {step === 0 ? <StepDatosGenerales {...props} /> : null}
      {step === 1 ? <StepObservacion {...props} /> : null}
      {step === 2 ? <StepEntrevistas {...props} /> : null}
      {step === 3 ? <StepFortalezas {...props} /> : null}
      {step === 4 ? <StepResumen {...props} /> : null}

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <button
          className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-40"
          disabled={!canGoBack}
          onClick={() => setStep(Math.max(0, step - 1))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Atras
        </button>
        <span className="text-xs text-slate-400">
          Paso {step + 1} de {STEP_LABELS.length}: {docente ? docente.nombre : "Sin docente"}
        </span>
        <button
          className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-40"
          disabled={!canGoNext}
          onClick={() => setStep(Math.min(STEP_LABELS.length - 1, step + 1))}
          type="button"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepDatosGenerales(props: Parameters<typeof CoordinacionPanel>[0]) {
  const {
    docentes,
    docente,
    curso,
    setSelectedDocenteId,
    setSelectedCursoId,
    anio,
    setAnio,
    trimestre,
    setTrimestre,
    fecha,
    setFecha,
    addDocenteOpen,
    setAddDocenteOpen,
    newDocenteNombre,
    setNewDocenteNombre,
    newDocenteCorreo,
    setNewDocenteCorreo,
    newDocenteFemenino,
    setNewDocenteFemenino,
    onAddDocente,
    addCursoOpen,
    setAddCursoOpen,
    newCursoNombre,
    setNewCursoNombre,
    newCursoHorario,
    setNewCursoHorario,
    newCursoGrupo,
    setNewCursoGrupo,
    newCursoEdificio,
    setNewCursoEdificio,
    newCursoTrimestre,
    setNewCursoTrimestre,
    onAddCurso,
  } = props;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <Field label="Docente">
          <div className="flex gap-2">
            <select
              className="field"
              value={docente?.id ?? ""}
              onChange={(event) => {
                setSelectedDocenteId(event.target.value);
                setSelectedCursoId(null);
              }}
            >
              {docentes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-slate-200 transition hover:border-emerald-300/50"
              onClick={() => setAddDocenteOpen(!addDocenteOpen)}
              title="Agregar docente"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Field>
        <Field label="Curso">
          <div className="flex gap-2">
            <select
              className="field"
              disabled={!docente}
              value={curso?.id ?? ""}
              onChange={(event) => setSelectedCursoId(event.target.value)}
            >
              {(docente?.cursos ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/8 text-slate-200 transition hover:border-emerald-300/50 disabled:opacity-40"
              disabled={!docente}
              onClick={() => setAddCursoOpen(!addCursoOpen)}
              title="Agregar curso"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Field>
        <Field label="Ano">
          <input className="field" min={2024} type="number" value={anio} onChange={(event) => setAnio(Number(event.target.value))} />
        </Field>
        <Field label="Trimestre">
          <select className="field" value={trimestre} onChange={(event) => setTrimestre(Number(event.target.value) as Trimestre)}>
            {TRIMESTRES.map((value) => (
              <option key={value} value={value}>
                Trimestre {value}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {addDocenteOpen ? (
        <InlineForm title="Nuevo docente" onCancel={() => setAddDocenteOpen(false)} onSubmit={onAddDocente}>
          <input
            className="field"
            placeholder="Nombre completo"
            value={newDocenteNombre}
            onChange={(event) => setNewDocenteNombre(event.target.value)}
          />
          <input
            className="field"
            placeholder="Correo (opcional)"
            value={newDocenteCorreo}
            onChange={(event) => setNewDocenteCorreo(event.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input checked={newDocenteFemenino} onChange={(event) => setNewDocenteFemenino(event.target.checked)} type="checkbox" />
            Femenino
          </label>
        </InlineForm>
      ) : null}

      {addCursoOpen ? (
        <InlineForm title={`Nuevo curso para ${docente?.nombre ?? ""}`} onCancel={() => setAddCursoOpen(false)} onSubmit={onAddCurso}>
          <input className="field" placeholder="Nombre del curso" value={newCursoNombre} onChange={(event) => setNewCursoNombre(event.target.value)} />
          <input className="field" placeholder="Horario" value={newCursoHorario} onChange={(event) => setNewCursoHorario(event.target.value)} />
          <input className="field" placeholder="Grupo / seccion" value={newCursoGrupo} onChange={(event) => setNewCursoGrupo(event.target.value)} />
          <input className="field" placeholder="Edificio" value={newCursoEdificio} onChange={(event) => setNewCursoEdificio(event.target.value)} />
          <select className="field" value={newCursoTrimestre} onChange={(event) => setNewCursoTrimestre(Number(event.target.value) as Trimestre)}>
            {TRIMESTRES.map((value) => (
              <option key={value} value={value}>
                Trimestre {value}
              </option>
            ))}
          </select>
        </InlineForm>
      ) : null}

      <Field label="Fecha de observacion">
        <input className="field max-w-xs" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
      </Field>
    </div>
  );
}

function InlineForm({
  children,
  onCancel,
  onSubmit,
  title,
}: {
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <div className="border border-emerald-300/30 bg-emerald-300/6 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-emerald-100">{title}</span>
        <button onClick={onCancel} type="button">
          <X className="h-4 w-4 text-slate-400 hover:text-white" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      <button
        className="mt-3 inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
        onClick={onSubmit}
        type="button"
      >
        <Plus className="h-4 w-4" />
        Agregar
      </button>
    </div>
  );
}

function StepObservacion(props: Parameters<typeof CoordinacionPanel>[0]) {
  const { scores, setScores, observaciones, setObservaciones } = props;

  return (
    <div className="grid gap-4">
      {CRITERIOS.map((categoria) => (
        <div key={categoria.id} className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">{categoria.categoria}</h3>
            <span className="text-xs font-semibold text-slate-400">{categoria.items.length} criterios</span>
          </div>
          <div className="grid gap-3">
            {categoria.items.map((item) => (
              <div key={item.id} className="grid gap-3 border border-white/8 bg-slate-950/38 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <p className="text-sm leading-6 text-slate-200">
                  <span className="font-semibold text-slate-500">{item.id}. </span>
                  {item.texto}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      className={`h-9 w-9 border text-sm font-bold transition ${
                        scores[item.id] === value
                          ? "border-emerald-300 bg-emerald-300 text-slate-950"
                          : "border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                      }`}
                      onClick={() => setScores((current) => ({ ...current, [item.id]: value }))}
                      title={SCORE_LABELS[value]}
                      type="button"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Field label="Observaciones de clase">
        <textarea className="field min-h-28 resize-y" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
      </Field>
    </div>
  );
}

function StepEntrevistas(props: Parameters<typeof CoordinacionPanel>[0]) {
  const { entrevistas, setEntrevistas, entrevistaStats } = props;

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-slate-300">
        Entrevista a dos estudiantes del curso con las mismas preguntas de seleccion multiple. Las respuestas generan estadisticas automaticas.
      </p>

      {([1, 2] as const).map((numero) => {
        const stat = entrevistaStats.porEstudiante.find((item) => item.estudiante === numero);
        return (
          <div key={numero} className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                <Users className="h-4 w-4 text-sky-300" />
                Estudiante {numero}
              </h3>
              <span className="text-xs font-semibold text-slate-400">{stat?.promedio ?? 0}% favorable</span>
            </div>
            <div className="grid gap-3">
              {ENTREVISTA_PREGUNTAS.map((pregunta) => (
                <div key={pregunta.id} className="border border-white/8 bg-slate-950/38 p-3">
                  <p className="mb-2 text-sm leading-6 text-slate-200">{pregunta.texto}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ENTREVISTA_ESCALA.map((opcion) => (
                      <button
                        key={opcion.value}
                        className={`border px-3 py-1.5 text-xs font-semibold transition ${
                          entrevistas[numero][pregunta.id] === opcion.value
                            ? "border-emerald-300 bg-emerald-300 text-slate-950"
                            : "border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                        }`}
                        onClick={() =>
                          setEntrevistas((current) => ({
                            ...current,
                            [numero]: { ...current[numero], [pregunta.id]: opcion.value },
                          }))
                        }
                        type="button"
                      >
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepFortalezas(props: Parameters<typeof CoordinacionPanel>[0]) {
  const { fortalezas, setFortalezas, fortalezaOtro, setFortalezaOtro } = props;

  const toggle = (opcion: string) => {
    setFortalezas((current) => (current.includes(opcion) ? current.filter((item) => item !== opcion) : [...current, opcion]));
  };

  return (
    <div className="grid gap-4">
      <div className="border border-white/10 bg-white/6 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Star className="h-4 w-4 text-amber-300" />
          Areas en las que mas sobresale
        </div>
        <p className="mb-3 text-xs leading-5 text-slate-400">Selecciona todas las que apliquen. Se usan para estadisticas de fortalezas.</p>
        <div className="flex flex-wrap gap-2">
          {FORTALEZAS_OPCIONES.map((opcion) => (
            <button
              key={opcion}
              className={`border px-3 py-1.5 text-xs font-semibold transition ${
                fortalezas.includes(opcion)
                  ? "border-emerald-300 bg-emerald-300 text-slate-950"
                  : "border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
              }`}
              onClick={() => toggle(opcion)}
              type="button"
            >
              {opcion}
            </button>
          ))}
        </div>
        <Field label="Otra fortaleza (opcional)">
          <input className="field" value={fortalezaOtro} onChange={(event) => setFortalezaOtro(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function StepResumen(props: Parameters<typeof CoordinacionPanel>[0]) {
  const {
    docente,
    curso,
    anio,
    trimestre,
    fecha,
    pct,
    total,
    max,
    fortalezas,
    fortalezaOtro,
    saveMessage,
    onSave,
    onPrint,
    onGenerateEmail,
    onNuevaEvaluacion,
    onVolverMenu,
    saving,
    categoryAnalytics,
    improvementAreas,
    entrevistaStats,
  } = props;

  const puedeGenerarCorreo = Boolean(docente && curso);
  const guardadoOk = saveMessage === "Evaluacion guardada en Supabase.";

  return (
    <div className="grid gap-4">
      <div className="border border-emerald-300/30 bg-emerald-300/10 p-4">
        <div className="text-xs font-semibold uppercase text-emerald-200">Resumen del registro</div>
        <dl className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          <Resumen label="Docente" value={docente?.nombre ?? "-"} />
          <Resumen label="Curso" value={curso?.nombre ?? "-"} />
          <Resumen label="Periodo" value={`Trimestre ${trimestre}, ${anio}`} />
          <Resumen label="Fecha de observacion" value={fecha} />
          <Resumen label="Resultado de observacion" value={`${pct}% (${total}/${max})`} />
          <Resumen label="Fortalezas seleccionadas" value={`${fortalezas.length + (fortalezaOtro.trim() ? 1 : 0)}`} />
        </dl>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-sky-300" />
            Analisis por categoria
          </div>
          <div className="grid gap-3">
            {categoryAnalytics.map((item) => (
              <div key={item.categoria}>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{item.categoria}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="h-2 bg-slate-800">
                  <div className="h-full bg-sky-300" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-sky-300" />
            Entrevistas estudiantiles
          </div>
          <div className="grid gap-3">
            {entrevistaStats.porEstudiante.map((item) => (
              <div key={item.estudiante}>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>Estudiante {item.estudiante}</span>
                  <span>{item.promedio}%</span>
                </div>
                <div className="h-2 bg-slate-800">
                  <div className="h-full bg-emerald-300" style={{ width: `${item.promedio}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-white/10 bg-white/6 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ChevronRight className="h-4 w-4 text-amber-300" />
          Areas de mejora
        </div>
        {improvementAreas.length ? (
          <div className="grid gap-2">
            {improvementAreas.map((item) => (
              <div key={`${item.categoria}-${item.texto}`} className="border border-white/8 bg-slate-950/35 p-3 text-xs leading-5 text-slate-300">
                <strong className="text-amber-200">{item.categoria}</strong>: {item.texto}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-300">Apareceran cuando haya criterios con punteo menor a 4.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 bg-amber-300 px-6 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar evaluacion"}
        </button>
        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30"
          onClick={onPrint}
          type="button"
        >
          <Printer className="h-4 w-4" />
          Imprimir reporte
        </button>
        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-sky-300/40 bg-sky-300/10 px-6 text-sm font-bold text-sky-100 transition hover:border-sky-300/70 disabled:opacity-40"
          disabled={!puedeGenerarCorreo}
          onClick={onGenerateEmail}
          title={puedeGenerarCorreo ? undefined : "Selecciona un docente y un curso primero"}
          type="button"
        >
          <Mail className="h-4 w-4" />
          Generar correo para el docente
        </button>
      </div>

      {saveMessage ? <p className="border border-white/10 bg-white/8 p-3 text-sm text-slate-200">{saveMessage}</p> : null}

      {guardadoOk ? (
        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-emerald-300/50 bg-emerald-300/10 px-6 text-sm font-bold text-emerald-100 transition hover:border-emerald-300"
            onClick={onNuevaEvaluacion}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nueva evaluacion (mismo docente y curso)
          </button>
          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 bg-white/8 px-6 text-sm font-bold text-slate-100 transition hover:border-white/30"
            onClick={onVolverMenu}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al menu principal
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Resumen({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="font-semibold text-white">{value}</dd>
    </div>
  );
}

function EmailDraftModal(props: {
  body: string;
  correo: string | null | undefined;
  onClose: () => void;
  open: boolean;
  setBody: (value: string) => void;
  setSubject: (value: string) => void;
  subject: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!props.open) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Asunto: ${props.subject}\n\n${props.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoHref = props.correo
    ? `mailto:${encodeURIComponent(props.correo)}?subject=${encodeURIComponent(props.subject)}&body=${encodeURIComponent(props.body)}`
    : undefined;
  const mailtoTooLong = Boolean(mailtoHref && mailtoHref.length > 2000);

  return (
    <div className="print-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-white/10 bg-slate-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Mail className="h-5 w-5 text-sky-300" />
            Correo para el docente
          </h3>
          <button onClick={props.onClose} type="button">
            <X className="h-5 w-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="grid gap-3">
          <Field label="Asunto">
            <input className="field" onChange={(event) => props.setSubject(event.target.value)} value={props.subject} />
          </Field>
          <Field label="Cuerpo del correo">
            <textarea
              className="field min-h-72 resize-y"
              onChange={(event) => props.setBody(event.target.value)}
              value={props.body}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
            onClick={handleCopy}
            type="button"
          >
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          {mailtoHref ? (
            <div className="flex flex-col gap-1">
              <a
                className={`inline-flex items-center gap-2 border border-white/10 bg-white/8 px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-white/30 ${
                  mailtoTooLong ? "pointer-events-none opacity-40" : ""
                }`}
                href={mailtoTooLong ? undefined : mailtoHref}
                title={mailtoTooLong ? "El correo es muy largo para abrirlo directamente. Usa \"Copiar texto\" en su lugar." : undefined}
              >
                Abrir en tu correo
              </a>
              {mailtoTooLong ? (
                <span className="text-xs text-amber-300">
                  El correo es muy largo para abrirlo directamente en tu cliente de correo. Copia el texto y pegalo manualmente.
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-xs text-slate-400">Agrega el correo del docente para habilitar &quot;Abrir en tu correo&quot;.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AreaPlaceholder({ areaId }: { areaId: AreaId }) {
  const area = AREAS.find((item) => item.id === areaId)!;
  const Icon = areaIcons[area.id];

  return (
    <div className="flex min-h-[620px] flex-col justify-between gap-8">
      <div>
        <div className="mb-4 flex h-14 w-14 items-center justify-center bg-white/10">
          <Icon className="h-7 w-7 text-emerald-200" />
        </div>
        <h2 className="text-3xl font-semibold text-white">{area.nombre}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{area.descripcion}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {["Registros", "Analisis", "Seguimiento"].map((item) => (
          <div key={item} className="border border-white/10 bg-white/6 p-4">
            <ListChecks className="mb-3 h-5 w-5 text-sky-300" />
            <div className="text-sm font-semibold">{item}</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Modulo preparado para la siguiente fase.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  detail,
  icon: Icon,
  title,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-400">{title}</span>
        <Icon className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-300">{detail}</div>
    </div>
  );
}
