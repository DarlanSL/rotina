import { CalendarClockIcon, CircleCheckIcon, RefreshCwIcon } from "lucide-react";
import { formatDateBR, formatLongDateBR, formatMinutes } from "@/lib/dates";
import { periodLabel, reportTitle, type ReportData } from "@/lib/report";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-cyan-50/60 p-3 dark:bg-cyan-500/5 print:bg-transparent">
      <p className="text-xl font-semibold text-cyan-800 tabular-nums dark:text-cyan-300 print:text-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold tracking-wide text-cyan-700 uppercase dark:text-cyan-400 print:text-black">
      {children}
    </h3>
  );
}

/** Documento do relatório: na tela é um "papel"; na impressão vira o PDF. */
export function ReportView({ data, generatedAt }: { data: ReportData; generatedAt: string }) {
  const { totals } = data;
  const maxTagMinutes = Math.max(1, ...data.byTag.map((t) => t.minutes));
  const empty = totals.activities === 0 && !data.routinesDone.length && !data.itemsDone.length;

  return (
    <article
      id="relatorio"
      className="rounded-2xl border bg-card p-5 shadow-xs md:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-cyan-700 uppercase dark:text-cyan-400 print:text-black">
            Rotina
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{reportTitle(data)}</h2>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {data.from === data.to
              ? `${formatLongDateBR(data.from)} · ${formatDateBR(data.from)}`
              : periodLabel(data.from, data.to)}
          </p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          {data.userName && <p className="font-medium text-foreground">{data.userName}</p>}
          <p>Gerado em {generatedAt}</p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Atividades" value={totals.activities} />
        <Stat label="Horas registradas" value={totals.minutes ? formatMinutes(totals.minutes) : "—"} />
        {data.from !== data.to ? (
          <Stat label="Dias com registro" value={totals.days} />
        ) : (
          <Stat label="Itens realizados" value={data.itemsDone.length} />
        )}
        <Stat label="Revisões concluídas" value={data.routinesDone.length} />
      </div>

      {empty && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>}

      {data.byTag.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <SectionTitle>Por tag</SectionTitle>
          <ul className="grid gap-1.5">
            {data.byTag.map((t) => (
              <li
                key={t.tag}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_auto]"
              >
                <span className="truncate">#{t.tag}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted print:border">
                  <span
                    className="block h-full rounded-full bg-cyan-500 print:bg-gray-500"
                    style={{ width: `${Math.max(4, (t.minutes / maxTagMinutes) * 100)}%` }}
                  />
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t.count} · {t.minutes ? formatMinutes(t.minutes) : "sem horário"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.days.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Atividades</SectionTitle>
          <div className="space-y-5">
            {data.days.map((day) => (
              <div key={day.date} className="break-inside-avoid">
                {data.from !== data.to && (
                  <p className="mb-1.5 flex justify-between text-sm font-semibold first-letter:uppercase">
                    <span className="first-letter:uppercase">{formatLongDateBR(day.date)}</span>
                    {day.minutes > 0 && (
                      <span className="font-normal text-muted-foreground">{formatMinutes(day.minutes)}</span>
                    )}
                  </p>
                )}
                <table className="w-full text-sm">
                  <tbody className="divide-y border-y">
                    {day.activities.map((a) => (
                      <tr key={a.id} className="align-top">
                        <td className="w-24 py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {a.startTime ? `${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <p className="font-medium">{a.title}</p>
                          {a.notes && <p className="text-xs whitespace-pre-line text-muted-foreground">{a.notes}</p>}
                          {a.tags.length > 0 && (
                            <p className="text-xs text-cyan-700 dark:text-cyan-400 print:text-gray-600">
                              {a.tags.map((t) => `#${t}`).join(" ")}
                            </p>
                          )}
                        </td>
                        <td className="w-14 py-2 text-right text-xs text-muted-foreground tabular-nums">
                          {a.minutes ? formatMinutes(a.minutes) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {(data.routinesDone.length > 0 || data.itemsDone.length > 0) && (
        <section className="mb-6 grid gap-6 break-inside-avoid sm:grid-cols-2">
          {data.routinesDone.length > 0 && (
            <div>
              <SectionTitle>Revisões concluídas</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {data.routinesDone.map((r) => (
                  <li key={r.id} className="flex gap-2">
                    <RefreshCwIcon className="mt-0.5 size-3.5 shrink-0 text-violet-600 print:text-black" />
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateBR(r.date).slice(0, 5)}
                    </span>
                    {r.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.itemsDone.length > 0 && (
            <div>
              <SectionTitle>Itens realizados</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {data.itemsDone.map((i) => (
                  <li key={i.id} className="flex gap-2">
                    <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600 print:text-black" />
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateBR(i.date).slice(0, 5)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">{i.typeLabel}:</span> {i.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {data.postponements.length > 0 && (
        <section className="break-inside-avoid">
          <SectionTitle>Prorrogações</SectionTitle>
          <ul className="space-y-2 text-sm">
            {data.postponements.map((p) => (
              <li key={p.id} className="flex gap-2">
                <CalendarClockIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 print:text-black" />
                <span>
                  <span className="font-medium">{p.title}</span>{" "}
                  <span className="text-muted-foreground">
                    {formatDateBR(p.from)} → {formatDateBR(p.to)}
                  </span>
                  <span className="block text-xs text-muted-foreground">Motivo: {p.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
