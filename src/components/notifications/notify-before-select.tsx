"use client";

import { NativeSelect } from "@/components/native-select";
import { FormField } from "@/components/form-field";
import { useNotificationState } from "@/components/notifications/store";
import { formatLead, NOTIFY_BEFORE_OPTIONS, notifyBeforeLabel } from "@/lib/notify";

/** Campo "Avisar": antecedência do aviso desta tarefa (vazio = padrão escolhido no sino). */
export function NotifyBeforeField({
  id,
  defaultValue,
  className,
}: {
  id: string;
  defaultValue?: number | null;
  className?: string;
}) {
  const { leadMinutes } = useNotificationState();
  return (
    <FormField label="Avisar" htmlFor={id} className={className}>
      <NativeSelect id={id} name="notifyBefore" defaultValue={defaultValue ?? ""}>
        <option value="">Padrão ({formatLead(leadMinutes)} antes)</option>
        {NOTIFY_BEFORE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {notifyBeforeLabel(m)}
          </option>
        ))}
      </NativeSelect>
    </FormField>
  );
}
