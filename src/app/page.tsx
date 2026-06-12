"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PantryProvider } from "@/components/PantryProvider";
import { BrandMark } from "@/components/BrandMark";
import ListaTab from "@/components/ListaTab";
import DespensaTab from "@/components/DespensaTab";
import AlmacenTab from "@/components/AlmacenTab";

type Tab = "lista" | "despensa" | "almacen";

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth();

  // Protege la ruta: sin sesión, al login.
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-400">Cargando…</p>
      </div>
    );
  }

  return (
    <PantryProvider>
      <AppShell />
    </PantryProvider>
  );
}

function AppShell() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("lista");

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      {/* Cabecera de marca, en rosa pastel suave */}
      <header className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <BrandMark size={38} />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-neutral-900">
              Despensa Familiar
            </h1>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
        >
          Salir
        </button>
      </header>

      {/* Contenido de la pestaña activa */}
      <main className="mx-auto w-full max-w-md flex-1 p-4">
        {tab === "lista" ? (
          <ListaTab />
        ) : tab === "despensa" ? (
          <DespensaTab />
        ) : (
          <AlmacenTab />
        )}
      </main>

      {/* Navegación inferior con las tres pestañas */}
      <nav className="sticky bottom-0 grid grid-cols-3 border-t border-neutral-100 bg-white">
        <TabButton
          active={tab === "lista"}
          onClick={() => setTab("lista")}
          label="Lista"
        />
        <TabButton
          active={tab === "despensa"}
          onClick={() => setTab("despensa")}
          label="Despensa"
        />
        <TabButton
          active={tab === "almacen"}
          onClick={() => setTab("almacen")}
          label="Almacén"
        />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 text-sm font-semibold transition-colors ${
        active ? "text-fucsia-600" : "text-neutral-400 hover:text-neutral-600"
      }`}
    >
      {label}
      <span
        className={`mx-auto mt-1 block h-0.5 w-8 rounded-full transition-colors ${
          active ? "bg-fucsia-500" : "bg-transparent"
        }`}
      />
    </button>
  );
}
