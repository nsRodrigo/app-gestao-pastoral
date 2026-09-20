"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createFamilyAction, FormState } from "./actions";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Adicionando..." : "Adicionar família"}
    </button>
  );
}

export function CreateFamilyForm() {
  const [state, formAction] = useActionState(createFamilyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Nome da família
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex.: Família Silva"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <SubmitButton />
      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:ml-3">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
