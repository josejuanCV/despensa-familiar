"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { BrandMark } from "@/components/BrandMark";
import { btnPrimary, errorBox, inputBase } from "@/components/ui";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Si ya hay sesión, fuera de aquí.
  useEffect(() => {
    if (!loading && session) {
      router.replace("/");
    }
  }, [loading, session, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Si el proyecto exige confirmación por email, no habrá sesión todavía.
        if (data.session) {
          router.replace("/");
        } else {
          setInfo(
            "Cuenta creada. Revisa tu correo para confirmar la cuenta antes de entrar.",
          );
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo ha ido mal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandMark className="mb-3" />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Despensa Familiar
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "signin"
              ? "Entra con tu correo y contraseña"
              : "Crea tu cuenta para empezar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-700">Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className={inputBase}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-700">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputBase}
            />
          </label>

          {error && <p className={errorBox}>{error}</p>}
          {info && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${btnPrimary} mt-2`}
          >
            {submitting
              ? "Un momento…"
              : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          {mode === "signin" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="font-semibold text-fucsia-600 underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Crear una" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
