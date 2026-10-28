import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { RoutineCard } from "@/components/rotinas/routine-card";
import { RoutineFormDialog } from "@/components/rotinas/routine-form";
import { requireUser } from "@/lib/session";
import { listRoutines } from "@/lib/queries/routines";

export const metadata: Metadata = { title: "Rotinas" };

export default async function RotinasPage() {
  const user = await requireUser();
  const routines = await listRoutines(user);

  return (
    <>
      <PageHeader
        module="rotinas"
        title="Rotinas e Revisões"
        description="Ações recorrentes. A próxima data é recalculada a partir da última conclusão."
      >
        <RoutineFormDialog />
      </PageHeader>

      {routines.length === 0 ? (
        <EmptyState>Nenhuma rotina cadastrada. Crie a primeira, ex: &quot;Trocar filtro de água a cada 90 dias&quot;.</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </ul>
      )}
    </>
  );
}
