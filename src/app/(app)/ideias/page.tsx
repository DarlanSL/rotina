import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanbanIcon } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { FilterChips } from "@/components/filter-chips";
import { QuickCapture } from "@/components/ideias/quick-capture";
import { ItemCard } from "@/components/ideias/item-card";
import { requireUser } from "@/lib/session";
import { countPendingByType, listItems, type ItemFilters } from "@/lib/queries/items";
import { listProjectOptions } from "@/lib/queries/projects";
import { ITEM_TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES } from "@/lib/validations";
import { LinkButton } from "@/components/link-button";
import type { ItemType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Ideias e Anotações" };

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendentes" },
  { value: "done", label: "Concluídos" },
  { value: "all", label: "Todos" },
] as const;

function href(type: string | undefined, status: string) {
  const params = new URLSearchParams();
  if (type) params.set("tipo", type);
  if (status !== "pending") params.set("status", status);
  const qs = params.toString();
  return qs ? `/ideias?${qs}` : "/ideias";
}

export default async function IdeiasPage(props: PageProps<"/ideias">) {
  const user = await requireUser();
  const params = await props.searchParams;
  const type = ITEM_TYPES.find((t) => t === params.tipo) as ItemType | undefined;
  const status: NonNullable<ItemFilters["status"]> =
    STATUS_OPTIONS.find((s) => s.value === params.status)?.value ?? "pending";

  const [items, counts, projects] = await Promise.all([
    listItems(user, { type, status }),
    countPendingByType(user),
    listProjectOptions(user),
  ]);
  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        module="ideias"
        title="Ideias e Anotações"
        description="Capture ideias, anotações, lembretes e melhorias."
      >
        <LinkButton variant="outline" href="/projetos">
          <FolderKanbanIcon /> Projetos
        </LinkButton>
      </PageHeader>

      <div className="mb-5">
        <QuickCapture key={type ?? "all"} defaultType={type ?? "IDEA"} projects={projects} />
      </div>

      <FilterChips
        active={type ?? "all"}
        options={[
          { value: "all", label: "Tudo", count: totalPending, href: href(undefined, status) },
          ...ITEM_TYPES.map((t) => ({
            value: t,
            label: ITEM_TYPE_LABEL[t].plural,
            count: counts[t],
            href: href(t, status),
          })),
        ]}
      />

      <div className="mb-4 flex gap-1 text-sm">
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s.value}
            href={href(type, s.value)}
            className={
              s.value === status
                ? "rounded-md bg-muted px-2.5 py-1 font-medium"
                : "rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground"
            }
          >
            {s.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState>
          {status === "pending" ? "Nada pendente aqui. Use o campo acima para capturar algo." : "Nenhum item."}
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} projects={projects} timezone={user.timezone} showType={!type} />
          ))}
        </ul>
      )}
    </>
  );
}
