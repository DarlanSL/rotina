import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterChips } from "@/components/filter-chips";
import { DocumentFormDialog } from "@/components/documentos/document-form";
import { DocumentList } from "@/components/documentos/document-list";
import { requireUser } from "@/lib/session";
import { listDocuments } from "@/lib/queries/documents";
import type { DeadlineStatus } from "@/lib/deadlines";

export const metadata: Metadata = { title: "Documentos" };

const STATUS_FILTERS: { value: "all" | DeadlineStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "expired", label: "Vencidos" },
  { value: "warning", label: "Próximos" },
  { value: "ok", label: "Válidos" },
];

export default async function DocumentosPage(props: PageProps<"/documentos">) {
  const user = await requireUser();
  const { status: raw } = await props.searchParams;
  const status = STATUS_FILTERS.find((f) => f.value === raw)?.value ?? "all";

  const all = await listDocuments(user);
  const documents = status === "all" ? all : all.filter((d) => d.status === status);
  const counts = (s: (typeof STATUS_FILTERS)[number]["value"]) =>
    s === "all" ? all.length : all.filter((d) => d.status === s).length;

  return (
    <>
      <PageHeader module="documentos" title="Documentos" description="Controle de vencimentos com alerta automático.">
        <DocumentFormDialog />
      </PageHeader>

      <FilterChips
        active={status}
        options={STATUS_FILTERS.map((f) => ({
          value: f.value,
          label: f.label,
          count: counts(f.value),
          href: f.value === "all" ? "/documentos" : `/documentos?status=${f.value}`,
        }))}
      />

      {documents.length === 0 ? (
        <EmptyState>
          {all.length === 0 ? "Nenhum documento cadastrado ainda." : "Nenhum documento com esse status."}
        </EmptyState>
      ) : (
        <DocumentList documents={documents} />
      )}
    </>
  );
}
