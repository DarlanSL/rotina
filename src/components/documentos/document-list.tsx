import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { DocumentFormDialog } from "@/components/documentos/document-form";
import { deleteDocument } from "@/app/(app)/documentos/actions";
import { formatDateBR } from "@/lib/dates";
import { STATUS_ACCENT } from "@/lib/deadlines";
import { cn } from "@/lib/utils";
import type { DocumentView } from "@/lib/queries/documents";

function Actions({ doc }: { doc: DocumentView }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <DocumentFormDialog
        document={doc}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Editar">
            <PencilIcon />
          </Button>
        }
      />
      <ConfirmDelete what="documento" action={deleteDocument.bind(null, doc.id)} />
    </div>
  );
}

/** Tabela no desktop, cards no celular. */
export function DocumentList({ documents }: { documents: DocumentView[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Documento</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Órgão emissor</th>
              <th className="px-4 py-2.5 font-medium">Vencimento</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="w-20 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {documents.map((doc) => (
              <tr key={doc.id} className="align-top">
                <td className={cn("border-l-4 px-4 py-3", STATUS_ACCENT[doc.status])}>
                  <p className="font-medium">{doc.name}</p>
                  {doc.notes && <p className="mt-0.5 text-xs text-muted-foreground">{doc.notes}</p>}
                </td>
                <td className="px-4 py-3">{doc.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{doc.issuer ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{formatDateBR(doc.expiresAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} daysLeft={doc.daysLeft} />
                </td>
                <td className="px-2 py-2">
                  <Actions doc={doc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {documents.map((doc) => (
          <li key={doc.id} className={cn("rounded-xl border border-l-4 bg-card p-4", STATUS_ACCENT[doc.status])}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.type}
                  {doc.issuer && ` · ${doc.issuer}`}
                </p>
              </div>
              <Actions doc={doc} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="tabular-nums">Vence em {formatDateBR(doc.expiresAt)}</span>
              <StatusBadge status={doc.status} daysLeft={doc.daysLeft} />
            </div>
            {doc.notes && <p className="mt-2 text-xs text-muted-foreground">{doc.notes}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
