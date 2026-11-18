"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { LAST_WEEK, ordinalLabel, WEEK_ORDINALS, WEEKDAY_NAMES, type RepeatKind } from "@/lib/recurrence";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type RepeatDefaults = {
  intervalDays?: number | null;
  monthDay?: number | null;
  weekOrdinal?: number | null;
  weekday?: number | null;
};

/**
 * "Repetir" com as regras das rotinas (usado em rotinas e contas).
 * `kind` vazio = não repete (só quando `allowNone`).
 */
export function RepeatFields({
  prefix: p,
  kind,
  onKindChange,
  defaults,
  allowNone = false,
  doneVerb = "concluir",
}: {
  prefix: string;
  kind: RepeatKind | "";
  onKindChange: (kind: RepeatKind | "") => void;
  defaults?: RepeatDefaults;
  allowNone?: boolean;
  /** "concluir" (rotina) ou "pagar" (conta) — aparece nas explicações */
  doneVerb?: string;
}) {
  return (
    <>
      <FormField label="Repetir" htmlFor={`${p}-kind`}>
        <NativeSelect
          id={`${p}-kind`}
          name="repeatKind"
          value={kind}
          onChange={(e) => onKindChange(e.target.value as RepeatKind | "")}
        >
          {allowNone && <option value="">Não repete</option>}
          <option value="INTERVAL">A cada X dias (contando de quando {doneVerb})</option>
          <option value="INTERVAL_FIXED">A cada X dias (datas fixas)</option>
          <option value="WEEKLY">Toda semana num dia fixo (ex.: toda segunda)</option>
          <option value="MONTHLY_DAY">Todo mês num dia fixo (ex.: dia 10)</option>
          <option value="MONTHLY_WEEKDAY">Todo mês numa semana (ex.: 1ª quarta)</option>
        </NativeSelect>
      </FormField>
      {(kind === "INTERVAL" || kind === "INTERVAL_FIXED") && (
        <FormField
          label="A cada quantos dias"
          htmlFor={`${p}-interval`}
          hint={
            kind === "INTERVAL"
              ? `A próxima conta a partir do dia em que você ${doneVerb}.`
              : `A próxima conta a partir da data prevista, mesmo se ${doneVerb} antes ou depois.`
          }
        >
          <Input
            id={`${p}-interval`}
            name="intervalDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            required
            defaultValue={defaults?.intervalDays ?? 30}
          />
        </FormField>
      )}
      {kind === "WEEKLY" && (
        <FormField label="Dia da semana" htmlFor={`${p}-weekday-w`}>
          <NativeSelect id={`${p}-weekday-w`} name="weekday" defaultValue={defaults?.weekday ?? 1}>
            {WEEKDAY_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {capitalize(name)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}
      {kind === "MONTHLY_DAY" && (
        <FormField
          label="Dia do mês"
          htmlFor={`${p}-monthday`}
          hint="Nos meses sem esse dia (ex.: 31), cai no último dia do mês."
        >
          <Input
            id={`${p}-monthday`}
            name="monthDay"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            required
            defaultValue={defaults?.monthDay ?? 10}
          />
        </FormField>
      )}
      {kind === "MONTHLY_WEEKDAY" && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Semana" htmlFor={`${p}-ordinal`}>
            <NativeSelect id={`${p}-ordinal`} name="weekOrdinal" defaultValue={defaults?.weekOrdinal ?? 1}>
              {WEEK_ORDINALS.map((n) => (
                <option key={n} value={n}>
                  {n === LAST_WEEK ? "Última" : ordinalLabel(n)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Dia da semana" htmlFor={`${p}-weekday`}>
            <NativeSelect id={`${p}-weekday`} name="weekday" defaultValue={defaults?.weekday ?? 3}>
              {WEEKDAY_NAMES.map((name, i) => (
                <option key={name} value={i}>
                  {capitalize(name)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      )}
    </>
  );
}
