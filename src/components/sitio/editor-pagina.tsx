"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Monitor,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  crearSitio,
  INTERVALO_MAX,
  INTERVALO_MIN,
  limpiarUrlImagen,
  MAX_IMAGENES,
  normalizarPortada,
  portadaPorDefecto,
  type Idioma,
  type Portada,
  type TextosPortada,
} from "../../../sitio-web/plantilla.mjs";
import configSitio from "../../../public/config.json";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ModalPortal } from "@/components/modal-portal";
import { BTN_GHOST, BTN_PRIMARY, ErrorBanner } from "@/components/ui-comun";
import { getSupabaseClient } from "@/lib/supabase";

const sitio = crearSitio(configSitio);
const TABLA = "gestionesjj_sitio_portada";
const BUCKET = "gestionesjj-sitio";
const MAX_LADO_IMAGEN = 2400;

/**
 * Lo que se agrega a la vista previa: los enlaces no navegan (el iframe no
 * puede salir de la vista previa) y los de ancla (#areas) solo desplazan.
 */
const SCRIPT_VISTA_PREVIA = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;e.preventDefault();var h=a.getAttribute('href')||'';if(h.charAt(0)==='#'){var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView({behavior:'smooth'})}},true);</script>`;

type Ruta = (string | number)[];
type CampoTexto = { ruta: Ruta; etiqueta: string; largo?: boolean };
type Seccion = { id: string; titulo: string; descripcion: string; selector: string; campos: CampoTexto[] };

const SECCIONES: Seccion[] = [
  {
    id: "hero",
    titulo: "Encabezado",
    descripcion: "Lo primero que ven los visitantes al entrar al sitio.",
    selector: ".hero",
    campos: [
      { ruta: ["hero", "eyebrow"], etiqueta: "Texto sobre el título" },
      { ruta: ["hero", "titulo1"], etiqueta: "Título · línea 1" },
      { ruta: ["hero", "titulo2"], etiqueta: "Título · línea 2" },
      { ruta: ["hero", "texto"], etiqueta: "Mensaje de bienvenida", largo: true },
      { ruta: ["hero", "boton1"], etiqueta: "Botón principal (lleva a Trayectoria)" },
      { ruta: ["hero", "boton2"], etiqueta: "Botón secundario (baja a las áreas)" },
    ],
  },
  {
    id: "stats",
    titulo: "Cifras destacadas",
    descripcion: "Los tres datos bajo el encabezado.",
    selector: ".stats",
    campos: [0, 1, 2].flatMap((i) => [
      { ruta: ["stats", i, "valor"], etiqueta: `Cifra ${i + 1}` },
      { ruta: ["stats", i, "texto"], etiqueta: `Descripción ${i + 1}` },
    ]),
  },
  {
    id: "areas",
    titulo: "Áreas de trabajo",
    descripcion: "Las tres puertas de entrada: formación, consulta y conferencias.",
    selector: "#areas",
    campos: [
      { ruta: ["areas", "eyebrow"], etiqueta: "Texto sobre el título" },
      { ruta: ["areas", "titulo"], etiqueta: "Título de la sección" },
      ...["Programas de formación", "Consulta psicológica", "Conferencias"].flatMap((nombre, i) => [
        { ruta: ["areas", "items", i, "titulo"], etiqueta: `${String(i + 1).padStart(2, "0")} · Título (${nombre})` },
        { ruta: ["areas", "items", i, "texto"], etiqueta: `${String(i + 1).padStart(2, "0")} · Descripción`, largo: true },
        { ruta: ["areas", "items", i, "boton"], etiqueta: `${String(i + 1).padStart(2, "0")} · Botón` },
      ]),
    ],
  },
  {
    id: "manifiesto",
    titulo: "Manifiesto",
    descripcion: "La frase central sobre tu forma de trabajar.",
    selector: ".manifesto",
    campos: [
      { ruta: ["manifiesto", "eyebrow"], etiqueta: "Texto sobre el título" },
      { ruta: ["manifiesto", "titulo"], etiqueta: "Frase principal", largo: true },
      { ruta: ["manifiesto", "texto"], etiqueta: "Texto", largo: true },
    ],
  },
  {
    id: "bio",
    titulo: "Sobre Juan J.",
    descripcion: "Biografía breve con foto.",
    selector: ".bio",
    campos: [
      { ruta: ["bio", "eyebrow"], etiqueta: "Texto sobre el título" },
      { ruta: ["bio", "titulo"], etiqueta: "Título", largo: true },
      { ruta: ["bio", "texto"], etiqueta: "Texto", largo: true },
      { ruta: ["bio", "boton"], etiqueta: "Botón (lleva a Trayectoria)" },
    ],
  },
];

function leerRuta(objeto: unknown, ruta: Ruta): string {
  let actual: unknown = objeto;
  for (const paso of ruta) actual = (actual as Record<string | number, unknown> | undefined)?.[paso];
  return typeof actual === "string" ? actual : "";
}

function conRuta<T>(objeto: T, ruta: Ruta, valor: unknown): T {
  const copia = structuredClone(objeto);
  let actual = copia as Record<string | number, unknown>;
  ruta.slice(0, -1).forEach((paso) => {
    actual = actual[paso] as Record<string | number, unknown>;
  });
  actual[ruta[ruta.length - 1]] = valor;
  return copia;
}

/** Reduce fotos grandes del celular (máx. 2400 px por lado, JPEG) para que el sitio cargue rápido. */
async function prepararImagen(archivo: File): Promise<{ datos: Blob; extension: string; tipo: string }> {
  const original = { datos: archivo as Blob, extension: archivo.name.split(".").pop()?.toLowerCase() || "jpg", tipo: archivo.type };
  if (archivo.type === "image/gif") return original;
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, MAX_LADO_IMAGEN / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();
    const datos = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.86));
    if (!datos || (escala === 1 && datos.size >= archivo.size)) return original;
    return { datos, extension: "jpg", tipo: "image/jpeg" };
  } catch {
    return original;
  }
}

async function subirImagen(archivo: File): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  if (!archivo.type.startsWith("image/")) throw new Error(`"${archivo.name}" no es una imagen.`);
  const { datos, extension, tipo } = await prepararImagen(archivo);
  if (datos.size > 8 * 1024 * 1024) throw new Error(`"${archivo.name}" pesa más de 8 MB.`);
  const ruta = `portada/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, datos, { cacheControl: "31536000", contentType: tipo });
  if (error) throw new Error(`No se pudo subir "${archivo.name}": ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

export function EditorPagina({ onClose }: { onClose: () => void }) {
  const [borrador, setBorrador] = useState<Portada | null>(null);
  const [publicado, setPublicado] = useState<Portada | null>(null);
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [dispositivo, setDispositivo] = useState<"escritorio" | "movil">(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "movil" : "escritorio",
  );
  const [panelMovil, setPanelMovil] = useState<"editar" | "vista">("editar");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [subiendo, setSubiendo] = useState<"carrusel" | "bio" | null>(null);
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);

  // Autoguardado del borrador: lo último guardado evita escrituras repetidas.
  const guardadoRef = useRef("");
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borradorRef = useRef<Portada | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabase no está configurado.");
        return;
      }
      const { data, error: errorLectura } = await supabase.from(TABLA).select("id, contenido");
      if (!vigente) return;
      if (errorLectura) {
        setError(`No se pudo cargar la portada: ${errorLectura.message}`);
        return;
      }
      const filas = (data ?? []) as { id: string; contenido: unknown }[];
      const pub = normalizarPortada(filas.find((f) => f.id === "publicado")?.contenido);
      const filaBorrador = filas.find((f) => f.id === "borrador");
      const bor = filaBorrador ? normalizarPortada(filaBorrador.contenido) : pub;
      guardadoRef.current = filaBorrador ? JSON.stringify(bor) : "";
      setPublicado(pub);
      setBorrador(bor);
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const guardarAhora = useCallback(async () => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
    const actual = borradorRef.current;
    const supabase = getSupabaseClient();
    if (!actual || !supabase) return true;
    const json = JSON.stringify(actual);
    if (json === guardadoRef.current) return true;
    setGuardando(true);
    const { error: errorGuardar } = await supabase
      .from(TABLA)
      .upsert({ id: "borrador", contenido: actual, updated_at: new Date().toISOString() });
    setGuardando(false);
    if (errorGuardar) {
      setError(`No se pudo guardar el borrador: ${errorGuardar.message}`);
      return false;
    }
    guardadoRef.current = json;
    return true;
  }, []);

  useEffect(() => {
    borradorRef.current = borrador;
    if (!borrador) return;
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => void guardarAhora(), 800);
  }, [borrador, guardarAhora]);

  // Al cerrar o salir, se guarda lo pendiente.
  useEffect(() => () => void guardarAhora(), [guardarAhora]);

  const hayCambios = useMemo(
    () => Boolean(borrador && publicado && JSON.stringify(borrador) !== JSON.stringify(publicado)),
    [borrador, publicado],
  );

  const cambiar = (ruta: Ruta, valor: unknown) => setBorrador((b) => (b ? conRuta(b, ruta, valor) : b));
  const cambiarTexto = (ruta: Ruta, valor: string) => cambiar([idioma, ...ruta], valor);

  const restaurarSeccion = (seccion: Seccion) => {
    const defecto = portadaPorDefecto()[idioma];
    const clave = seccion.campos[0].ruta[0] as keyof TextosPortada;
    cambiar([idioma, clave], structuredClone(defecto[clave]));
  };

  const agregarImagenes = (urls: string[]) => {
    setBorrador((b) => (b ? { ...b, imagenes: [...b.imagenes, ...urls].slice(0, MAX_IMAGENES) } : b));
  };

  const subirCarrusel = async (archivos: FileList | null) => {
    if (!archivos?.length || !borrador) return;
    const libres = MAX_IMAGENES - borrador.imagenes.length;
    if (libres <= 0) {
      setError(`El carrusel admite hasta ${MAX_IMAGENES} imágenes.`);
      return;
    }
    setError("");
    setSubiendo("carrusel");
    try {
      for (const archivo of Array.from(archivos).slice(0, libres)) {
        const url = await subirImagen(archivo);
        agregarImagenes([url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(null);
    }
  };

  const subirFotoBio = async (archivos: FileList | null) => {
    const archivo = archivos?.[0];
    if (!archivo) return;
    setError("");
    setSubiendo("bio");
    try {
      const url = await subirImagen(archivo);
      cambiar(["fotoBio"], url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(null);
    }
  };

  const pedirEnlace = (destino: "carrusel" | "bio") => {
    const valor = window.prompt("Pega el enlace (https://...) de la imagen:");
    if (!valor) return;
    const url = limpiarUrlImagen(valor);
    if (!url) {
      setError("El enlace debe empezar con https:// y apuntar a una imagen.");
      return;
    }
    setError("");
    if (destino === "bio") cambiar(["fotoBio"], url);
    else agregarImagenes([url]);
  };

  const moverImagen = (indice: number, paso: -1 | 1) => {
    setBorrador((b) => {
      if (!b) return b;
      const imagenes = [...b.imagenes];
      const destino = indice + paso;
      if (destino < 0 || destino >= imagenes.length) return b;
      [imagenes[indice], imagenes[destino]] = [imagenes[destino], imagenes[indice]];
      return { ...b, imagenes };
    });
  };

  const publicar = async () => {
    setError("");
    setAviso("");
    setPublicando(true);
    try {
      if (!(await guardarAhora())) return;
      const supabase = getSupabaseClient();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const respuesta = await fetch("/api/sitio/portada/publicar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(cuerpo.error || "No se pudo publicar.");
      setPublicado(borradorRef.current);
      setAviso("¡Listo! Los cambios ya se ven en www.juanjreyes.org.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setPublicando(false);
    }
  };

  const descartar = () => {
    if (publicado) setBorrador(structuredClone(publicado));
    setConfirmarDescartar(false);
    setAviso("Se descartaron los cambios: el borrador volvió a lo publicado.");
  };

  const estado = !borrador
    ? "Cargando…"
    : guardando
      ? "Guardando…"
      : hayCambios
        ? "Cambios sin publicar"
        : "Todo publicado";

  // ------------------------------------------------------------------
  // Vista previa: el HTML real de la portada con el borrador. Cada cambio
  // monta un iframe nuevo detrás del actual y, cuando termina de cargar,
  // toma su lugar en la misma posición de desplazamiento (sin parpadeo).
  // ------------------------------------------------------------------
  const [capas, setCapas] = useState<{ id: number; html: string }[]>([]);
  const iframesRef = useRef(new Map<number, HTMLIFrameElement>());
  const contadorRef = useRef(0);

  useEffect(() => {
    if (!borrador) return;
    const espera = setTimeout(() => {
      const html = sitio.home(idioma, borrador).replace("</body>", `${SCRIPT_VISTA_PREVIA}</body>`);
      contadorRef.current += 1;
      const id = contadorRef.current;
      setCapas((actuales) => [...actuales.slice(0, 1), { id, html }]);
    }, 250);
    return () => clearTimeout(espera);
  }, [borrador, idioma]);

  const capasRef = useRef(capas);
  useEffect(() => {
    capasRef.current = capas;
  }, [capas]);

  const alCargarCapa = (id: number) => {
    const visible = capasRef.current[0];
    if (!visible || visible.id === id) return;
    const y = iframesRef.current.get(visible.id)?.contentWindow?.scrollY ?? 0;
    iframesRef.current.get(id)?.contentWindow?.scrollTo({ top: y, behavior: "instant" });
    setCapas((actuales) => actuales.filter((c) => c.id >= id).slice(0, 2));
  };

  const irASeccion = (selector: string) => {
    const visible = capas[0] ? iframesRef.current.get(capas[0].id) : undefined;
    visible?.contentDocument?.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Escala del iframe para que la página (1280 px o 390 px de ancho) quepa en el panel.
  // (Ref por estado: el portal monta el contenido después del primer render.)
  const [elementoMarco, setElementoMarco] = useState<HTMLDivElement | null>(null);
  const [marco, setMarco] = useState({ ancho: 0, alto: 0 });
  useEffect(() => {
    const elemento = elementoMarco;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setMarco({ ancho: entrada.contentRect.width, alto: entrada.contentRect.height }),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [elementoMarco]);
  const anchoPagina = dispositivo === "escritorio" ? 1280 : 390;
  const escala = marco.ancho ? Math.min(1, marco.ancho / anchoPagina) : 1;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-40 flex flex-col bg-[#060c17] text-slate-50">
        {/* Barra superior */}
        <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
          <div className="mr-auto min-w-0">
            <p className="text-sm font-semibold text-white">Editar página</p>
            <p className="text-[11px] text-slate-400">Portada de www.juanjreyes.org</p>
          </div>
          <span
            className={`hidden text-xs sm:inline ${hayCambios ? "text-amber-200" : "text-slate-400"}`}
            aria-live="polite"
          >
            {estado}
          </span>
          <a className={`${BTN_GHOST} !px-2.5 !py-1.5 text-xs`} href={`/${idioma}`} rel="noopener" target="_blank">
            Ver sitio <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            className={`${BTN_GHOST} !px-2.5 !py-1.5 text-xs`}
            disabled={!hayCambios || publicando}
            onClick={() => setConfirmarDescartar(true)}
            type="button"
          >
            Descartar
          </button>
          <button
            className={`${BTN_PRIMARY} !px-3 !py-1.5 text-xs`}
            disabled={!hayCambios || publicando || guardando}
            onClick={publicar}
            type="button"
          >
            {publicando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {publicando ? "Publicando…" : "Publicar cambios"}
          </button>
          <button
            aria-label="Cerrar editor"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/8 text-slate-300 transition hover:text-white"
            onClick={async () => {
              await guardarAhora();
              onClose();
            }}
            title="Cerrar (el borrador queda guardado)"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* En celular: alternar entre editar y vista previa */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 lg:hidden">
          {(["editar", "vista"] as const).map((p) => (
            <button
              key={p}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                panelMovil === p ? "bg-emerald-300 text-slate-950" : "bg-white/8 text-slate-300"
              }`}
              onClick={() => setPanelMovil(p)}
              type="button"
            >
              {p === "editar" ? "Editar" : "Vista previa"}
            </button>
          ))}
          <span className={`text-[11px] ${hayCambios ? "text-amber-200" : "text-slate-400"}`}>{estado}</span>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,430px)_1fr]">
          {/* Panel de edición */}
          <aside
            className={`min-h-0 overflow-y-auto border-white/10 p-3 sm:p-4 lg:block lg:border-r ${
              panelMovil === "editar" ? "block" : "hidden"
            }`}
          >
            <div className="grid gap-4">
              <ErrorBanner message={error} />
              {aviso ? <p className="border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{aviso}</p> : null}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Los cambios se guardan solos como borrador y se ven en el sitio al <strong>publicar</strong>.
                </p>
                <div className="flex shrink-0 rounded-full border border-white/10 bg-white/5 p-0.5" role="group" aria-label="Idioma">
                  {(["es", "en"] as const).map((l) => (
                    <button
                      key={l}
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                        idioma === l ? "bg-emerald-300 text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                      onClick={() => setIdioma(l)}
                      type="button"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {!borrador ? (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando la portada…
                </p>
              ) : (
                <>
                  {/* Carrusel del encabezado */}
                  <section
                    className="grid gap-3 border border-white/10 bg-white/[0.04] p-4"
                    onFocus={() => irASeccion(".hero")}
                  >
                    <div>
                      <h2 className="text-base font-semibold text-white">Imágenes del encabezado</h2>
                      <p className="mt-0.5 text-xs leading-5 text-slate-400">
                        Van cambiando solas con un fundido suave, sin flechas ni puntos. Usa las flechas para
                        ordenarlas y «Quitar» para retirarlas. Sin imágenes se muestra el retrato de siempre.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className={`${BTN_GHOST} cursor-pointer !px-2.5 !py-1.5 text-xs`}>
                        {subiendo === "carrusel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {subiendo === "carrusel" ? "Subiendo…" : "Subir imágenes"}
                        <input
                          accept="image/*"
                          className="sr-only"
                          disabled={subiendo !== null}
                          multiple
                          onChange={(e) => {
                            void subirCarrusel(e.target.files);
                            e.target.value = "";
                          }}
                          type="file"
                        />
                      </label>
                      <button className={`${BTN_GHOST} !px-2.5 !py-1.5 text-xs`} onClick={() => pedirEnlace("carrusel")} type="button">
                        <Link2 className="h-3.5 w-3.5" /> Imagen por enlace
                      </button>
                    </div>

                    {borrador.imagenes.length ? (
                      <ul className="grid gap-2">
                        {borrador.imagenes.map((url, i) => (
                          <li key={`${url}-${i}`} className="flex items-center gap-2 border border-white/10 bg-slate-950/60 p-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una URL externa o de Storage */}
                            <img alt="" className="h-12 w-20 shrink-0 object-cover" src={url} />
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                              {i === 0 ? "Primera · " : ""}
                              {decodeURIComponent(url.split("/").pop() ?? url)}
                            </span>
                            <button
                              aria-label="Subir"
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              disabled={i === 0}
                              onClick={() => moverImagen(i, -1)}
                              type="button"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Bajar"
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              disabled={i === borrador.imagenes.length - 1}
                              onClick={() => moverImagen(i, 1)}
                              type="button"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-red-200 hover:text-red-100"
                              onClick={() => cambiar(["imagenes"], borrador.imagenes.filter((_, j) => j !== i))}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="flex items-center gap-2 border border-dashed border-white/15 p-3 text-xs text-slate-400">
                        <ImagePlus className="h-4 w-4" /> Aún no hay imágenes: se muestra el retrato fijo.
                      </p>
                    )}

                    {borrador.imagenes.length > 1 ? (
                      <label className="grid gap-1.5">
                        <span className="text-xs font-semibold text-slate-300">
                          Cambiar de imagen cada {borrador.intervalo} segundos
                        </span>
                        <input
                          className="accent-emerald-300"
                          max={INTERVALO_MAX}
                          min={INTERVALO_MIN}
                          onChange={(e) => cambiar(["intervalo"], Number(e.target.value))}
                          type="range"
                          value={borrador.intervalo}
                        />
                      </label>
                    ) : null}
                  </section>

                  {SECCIONES.map((seccion) => (
                    <section
                      key={seccion.id}
                      className="grid gap-3 border border-white/10 bg-white/[0.04] p-4"
                      onFocus={() => irASeccion(seccion.selector)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold text-white">{seccion.titulo}</h2>
                          <p className="mt-0.5 text-xs text-slate-400">{seccion.descripcion}</p>
                        </div>
                        <button
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                          onClick={() => restaurarSeccion(seccion)}
                          title={`Volver a los textos originales de esta sección (${idioma.toUpperCase()})`}
                          type="button"
                        >
                          <RotateCcw className="h-3 w-3" /> Original
                        </button>
                      </div>

                      {seccion.campos.map((campo) => {
                        const valor = leerRuta(borrador[idioma], campo.ruta);
                        return (
                          <label key={campo.ruta.join(".")} className="grid gap-1.5">
                            <span className="text-xs font-semibold text-slate-300">{campo.etiqueta}</span>
                            {campo.largo ? (
                              <textarea
                                className="field min-h-[84px] text-sm"
                                onChange={(e) => cambiarTexto(campo.ruta, e.target.value)}
                                value={valor}
                              />
                            ) : (
                              <input
                                className="field text-sm"
                                onChange={(e) => cambiarTexto(campo.ruta, e.target.value)}
                                value={valor}
                              />
                            )}
                          </label>
                        );
                      })}

                      {seccion.id === "bio" ? (
                        <div className="grid gap-2">
                          <span className="text-xs font-semibold text-slate-300">Foto</span>
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una URL externa o de Storage */}
                            <img
                              alt=""
                              className="h-16 w-16 shrink-0 object-cover grayscale-[65%]"
                              src={borrador.fotoBio ?? "/assets/portrait.jpg"}
                            />
                            <div className="flex flex-wrap gap-2">
                              <label className={`${BTN_GHOST} cursor-pointer !px-2.5 !py-1.5 text-xs`}>
                                {subiendo === "bio" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                Cambiar foto
                                <input
                                  accept="image/*"
                                  className="sr-only"
                                  disabled={subiendo !== null}
                                  onChange={(e) => {
                                    void subirFotoBio(e.target.files);
                                    e.target.value = "";
                                  }}
                                  type="file"
                                />
                              </label>
                              <button className={`${BTN_GHOST} !px-2.5 !py-1.5 text-xs`} onClick={() => pedirEnlace("bio")} type="button">
                                <Link2 className="h-3.5 w-3.5" /> Por enlace
                              </button>
                              {borrador.fotoBio ? (
                                <button className={`${BTN_GHOST} !px-2.5 !py-1.5 text-xs`} onClick={() => cambiar(["fotoBio"], null)} type="button">
                                  <RotateCcw className="h-3.5 w-3.5" /> Retrato original
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ))}

                  <p className="pb-6 text-[11px] leading-5 text-slate-500">
                    El menú superior, el pie de página y las demás secciones del sitio se editan en{" "}
                    <code>sitio-web/plantilla.mjs</code>.
                  </p>
                </>
              )}
            </div>
          </aside>

          {/* Vista previa en tiempo real */}
          <section
            className={`min-h-0 flex-col bg-black/30 p-2 sm:p-3 lg:flex ${panelMovil === "vista" ? "flex" : "hidden"}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">
                Vista previa · {idioma === "es" ? "Español" : "English"}
              </span>
              <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5" role="group" aria-label="Tamaño de pantalla">
                {(
                  [
                    ["escritorio", Monitor, "Computadora"],
                    ["movil", Smartphone, "Celular"],
                  ] as const
                ).map(([valor, Icono, etiqueta]) => (
                  <button
                    key={valor}
                    aria-label={etiqueta}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      dispositivo === valor ? "bg-emerald-300 text-slate-950" : "text-slate-300 hover:text-white"
                    }`}
                    onClick={() => setDispositivo(valor)}
                    type="button"
                  >
                    <Icono className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{etiqueta}</span>
                  </button>
                ))}
              </div>
            </div>
            <div ref={setElementoMarco} className="relative min-h-0 flex-1 overflow-hidden">
              <div
                className="absolute top-0 origin-top overflow-hidden border border-white/10 bg-[#171918] shadow-2xl"
                style={{
                  width: anchoPagina,
                  height: escala ? marco.alto / escala : marco.alto,
                  transform: `translateX(-50%) scale(${escala})`,
                  left: "50%",
                }}
              >
                {capas.map((capa, i) => (
                  <iframe
                    key={capa.id}
                    ref={(el) => {
                      if (el) iframesRef.current.set(capa.id, el);
                      else iframesRef.current.delete(capa.id);
                    }}
                    className="absolute inset-0 h-full w-full border-0"
                    onLoad={() => alCargarCapa(capa.id)}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={capa.html}
                    style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 1 : 0 }}
                    title="Vista previa de la portada"
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Sí, descartar"
        message="El borrador vuelve a lo que está publicado. Los textos e imágenes sin publicar se pierden."
        onCancel={() => setConfirmarDescartar(false)}
        onConfirm={descartar}
        open={confirmarDescartar}
        title="¿Descartar los cambios?"
      />
    </ModalPortal>
  );
}
