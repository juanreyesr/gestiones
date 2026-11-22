-- Limpieza diaria del registro de ejecuciones de pg_cron (cron.job_run_details)
-- de los trabajos de GestionesJJ.
--
-- pg_cron escribe una fila por cada ejecucion y nunca la borra. Los trabajos
-- de GestionesJJ que corren cada minuto (supervisiones, mensajes programados,
-- avisos de estudiantes) llevaban unas 143 000 filas desde septiembre, y cada
-- ejecucion son cuatro o cinco escrituras al disco. Supabase aviso que el
-- proyecto agotaba su cuota de E/S de disco (Disk IO Budget).
--
-- Solo se borra el registro de ejecuciones (hora, estado y mensaje de cada
-- corrida), nunca datos de GestionesJJ: ninguna tabla gestionesjj_ ni ninguna
-- funcion lee cron.job_run_details. Se conservan 7 dias para poder revisar un
-- fallo reciente. Solo toca los trabajos gestionesjj_*: CCI Chimaltenango, que
-- comparte la base, limpia los suyos con su propio trabajo.

select cron.schedule(
  'gestionesjj_cron_limpieza',
  '20 9 * * *',
  $cron$
  delete from cron.job_run_details as d
  using cron.job as j
  where j.jobid = d.jobid
    and j.jobname like 'gestionesjj\_%'
    and d.end_time < now() - interval '7 days'
  $cron$
);
