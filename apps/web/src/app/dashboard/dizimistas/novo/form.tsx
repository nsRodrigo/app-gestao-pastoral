"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { quickRegisterMemberAction, FormState } from "../actions";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Cadastrando..." : "Cadastrar dizimista"}
    </button>
  );
}

export function QuickRegisterForm() {
  const [state, formAction] = useActionState(quickRegisterMemberAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
          Nome completo *
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label htmlFor="whatsapp" className="mb-1 block text-sm font-medium text-slate-700">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label htmlFor="familyName" className="mb-1 block text-sm font-medium text-slate-700">
          Família (opcional — cria uma nova se não existir)
        </label>
        <input
          id="familyName"
          name="familyName"
          placeholder="Ex.: Família Silva"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="termsAccepted" required className="mt-1" />
        Li e aceito os termos de uso e a política de privacidade em nome do dizimista.
      </label>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="communicationConsent" className="mt-1" />
        Autoriza o recebimento de comunicações da comunidade (avisos, aniversários, campanhas).
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
