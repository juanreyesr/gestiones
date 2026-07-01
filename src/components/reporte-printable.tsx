import type { Trimestre } from "@/data/evaluacion";

export type ReporteData = {
  docenteNombre: string;
  cursoNombre: string;
  anio: number;
  trimestre: Trimestre;
  fecha: string;
  pct: number;
  total: number;
  max: number;
  categoryAnalytics: Array<{ categoria: string; percent: number }>;
  entrevistaStats: { porEstudiante: Array<{ estudiante: 1 | 2; promedio: number; respondidas: number }>; general: number };
  fortalezas: string[];
  improvementAreas: Array<{ categoria: string; texto: string; valor: number }>;
  observaciones: string;
};

export function ReportePrintable({ data }: { data: ReporteData | null }) {
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl p-8 text-slate-900">
      <h1 className="text-2xl font-bold">Reporte de evaluacion docente</h1>
      <p className="mt-1 text-sm text-slate-600">M. A. Juan J. Reyes - Coordinacion academica</p>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <strong>Docente:</strong> {data.docenteNombre}
        </div>
        <div>
          <strong>Curso:</strong> {data.cursoNombre}
        </div>
        <div>
          <strong>Periodo:</strong> Trimestre {data.trimestre}, {data.anio}
        </div>
        <div>
          <strong>Fecha de observacion:</strong> {data.fecha}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold">Resultado general</h2>
      <div className="mt-1 text-4xl font-bold">{data.pct}%</div>
      <div className="mt-1 text-sm text-slate-600">
        {data.total}/{data.max} puntos
      </div>
      <div className="mt-2 h-3 w-full max-w-md bg-slate-200">
        <div className="h-full bg-slate-800" style={{ width: `${data.pct}%` }} />
      </div>

      <h2 className="mt-8 text-lg font-bold">Analisis por categoria</h2>
      <div className="mt-3 grid gap-3">
        {data.categoryAnalytics.map((item) => (
          <div key={item.categoria}>
            <div className="flex justify-between text-sm">
              <span>{item.categoria}</span>
              <span>{item.percent}%</span>
            </div>
            <div className="mt-1 h-2.5 w-full max-w-md bg-slate-200">
              <div className="h-full bg-slate-700" style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">Entrevistas estudiantiles</h2>
      <div className="mt-3 grid gap-3">
        {data.entrevistaStats.porEstudiante.map((item) => (
          <div key={item.estudiante}>
            <div className="flex justify-between text-sm">
              <span>Estudiante {item.estudiante}</span>
              <span>{item.promedio}%</span>
            </div>
            <div className="mt-1 h-2.5 w-full max-w-md bg-slate-200">
              <div className="h-full bg-slate-700" style={{ width: `${item.promedio}%` }} />
            </div>
          </div>
        ))}
      </div>

      {data.fortalezas.length ? (
        <>
          <h2 className="mt-8 text-lg font-bold">Fortalezas destacadas</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {data.fortalezas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="mt-8 text-lg font-bold">Areas de mejora</h2>
      {data.improvementAreas.length ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {data.improvementAreas.map((item) => (
            <li key={`${item.categoria}-${item.texto}`}>
              <strong>{item.categoria}:</strong> {item.texto}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm">No se identificaron areas criticas de mejora.</p>
      )}

      {data.observaciones.trim() ? (
        <>
          <h2 className="mt-8 text-lg font-bold">Observaciones de clase</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{data.observaciones}</p>
        </>
      ) : null}
    </div>
  );
}
