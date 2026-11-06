// Pruebas del seguimiento programado (lógica del servidor con base de datos y Telegram simulados).
// Ejecutar: pnpm test:seguimientos
import assert from "node:assert/strict";
process.env.TELEGRAM_BOT_TOKEN = "x";
process.env.TELEGRAM_WEBHOOK_SECRET = "y";
process.env.NEXT_PUBLIC_APP_URL = "https://www.juanjreyes.org";
const { procesarSeguimientos, sumarDias, textoFrecuencia } = await import("../src/lib/server/seguimientos-evaluaciones.ts");
const { fechaLocal } = await import("../src/lib/server/telegram.ts");

/** Cliente mínimo en memoria con la forma de supabase-js que usa el módulo. */
function falsoAdmin(tablas) {
  let n = 0;
  const from = (t) => {
    const filas = (tablas[t] ??= []);
    let op = "select", datos = null, filtros = [], unico = false;
    const q = {
      select() { return q; },
      insert(d) { op = "insert"; datos = d; return q; },
      update(d) { op = "update"; datos = d; return q; },
      delete() { op = "delete"; return q; },
      eq(c, v) { filtros.push((f) => f[c] === v); return q; },
      lt(c, v) { filtros.push((f) => f[c] < v); return q; },
      is(c, v) { filtros.push((f) => (f[c] ?? null) === v); return q; },
      or(expr) {
        const hoy = expr.match(/proxima_fecha\.lte\.(.+)$/)[1];
        filtros.push((f) => f.pendiente_evaluacion_id != null || f.proxima_fecha <= hoy);
        return q;
      },
      single() { unico = true; return q; },
      maybeSingle() { unico = true; return q; },
      then(res) {
        let out;
        if (op === "insert") { const f = { id: `ev${++n}`, token: `tok${n}`, estado: "abierta", created_at: "2026-11-06T15:00:00Z", ...datos }; filas.push(f); out = [f]; }
        else {
          const sel = filas.filter((f) => filtros.every((p) => p(f)));
          if (op === "update") sel.forEach((f) => Object.assign(f, datos));
          if (op === "delete") sel.forEach((f) => filas.splice(filas.indexOf(f), 1));
          out = sel.map((f) => ({ ...f }));
        }
        return Promise.resolve(res({ data: unico ? out[0] ?? null : out, error: null }));
      },
    };
    return q;
  };
  return { from };
}

const enviados = [];
let telegramFalla = false;
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  if (telegramFalla) return new Response(JSON.stringify({ ok: false, description: "caído" }), { status: 500 });
  enviados.push(body);
  return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }));
};

let ok = 0;
const caso = async (nombre, fn) => { await fn(); ok++; console.log(`✔ ${nombre}`); };
const hoy = fechaLocal();
const config = { chatId: 123 };
const base = () => ({
  gestionesjj_pacientes: [{ id: "p1", nombre: "Ana Pérez", telefono: "+502 5555 1234", pais: "GT", es_menor: false, responsables: [] }],
  gestionesjj_evaluaciones: [{ id: "ev0", token: "tok0", estado: "completa", created_at: "2026-10-01T15:00:00Z", etiqueta: null }],
  gestionesjj_evaluacion_seguimientos: [{
    id: "s1", created_by: "u1", paciente_id: "p1", instrumento: "eapi", opciones: { modulos: ["gad", "dass"] }, etiqueta: null,
    cada_dias: 28, proxima_fecha: sumarDias(hoy, -1), activo: true, ultima_evaluacion_id: "ev0", pendiente_evaluacion_id: null, pendiente_tipo: null, avisos: 0, intentos: 0,
  }],
});

await caso("Utilidades de fecha y frecuencia", () => {
  assert.equal(sumarDias("2026-12-30", 3), "2027-01-02");
  assert.equal(textoFrecuencia(28), "cada 4 semanas");
  assert.equal(textoFrecuencia(7), "cada semana");
  assert.equal(textoFrecuencia(10), "cada 10 días");
});

await caso("Vencido con el anterior respondido: crea enlace nuevo y avisa con WhatsApp listo", async () => {
  const t = base(); enviados.length = 0;
  const r = await procesarSeguimientos(falsoAdmin(t), config);
  assert.deepEqual(r, { nuevos: 1, recordatorios: 0, avisados: 1, errores: 0 });
  const nueva = t.gestionesjj_evaluaciones.at(-1);
  assert.equal(nueva.instrumento, "eapi"); assert.deepEqual(nueva.opciones, { modulos: ["gad", "dass"] }); assert.equal(nueva.nota, "Seguimiento programado");
  const s = t.gestionesjj_evaluacion_seguimientos[0];
  assert.equal(s.proxima_fecha, sumarDias(hoy, 28)); assert.equal(s.ultima_evaluacion_id, nueva.id);
  assert.equal(s.pendiente_evaluacion_id, null); assert.equal(s.avisos, 1);
  const msg = enviados[0];
  assert.match(msg.text, /Seguimiento programado/); assert.match(msg.text, /EAPI \(GAD-7, DASS-21\) · cada 4 semanas/);
  const wa = msg.reply_markup.inline_keyboard[0][0].url;
  assert.match(wa, /^https:\/\/wa\.me\/50255551234\?text=/);
  const texto = decodeURIComponent(wa.split("text=")[1]);
  assert.match(texto, /Ana, como parte de tu seguimiento/);
  assert.match(texto, new RegExp(`https://www.juanjreyes.org/evaluacion/${nueva.token}`));
  // Segunda ejecución el mismo día: no hace nada.
  const r2 = await procesarSeguimientos(falsoAdmin(t), config);
  assert.deepEqual(r2, { nuevos: 0, recordatorios: 0, avisados: 0, errores: 0 });
});

await caso("Enlace anterior sin responder: recordatorio con el mismo enlace, sin crear otro", async () => {
  const t = base(); t.gestionesjj_evaluaciones[0].estado = "abierta"; enviados.length = 0;
  const r = await procesarSeguimientos(falsoAdmin(t), config);
  assert.equal(r.recordatorios, 1); assert.equal(t.gestionesjj_evaluaciones.length, 1);
  assert.equal(t.gestionesjj_evaluacion_seguimientos[0].proxima_fecha, sumarDias(hoy, 3));
  assert.match(enviados[0].text, /Recordatorio de evaluación pendiente/);
  assert.match(decodeURIComponent(enviados[0].reply_markup.inline_keyboard[0][0].url), /te recuerdo el cuestionario/);
});

await caso("Telegram falla: queda pendiente y se reintenta sin crear enlaces de más", async () => {
  const t = base(); telegramFalla = true; enviados.length = 0;
  const r = await procesarSeguimientos(falsoAdmin(t), config);
  assert.equal(r.errores, 1);
  const s = t.gestionesjj_evaluacion_seguimientos[0];
  assert.ok(s.pendiente_evaluacion_id); assert.equal(s.intentos, 1); assert.equal(t.gestionesjj_evaluaciones.length, 2);
  telegramFalla = false;
  const r2 = await procesarSeguimientos(falsoAdmin(t), config);
  assert.equal(r2.avisados, 1); assert.equal(r2.nuevos, 0); assert.equal(t.gestionesjj_evaluaciones.length, 2);
  assert.equal(s.pendiente_evaluacion_id, null); assert.equal(s.intentos, 0);
});

await caso("Menor: el mensaje va al padre/madre del enlace y habla del niño", async () => {
  const t = base(); enviados.length = 0;
  Object.assign(t.gestionesjj_pacientes[0], { nombre: "Luis Gómez", es_menor: true, responsables: [{ nombre: "María López", telefono: "+502 4444 0000" }] });
  Object.assign(t.gestionesjj_evaluacion_seguimientos[0], { instrumento: "b-breve", opciones: {}, etiqueta: "María (mamá)" });
  await procesarSeguimientos(falsoAdmin(t), config);
  const wa = enviados[0].reply_markup.inline_keyboard[0][0].url;
  assert.match(wa, /wa\.me\/50244440000/);
  assert.match(decodeURIComponent(wa), /cuestionario sobre Luis/);
  assert.match(enviados[0].text, /para María \(mamá\)/);
});

await caso("Sin Telegram vinculado o en pausa: no avisa", async () => {
  const t = base();
  const r = await procesarSeguimientos(falsoAdmin(t), null);
  assert.equal(r.errores, 1); assert.equal(t.gestionesjj_evaluacion_seguimientos[0].error, "Telegram no está vinculado.");
  const t2 = base(); t2.gestionesjj_evaluacion_seguimientos[0].activo = false;
  assert.deepEqual(await procesarSeguimientos(falsoAdmin(t2), config), { nuevos: 0, recordatorios: 0, avisados: 0, errores: 0 });
});

console.log(`\n${ok}/6 casos correctos.`);
