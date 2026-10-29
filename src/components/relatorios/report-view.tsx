"use client";

import { CalendarClockIcon, CircleCheckIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatDateBR, formatLongDateBR, formatMinutes } from "@/lib/dates";
import { periodLabel, reportKey, reportTitle, type ReportData } from "@/lib/report";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-cyan-50/60 p-3 dark:bg-cyan-500/5 print:bg-transparent">
      <p className="text-xl font-semibold text-cyan-800 tabular-nums dark:text-cyan-300 print:text-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DayMinutes({ minutes }: { minutes: number }) {
  if (!minutes) return null;
  return <span className="font-normal text-muted-foreground">{formatMinutes(minutes)}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold tracking-wide text-cyan-700 uppercase dark:text-cyan-400 print:text-black">
      {children}
    </h3>
  );
}

/** Caixinha "sai no relatório" — só na tela. */
function IncludeBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <Checkbox
      className="mt-0.5 shrink-0 print:hidden"
      checked={checked}
      onCheckedChange={onChange}
      aria-label={`Incluir no relatório: ${label}`}
    />
  );
}

/** Linha desmarcada: apagada na tela, fora da impressão. */
const excludedRow = "opacity-50 print:hidden [&_.row-text]:line-through";

/**
 * Documento do relatório: na tela é um "papel"; na impressão vira o PDF.
 * `data` traz todas as linhas (com caixinhas); totais e resumo vêm de `filtered`, a versão enviada.
 */
export function ReportView({
  data,
  filtered,
  excluded,
  onToggle,
  onToggleTag,
  generatedAt,
}: {
  data: ReportData;
  filtered: ReportData;
  excluded: Set<string>;
  onToggle: (key: string) => void;
  onToggleTag: (tag: string, hidden: boolean) => void;
  generatedAt: string;
}) {
  const { totals } = filtered;
  const maxTagMinutes = Math.max(1, ...filtered.byTag.map((t) => t.minutes));
  const empty = totals.activities === 0 && !filtered.routinesDone.length && !filtered.itemsDone.length;
  const has = (key: string) => !excluded.has(key);

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
          <Stat label="Itens realizados" value={filtered.itemsDone.length} />
        )}
        <Stat label="Revisões concluídas" value={filtered.routinesDone.length} />
      </div>

      {empty && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>}

      {(filtered.byTag.length > 0 || data.hiddenTags.length > 0) && (
        <section className={cn("mb-6 break-inside-avoid", filtered.byTag.length === 0 && "print:hidden")}>
          <SectionTitle>Por tag</SectionTitle>
          <ul className="grid gap-1.5">
            {filtered.byTag.map((t) => (
              <li
                key={t.tag}
                className="grid grid-cols-[7rem_1fr_auto_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_auto_auto] print:grid-cols-[10rem_1fr_auto]"
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="print:hidden"
                  aria-label={`Tag pessoal: não incluir #${t.tag}`}
                  title="Pessoal: nunca sai no relatório"
                  onClick={() => onToggleTag(t.tag, true)}
                >
                  <EyeOffIcon />
                </Button>
              </li>
            ))}
          </ul>
          {data.hiddenTags.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground print:hidden">
              Pessoais (não saem):
              {data.hiddenTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag, false)}
                  aria-label={`Voltar a incluir #${tag}`}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 hover:bg-muted"
                >
                  #{tag} <EyeIcon className="size-3" />
                </button>
              ))}
            </p>
          )}
        </section>
      )}

      {data.days.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Atividades</SectionTitle>
          <div className="space-y-5">
            {data.days.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "break-inside-avoid",
                  day.activities.every((a) => !has(reportKey.activity(a.id))) && "print:hidden",
                )}
              >
                {data.from !== data.to && (
                  <p className="mb-1.5 flex justify-between text-sm font-semibold first-letter:uppercase">
                    <span className="first-letter:uppercase">{formatLongDateBR(day.date)}</span>
                    <DayMinutes minutes={filtered.days.find((d) => d.date === day.date)?.minutes ?? 0} />
                  </p>
                )}
                <table className="w-full text-sm">
                  <tbody className="divide-y border-y">
                    {day.activities.map((a) => (
                      <tr key={a.id} className={cn("align-top", !has(reportKey.activity(a.id)) && excludedRow)}>
                        <td className="w-8 py-2 print:hidden">
                          <IncludeBox
                            label={a.title}
                            checked={has(reportKey.activity(a.id))}
                            onChange={() => onToggle(reportKey.activity(a.id))}
                          />
                        </td>
                        <td className="w-24 py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {a.startTime ? `${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <p className="row-text font-medium">{a.title}</p>
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
        <section
          className={cn(
            "mb-6 grid gap-6 break-inside-avoid sm:grid-cols-2",
            !filtered.routinesDone.length && !filtered.itemsDone.length && "print:hidden",
          )}
        >
          {data.routinesDone.length > 0 && (
            <div className={cn(!filtered.routinesDone.length && "print:hidden")}>
              <SectionTitle>Revisões concluídas</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {data.routinesDone.map((r) => (
                  <li key={r.id} className={cn("flex gap-2", !has(reportKey.routine(r.id)) && excludedRow)}>
                    <IncludeBox
                      label={r.title}
                      checked={has(reportKey.routine(r.id))}
                      onChange={() => onToggle(reportKey.routine(r.id))}
                    />
                    <RefreshCwIcon className="mt-0.5 size-3.5 shrink-0 text-violet-600 print:text-black" />
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateBR(r.date).slice(0, 5)}
                    </span>
                    <span className="row-text">{r.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.itemsDone.length > 0 && (
            <div className={cn(!filtered.itemsDone.length && "print:hidden")}>
              <SectionTitle>Itens realizados</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {data.itemsDone.map((i) => (
                  <li key={i.id} className={cn("flex gap-2", !has(reportKey.item(i.id)) && excludedRow)}>
                    <IncludeBox
                      label={i.title}
                      checked={has(reportKey.item(i.id))}
                      onChange={() => onToggle(reportKey.item(i.id))}
                    />
                    <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600 print:text-black" />
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateBR(i.date).slice(0, 5)}
                    </span>
                    <span className="row-text">
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
        <section className={cn("break-inside-avoid", !filtered.postponements.length && "print:hidden")}>
          <SectionTitle>Prorrogações</SectionTitle>
          <ul className="space-y-2 text-sm">
            {data.postponements.map((p) => (
              <li key={p.id} className={cn("flex gap-2", !has(reportKey.postponement(p.id)) && excludedRow)}>
                <IncludeBox
                  label={p.title}
                  checked={has(reportKey.postponement(p.id))}
                  onChange={() => onToggle(reportKey.postponement(p.id))}
                />
                <CalendarClockIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 print:text-black" />
                <span className="row-text">
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
