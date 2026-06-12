"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePantry } from "@/components/PantryProvider";
import {
  AltaEnCategoriaBtn,
  EditarProductoBtn,
  FilaProducto,
  ModalShell,
  NavegadorCarpetas,
} from "@/components/catalogo";
import { btnPrimary, btnSecondary, errorBox, inputBase } from "@/components/ui";
import type { Categoria } from "@/lib/types";

export default function AlmacenTab() {
  const { productos, categorias, loading, error, marcarFalta, marcarHay } =
    usePantry();
  const [gestionando, setGestionando] = useState(false);

  const catalogo = useMemo(
    () => productos.filter((p) => !p.metadata?.suelto),
    [productos],
  );

  return (
    <div className="flex flex-col gap-5">
      {error && <p className={errorBox}>{error}</p>}

      <NavegadorCarpetas
        titulo="Almacén"
        subtitulo="Elige una categoría. Toca un producto para añadirlo a la lista."
        acento="sky"
        items={catalogo}
        categorias={categorias}
        loading={loading && catalogo.length === 0}
        incluirVacias
        headerExtra={
          <button
            type="button"
            onClick={() => setGestionando(true)}
            className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            Gestionar
          </button>
        }
        accionCarpeta={(categoriaId) => (
          <AltaEnCategoriaBtn categoriaId={categoriaId} />
        )}
        renderFila={(p) => (
          <FilaProducto
            key={p.id}
            producto={p}
            enLista={p.en_lista}
            onClick={() =>
              p.en_lista ? marcarHay(p.id) : marcarFalta(p.id)
            }
            trailing={<EditarProductoBtn producto={p} />}
          />
        )}
      />

      {gestionando && (
        <GestionarCategoriasModal onClose={() => setGestionando(false)} />
      )}
    </div>
  );
}

/* ------------------------- Modal: gestionar categorías ------------------------- */

function GestionarCategoriasModal({ onClose }: { onClose: () => void }) {
  const { categorias } = usePantry();
  const [creando, setCreando] = useState(false);
  const [editar, setEditar] = useState<Categoria | null>(null);

  const ordenadas = useMemo(
    () =>
      [...categorias].sort(
        (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
      ),
    [categorias],
  );

  return (
    <ModalShell title="Categorías" onClose={onClose}>
      <button
        type="button"
        onClick={() => setCreando(true)}
        className={`${btnPrimary} mb-4 w-full`}
      >
        + Nueva categoría
      </button>

      {ordenadas.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-400">
          Todavía no hay categorías.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenadas.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-2 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-fucsia-50 text-xl">
                {c.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.foto_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden>📁</span>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                {c.nombre}
              </span>
              <button
                type="button"
                onClick={() => setEditar(c)}
                className="shrink-0 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}

      {creando && <CategoriaModal onClose={() => setCreando(false)} />}
      {editar && (
        <CategoriaModal categoria={editar} onClose={() => setEditar(null)} />
      )}
    </ModalShell>
  );
}

function CategoriaModal({
  categoria,
  onClose,
}: {
  categoria?: Categoria;
  onClose: () => void;
}) {
  const { addCategoria, updateCategoria, removeCategoria, subirFoto } =
    usePantry();
  const editando = Boolean(categoria);

  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    categoria?.foto_url ?? null,
  );
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setFile(f);
    setPreview(url);
    setQuitarFoto(false);
    setError(null);
  }

  function quitar() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFile(null);
    setPreview(null);
    setQuitarFoto(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let fotoUrl: string | null | undefined = undefined;
      if (file) fotoUrl = await subirFoto(file);
      else if (quitarFoto) fotoUrl = null;

      if (editando && categoria) {
        await updateCategoria(categoria.id, { nombre, fotoUrl });
      } else {
        await addCategoria(nombre, fotoUrl ?? null);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function borrar() {
    if (!categoria) return;
    if (
      !window.confirm(
        `¿Borrar la categoría "${categoria.nombre}"? Sus productos quedarán sin categoría.`,
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await removeCategoria(categoria.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar.");
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={editando ? "Editar categoría" : "Nueva categoría"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-2xl text-neutral-400 transition-colors hover:border-fucsia-300"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Vista previa"
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden>📷</span>
            )}
          </button>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Foto (opcional)</span>
            {preview && (
              <button
                type="button"
                onClick={quitar}
                className="text-left text-xs font-medium text-red-500 transition-colors hover:text-red-600"
              >
                Quitar foto
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="hidden"
          />
        </div>

        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la categoría"
          className={inputBase}
        />

        {error && <p className={errorBox}>{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`${btnSecondary} flex-1`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            className={`${btnPrimary} flex-1`}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {editando && (
          <button
            type="button"
            onClick={borrar}
            disabled={saving}
            className="mt-1 text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            Borrar categoría
          </button>
        )}
      </form>
    </ModalShell>
  );
}
