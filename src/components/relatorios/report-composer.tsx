"use client";

import { useMemo, useState } from "react";
import { EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { ReportView } from "@/components/relatorios/report-view";
import { ShareBar } from "@/components/relatorios/share-bar";
import { setTagHiddenInReport } from "@/app/(app)/relatorios/actions";
import { buildReportCsv, buildReportText, defaultExcluded, filterReport, type ReportData } from "@/lib/report";

/**
 * Monta a versão enviada: o que estiver desmarcado não sai na impressão, no Excel nem no texto.
 * As atividades com tag pessoal já começam desmarcadas.
 */
export function ReportComposer({
  data,
  title,
  fileBase,
  generatedAt,
}: {
  data: ReportData;
  title: string;
  fileBase: string;
  generatedAt: string;
}) {
  const [excluded, setExcluded] = useState(() => defaultExcluded(data));
  // período ou tags pessoais mudaram → recomeça da seleção padrão (ajuste de estado durante a renderização)
  const sourceKey = `${data.from}|${data.to}|${data.hiddenTags.join(",")}`;
  const [seenKey, setSeenKey] = useState(sourceKey);
  if (seenKey !== sourceKey) {
    setSeenKey(sourceKey);
    setExcluded(defaultExcluded(data));
  }

  const { run } = useAction();
  const filtered = useMemo(() => filterReport(data, excluded), [data, excluded]);

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="mb-4 print:hidden">
        <ShareBar title={title} text={buildReportText(filtered)} csv={buildReportCsv(filtered)} fileBase={fileBase} />
      </div>

      {excluded.size > 0 && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 print:hidden"
        >
          <EyeOffIcon className="size-4" />
          {excluded.size === 1 ? "1 item não vai sair" : `${excluded.size} itens não vão sair`} na impressão, no Excel e no
          texto enviado.
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setExcluded(new Set())}>
            Incluir todos
          </Button>
        </div>
      )}

      <ReportView
        data={data}
        filtered={filtered}
        excluded={excluded}
        onToggle={toggle}
        onToggleTag={(tag, hidden) => run(() => setTagHiddenInReport(tag, hidden))}
        generatedAt={generatedAt}
      />
    </>
  );
}
