"use client";

import { useMemo } from "react";
import { usePantry } from "@/components/PantryProvider";
import {
  Miniatura,
  NavegadorCarpetas,
  QuitarBtn,
} from "@/components/catalogo";
import { errorBox } from "@/components/ui";
import type { Producto } from "@/lib/types";

export default function DespensaTab() {
  const {
    productos,
    categorias,
    loading,
    error,
    marcarFalta,
    setStock,
    vaciarDespensa,
  } = usePantry();

  // En casa = en stock y no en la lista (ni sueltos).
  const enCasa = useMemo(
    () =>
      productos.filter(
        (p) => p.estado === "hay" && !p.en_lista && !p.metadata?.suelto,
      ),
    [productos],
  );

  function handleVaciar() {
    if (
      window.confirm(
        "¿Vaciar la despensa entera? Los productos saldrán de la despensa pero seguirán en el Almacén.",
      )
    )
      vaciarDespensa();
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className={errorBox}>{error}</p>}

      <NavegadorCarpetas
        titulo="Despensa"
        subtitulo="Lo que tienes en casa. Elige una categoría."
        acento="rose"
        items={enCasa}
        categorias={categorias}
        loading={loading && enCasa.length === 0}
        headerExtra={
          enCasa.length > 0 ? (
            <button
              type="button"
              onClick={handleVaciar}
              className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              Vaciar
            </button>
          ) : undefined
        }
        renderFila={(p) => (
          <DespensaRow
            key={p.id}
            producto={p}
            onStock={(n) => setStock(p.id, n)}
            onALaLista={() => marcarFalta(p.id)}
          />
        )}
      />
    </div>
  );
}

function colorStock(stock: number) {
  if (stock <= 0) return "text-red-600";
  if (stock <= 3) return "text-amber-600";
  return "text-emerald-600";
}

function DespensaRow({
  producto,
  onStock,
  onALaLista,
}: {
  producto: Producto;
  onStock: (n: number) => void;
  onALaLista: () => void;
}) {
  const stock = producto.metadata?.stock ?? 1;

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-2 shadow-sm">
      <Miniatura producto={producto} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm font-medium text-neutral-900">
          {producto.nombre}
        </p>
        {/* Stepper de stock en casa, con color según nivel */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStock(stock - 1)}
            disabled={stock <= 0}
            aria-label="Quitar una unidad de stock"
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            −
          </button>
          <span
            className={`w-6 text-center text-sm font-bold tabular-nums ${colorStock(
              stock,
            )}`}
          >
            {stock}
          </span>
          <button
            type="button"
            onClick={() => onStock(stock + 1)}
            aria-label="Añadir una unidad de stock"
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onALaLista}
          className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
        >
          A la lista
        </button>
        <QuitarBtn producto={producto} modo="despensa" />
      </div>
    </li>
  );
}
