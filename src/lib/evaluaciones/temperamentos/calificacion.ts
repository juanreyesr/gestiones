/**
 * Cuestionario de temperamento · versión JJ: calificación. SOLO panel del
 * psicólogo (no importar desde el formulario).
 *
 * Reglas fijas:
 * - Puntaje por temperamento: suma de sus 10 ítems (0–40) y porcentaje.
 * - Orden de mayor a menor (empates: orden fijo S, C, M, F).
 * - Tipo de perfil:
 *   · poco diferenciado: mayor − menor ≤ 5 (se nombra igual el dominante, aclarando
 *     que la diferencia es pequeña);
 *   · predominante: primero − segundo ≥ 8;
 *   · combinado: primero − segundo < 8 («primero-segundo»; el orden importa);
 *     si primero = segundo, «codominantes».
 * - SIEMPRE hay temperamento dominante (el de mayor puntaje; empates S, C, M, F);
 *   en codominantes son los dos.
 * - Tercera influencia: en un perfil combinado, si segundo − tercero ≤ 3.
 * - Dimensiones orientativas: hacia afuera = (S + C) − (M + F) y reacción
 *   intensa = (C + M) − (S + F); etiquetas ≤ −10 / −9 a 9 / ≥ 10.
 * - Estilo de respuesta: todas iguales, media ≥ 3,5 o media ≤ 0,5.
 *
 * Instrumento orientativo sin baremos: describe tendencias, no es un diagnóstico.
 */
import { COMBINACIONES, TEMPERAMENTOS_INFO, TEXTO_POCO_DIFERENCIADO, type ClaveCombinacion } from "./contenido";
import { TEMPERAMENTOS_IDS, TEMPERAMENTOS_ITEMS, temperamentoDeItem, type TemperamentoId } from "./escalas";

export type TemperamentosDatos = { items: number[]; edad?: number | null; situacion?: string; abierta?: string };
export type TipoPerfil = "poco-diferenciado" | "predominante" | "combinado" | "codominantes";

export { COMBINACIONES, TEMPERAMENTOS_INFO, TEXTO_POCO_DIFERENCIADO };

/** Lado de cada ítem dentro de su temperamento, por vuelta (F = fuerte, D = difícil): 6 y 4 en cada uno. */
const LADOS: Record<TemperamentoId, string> = { S: "FFDFDFFDFD", C: "FDFFDFDFFD", M: "DFFDFFFDFD", F: "FFDFDFDFDF" };
/** Lado del ítem n (1–40): «fuerte» o «difícil». */
export const ladoDeItem = (n: number): "fuerte" | "dificil" => (LADOS[temperamentoDeItem(n)][Math.floor((n - 1) / 4)] === "F" ? "fuerte" : "dificil");

const baja = (id: TemperamentoId) => TEMPERAMENTOS_INFO[id].nombre.toLowerCase();

export type EtiquetaDimension = { valor: number; k: "bajo" | "medio" | "alto"; label: string };
export const etiquetaDimension = (valor: number, bajo: string, medio: string, alto: string): EtiquetaDimension =>
  valor <= -10 ? { valor, k: "bajo", label: bajo } : valor >= 10 ? { valor, k: "alto", label: alto } : { valor, k: "medio", label: medio };

export type CalificacionTemperamentos = {
  /** En el orden fijo S, C, M, F. */
  temperamentos: { id: TemperamentoId; nombre: string; suma: number; pct: number }[];
  /** De mayor a menor (empates: orden fijo). */
  orden: TemperamentoId[];
  tipo: TipoPerfil;
  /** Temperamento dominante: SIEMPRE existe (también en perfil poco diferenciado). */
  principal: TemperamentoId;
  /** Segundo temperamento (null si el perfil es poco diferenciado: no se arma una combinación). */
  secundario: TemperamentoId | null;
  /** Temperamento(s) dominante(s): uno, o dos si son codominantes. */
  dominantes: TemperamentoId[];
  /** Tercera influencia (solo en perfiles combinados o codominantes). */
  tercero: TemperamentoId | null;
  /** Clave de la combinación «primero-segundo» (combinado o codominantes). */
  combinacion: ClaveCombinacion | null;
  /** Nombre legible: «Colérico con rasgos de sanguíneo», «Predominantemente flemático», «Dominante sanguíneo (perfil poco diferenciado)», … */
  perfil: string;
  /** Mayor − menor. */
  rango: number;
  /** Primero − segundo. */
  brecha: number;
  dimensiones: { afuera: EtiquetaDimension; intensa: EtiquetaDimension };
  media: number;
  flags: { lvl: "alert" | "warn" | ""; t: string }[];
  /** Ítems marcados con 4 (o con 3 si no hay ninguno con 4) del temperamento principal y del secundario. */
  destacados: { id: TemperamentoId; nombre: string; items: { n: number; texto: string; valor: number; lado: "fuerte" | "dificil" }[] }[];
};

export function calificarTemperamentos(d: TemperamentosDatos): CalificacionTemperamentos {
  const sumas: Record<TemperamentoId, number> = { S: 0, C: 0, M: 0, F: 0 };
  d.items.forEach((v, i) => {
    sumas[temperamentoDeItem(i + 1)] += v;
  });
  const temperamentos = TEMPERAMENTOS_IDS.map((id) => ({ id, nombre: TEMPERAMENTOS_INFO[id].nombre, suma: sumas[id], pct: Math.round((sumas[id] / 40) * 100) }));
  const orden = [...TEMPERAMENTOS_IDS].sort((a, b) => sumas[b] - sumas[a] || TEMPERAMENTOS_IDS.indexOf(a) - TEMPERAMENTOS_IDS.indexOf(b));
  const [p, s, t] = orden;
  const rango = sumas[orden[0]] - sumas[orden[3]];
  const brecha = sumas[p] - sumas[s];

  let tipo: TipoPerfil;
  if (rango <= 5) tipo = "poco-diferenciado";
  else if (brecha >= 8) tipo = "predominante";
  else if (brecha === 0) tipo = "codominantes";
  else tipo = "combinado";

  const enCombinacion = tipo === "combinado" || tipo === "codominantes";
  const tercero = enCombinacion && sumas[s] - sumas[t] <= 3 ? t : null;
  // El perfil de la mezcla se muestra también con un dominante claro si el segundo tiene presencia (≥ 16 de 40).
  const conMezcla = enCombinacion || (tipo === "predominante" && sumas[s] >= 16);
  const combinacion = conMezcla ? (`${p}-${s}` as ClaveCombinacion) : null;
  const perfil =
    tipo === "poco-diferenciado"
      ? `Dominante ${baja(p)} (perfil poco diferenciado)`
      : tipo === "predominante"
        ? `Predominantemente ${baja(p)}`
        : tipo === "combinado"
          ? `${TEMPERAMENTOS_INFO[p].nombre} con rasgos de ${baja(s)}`
          : `Codominante: ${baja(p)} y ${baja(s)}`;

  const afueraValor = sumas.S + sumas.C - (sumas.M + sumas.F);
  const intensaValor = sumas.C + sumas.M - (sumas.S + sumas.F);
  const dimensiones = {
    afuera: etiquetaDimension(afueraValor, "Más hacia adentro (reservado)", "Intermedio", "Más hacia afuera (sociable)"),
    intensa: etiquetaDimension(intensaValor, "Reacción más serena (estable)", "Intermedio", "Reacción más intensa (reactiva)"),
  };

  const media = d.items.reduce((a, v) => a + v, 0) / d.items.length;
  const flags: CalificacionTemperamentos["flags"] = [];
  if (d.items.every((v) => v === d.items[0]))
    flags.push({ lvl: "alert", t: `Todas las respuestas son iguales (${d.items[0]}): posible respuesta automática. No interpretar el perfil y confirmar en entrevista.` });
  else if (media >= 3.5)
    flags.push({ lvl: "warn", t: "Promedio ≥ 3,5: tendencia a decir que sí a todo (o a verse muy favorablemente); el perfil se diferencia poco. Interpretar con cautela." });
  else if (media <= 0.5)
    flags.push({ lvl: "warn", t: "Promedio ≤ 0,5: casi ninguna frase le resultó parecida; explorar dificultad para reconocerse, desinterés, anhedonia o respuestas al azar." });
  if (tipo === "poco-diferenciado")
    flags.push({ lvl: "", t: `Perfil poco diferenciado (diferencia entre el puntaje más alto y el más bajo = ${rango}): el dominante (${TEMPERAMENTOS_INFO[p].nombre}) se nombra, pero la diferencia con los demás es pequeña: leerlo como una tendencia suave y conversarlo con el paciente.` });
  if (tipo === "codominantes") flags.push({ lvl: "", t: `Los dos puntajes más altos son iguales (${sumas[p]}): se presentan como codominantes, en el orden fijo de la prueba.` });
  if (tercero) flags.push({ lvl: "", t: `Tercera influencia: ${TEMPERAMENTOS_INFO[tercero].nombre} (diferencia de ${sumas[s] - sumas[tercero]} con el segundo; se menciona cuando es de 3 puntos o menos).` });
  if (d.edad && d.edad < 14) flags.push({ lvl: "warn", t: `Edad ${d.edad}: el temperamento se observa mejor con información de otras personas; usar el perfil solo para conversar.` });
  const rangoLvl = { alert: 0, warn: 1, "": 2 } as const;
  flags.sort((a, b) => rangoLvl[a.lvl] - rangoLvl[b.lvl]);

  const destacados = (tipo === "poco-diferenciado" ? [p] : [p, s]).map((id) => {
    const marcados = d.items.map((valor, i) => ({ n: i + 1, valor })).filter((x) => temperamentoDeItem(x.n) === id);
    const con4 = marcados.filter((x) => x.valor === 4);
    const elegidos = con4.length ? con4 : marcados.filter((x) => x.valor === 3);
    return {
      id,
      nombre: TEMPERAMENTOS_INFO[id].nombre,
      items: elegidos.map((x) => ({ n: x.n, texto: TEMPERAMENTOS_ITEMS[x.n - 1], valor: x.valor, lado: ladoDeItem(x.n) })),
    };
  });

  return {
    temperamentos,
    orden,
    tipo,
    principal: p,
    secundario: tipo === "poco-diferenciado" ? null : s,
    dominantes: tipo === "codominantes" ? [p, s] : [p],
    tercero,
    combinacion,
    perfil,
    rango,
    brecha,
    dimensiones,
    media,
    flags,
    destacados,
  };
}

/** Seguimiento entre dos aplicaciones: cambio del tipo de perfil y de cada puntaje. */
export function seguimientoTemperamentos(actual: TemperamentosDatos, anterior: TemperamentosDatos) {
  const a = calificarTemperamentos(actual);
  const p = calificarTemperamentos(anterior);
  return {
    filas: a.temperamentos.map((v, i) => ({ id: v.id, nombre: v.nombre, antes: p.temperamentos[i].suma, ahora: v.suma, cambio: v.suma - p.temperamentos[i].suma })),
    perfilAntes: p.perfil,
    perfilAhora: a.perfil,
    tipoAntes: p.tipo,
    tipoAhora: a.tipo,
    cambioDeTipo: p.perfil !== a.perfil,
  };
}

export const TEMPERAMENTOS_AVISO =
  "Cuestionario orientativo de temperamento, de redacción propia, basado en la tipología clásica de los cuatro temperamentos (sanguíneo, colérico, melancólico y flemático; Hipócrates y Galeno) y en su lectura moderna en dos dimensiones, extraversión y estabilidad emocional (Eysenck): sanguíneo = extravertido y estable; colérico = extravertido y reactivo; melancólico = introvertido y reactivo; flemático = introvertido y estable. Es una tipología descriptiva tradicional, no un diagnóstico ni una medida validada con baremos: describe tendencias, ningún temperamento es mejor que otro y la mayoría de las personas combina dos. Debe integrarse con la entrevista, la historia y el contexto de la persona.";
