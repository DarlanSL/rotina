"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { login, signup, type AuthFormState } from "@/app/(auth)/actions";

/** Envia sem o reset automático do <form action>, para manter o que foi digitado quando há erro. */
function useAuthAction(action: (prev: AuthFormState, data: FormData) => Promise<AuthFormState>) {
  const [state, dispatch, pending] = useActionState(action, null);
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  return { error: state?.error, pending, onSubmit };
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

const usernameProps = {
  name: "username",
  required: true,
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export function LoginForm() {
  const { error, pending, onSubmit } = useAuthAction(login);
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormField label="Usuário" htmlFor="login-username">
        <Input id="login-username" {...usernameProps} autoComplete="username" autoFocus />
      </FormField>
      <FormField label="Senha" htmlFor="login-password">
        <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
      </FormField>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const { error, pending, onSubmit } = useAuthAction(signup);
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormField label="Nome" htmlFor="signup-name">
        <Input id="signup-name" name="name" required maxLength={120} autoComplete="name" autoFocus />
      </FormField>
      <FormField label="Usuário" htmlFor="signup-username" hint="Letras sem acento, números, ponto, hífen ou sublinhado.">
        <Input id="signup-username" {...usernameProps} minLength={3} maxLength={30} autoComplete="username" />
      </FormField>
      <FormField label="Senha" htmlFor="signup-password" hint="Pelo menos 8 caracteres.">
        <Input id="signup-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>
      <FormField label="Confirme a senha" htmlFor="signup-confirm">
        <Input id="signup-confirm" name="confirm" type="password" required autoComplete="new-password" />
      </FormField>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
