// Direccion de respaldo mientras los firewalls institucionales aceptan el
// dominio nuevo (juanjreyes.org se registro el 26/09/2026 y algunos filtros
// bloquean los dominios recien registrados). Hasta esta fecha el sitio tambien
// se sirve en gestionesjj.vercel.app; despues, esa direccion vuelve a
// redirigir sola al dominio oficial (src/proxy.ts), sin desplegar nada.

export const HOST_RESPALDO = "gestionesjj.vercel.app";

/** 19/10/2026 00:00 en Guatemala (UTC-6) = 06:00 UTC: 15 dias desde el 04/10/2026. */
export const RESPALDO_HASTA = Date.parse("2026-10-19T06:00:00Z");

export const respaldoActivo = (ahora = Date.now()) => ahora < RESPALDO_HASTA;
