"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { useAction } from "@/components/use-action";
import { changePassword, updateProfile } from "@/app/(app)/conta/actions";

export function ProfileForm({ name }: { name: string }) {
  const { pending, run } = useAction();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() => updateProfile(data));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormField label="Nome" htmlFor="profile-name">
        <Input id="profile-name" name="name" required maxLength={120} defaultValue={name} autoComplete="name" />
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        Salvar
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const { pending, run } = useAction();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(
      () => changePassword(data),
      () => form.reset(),
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <FormField label="Senha atual" htmlFor="pw-current">
        <Input id="pw-current" name="current" type="password" required autoComplete="current-password" />
      </FormField>
      <FormField label="Nova senha" htmlFor="pw-new" hint="Pelo menos 8 caracteres.">
        <Input id="pw-new" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>
      <FormField label="Confirme a nova senha" htmlFor="pw-confirm">
        <Input id="pw-confirm" name="confirm" type="password" required autoComplete="new-password" />
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        Alterar senha
      </Button>
    </form>
  );
}
