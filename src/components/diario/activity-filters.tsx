import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/native-select";
import { FormField } from "@/components/form-field";
import { LinkButton } from "@/components/link-button";
import type { ActivityFilters as Filters } from "@/lib/queries/activities";

/** Formulário GET: filtros ficam na URL (compartilháveis e sem JS). */
export function ActivityFilters({ filters, tags }: { filters: Filters; tags: string[] }) {
  const active = Boolean(filters.from || filters.to || filters.tag);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      <FormField label="De" htmlFor="f-from" className="w-[calc(50%-0.375rem)] sm:w-40">
        <Input id="f-from" name="from" type="date" defaultValue={filters.from} />
      </FormField>
      <FormField label="Até" htmlFor="f-to" className="w-[calc(50%-0.375rem)] sm:w-40">
        <Input id="f-to" name="to" type="date" defaultValue={filters.to} />
      </FormField>
      <FormField label="Tag" htmlFor="f-tag" className="min-w-40 flex-1">
        <NativeSelect id="f-tag" name="tag" defaultValue={filters.tag ?? ""}>
          <option value="">Todas</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {active && (
          <LinkButton variant="ghost" href="/diario">
            Limpar
          </LinkButton>
        )}
      </div>
    </form>
  );
}
