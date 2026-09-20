"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CUSTOMIZABLE_ROLES, PERMISSION_RESOURCE_GROUPS, RolePermissionsEntry } from "@gestao-pastoral/shared";
import { Card } from "@/components/ui";
import { updateRolePermissionsAction, FormState } from "./actions";
import { currentLevel, levelOptions, LEVEL_LABELS } from "./level";

const ROLE_LABELS: Record<string, string> = {
  TESOUREIRO: "Tesoureiro",
  SECRETARIA: "Secretaria",
  COORDENADOR_DIZIMO: "Coordenador do Dízimo",
  APOIADOR: "Apoiador",
};

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function RolePermissionsForm({
  organizationId,
  entries,
}: {
  organizationId: string;
  entries: RolePermissionsEntry[];
}) {
  const action = updateRolePermissionsAction.bind(null, organizationId);
  const [state, formAction] = useActionState(action, initialState);

  const permissionsByRole = Object.fromEntries(
    entries.map((entry) => [entry.role, entry.permissions]),
  ) as Record<string, RolePermissionsEntry["permissions"]>;

  return (
    <form action={formAction}>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Recurso</th>
              {CUSTOMIZABLE_ROLES.map((role) => (
                <th key={role} className="px-4 py-3">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_RESOURCE_GROUPS.map((group) => (
              <tr key={group.key} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{group.label}</td>
                {CUSTOMIZABLE_ROLES.map((role) => {
                  const options = levelOptions(group);
                  const value = currentLevel(group, permissionsByRole[role] ?? []);
                  return (
                    <td key={role} className="px-4 py-3">
                      <select
                        key={`${group.key}-${role}-${value}`}
                        name={`level__${group.key}__${role}`}
                        defaultValue={value}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      >
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {LEVEL_LABELS[opt]}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Permissões atualizadas.
        </p>
      ) : null}

      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
