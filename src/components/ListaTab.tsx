"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePantry } from "@/components/PantryProvider";
import {
  agruparPorCategoria,
  CatalogoCompacto,
  Miniatura,
  ModalShell,
  QuitarBtn,
} from "@/components/catalogo";
import { btnPrimary, btnSecondary, errorBox, inputBase } from "@/components/ui";
import type { Producto } from "@/lib/types";

export default function ListaTab() {
  const {
    productos,
    categorias,
    loading,
    error,
    addProducto,
    marcarComprado,
    desmarcarComprado,
    setCantidadLista,
    finalizarCompra,
    vaciarLista,
  } = usePantry();

  const [suelto, setSuelto] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  // Productos añadidos a la lista desde que se abrió el catálogo (para el contador).
  const [sesionAdds, setSesionAdds] = useState(0);

  function abrirCatalogo() {
    setSesionAdds(0);
    setEligiendo(true);
  }

  // Todo lo que está en la lista.
  const items = useMemo(() => productos.filter((p) => p.en_lista), [productos]);

  const compradosCount = items.filter((p) => p.estado === "comprado").length;

  // Agrupado por categoría; dentro de cada grupo, pendientes antes que comprados.
  const grupos = useMemo(
    () =>
      agruparPorCategoria(items, categorias, (a, b) => {
        const ac = a.estado === "comprado" ? 1 : 0;
        const bc = b.estado === "comprado" ? 1 : 0;
        if (ac !== bc) return ac - bc;
        return a.nombre.localeCompare(b.nombre);
      }),
    [items, categorias],
  );

  function handleVaciar() {
    if (
      window.confirm(
        "¿Vaciar la lista entera? Los productos saldrán de la lista pero seguirán en el Almacén.",
      )
    )
      vaciarLista();
  }

  async function handleAddSuelto(e: FormEvent) {
    e.preventDefault();
    if (!suelto.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await addProducto({ nombre: suelto, enLista: true, suelto: true });
      setSuelto("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "No se pudo añadir.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 h-7 w-1.5 shrink-0 rounded-full bg-violet-300"
            aria-hidden
          />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Lista de la compra
            </h2>
            <p className="text-sm text-neutral-500">
              Lo que falta. Marca lo que vas comprando.
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleVaciar}
            className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            Vaciar
          </button>
        )}
      </header>

      {error && <p className={errorBox}>{error}</p>}

      {/* Vía principal: montar la lista tocando productos del catálogo. */}
      <button
        type="button"
        onClick={abrirCatalogo}
        className={`${btnPrimary} flex items-center justify-center gap-2 py-3.5`}
      >
        <span className="text-lg leading-none">＋</span> Agregar producto
      </button>

      {/* Vía secundaria: cosas sueltas sin foto. */}
      <form onSubmit={handleAddSuelto} className="flex gap-2">
        <input
          type="text"
          value={suelto}
          onChange={(e) => setSuelto(e.target.value)}
          placeholder="…o algo suelto que no está en la despensa"
          className={`min-w-0 flex-1 ${inputBase}`}
        />
        <button
          type="submit"
          disabled={adding || !suelto.trim()}
          className={`${btnSecondary} shrink-0`}
        >
          Añadir
        </button>
      </form>

      {addError && <p className={errorBox}>{addError}</p>}

      {loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
          La lista está vacía. Marca productos como &quot;se acabó&quot; en la
          despensa, o añade algo suelto arriba.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.id} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {g.nombre}
              </h3>
              <ul className="flex flex-col gap-2">
                {g.items.map((p) => (
                  <ListaRow
                    key={p.id}
                    producto={p}
                    onToggle={() =>
                      p.estado === "comprado"
                        ? desmarcarComprado(p.id)
                        : marcarComprado(p.id)
                    }
                    onCantidad={(n) => setCantidadLista(p.id, n)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {compradosCount > 0 && (
        <button
          type="button"
          onClick={finalizarCompra}
          className="sticky bottom-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {compradosCount} comprado{compradosCount > 1 ? "s" : ""} · Guardar la
          compra
        </button>
      )}

      {eligiendo && (
        <ModalShell
          title="Agregar a la lista"
          onClose={() => setEligiendo(false)}
        >
          <CatalogoCompacto
            subtitulo="Toca los productos que necesitas."
            acento="violet"
            altaEnLista
            onAfterToggle={(added) =>
              setSesionAdds((n) => (added ? n + 1 : Math.max(0, n - 1)))
            }
          />

          {/* Salida hacia delante, con contador de añadidos en esta sesión. */}
          <div className="sticky bottom-0 -mx-5 mt-4 flex justify-end border-t border-neutral-100 bg-white/90 px-5 pb-1 pt-3 backdrop-blur">
            <button
              type="button"
              onClick={() => setEligiendo(false)}
              className={btnPrimary}
            >
              {sesionAdds > 0
                ? `${sesionAdds} añadido${sesionAdds > 1 ? "s" : ""} · Listo`
                : "Listo"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ListaRow({
  producto,
  onToggle,
  onCantidad,
}: {
  producto: Producto;
  onToggle: () => void;
  onCantidad: (n: number) => void;
}) {
  const comprado = producto.estado === "comprado";
  const cantidadLista = producto.metadata?.cantidad_lista ?? 1;

  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-neutral-100 bg-white p-2 shadow-sm">
      <div className={comprado ? "opacity-50" : ""}>
        <Miniatura producto={producto} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            comprado ? "text-neutral-400 line-through" : "text-neutral-900"
          }`}
        >
          {producto.nombre}
        </p>
        {producto.metadata?.suelto && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
            suelto
          </span>
        )}
      </div>

      {/* Stepper de unidades a comprar */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onCantidad(cantidadLista - 1)}
          disabled={cantidadLista <= 1}
          aria-label="Quitar una unidad"
          className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums text-neutral-800">
          {cantidadLista}
        </span>
        <button
          type="button"
          onClick={() => onCantidad(cantidadLista + 1)}
          aria-label="Añadir una unidad"
          className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={comprado}
        aria-label={comprado ? "Desmarcar" : "Marcar como comprado"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
          comprado
            ? "border-fucsia-500 bg-fucsia-500 text-white"
            : "border-neutral-300 text-transparent hover:border-fucsia-400"
        }`}
      >
        ✓
      </button>

      <QuitarBtn producto={producto} modo="lista" />
    </li>
  );
}
