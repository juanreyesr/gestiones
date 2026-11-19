/**
 * Fichas terapéuticas JJR: detección de palabras de riesgo en el texto libre
 * (ideas de muerte, de suicidio o de hacerse daño). Reglas fijas, sin IA.
 *
 * Criterio (decidido para este módulo):
 *  - Se prefiere avisar de más que de menos: un falso positivo cuesta una revisión
 *    del psicólogo; uno negativo, una señal perdida.
 *  - Se busca sobre texto sin tildes ni mayúsculas; la ñ cuenta como n.
 *  - Se marca: suicid*, matarme / «me quiero matar», quitarme la vida, hacerme daño
 *    («me hago daño»), autolesión, cortarme las venas, «no quiero vivir / seguir
 *    viviendo», «no vale la pena vivir», quiero / quisiera morir (o morirme), ideas o
 *    deseos de muerte, «ojalá me muriera», «mejor muerto», «quiero desaparecer
 *    (para siempre / de este mundo)», «no despertar nunca».
 *  - NO se marca: expresiones coloquiales («me muero de risa / de hambre / de
 *    vergüenza / de sueño», «me quiero morir de la pena»), hablar de la muerte de otra
 *    persona o de un duelo («se murió mi abuelo»), «miedo a morir» sin deseo, ni
 *    «quiero desaparecer el dolor / mis deudas» (verbo transitivo), ni «no quiero vivir
 *    lejos / en otra ciudad / con mis suegros».
 *  - Frases protectoras explícitas se descartan antes de buscar («no quiero hacerme
 *    daño», «no tengo ideas suicidas», «nunca he pensado en matarme»). Cualquier otra
 *    negación NO descarta la coincidencia (p. ej. «no puedo más y quiero matarme»).
 * Es una ayuda para priorizar la lectura, no una evaluación de riesgo: siempre se
 * revisa la respuesta completa.
 */
import { camposDeFicha, type Ficha } from "./catalogo";
import type { RespuestasFicha, ValorCasillas } from "./codigo";

/** Mismo largo que el original: minúsculas y sin tildes (ñ → n). */
function normalizar(texto: string): string {
  let out = "";
  for (const ch of texto) {
    const base = Array.from(ch.normalize("NFD"))[0] ?? ch;
    const bajo = base.toLowerCase();
    out += bajo.length === ch.length ? bajo : ch;
  }
  return out;
}

const COLOQUIAL = "de\\s+(?:(?:la|el|una|un|puro|pura|tanta|tanto)\\s+)?(?:risa|verguenza|pena|hambre|sueno|calor|frio|ganas|envidia|aburrimiento|sed|celos|curiosidad|cansancio|miedo|susto|nervios|amor|coraje|rabia|lastima)\\b";
const DESEO = "(?:quiero|quisiera|queria|prefiero|preferiria|deseo|deseaba|desearia|ojala|me gustaria|pienso en|pensando en|pensar en|ganas de|deseos de|deseo de|ideas de|pensamientos de)";
const FIN_DE_FRASE = "(?=\\s*(?:$|[.,;:!?)\\n]|para siempre|de este mundo|del mundo|de la faz|de aqui|y no volver|y que nadie|y nunca|de todo|de una vez|por completo))";

/** Frases protectoras (se anulan antes de buscar). */
const PROTECTORAS: RegExp[] = [
  /\b(?:no|nunca|jamas)\s+(?:me\s+)?(?:quiero|voy a|pienso|podria|puedo|tengo ganas de|he pensado en)\s+(?:me\s+)?(?:hacer(?:me|se)?\s+dano|matar(?:me)?|suicidar(?:me)?|quitar(?:me)?\s+la\s+vida)\b/g,
  /\bno tengo\s+(?:ideas|pensamientos|deseos|ganas)\s+(?:suicidas|de suicidio|de muerte|de morir|de hacerme dano|de matarme)\b/g,
  /\bnunca he\s+(?:pensado en|tenido ideas de|intentado)\s+(?:suicidarme|matarme|hacerme dano|suicidio)\b/g,
];

const RIESGO: RegExp[] = [
  /\bsuicid\w*/g,
  /\bmatarme\b/g,
  /\bme\s+(?:quiero|quisiera|queria|voy a|iba a|pienso|podria|deberia)\s+(?:matar|quitar\s+la\s+vida)\b/g,
  /\bquit(?:arme|arse)\s+la\s+vida\b/g,
  /\b(?:acabar|terminar)\s+con\s+(?:mi\s+vida|mi\s+existencia)\b/g,
  /\bponerle\s+fin\s+a\s+mi\s+vida\b/g,
  /\bhacerme\s+dano\b/g,
  /\bme\s+(?:quiero|quisiera|queria|voy a|iba a|pienso|podria|puedo)\s+hacer\s+dano\b/g,
  /\bme\s+hago\s+dano\b/g,
  /\bautolesion\w*/g,
  /\bautolesionar\w*/g,
  /\bcortarme\s+(?:las\s+venas|los\s+brazos|las\s+munecas|a\s+proposito)\b/g,
  /\blastimarme\s+a\s+proposito\b/g,
  // «No quiero vivir lejos / en / con mis suegros…» es otra cosa: se excluye si «vivir» va seguido de lugar o compañía.
  /\bno\s+quiero\s+(?:seguir\s+)?(?:vivir(?!\s+(?:en|lejos|cerca|solo|sola|aqui|alli|ahi|alla|donde|de|por|a|con\s+(?:mi|mis|su|sus|ella|el|ellos|ellas|alguien|otra|otro|otros|mama|papa|tu|tus))\b)|viviendo|existir|estar\s+vivo|estar\s+viva)\b/g,
  /\bno\s+vale\s+la\s+pena\s+(?:vivir|seguir\s+viviendo|seguir\s+con\s+vida)\b/g,
  /\bno\s+tiene\s+sentido\s+(?:vivir|seguir\s+viviendo)\b/g,
  /\b(?:quisiera|ojala|prefiero|preferiria)\s+no\s+(?:existir|despertar)\b/g,
  /\bno\s+despertar\s+nunca\b/g,
  new RegExp(`\\b(?:me\\s+)?${DESEO}\\s+morir(?:me|se)?\\b(?!\\s+${COLOQUIAL})`, "g"),
  /\bojala\s+(?:me\s+)?(?:muriera|muera|muriese|hubiera\s+muerto|hubiese\s+muerto)\b/g,
  /\b(?:mejor|estaria\s+mejor)\s+(?:estar\s+)?muert[oa]\b/g,
  /\b(?:quiero|quisiera|desearia|ojala)\s+estar\s+muert[oa]\b/g,
  /\b(?:ideas|pensamientos|deseos)\s+de\s+muerte\b/g,
  new RegExp(`\\b(?:quiero|quisiera|queria|desearia|ganas\\s+de|me\\s+gustaria)\\s+desaparecer(?:me)?\\b${FIN_DE_FRASE}`, "g"),
  /\b(?:quiero|quisiera|queria|deseo|desearia|ganas\s+de|me\s+gustaria|ojala\s+pudiera)\s+(?:\w+\s+){0,2}desaparecer(?:me)?\s+(?:para\s+siempre|de\s+este\s+mundo|de\s+la\s+faz)\b/g,
  new RegExp(`\\b(?:quiero|quisiera|queria|voy a|pienso en|ganas\\s+de)\\s+(?:acabar|terminar)\\s+con\\s+todo\\b${FIN_DE_FRASE}`, "g"),
];

/** Fragmentos del texto (tal como los escribió la persona) que sugieren riesgo. Lista vacía si no hay. */
export function detectarRiesgo(texto: string): string[] {
  if (!texto || !texto.trim()) return [];
  let t = normalizar(texto);
  for (const p of PROTECTORAS) t = t.replace(p, (m) => " ".repeat(m.length));
  const rangos: [number, number][] = [];
  for (const re of RIESGO) {
    re.lastIndex = 0;
    for (let m = re.exec(t); m; m = re.exec(t)) {
      if (m[0] === "") {
        re.lastIndex++;
        continue;
      }
      rangos.push([m.index, m.index + m[0].length]);
    }
  }
  // Une rangos solapados para no repetir el mismo fragmento.
  rangos.sort((a, b) => a[0] - b[0]);
  const unidos: [number, number][] = [];
  for (const r of rangos) {
    const ult = unidos[unidos.length - 1];
    if (ult && r[0] <= ult[1]) ult[1] = Math.max(ult[1], r[1]);
    else unidos.push([...r]);
  }
  return unidos.map(([a, b]) => texto.slice(a, b).trim());
}

/** Textos libres de una respuesta (texto, párrafo, listas, celdas de tablas y «Otra» de las casillas). */
export function textosLibres(ficha: Ficha, respuestas: RespuestasFicha | null | undefined): { campo: string; texto: string }[] {
  const out: { campo: string; texto: string }[] = [];
  for (const c of camposDeFicha(ficha)) {
    const v = respuestas?.[c.id];
    const poner = (t: unknown) => typeof t === "string" && t.trim() && out.push({ campo: c.etiqueta, texto: t });
    if (c.tipo === "texto" || c.tipo === "parrafo") poner(v);
    else if (c.tipo === "lista" && Array.isArray(v)) (v as unknown[]).forEach(poner);
    else if (c.tipo === "casillas" && v && typeof v === "object") poner((v as ValorCasillas).otra);
    else if (c.tipo === "tabla" && Array.isArray(v)) (v as unknown[]).forEach((f) => Array.isArray(f) && f.forEach(poner));
  }
  return out;
}

export type RiesgoFicha = { riesgo: boolean; coincidencias: { campo: string; fragmento: string }[] };

/** Revisa todo el texto libre de la respuesta de una ficha. */
export function riesgoFicha(ficha: Ficha, respuestas: RespuestasFicha | null | undefined): RiesgoFicha {
  const coincidencias: RiesgoFicha["coincidencias"] = [];
  for (const { campo, texto } of textosLibres(ficha, respuestas)) for (const fragmento of detectarRiesgo(texto)) coincidencias.push({ campo, fragmento });
  return { riesgo: coincidencias.length > 0, coincidencias };
}
