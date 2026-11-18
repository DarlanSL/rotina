import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { BillCard } from "@/components/contas/bill-card";
import { BillFormDialog } from "@/components/contas/bill-form";
import { requireUser } from "@/lib/session";
import { listBills } from "@/lib/queries/bills";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contas" };

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Total({ label, count, cents, className }: { label: string; count: number; cents: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatBRL(cents)}</p>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "conta" : "contas"}
      </p>
    </div>
  );
}

export default async function ContasPage(props: PageProps<"/contas">) {
  const user = await requireUser();
  const { tipo, encerradas } = await props.searchParams;
  const kind = tipo === "receber" ? "RECEIVABLE" : "PAYABLE";
  const payable = kind === "PAYABLE";
  const showClosed = encerradas === "1";
  const { today, bills, totals } = await listBills(user, kind, showClosed);
  const base = payable ? "/contas" : "/contas?tipo=receber";

  return (
    <>
      <PageHeader
        module="contas"
        title="Contas"
        description="Vencimentos a pagar e a receber, com repetição igual às rotinas."
      >
        <BillFormDialog key={kind} kind={kind} today={today} />
      </PageHeader>

      <nav className="mb-4 inline-flex rounded-xl bg-muted p-1" aria-label="Tipo de conta">
        <Tab href="/contas" active={payable}>
          A pagar
        </Tab>
        <Tab href="/contas?tipo=receber" active={!payable}>
          A receber
        </Tab>
      </nav>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Total
          label="Atrasadas"
          {...totals.overdue}
          className={totals.overdue.count ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10" : undefined}
        />
        <Total label="Vencem este mês" {...totals.month} />
        <Total label={payable ? "Pago este mês" : "Recebido este mês"} {...totals.done} />
      </div>

      {bills.length === 0 ? (
        <EmptyState>
          {payable
            ? 'Nenhuma conta a pagar. Crie a primeira, ex: "Aluguel, todo dia 10".'
            : 'Nenhuma conta a receber. Crie a primeira, ex: "Salário, todo 5º dia".'}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {bills.map((b) => (
            <BillCard key={b.id} bill={b} today={today} />
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href={showClosed ? base : `${base}${payable ? "?" : "&"}encerradas=1`}
          className="text-muted-foreground hover:text-foreground"
        >
          {showClosed ? "Ocultar quitadas" : "Mostrar quitadas"}
        </Link>
      </p>
    </>
  );
}
