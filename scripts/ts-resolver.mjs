// Permite a Node (con --experimental-strip-types) importar módulos .ts escritos
// sin extensión (como los usa Next.js) y el alias «@/» de tsconfig (= src/).
// Solo para los scripts de prueba.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(`${process.cwd()}/src/`).href;
register(
  "data:text/javascript," +
    encodeURIComponent(`
const SRC = ${JSON.stringify(SRC)};
export async function resolve(especificador, contexto, siguiente) {
  if (especificador.startsWith("@/")) especificador = SRC + especificador.slice(2);
  const relativo = especificador.startsWith(".") || especificador.startsWith("file:");
  try { return await siguiente(especificador, contexto); }
  catch (error) {
    if (relativo && !/\\.[cm]?[jt]sx?$/.test(especificador)) {
      try { return await siguiente(especificador + ".ts", contexto); }
      catch { return siguiente(especificador + ".tsx", contexto); }
    }
    throw error;
  }
}`),
  import.meta.url,
);
