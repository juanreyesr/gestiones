/**
 * Compras de la plataforma de tests: precio (primera vez o reevaluación), orden de PayPal,
 * captura y alta de la aplicación. Toda compra lleva custom_id «tests:<id>» para que el
 * webhook de PayPal la distinga de los pagos de consultas (nunca se aplica a una cita).
 */
import { apiBase, tokenAcceso } from "@/lib/server/paypal";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { esc, notificar } from "@/lib/server/telegram";
import { MONEDA, PRECIO_PRIMERA, PRECIO_REEVALUACION, testPorId } from "@/lib/tests/catalogo";

export const PREFIJO_CUSTOM_ID = "tests:";

export function isPayPalOrdenesConfigurado() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** Precio para esta persona: reevaluación si ya completó este test. */
export async function precioPara(admin: Admin, usuarioId: string, instrumento: string) {
  const { count } = await admin
    .from("tests_aplicaciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("instrumento", instrumento)
    .not("completada_at", "is", null);
  return (count ?? 0) > 0
    ? { tipo: "reevaluacion" as const, monto: PRECIO_REEVALUACION }
    : { tipo: "primera" as const, monto: PRECIO_PRIMERA };
}

/** Aplicación pagada y sin terminar de este test (para continuarla en vez de cobrar otra vez). */
export async function aplicacionPendiente(admin: Admin, usuarioId: string, instrumento: string) {
  const { data } = await admin
    .from("tests_aplicaciones")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("instrumento", instrumento)
    .is("completada_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Crea la compra pendiente y su orden en PayPal. Devuelve el id de la orden para el botón. */
export async function crearOrden(admin: Admin, usuarioId: string, instrumento: string) {
  const test = testPorId(instrumento);
  if (!test) return { error: "Test no disponible." };
  const precio = await precioPara(admin, usuarioId, instrumento);
  const { data: compra, error } = await admin
    .from("tests_compras")
    .insert({ usuario_id: usuarioId, instrumento, tipo: precio.tipo, monto: precio.monto, moneda: MONEDA })
    .select("id")
    .single();
  if (error || !compra) return { error: "No se pudo iniciar la compra." };
  const compraId = (compra as { id: string }).id;

  const token = await tokenAcceso();
  if (!token) return { error: "El pago no está disponible en este momento." };
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": compraId },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: compraId,
          custom_id: `${PREFIJO_CUSTOM_ID}${compraId}`,
          description: `${precio.tipo === "reevaluacion" ? "Reevaluación" : "Test"}: ${test.nombre}`.slice(0, 127),
          amount: { currency_code: MONEDA, value: precio.monto.toFixed(2) },
        },
      ],
      application_context: { brand_name: "Juan José Reyes · Tests", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
    }),
    cache: "no-store",
  });
  const orden = (await res.json().catch(() => null)) as { id?: string } | null;
  if (!res.ok || !orden?.id) return { error: "No se pudo crear la orden de pago." };
  await admin.from("tests_compras").update({ paypal_order_id: orden.id }).eq("id", compraId);
  return { orderId: orden.id };
}

type Captura = { estado: string; captureId: string | null; customId: string | null; valor: number | null; moneda: string | null };

async function capturarEnPayPal(orderId: string): Promise<Captura | null> {
  const token = await tokenAcceso();
  if (!token) return null;
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `cap-${orderId}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    purchase_units?: { payments?: { captures?: { id?: string; status?: string; custom_id?: string; amount?: { value?: string; currency_code?: string } }[] } }[];
  } | null;
  // Orden ya capturada antes (doble clic o reintento): se consulta para confirmar.
  if (!res.ok && res.status !== 422) return null;
  const datos =
    res.ok && json
      ? json
      : ((await (
          await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        )
          .json()
          .catch(() => null)) as typeof json);
  const cap = datos?.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap) return null;
  const valor = cap.amount?.value ? Number(cap.amount.value) : NaN;
  return {
    estado: cap.status ?? datos?.status ?? "",
    captureId: cap.id ?? null,
    customId: cap.custom_id ?? null,
    valor: Number.isFinite(valor) ? valor : null,
    moneda: cap.amount?.currency_code ?? null,
  };
}

/**
 * Marca la compra como pagada (una sola vez) y crea su aplicación. Comprueba el monto y la moneda
 * contra lo guardado. Devuelve el id de la aplicación. Lo usan la captura y el webhook.
 */
export async function confirmarPago(admin: Admin, compraId: string, captura: { captureId: string | null; valor: number | null; moneda: string | null }) {
  const { data } = await admin.from("tests_compras").select("id,usuario_id,instrumento,tipo,monto,moneda,estado").eq("id", compraId).maybeSingle();
  const compra = data as { id: string; usuario_id: string; instrumento: string; tipo: string; monto: number; moneda: string; estado: string } | null;
  if (!compra) return { error: "Compra no encontrada." };
  if (captura.valor === null || Math.abs(Number(compra.monto) - captura.valor) > 0.009 || captura.moneda !== compra.moneda) {
    return { error: "El monto pagado no coincide con el precio del test." };
  }
  let nueva = false;
  if (compra.estado === "pendiente") {
    const { data: act } = await admin
      .from("tests_compras")
      .update({ estado: "pagada", pagada_at: new Date().toISOString(), paypal_capture_id: captura.captureId })
      .eq("id", compraId)
      .eq("estado", "pendiente")
      .select("id");
    nueva = Array.isArray(act) && act.length > 0;
  } else if (compra.estado !== "pagada") {
    return { error: "Esta compra ya no está activa." };
  }
  // La aplicación es única por compra: si ya existe, se reutiliza.
  const existente = await admin.from("tests_aplicaciones").select("id").eq("compra_id", compraId).maybeSingle();
  let aplicacionId = (existente.data as { id: string } | null)?.id ?? null;
  if (!aplicacionId) {
    const test = testPorId(compra.instrumento);
    const { data: ap } = await admin
      .from("tests_aplicaciones")
      .insert({ usuario_id: compra.usuario_id, compra_id: compraId, instrumento: compra.instrumento, opciones: test?.opciones ?? {} })
      .select("id")
      .single();
    aplicacionId = (ap as { id: string } | null)?.id ?? null;
    if (!aplicacionId) {
      const otra = await admin.from("tests_aplicaciones").select("id").eq("compra_id", compraId).maybeSingle();
      aplicacionId = (otra.data as { id: string } | null)?.id ?? null;
    }
  }
  if (nueva) await avisarVenta(admin, compra);
  return { aplicacionId };
}

/** Captura la orden aprobada por la persona (botón de PayPal o tarjeta) y la confirma. */
export async function capturarOrden(admin: Admin, usuarioId: string, orderId: string) {
  const { data } = await admin.from("tests_compras").select("id,usuario_id").eq("paypal_order_id", orderId).maybeSingle();
  const compra = data as { id: string; usuario_id: string } | null;
  if (!compra || compra.usuario_id !== usuarioId) return { error: "Orden no válida." };
  const cap = await capturarEnPayPal(orderId);
  if (!cap) return { error: "No se pudo confirmar el pago con PayPal. Si se cobró, aparecerá en unos minutos en «Mis tests»." };
  if (cap.estado !== "COMPLETED") return { error: "El pago no se completó. Intenta de nuevo o usa otro medio de pago." };
  if (cap.customId !== `${PREFIJO_CUSTOM_ID}${compra.id}`) return { error: "El pago no corresponde a esta compra." };
  return confirmarPago(admin, compra.id, cap);
}

async function avisarVenta(admin: Admin, compra: { usuario_id: string; instrumento: string; tipo: string; monto: number; moneda: string }) {
  const { data } = await admin.from("tests_usuarios").select("nombre,correo,pais").eq("id", compra.usuario_id).maybeSingle();
  const u = data as { nombre: string; correo: string; pais: string | null } | null;
  const test = testPorId(compra.instrumento);
  await notificar(
    "tests_ventas",
    [
      `🧪 <b>Venta de test${compra.tipo === "reevaluacion" ? " (reevaluación)" : ""}</b>`,
      `${esc(test?.nombre ?? compra.instrumento)} · US$${Number(compra.monto).toFixed(2)}`,
      u ? `${esc(u.nombre)} · ${esc(u.correo)}${u.pais ? ` · ${esc(u.pais)}` : ""}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

/** Reembolso desde PayPal (webhook): la compra queda reembolsada. */
export async function marcarReembolso(admin: Admin, captureId: string) {
  const { data } = await admin
    .from("tests_compras")
    .update({ estado: "reembolsada" })
    .eq("paypal_capture_id", captureId)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}
