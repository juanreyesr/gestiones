// Permite a Node (con --experimental-strip-types) importar módulos .ts escritos
// sin extensión (como los usa Next.js). Solo para los scripts de prueba.
import { register } from "node:module";
register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(especificador, contexto, siguiente) {
  try { return await siguiente(especificador, contexto); }
  catch (error) {
    if (especificador.startsWith(".") && !/\\.[cm]?[jt]s$/.test(especificador)) return siguiente(especificador + ".ts", contexto);
    throw error;
  }
}`),
  import.meta.url,
);
