/*
File description:
This shared report header gives analytics pages consistent title, date, and context styling. It keeps
page introductions lightweight and unframed so the actual KPI cards, charts, and tables remain the main
scannable surfaces.
*/

export function ReportHeader({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-teal-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {meta ? (
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm shadow-slate-200/60">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
