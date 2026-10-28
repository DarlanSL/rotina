import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { FilterChips } from "@/components/filter-chips";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/relatorios/report-view";
import { ShareBar } from "@/components/relatorios/share-bar";
import { requireUser } from "@/lib/session";
import { getReport } from "@/lib/queries/report";
import { todayISO } from "@/lib/dates";
import { buildReportCsv, buildReportText, periodLabel, reportTitle } from "@/lib/report";
import { parsePeriod, PRESETS } from "@/lib/report-period";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage(props: PageProps<"/relatorios">) {
  const user = await requireUser();
  const today = todayISO(user.timezone);
  const { from, to, preset } = parsePeriod(await props.searchParams, today);
  const data = await getReport(user, from, to);

  const title = `${reportTitle(data)} · ${periodLabel(from, to)}`;
  const fileBase = from === to ? `relatorio-${from}` : `relatorio-${from}_a_${to}`;
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: user.timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          module="relatorios"
          title="Relatórios"
          description="Relatório do dia ou consolidado por período. Exporte em PDF/Excel ou envie por WhatsApp e e-mail."
        />

        <FilterChips
          active={preset ?? "custom"}
          options={PRESETS.map((p) => ({ value: p.key, label: p.label, href: `/relatorios?p=${p.key}` }))}
        />

        <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
          <FormField label="De" htmlFor="r-from" className="w-[calc(50%-0.375rem)] sm:w-44">
            <Input id="r-from" name="de" type="date" defaultValue={from} max={today} required />
          </FormField>
          <FormField label="Até" htmlFor="r-to" className="w-[calc(50%-0.375rem)] sm:w-44">
            <Input id="r-to" name="ate" type="date" defaultValue={to} max={today} required />
          </FormField>
          <Button type="submit" variant="secondary">
            Gerar relatório
          </Button>
        </form>

        <div className="mb-4">
          <ShareBar title={title} text={buildReportText(data)} csv={buildReportCsv(data)} fileBase={fileBase} />
        </div>
      </div>

      <ReportView data={data} generatedAt={generatedAt} />
    </>
  );
}
