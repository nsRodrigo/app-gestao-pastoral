"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RoleName } from "@gestao-pastoral/shared";
import { createStaffUserAction, FormState } from "./actions";

const initialState: FormState = {};

const ROLE_OPTIONS = Object.values(RoleName).filter((r) => r !== RoleName.DIZIMISTA);

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  PAROCO: "Pároco",
  TESOUREIRO: "Tesoureiro",
  SECRETARIA: "Secretaria",
  COORDENADOR_DIZIMO: "Coordenador do Dízimo",
  APOIADOR: "Apoiador",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar usuário"}
    </button>
  );
}

export function CreateUserForm({ organizationId }: { organizationId: string | null }) {
  const [state, formAction] = useActionState(createStaffUserAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Senha provisória
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
          Perfil
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue=""
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="" disabled>
            Selecione um perfil
          </option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      {!organizationId && (
        <div className="sm:col-span-2">
          <label
            htmlFor="organizationId"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            ID da organização
          </label>
          <input
            id="organizationId"
            name="organizationId"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      )}

      {state.error ? (
        <p role="alert" className="sm:col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
