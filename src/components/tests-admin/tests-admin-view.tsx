"use client";

import { AlertTriangle, Brain, Download, ExternalLink, KeyRound, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/clinica/ai-client";
import { getSupabaseClient } from "@/lib/supabase";
import { AREAS_TESTS, testPorId } from "@/lib/tests/catalogo";

type Persona = {
  id: string;
  correo: string;
  nombre: string;
  fecha_nacimiento: string;
  pais: string | null;
  telefono: string | null;
  genero: string | null;
  ocupacion: string | null;
  acepta_contacto: boolean;
  intereses: string[];
  created_at: string;
  ultimo_ingreso_at: string | null;
};
type Compra = { id: string; usuario_id: string; instrumento: string; tipo: string; monto: number; estado: string; pagada_at: string | null };
type Aplicacion = { id: string; usuario_id: string; instrumento: string; alerta: boolean; completada_at: string | null };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }) : "—");
const edad = (f: string) => {
  const [a, m, d] = f.split("-").map(Number);
  const h = new Date();
  return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
};
const nombreArea = (id: string) => AREAS_TESTS.find((a) => a.id === id)?.nombre ?? id;

function Metrica({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="grid gap-0.5 border border-white/10 bg-white/6 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</span>
      <span className="text-2xl font-semibold text-white">{valor}</span>
      {nota ? <span className="text-xs text-slate-400">{nota}</span> : null}
    </div>
  );
}

/** «Tests en línea» en /admin: base de personas, ventas, alertas y contactos (solo lectura, RLS del propietario). */
export function TestsAdminView() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [apps, setApps] = useState<Aplicacion[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    const s = getSupabaseClient();
    if (!s) return;
    setCargando(true);
    const [p, c, a] = await Promise.all([
      s
        .from("tests_usuarios")
        .select("id,correo,nombre,fecha_nacimiento,pais,telefono,genero,ocupacion,acepta_contacto,intereses,created_at,ultimo_ingreso_at")
        .order("created_at", { ascending: false }),
      s.from("tests_compras").select("id,usuario_id,instrumento,tipo,monto,estado,pagada_at").neq("estado", "pendiente").order("pagada_at", { ascending: false }),
      s.from("tests_aplicaciones").select("id,usuario_id,instrumento,alerta,completada_at").order("completada_at", { ascending: false }),
    ]);
    const err = p.error ?? c.error ?? a.error;
    setError(err ? (/does not exist|schema cache/i.test(err.message) ? "Falta aplicar la migración 072 en Supabase." : err.message) : "");
    setPersonas((p.data ?? []) as Persona[]);
    setCompras((c.data ?? []) as Compra[]);
    setApps((a.data ?? []) as Aplicacion[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const porId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);
  const pagadas = compras.filter((c) => c.estado === "pagada");
  const mes = new Date().toISOString().slice(0, 7);
  const delMes = pagadas.filter((c) => c.pagada_at?.startsWith(mes));
  const suma = (l: Compra[]) => l.reduce((n, c) => n + Number(c.monto), 0);
  const completadas = apps.filter((a) => a.completada_at);
  const alertas = completadas.filter((a) => a.alerta);
  const contactos = personas.filter((p) => p.acepta_contacto);
  const filtro = buscar.trim().toLowerCase();
  const visibles = filtro ? personas.filter((p) => `${p.nombre} ${p.correo} ${p.pais ?? ""}`.toLowerCase().includes(filtro)) : personas;

  const exportar = () => {
    const filas = [["Nombre", "Correo", "Teléfono", "País", "Edad", "Intereses", "Registrado"]].concat(
      contactos.map((p) => [p.nombre, p.correo, p.telefono ?? "", p.pais ?? "", String(edad(p.fecha_nacimiento)), p.intereses.map(nombreArea).join("; "), p.created_at.slice(0, 10)])
    );
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-tests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restablecer = async (p: Persona) => {
    if (!window.confirm(`¿Generar una contraseña temporal para ${p.nombre}? Se cerrarán sus sesiones abiertas.`)) return;
    const token = await getAccessToken();
    const r = await fetch("/api/tests/admin/restablecer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ usuarioId: p.id }),
    });
    const d = (await r.json().catch(() => ({}))) as { temporal?: string; error?: string };
    setAviso(d.temporal ? `Contraseña temporal de ${p.nombre}: ${d.temporal} (compártela y pídele cambiarla en «Mi cuenta»)` : (d.error ?? "No se pudo restablecer."));
  };

  return (
    <div className="grid gap-4 border border-white/10 bg-slate-950/58 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Brain className="h-5 w-5 text-emerald-300" /> Tests en línea
        </h2>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10" href="/tests" rel="noreferrer" target="_blank">
            <ExternalLink className="h-4 w-4" /> Ver la página pública
          </a>
          <button className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10" onClick={() => void cargar()} type="button">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-amber-200">{error}</p> : null}
      {aviso ? <p className="break-words border border-emerald-400/30 bg-emerald-400/10 p-2 text-sm text-emerald-100">{aviso}</p> : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metrica etiqueta="Personas registradas" valor={String(personas.length)} nota={`${contactos.length} aceptan recibir información`} />
        <Metrica etiqueta="Ventas del mes" valor={`US$${suma(delMes).toFixed(2)}`} nota={`${delMes.length} pago${delMes.length === 1 ? "" : "s"}`} />
        <Metrica etiqueta="Ventas totales" valor={`US$${suma(pagadas).toFixed(2)}`} nota={`${pagadas.length} pago${pagadas.length === 1 ? "" : "s"}`} />
        <Metrica etiqueta="Tests completados" valor={String(completadas.length)} nota={alertas.length ? `${alertas.length} con alerta de seguridad` : "sin alertas"} />
      </div>

      {alertas.length ? (
        <div className="grid gap-1 border border-rose-400/40 bg-rose-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-200">
            <AlertTriangle className="h-4 w-4" /> Alertas de seguridad (marcaron la pregunta de riesgo)
          </p>
          {alertas.slice(0, 10).map((a) => {
            const p = porId.get(a.usuario_id);
            return (
              <p className="text-sm text-rose-100" key={a.id}>
                {fecha(a.completada_at)} · {testPorId(a.instrumento)?.nombre ?? a.instrumento} · {p?.nombre ?? "—"} · {p?.correo ?? ""}
                {p?.telefono ? ` · ${p.telefono}` : ""}
              </p>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-white/10 bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, correo o país"
            value={buscar}
          />
        </label>
        <button
          className="inline-flex items-center gap-1 border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
          disabled={!contactos.length}
          onClick={exportar}
          type="button"
        >
          <Download className="h-4 w-4" /> Exportar contactos (CSV)
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay personas registradas.</p>
      ) : (
        <div className="grid gap-2">
          {visibles.map((p) => {
            const susApps = completadas.filter((a) => a.usuario_id === p.id);
            const gasto = suma(pagadas.filter((c) => c.usuario_id === p.id));
            return (
              <div className="grid gap-1 border border-white/10 bg-white/4 p-3" key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{p.nombre}</p>
                    <p className="break-all text-xs text-slate-400">
                      {p.correo}
                      {p.telefono ? ` · ${p.telefono}` : ""} · {edad(p.fecha_nacimiento)} años{p.pais ? ` · ${p.pais}` : ""}
                      {p.ocupacion ? ` · ${p.ocupacion}` : ""}
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white" onClick={() => void restablecer(p)} type="button">
                    <KeyRound className="h-3.5 w-3.5" /> Restablecer contraseña
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  {susApps.length} test{susApps.length === 1 ? "" : "s"}
                  {susApps.length ? `: ${[...new Set(susApps.map((a) => testPorId(a.instrumento)?.nombre ?? a.instrumento))].join(", ")}` : ""} · US${gasto.toFixed(2)} · Registro{" "}
                  {fecha(p.created_at)}
                </p>
                <p className="text-xs text-slate-400">
                  {p.acepta_contacto ? `Acepta recibir información${p.intereses.length ? `: ${p.intereses.map(nombreArea).join(", ")}` : ""}` : "No acepta recibir información"}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500">
        Las cuentas de esta plataforma están separadas del resto de tus proyectos: no usan el sistema de usuarios de Supabase y no pueden entrar a ninguna otra
        tabla. Aquí solo se ven sus datos generales, compras y aplicaciones; las contraseñas están cifradas.
      </p>
    </div>
  );
}
