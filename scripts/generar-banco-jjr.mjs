// Genera src/lib/evaluaciones/jjr/banco.ts desde los documentos fuente:
// node scripts/generar-banco-jjr.mjs docs/instrumentos/JJR-84_v0.2.0.md docs/instrumentos/JJR-INV-176_v0.3.0.md src/lib/evaluaciones/jjr/banco.ts
import fs from "node:fs";
const [v2, v3, salida] = process.argv.slice(2);
const t2 = fs.readFileSync(v2, "utf8"), t3 = fs.readFileSync(v3, "utf8");
const banco = JSON.parse(t3.split("```json")[1].split("```")[0]);
// v0.2 bank texts must match anchors
const filas2 = [...t2.matchAll(/^\|(\d+)\|([A-Z]{3}\d{2})\|([A-Z]{3})\|([^|]+)\|([^|]+)\|$/gm)].map((m) => ({ orden: +m[1], id: m[2], campo: m[3], faceta: m[4], actividad: m[5] }));
if (filas2.length !== 84) throw new Error("v0.2 filas " + filas2.length);
for (const f of filas2) { const b = banco.find((x) => x.id === f.id); if (!b || b.actividad !== f.actividad || b.grupo !== "ancla") throw new Error("difiere " + f.id); }
// campos (sección 6 de v0.2)
const sec6 = t2.split("## 6.")[1].split("## 7.")[0];
const campos = [...sec6.matchAll(/### ([A-Z]{3}) — (.+)\n([\s\S]*?)(?=\n### |$)/g)].map((m) => {
  const g = (k) => (m[3].match(new RegExp(k + ": (.+)")) || [])[1]?.trim();
  return { codigo: m[1], nombre: m[2].trim(), definicion: g("Definición"), limite: g("Límite interpretativo"), riasec: g("Relación conceptual para revisión")?.replace(/\.$/, ""), rutas: g("Rutas ilustrativas") };
});
if (campos.length !== 14 || campos.some((c) => !c.definicion || !c.limite || !c.riasec || !c.rutas)) throw new Error("campos");
// tabla de v0.3 (20 agrupaciones)
const tabla3 = [...t3.split("## 2.")[1].split("## 3.")[0].matchAll(/^\|([A-Z]{3})\|([^|]+)\|([^|]+)\|$/gm)].map((m) => ({ codigo: m[1], nombre: m[2].replace(/ — exploratorio$/, "").trim(), atencion: m[3].trim() }));
if (tabla3.length !== 20) throw new Error("tabla3 " + tabla3.length);
const j = (x) => JSON.stringify(x, null, 2);
fs.writeFileSync(salida, `/**
 * Banco de actividades y campos de «Intereses Vocacionales JJR Actualizada»
 * (Lic. Juan J. Reyes). GENERADO desde los documentos fuente
 * (JJR-84 v0.2.0-experimental y banco ampliado JJR-INV-176 v0.3.0-investigación):
 * no editar textos a mano; un cambio de texto exige nueva versión.
 *
 * Las 84 anclas (grupo «ancla», forma «AB») tienen el mismo texto en ambas
 * versiones. Los candidatos (56) y las áreas exploratorias (36) solo existen
 * en JJR-INV-176 y se reparten entre las formas A y B.
 */

export type CampoPrincipal = ${campos.map((c) => JSON.stringify(c.codigo)).join(" | ")};
export type CampoExploratorio = ${tabla3.slice(14).map((c) => JSON.stringify(c.codigo)).join(" | ")};
export type CampoJjr = CampoPrincipal | CampoExploratorio;
export type ItemJjr = {
  id: string;
  campo: CampoJjr;
  actividad: string;
  origen: "v0.2" | "nuevo_0.3";
  /** Etiqueta editorial de cobertura; no es subescala. */
  faceta: string;
  grupo: "ancla" | "candidato" | "exploratorio";
  /** «AB» = en ambas formas (no es una forma adicional). */
  forma: "AB" | "A" | "B";
};

/** Orden fijo de presentación y de informe (14 principales + 6 exploratorias). */
export const CAMPOS_JJR: readonly CampoJjr[] = ${JSON.stringify(tabla3.map((c) => c.codigo))};
export const CAMPOS_PRINCIPALES: readonly CampoPrincipal[] = ${JSON.stringify(campos.map((c) => c.codigo))};

/** Nombre y aspecto a vigilar en la revisión (tabla del banco ampliado). */
export const NOMBRES_CAMPOS: Record<CampoJjr, { nombre: string; atencion: string }> = ${j(Object.fromEntries(tabla3.map((c) => [c.codigo, { nombre: c.nombre, atencion: c.atencion }])))};

/** Definición, límite interpretativo, relación RIASEC (hipótesis conceptual) y rutas ilustrativas. */
export const INFO_CAMPOS: Record<CampoPrincipal, { definicion: string; limite: string; riasec: string; rutas: string }> = ${j(Object.fromEntries(campos.map((c) => [c.codigo, { definicion: c.definicion, limite: c.limite, riasec: c.riasec, rutas: c.rutas }])))};

export const BANCO_JJR: readonly ItemJjr[] = ${j(banco)};
`);
console.log("ok", banco.length, campos.length);
