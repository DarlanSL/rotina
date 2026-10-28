import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variants = VariantProps<typeof buttonVariants>;

/** Link com visual de botão (mantém a semântica de link para leitores de tela). */
export function LinkButton({ className, variant, size, ...props }: React.ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/** Variante para links externos (wa.me, mailto:). */
export function AnchorButton({ className, variant, size, ...props }: React.ComponentProps<"a"> & Variants) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
