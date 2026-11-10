// Pruebas de los avisos de la hoja de datos generales y del texto de la solicitud de cita.
// Ejecutar: pnpm test:datos-pendientes
import assert from "node:assert/strict";
process.env.TELEGRAM_BOT_TOKEN = "x";
process.env.TELEGRAM_WEBHOOK_SECRET = "y";
process.env.NEXT_PUBLIC_APP_URL = "https://www.juanjreyes.org";
process.env.CRON_SECRET = "secreto-de-prueba";
const { avisoInmediato, avisosDatosPendientesManana, citaDeTokenDatos, cuandoEsLaCita, urlRecordatorioDatos } = await import("../src/lib/server/datos-pendientes.ts");
const { mensajeDatosAntesDeCita } = await import("../src/lib/clinica/mensaje-paciente.ts");
const { fechaLocal, inicioDiaIso } = await import("../src/lib/server/telegram.ts");
const { textoSolicitudCita } = await import("../src/lib/server/telegram-bot.ts");

/** Cliente mínimo en memoria (solo lo que usa el módulo); las citas traen su paciente embebido. */
function falsoAdmin(tablas) {
  const from = (t) => {
    const filas = (tablas[t] ??= []);
    let op = "select", datos = null, filtros = [];
    const q = {
      select() { return q; },
      update(d) { op = "update"; datos = d; return q; },
      eq(c, v) { filtros.push((f) => f[c] === v); return q; },
      in(c, v) { filtros.push((f) => v.includes(f[c])); return q; },
      not() { filtros.push((f) => f.paciente_id != null); return q; },
      gte(c, v) { filtros.push((f) => f[c] >= v); return q; },
      lt(c, v) { filtros.push((f) => f[c] < v); return q; },
      order() { return q; },
      then(res) {
        const sel = filas.filter((f) => filtros.every((p) => p(f)));
        if (op === "update") sel.forEach((f) => Object.assign(f, datos));
        const out = sel.map((f) => (t === "gestionesjj_citas" ? { ...f, gestionesjj_pacientes: tablas.gestionesjj_pacientes.find((p) => p.id === f.paciente_id) ?? null } : { ...f }));
        return Promise.resolve(res({ data: out, error: null }));
      },
    };
    return q;
  };
  return { from };
}

let ok = 0;
const caso = async (nombre, fn) => { await fn(); ok++; console.log(`✔ ${nombre}`); };
const manana = fechaLocal(1);
const a10 = new Date(new Date(inicioDiaIso(manana)).getTime() + 10 * 3600_000).toISOString();
const uuid = (n) => `00000000-0000-4000-8000-00000000000${n}`;

await caso("Mensaje: saludo por hora, «mañana», formulario y despedida", () => {
  const m = mensajeDatosAntesDeCita("Ana Pérez", "https://x/datos/t", "mañana", 15);
  assert.equal(m, "Buenas tardes, Ana. Te recuerdo que mañana tienes una cita agendada, por lo que quiero solicitarte que completes el siguiente formulario, por favor:\n\nhttps://x/datos/t\n\nNos vemos en sesión, saludos.");
  assert.match(mensajeDatosAntesDeCita("Ana", "u", "mañana", 8), /^Buenos días, Ana\./);
  assert.match(mensajeDatosAntesDeCita("Ana", "u", "mañana", 20), /^Buenas noches, Ana\./);
});

await caso("«mañana» / «hoy» según la fecha de la cita al tocar el botón", () => {
  assert.equal(cuandoEsLaCita(a10), "mañana");
  assert.equal(cuandoEsLaCita(a10, new Date(a10)), "hoy");
  assert.match(cuandoEsLaCita(a10, new Date(Date.now() - 3 * 86_400_000)), /^el /);
});

await caso("Enlace firmado del botón", () => {
  const url = urlRecordatorioDatos(uuid(1));
  const t = new URL(url).searchParams.get("t");
  assert.equal(citaDeTokenDatos(t), uuid(1));
  assert.equal(citaDeTokenDatos(t.replace(/.$/, (c) => (c === "A" ? "B" : "A"))), null);
  assert.equal(citaDeTokenDatos(`${uuid(2)}.${t.split(".")[1]}`), null, "la firma no sirve para otra cita");
});

await caso("Día antes: solo pacientes sin datos o sin consentimiento; crea el enlace y reabre si falta firmar", async () => {
  const tablas = {
    gestionesjj_pacientes: [
      { id: "p1", nombre: "Ana Pérez", telefono: "+502 5555 1234", pais: "GT", datos_token: null, datos_completados_at: null },
      { id: "p2", nombre: "Luis Gómez", telefono: "+502 5555 0000", pais: "GT", datos_token: "tok2", datos_completados_at: "2026-10-01T00:00:00Z" },
      { id: "p3", nombre: "Eva Ruiz", telefono: "+502 5555 1111", pais: "GT", datos_token: "tok3", datos_completados_at: "2026-10-01T00:00:00Z" },
      { id: "p4", nombre: "Otro Día", telefono: "+502 1", pais: "GT", datos_token: null, datos_completados_at: null },
    ],
    gestionesjj_citas: [
      { id: uuid(1), paciente_id: "p1", inicio: a10, estado: "confirmada" },
      { id: uuid(2), paciente_id: "p2", inicio: a10, estado: "pendiente" },
      { id: uuid(3), paciente_id: "p3", inicio: a10, estado: "confirmada" },
      { id: uuid(4), paciente_id: "p4", inicio: inicioDiaIso(fechaLocal(3)), estado: "confirmada" },
      { id: uuid(5), paciente_id: "p1", inicio: a10, estado: "cancelada" },
    ],
    gestionesjj_consentimientos: [{ paciente_id: "p3" }],
  };
  const avisos = await avisosDatosPendientesManana(falsoAdmin(tablas));
  assert.equal(avisos.length, 2, "Ana (sin datos) y Luis (sin consentimiento); Eva completa; p4 no es mañana");
  assert.match(avisos[0].texto, /Ana Pérez<\/b> tiene cita mañana/);
  assert.match(avisos[0].texto, /Te recuerdo que mañana tienes una cita agendada/);
  assert.ok(tablas.gestionesjj_pacientes[0].datos_token, "se creó el enlace de datos");
  assert.match(avisos[0].texto, new RegExp(`/datos/${tablas.gestionesjj_pacientes[0].datos_token}`));
  assert.match(avisos[0].botones[0][0].url, /\/api\/wa\/datos\?t=/);
  assert.match(avisos[1].texto, /no tiene consentimiento firmado/);
  assert.equal(tablas.gestionesjj_pacientes[1].datos_completados_at, null, "se reabrió la hoja para firmar");
  assert.equal(tablas.gestionesjj_pacientes[2].datos_completados_at, "2026-10-01T00:00:00Z", "a Eva no se le toca nada");
});

await caso("Solicitud de cita: aviso si no llenó el motivo; seguimiento sin aviso", () => {
  const base = { nombre: "Ana", telefono: "+502", email: null, inicio: a10, ya_es_paciente: false, primera_sesion: true, dar_seguimiento: false, modalidad: "virtual", necesita_ubicacion: false };
  assert.match(textoSolicitudCita({ ...base, motivo: null }), /No llenó el motivo de consulta/);
  assert.doesNotMatch(textoSolicitudCita({ ...base, motivo: "Ansiedad" }), /No llenó/);
  const seg = textoSolicitudCita({ ...base, ya_es_paciente: true, primera_sesion: false, dar_seguimiento: true, motivo: null });
  assert.match(seg, /Seguimiento a la sesión anterior/);
  assert.doesNotMatch(seg, /No llenó/);
});

await caso("Aviso inmediato: hoy siempre; mañana solo si ya pasaron las 7:00 a. m.; nunca si ya tiene todo", async () => {
  const hoyYmd = fechaLocal();
  const en = (ymd, h) => new Date(`${ymd}T${String(h).padStart(2, "0")}:00:00-06:00`);
  const paciente = () => ({ id: "p1", nombre: "Ana Pérez", telefono: "+502 1", pais: "GT", datos_token: "tk", datos_completados_at: null });
  const tablas = () => ({ gestionesjj_pacientes: [paciente()], gestionesjj_consentimientos: [] });
  const cita = (inicio) => ({ id: uuid(7), inicio: inicio.toISOString(), gestionesjj_pacientes: paciente() });
  // Cita hoy a las 17:00, creada a las 10:00 → aviso «hoy».
  const a1 = await avisoInmediato(falsoAdmin(tablas()), cita(en(hoyYmd, 17)), en(hoyYmd, 10));
  assert.match(a1.texto, /tiene cita hoy/); assert.match(a1.texto, /Te recuerdo que hoy tienes una cita/);
  // Cita mañana: creada hoy a las 6:00 → la cubre el aviso de las 7:00; a las 9:00 → aviso inmediato.
  assert.equal(await avisoInmediato(falsoAdmin(tablas()), cita(en(manana, 10)), en(hoyYmd, 6)), null);
  assert.match((await avisoInmediato(falsoAdmin(tablas()), cita(en(manana, 10)), en(hoyYmd, 9))).texto, /tiene cita mañana/);
  // Cita en 3 días o ya pasada → nada.
  assert.equal(await avisoInmediato(falsoAdmin(tablas()), cita(en(fechaLocal(3), 10)), en(hoyYmd, 9)), null);
  assert.equal(await avisoInmediato(falsoAdmin(tablas()), cita(en(hoyYmd, 8)), en(hoyYmd, 9)), null);
  // Con datos y consentimiento → nada.
  const completo = { ...paciente(), datos_completados_at: "2026-10-01T00:00:00Z" };
  const t = { gestionesjj_pacientes: [completo], gestionesjj_consentimientos: [{ paciente_id: "p1" }] };
  assert.equal(await avisoInmediato(falsoAdmin(t), { id: uuid(7), inicio: en(hoyYmd, 17).toISOString(), gestionesjj_pacientes: completo }, en(hoyYmd, 10)), null);
});

console.log(`\n${ok}/6 casos correctos.`);
