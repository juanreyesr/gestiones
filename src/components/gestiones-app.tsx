"use client";

import {
  Activity,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Church,
  GraduationCap,
  HeartPulse,
  LockKeyhole,
  MessageSquareText,
  Save,
  Sparkles,
  TrendingUp,
  UserRoundCog,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { AREAS, CRITERIOS, DOCENTES_DATA, SCORE_LABELS } from "@/data/evaluacion";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { OrbitScene } from "./orbit-scene";

type Scores = Record<number, number>;
type AreaId = (typeof AREAS)[number]["id"];

const areaIcons: Record<AreaId, React.ComponentType<{ className?: string }>> = {
  iglesia: Church,
  clinica: HeartPulse,
  coordinacion: GraduationCap,
  cursos: BookOpenCheck,
  caeduc: Building2,
};

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

export function GestionesApp() {
  const [activeArea, setActiveArea] = useState<AreaId>("coordinacion");
  const [email, setEmail] = useState("lic.juanreyesr@gmail.com");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [docenteIdx, setDocenteIdx] = useState(0);
  const [cursoIdx, setCursoIdx] = useState(0);
  const [anio, setAnio] = useState(2026);
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1);
  const [fecha, setFecha] = useState(localDateValue);
  const [scores, setScores] = useState<Scores>(() => initialScores());
  const [observaciones, setObservaciones] = useState("");
  const [entrevista1, setEntrevista1] = useState("");
  const [entrevista2, setEntrevista2] = useState("");
  const [sobresale1, setSobresale1] = useState("");
  const [sobresale2, setSobresale2] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const docente = DOCENTES_DATA[docenteIdx];
  const curso = docente.cursos[cursoIdx] ?? docente.cursos[0];
  const totalItems = Object.values(scores).length;
  const completed = Object.values(scores).filter(Boolean).length;
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const max = totalItems * 5;
  const pct = Math.round((total / max) * 100);

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

  const handleLogin = async () => {
    setAuthMessage("");
    const supabase = getSupabaseClient();

    if (!supabase) {
      setAuthMessage("Faltan las variables de Supabase. La interfaz queda lista para conectarse.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? error.message : "Sesion iniciada correctamente.");
  };

  const handleSave = async () => {
    setSaveMessage("");
    const payload = {
      docente_nombre: docente.nombre,
      docente_correo: docente.correo || null,
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
      entrevista_estudiante_1: entrevista1,
      entrevista_estudiante_2: entrevista2,
      fortaleza_1: sobresale1,
      fortaleza_2: sobresale2,
    };

    const supabase = getSupabaseClient();
    if (!supabase) {
      setSaveMessage("Registro preparado localmente. Conecta Supabase para guardarlo en la nube.");
      console.info("Evaluacion preparada", payload);
      return;
    }

    const { error } = await supabase.from("evaluaciones_docentes").insert(payload);
    setSaveMessage(error ? error.message : "Evaluacion guardada en Supabase.");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
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
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <LockKeyhole className="h-4 w-4 text-amber-200" />
                Acceso privado
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_0.8fr_auto]">
                <input
                  aria-label="Correo electronico"
                  className="min-w-0 border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-emerald-300/50 transition focus:ring-2"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <input
                  aria-label="Contrasena"
                  className="min-w-0 border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-emerald-300/50 transition focus:ring-2"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contrasena"
                />
                <button
                  className="inline-flex items-center justify-center gap-2 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                  onClick={handleLogin}
                  type="button"
                >
                  Entrar
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                {isSupabaseConfigured ? authMessage || "Supabase listo para autenticar." : "Pendiente: variables de Supabase."}
              </p>
            </div>
          </header>

          <div className="grid flex-1 gap-5 lg:grid-cols-[260px_1fr]">
            <nav className="border border-white/10 bg-white/8 p-3 backdrop-blur-xl">
              <div className="mb-3 px-2 text-xs font-semibold uppercase text-slate-400">Areas iniciales</div>
              <div className="grid gap-2">
                {AREAS.map((area) => {
                  const Icon = areaIcons[area.id];
                  const selected = activeArea === area.id;
                  return (
                    <button
                      key={area.id}
                      className={`grid grid-cols-[34px_1fr] gap-3 border p-3 text-left transition ${
                        selected
                          ? "border-emerald-300/70 bg-emerald-300/14 text-white"
                          : "border-white/8 bg-slate-950/32 text-slate-300 hover:border-white/20 hover:bg-white/10"
                      }`}
                      onClick={() => setActiveArea(area.id)}
                      type="button"
                    >
                      <span className="flex h-8 w-8 items-center justify-center bg-white/10">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{area.nombre}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">{area.descripcion}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
                {activeArea === "coordinacion" ? (
                  <CoordinacionPanel
                    anio={anio}
                    categoryAnalytics={categoryAnalytics}
                    completed={completed}
                    cursoIdx={cursoIdx}
                    docenteIdx={docenteIdx}
                    entrevista1={entrevista1}
                    entrevista2={entrevista2}
                    fecha={fecha}
                    improvementAreas={improvementAreas}
                    max={max}
                    observaciones={observaciones}
                    pct={pct}
                    saveMessage={saveMessage}
                    scores={scores}
                    setAnio={setAnio}
                    setCursoIdx={setCursoIdx}
                    setDocenteIdx={setDocenteIdx}
                    setEntrevista1={setEntrevista1}
                    setEntrevista2={setEntrevista2}
                    setFecha={setFecha}
                    setObservaciones={setObservaciones}
                    setScores={setScores}
                    setSobresale1={setSobresale1}
                    setSobresale2={setSobresale2}
                    setTrimestre={setTrimestre}
                    sobresale1={sobresale1}
                    sobresale2={sobresale2}
                    total={total}
                    totalItems={totalItems}
                    trimestre={trimestre}
                    onSave={handleSave}
                  />
                ) : (
                  <AreaPlaceholder areaId={activeArea} />
                )}
              </div>

              <aside className="grid content-start gap-4">
                <Metric title="Rendimiento actual" value={`${pct}%`} icon={TrendingUp} detail={scoreTone(pct)} />
                <Metric title="Criterios completados" value={`${completed}/${totalItems}`} icon={CheckCircle2} detail="Evaluacion docente" />
                <Metric title="Periodo activo" value={`T${trimestre} ${anio}`} icon={CalendarDays} detail="Filtro de analisis" />

                <div className="border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-sky-300" />
                    Dashboard esperado
                  </div>
                  <div className="space-y-3">
                    {["Individual por docente", "Comparativo por trimestre", "Evolucion anual", "Global historico"].map((item) => (
                      <div key={item} className="flex items-center justify-between border border-white/8 bg-slate-950/35 px-3 py-2 text-sm">
                        <span>{item}</span>
                        <Activity className="h-4 w-4 text-emerald-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function CoordinacionPanel(props: {
  anio: number;
  categoryAnalytics: Array<{ categoria: string; percent: number }>;
  completed: number;
  cursoIdx: number;
  docenteIdx: number;
  entrevista1: string;
  entrevista2: string;
  fecha: string;
  improvementAreas: Array<{ categoria: string; texto: string; valor: number }>;
  max: number;
  observaciones: string;
  pct: number;
  saveMessage: string;
  scores: Scores;
  setAnio: (value: number) => void;
  setCursoIdx: (value: number) => void;
  setDocenteIdx: (value: number) => void;
  setEntrevista1: (value: string) => void;
  setEntrevista2: (value: string) => void;
  setFecha: (value: string) => void;
  setObservaciones: (value: string) => void;
  setScores: React.Dispatch<React.SetStateAction<Scores>>;
  setSobresale1: (value: string) => void;
  setSobresale2: (value: string) => void;
  setTrimestre: (value: 1 | 2 | 3 | 4) => void;
  sobresale1: string;
  sobresale2: string;
  total: number;
  totalItems: number;
  trimestre: 1 | 2 | 3 | 4;
  onSave: () => void;
}) {
  const docente = DOCENTES_DATA[props.docenteIdx];

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
            Registro editable por docente, curso, ano y trimestre, con observacion de clase y dos entrevistas estudiantiles.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-amber-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
          onClick={props.onSave}
          type="button"
        >
          <Save className="h-4 w-4" />
          Guardar evaluacion
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <Field label="Docente">
          <select
            className="field"
            value={props.docenteIdx}
            onChange={(event) => {
              props.setDocenteIdx(Number(event.target.value));
              props.setCursoIdx(0);
            }}
          >
            {DOCENTES_DATA.map((item, index) => (
              <option key={`${item.nombre}-${index}`} value={index}>
                {item.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Curso">
          <select className="field" value={props.cursoIdx} onChange={(event) => props.setCursoIdx(Number(event.target.value))}>
            {docente.cursos.map((item, index) => (
              <option key={`${item.nombre}-${index}`} value={index}>
                {item.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ano">
          <input className="field" min={2024} type="number" value={props.anio} onChange={(event) => props.setAnio(Number(event.target.value))} />
        </Field>
        <Field label="Trimestre">
          <select className="field" value={props.trimestre} onChange={(event) => props.setTrimestre(Number(event.target.value) as 1 | 2 | 3 | 4)}>
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                Trimestre {value}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <Field label="Fecha de observacion">
            <input className="field" type="date" value={props.fecha} onChange={(event) => props.setFecha(event.target.value)} />
          </Field>

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
                            props.scores[item.id] === value
                              ? "border-emerald-300 bg-emerald-300 text-slate-950"
                              : "border-white/10 bg-white/8 text-slate-200 hover:border-emerald-300/50"
                          }`}
                          onClick={() => props.setScores((current) => ({ ...current, [item.id]: value }))}
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

          <div className="grid gap-3">
            <Field label="Observaciones de clase">
              <textarea className="field min-h-28 resize-y" value={props.observaciones} onChange={(event) => props.setObservaciones(event.target.value)} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Entrevista estudiante 1">
                <textarea className="field min-h-24 resize-y" value={props.entrevista1} onChange={(event) => props.setEntrevista1(event.target.value)} />
              </Field>
              <Field label="Entrevista estudiante 2">
                <textarea className="field min-h-24 resize-y" value={props.entrevista2} onChange={(event) => props.setEntrevista2(event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Area donde mas sobresale 1">
                <input className="field" value={props.sobresale1} onChange={(event) => props.setSobresale1(event.target.value)} />
              </Field>
              <Field label="Area donde mas sobresale 2">
                <input className="field" value={props.sobresale2} onChange={(event) => props.setSobresale2(event.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="border border-emerald-300/30 bg-emerald-300/10 p-4">
            <div className="text-xs font-semibold uppercase text-emerald-200">Resultado actual</div>
            <div className="mt-2 text-5xl font-semibold text-white">{props.pct}%</div>
            <div className="mt-1 text-sm text-slate-300">
              {props.total}/{props.max} puntos registrados
            </div>
          </div>

          <div className="border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-sky-300" />
              Analisis por categoria
            </div>
            <div className="grid gap-3">
              {props.categoryAnalytics.map((item) => (
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
              <MessageSquareText className="h-4 w-4 text-amber-300" />
              Areas de mejora
            </div>
            {props.improvementAreas.length ? (
              <div className="grid gap-2">
                {props.improvementAreas.map((item) => (
                  <div key={`${item.categoria}-${item.texto}`} className="border border-white/8 bg-slate-950/35 p-3 text-xs leading-5 text-slate-300">
                    <strong className="text-amber-200">{item.categoria}</strong>: {item.texto}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-300">Apareceran cuando haya criterios con punteo menor a 4.</p>
            )}
          </div>

          {props.saveMessage ? <p className="border border-white/10 bg-white/8 p-3 text-sm text-slate-200">{props.saveMessage}</p> : null}
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
            <BriefcaseBusiness className="mb-3 h-5 w-5 text-sky-300" />
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
