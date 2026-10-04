import { NextResponse, type NextRequest } from "next/server";
import { HOST_RESPALDO, respaldoActivo } from "@/lib/dominio-respaldo";

const DOMINIO_OFICIAL = "https://www.juanjreyes.org";

/**
 * Quien entra por la direccion de Vercel pasa a la misma pagina en el dominio
 * oficial, salvo mientras dure el periodo de respaldo (src/lib/dominio-respaldo.ts):
 * se compara la fecha en cada visita, asi que la redireccion vuelve sola al
 * vencer. No toca /api (webhooks de Telegram, PayPal, WhatsApp y el callback
 * de Google) ni /_next (archivos de la app).
 */
export function proxy(request: NextRequest) {
  if (request.headers.get("host") !== HOST_RESPALDO || respaldoActivo()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(`${DOMINIO_OFICIAL}${pathname}${search}`, 307);
}

export const config = {
  matcher: ["/((?!api/|_next/).*)"],
};
