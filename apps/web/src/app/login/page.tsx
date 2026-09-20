import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-brand-dark">Dízimo Conectado</h1>
          <p className="mt-1 text-sm text-slate-500">Mais fé, mais pessoas, mais missão.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
