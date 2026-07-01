-- One-time seed migrating the previously hardcoded docentes/cursos into the database.
do $$
declare
  owner uuid;
  d_id uuid;
begin
  select id into owner from auth.users where email = 'lic.juanreyesr@gmail.com' limit 1;
  if owner is null then
    raise notice 'User lic.juanreyesr@gmail.com not found. Skipping seed.';
    return;
  end if;

  if exists (select 1 from public.gestionesjj_docentes limit 1) then
    return;
  end if;

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Sara Castellanos', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Inteligencia Emocional', 'Sabado 07:00 a 09:00 horas', 'Primer Ano - Lic. en Psicologia Clinica y Consejeria Social', '302', 2026, 1),
    (owner, d_id, 'Psicologia de la Personalidad', 'Sabado 09:30 a 11:30 horas', 'Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social', '303', 2026, 1),
    (owner, d_id, 'Practica en Medicion Psicologica', 'Sabado 11:45 a 13:45 horas', 'Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social', '304', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Elly Giron de Leon', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Psicologia General', 'Sabado 09:30 a 11:30 horas', 'Primer Ano - Lic. en Psicologia Clinica y Consejeria Social', '302', 2026, 1),
    (owner, d_id, 'Consejeria Familiar y de Pareja', 'Sabado 07:00 a 09:00 horas', 'Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social', '305', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Consuelo Alejandra Garcia', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Sociologia General', 'Sabado 11:45 a 13:45 horas', 'Primer Ano - Lic. en Psicologia Clinica y Consejeria Social', '302', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Cristina Ventura Aneliess Garcia', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Estadistica Basica', 'Sabado 07:00 a 09:00 horas', 'Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social', '303', 2026, 1),
    (owner, d_id, 'Estadistica Basica', 'Martes 18:00 a 20:00 horas', 'Primer Ano - LICP', '203', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Glenda Cecilia Corado Franco', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Psicologia del Aprendizaje', 'Sabado 11:45 a 13:45 horas', 'Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social', '303', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Brigette Marroquin Castillo', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Practica Intervencion Psicologica Preventiva', 'Sabado 14:00 a 16:00 horas', 'Segundo Ano - Lic. en Psicologia Clinica y Consejeria Social', '303', 2026, 1),
    (owner, d_id, 'Psicopatologia II', 'Sabado 07:00 a 09:00 horas', 'Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social', '304', 2026, 1),
    (owner, d_id, 'Psicoterapia del Adulto', 'Sabado 09:30 a 11:30 horas', 'Quinto Ano - Lic. en Psicologia Clinica y Consejeria Social', '306', 2026, 1),
    (owner, d_id, 'Psicologia General', 'Lunes 18:00 a 20:00 horas', 'Primer Ano - LICP', '203', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Shara Barrios', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Psicometria: Pruebas Proyectivas', 'Sabado 09:30 a 11:30 horas', 'Tercer Ano - Lic. en Psicologia Clinica y Consejeria Social', '304', 2026, 1),
    (owner, d_id, 'Metodos de Diagnostico', 'Sabado 11:45 a 13:45 horas', 'Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social', '305', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Shirley Rosicela Rosales Ramos', true) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Fundamentos de Psicoterapia', 'Sabado 09:30 a 11:30 horas', 'Cuarto Ano - Lic. en Psicologia Clinica y Consejeria Social', '305', 2026, 1);

  insert into public.gestionesjj_docentes (created_by, nombre, femenino) values (owner, 'Juan Jose Reyes Rodriguez', false) returning id into d_id;
  insert into public.gestionesjj_cursos (created_by, docente_id, nombre, horario, grupo, edificio, anio, trimestre) values
    (owner, d_id, 'Psicopatologia Social', 'Sabado 07:00 a 09:00 horas', 'Quinto Ano - Lic. en Psicologia Clinica y Consejeria Social', '306', 2026, 1);
end $$;
