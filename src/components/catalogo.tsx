"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePantry } from "@/components/PantryProvider";
import { btnPrimary, btnSecondary, errorBox, inputBase } from "@/components/ui";
import type { Categoria, Producto } from "@/lib/types";

export const SIN_CATEGORIA = "__sin__";

/** Acento pastel de cada zona (barra junto al título de sección). */
export type Acento = "rose" | "violet" | "sky";

const ACENTO_BAR: Record<Acento, string> = {
  rose: "bg-rose-300",
  violet: "bg-violet-300",
  sky: "bg-sky-300",
};

/* ------------------------- Agrupar por categoría ------------------------- */

/** Agrupa productos por categoría respetando el orden de las categorías. */
export function agruparPorCategoria(
  items: Producto[],
  categorias: Categoria[],
  comparator: (a: Producto, b: Producto) => number = (a, b) =>
    a.nombre.localeCompare(b.nombre),
): { id: string; nombre: string; items: Producto[] }[] {
  const porId = new Map<string, Producto[]>();
  for (const p of items) {
    const key = p.categoria_id ?? SIN_CATEGORIA;
    const arr = porId.get(key) ?? [];
    arr.push(p);
    porId.set(key, arr);
  }
  const ordenadas = [...categorias].sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
  const out: { id: string; nombre: string; items: Producto[] }[] = [];
  for (const c of ordenadas) {
    const arr = porId.get(c.id);
    if (arr?.length)
      out.push({ id: c.id, nombre: c.nombre, items: [...arr].sort(comparator) });
  }
  const sin = porId.get(SIN_CATEGORIA);
  if (sin?.length)
    out.push({
      id: SIN_CATEGORIA,
      nombre: "Sin categoría",
      items: [...sin].sort(comparator),
    });
  return out;
}

/* ------------------------- Contenedor de modal ------------------------- */

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg px-2 text-xl leading-none text-neutral-400 transition-colors hover:text-neutral-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------- Fila de producto (compacta) ------------------------- */

/**
 * Fila compacta reutilizable: miniatura + nombre + cantidad. La usan tanto la
 * Despensa (con botón "Se acabó") como el Almacén/picker (toque para añadir a
 * la lista, con ✓ fucsia, y acciones a la derecha).
 */
/** Miniatura cuadrada (~56px) del producto, con un badge opcional en la esquina. */
export function Miniatura({
  producto,
  badge,
}: {
  producto: Producto;
  badge?: ReactNode;
}) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-50">
      {producto.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={producto.foto_url}
          alt={producto.nombre}
          loading="lazy"
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl text-neutral-300">
          🛒
        </div>
      )}
      {badge}
    </div>
  );
}

const badgeEnLista = (
  <span className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fucsia-500 text-[10px] leading-none text-white shadow-sm">
    ✓
  </span>
);

export function FilaProducto({
  producto,
  onClick,
  enLista,
  trailing,
}: {
  producto: Producto;
  /** Si se pasa, la zona foto+texto es pulsable. */
  onClick?: () => void;
  /** Muestra el indicador fucsia ✓ (en la lista). */
  enLista?: boolean;
  /** Acciones a la derecha (p. ej. "Se acabó" o el lápiz de editar). */
  trailing?: ReactNode;
}) {
  const cuerpo = (
    <>
      <Miniatura producto={producto} badge={enLista ? badgeEnLista : undefined} />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <p className="truncate text-sm font-medium text-neutral-900">
          {producto.nombre}
        </p>
        {producto.cantidad && (
          <span className="shrink-0 text-xs text-neutral-400">
            · {producto.cantidad}
          </span>
        )}
      </div>
    </>
  );

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border bg-white p-2 shadow-sm transition-colors ${
        enLista ? "border-fucsia-300" : "border-neutral-100"
      }`}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={enLista}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {cuerpo}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{cuerpo}</div>
      )}
      {trailing}
    </li>
  );
}

/* ------------------------- Catálogo en lista compacta ------------------------- */

/**
 * Lista compacta del catálogo (todos los productos no sueltos), agrupada por
 * categoría. Tocar una fila añade/quita el producto de la lista. Lo usan el
 * Almacén (con lápiz de editar) y el picker "Agregar producto" de la Lista.
 */
export function CatalogoCompacto({
  titulo,
  subtitulo,
  acento,
  headerExtra,
  altaEnLista = false,
  mostrarEditar = false,
  onAfterToggle,
}: {
  titulo?: string;
  subtitulo?: string;
  acento?: Acento;
  headerExtra?: ReactNode;
  /** Si true, el alta nueva entra también en la lista (picker). */
  altaEnLista?: boolean;
  /** Muestra el lápiz de editar en cada fila (Almacén). */
  mostrarEditar?: boolean;
  /** Aviso tras añadir (true) o quitar (false), para contadores. */
  onAfterToggle?: (added: boolean) => void;
}) {
  const { productos, categorias, loading, marcarFalta, marcarHay } = usePantry();
  const [alta, setAlta] = useState(false);

  const catalogo = useMemo(
    () => productos.filter((p) => !p.metadata?.suelto),
    [productos],
  );
  const grupos = useMemo(
    () => agruparPorCategoria(catalogo, categorias),
    [catalogo, categorias],
  );

  function toggle(p: Producto) {
    if (p.en_lista) {
      marcarHay(p.id);
      onAfterToggle?.(false);
    } else {
      marcarFalta(p.id);
      onAfterToggle?.(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          {acento && (
            <span
              className={`mt-0.5 h-7 w-1.5 shrink-0 rounded-full ${ACENTO_BAR[acento]}`}
              aria-hidden
            />
          )}
          <div>
            {titulo && (
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                {titulo}
              </h2>
            )}
            {subtitulo && <p className="text-sm text-neutral-500">{subtitulo}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={() => setAlta(true)}
            aria-label="Dar de alta un producto"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-fucsia-500 text-xl leading-none text-white shadow-sm transition-colors hover:bg-fucsia-600"
          >
            +
          </button>
        </div>
      </header>

      {loading && catalogo.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">Cargando…</p>
      ) : catalogo.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
          Aún no hay productos. Pulsa{" "}
          <span className="font-semibold text-fucsia-600">+</span> para dar de
          alta el primero.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.id} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {g.nombre}
              </h3>
              <ul className="flex flex-col gap-2">
                {g.items.map((p) => (
                  <FilaProducto
                    key={p.id}
                    producto={p}
                    onClick={() => toggle(p)}
                    enLista={p.en_lista}
                    trailing={
                      mostrarEditar ? (
                        <EditarProductoBtn producto={p} />
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {alta && (
        <ProductoModal enLista={altaEnLista} onClose={() => setAlta(false)} />
      )}
    </div>
  );
}

export function EditarProductoBtn({ producto }: { producto: Producto }) {
  const [editando, setEditando] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label={`Editar ${producto.nombre}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm text-neutral-500 shadow-sm transition-colors hover:text-fucsia-600"
      >
        ✎
      </button>
      {editando && (
        <ProductoModal producto={producto} onClose={() => setEditando(false)} />
      )}
    </>
  );
}

/* ------------------------- Quitar de lista / despensa ------------------------- */

/**
 * Botón "×" que abre un modal para decidir qué hacer al quitar un producto:
 * mandarlo al otro sitio (despensa/lista) o borrarlo de circulación (sigue en
 * el Almacén). Evita el rebote automático entre lista y despensa.
 */
export function QuitarBtn({
  producto,
  modo,
}: {
  producto: Producto;
  modo: "lista" | "despensa";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Quitar ${producto.nombre}`}
        className="shrink-0 rounded-lg px-1 text-lg leading-none text-neutral-300 transition-colors hover:text-fucsia-500"
      >
        ×
      </button>
      {open && (
        <QuitarModal
          producto={producto}
          modo={modo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function QuitarModal({
  producto,
  modo,
  onClose,
}: {
  producto: Producto;
  modo: "lista" | "despensa";
  onClose: () => void;
}) {
  const { marcarHay, marcarFalta, quitarDeCirculacion } = usePantry();
  const suelto = Boolean(producto.metadata?.suelto);

  const altLabel = modo === "lista" ? "A la despensa" : "A la lista";
  const altDesc =
    modo === "lista"
      ? "Vuelve a estar en casa."
      : "Pasa a la lista de la compra.";

  function alOtroSitio() {
    if (modo === "lista") marcarHay(producto.id);
    else marcarFalta(producto.id);
    onClose();
  }
  function borrar() {
    quitarDeCirculacion(producto.id);
    onClose();
  }

  return (
    <ModalShell title={`Quitar “${producto.nombre}”`} onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {/* Sueltos no están en el catálogo: solo se pueden borrar. */}
        {!suelto && (
          <button
            type="button"
            onClick={alOtroSitio}
            className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:bg-neutral-50"
          >
            <span className="text-sm font-semibold text-neutral-900">
              {altLabel}
            </span>
            <span className="text-xs text-neutral-500">{altDesc}</span>
          </button>
        )}

        <button
          type="button"
          onClick={borrar}
          className="flex flex-col items-start rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100"
        >
          <span className="text-sm font-semibold text-red-700">Borrar</span>
          <span className="text-xs text-red-600/80">
            {suelto
              ? "Se elimina del todo."
              : "Sale de lista y despensa. Sigue en el Almacén."}
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
        >
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
}

/* ------------------------- Navegación por carpetas ------------------------- */

/** Botón "+" que da de alta un producto en una categoría concreta. */
export function AltaEnCategoriaBtn({
  categoriaId,
  enLista = false,
}: {
  categoriaId: string | null;
  enLista?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Dar de alta un producto"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fucsia-500 text-xl leading-none text-white shadow-sm transition-colors hover:bg-fucsia-600"
      >
        +
      </button>
      {abierto && (
        <ProductoModal
          categoriaId={categoriaId}
          enLista={enLista}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}

function CarpetaCard({
  nombre,
  count,
  muted,
  foto,
  onClick,
}: {
  nombre: string;
  count: number;
  muted?: boolean;
  foto?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl border border-neutral-100 bg-gradient-to-br from-rose-50 to-fucsia-50 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-fucsia-200 hover:shadow-md"
    >
      {foto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        </>
      )}
      <span
        className={`relative text-3xl ${muted ? "opacity-40" : ""} ${
          foto ? "opacity-0" : ""
        }`}
        aria-hidden
      >
        📁
      </span>
      <span className="relative">
        <span
          className={`block truncate text-sm font-semibold ${
            foto ? "text-white" : "text-neutral-900"
          }`}
        >
          {nombre}
        </span>
        <span className={`text-xs ${foto ? "text-white/80" : "text-neutral-400"}`}>
          {count} {count === 1 ? "producto" : "productos"}
        </span>
      </span>
    </button>
  );
}

/**
 * Navegación por carpetas (categorías) y, dentro de cada una, el contenido en
 * lista compacta. La fila de cada producto se delega vía `renderFila`, y el
 * "+" de alta en la carpeta vía `accionCarpeta`.
 */
export function NavegadorCarpetas({
  titulo,
  subtitulo,
  acento,
  headerExtra,
  items,
  categorias,
  loading = false,
  incluirVacias = false,
  comparator = (a, b) => a.nombre.localeCompare(b.nombre),
  renderFila,
  accionCarpeta,
}: {
  titulo?: string;
  subtitulo?: string;
  acento?: Acento;
  headerExtra?: ReactNode;
  items: Producto[];
  categorias: Categoria[];
  loading?: boolean;
  /** Mostrar también carpetas sin productos (para poder dar de alta en ellas). */
  incluirVacias?: boolean;
  comparator?: (a: Producto, b: Producto) => number;
  renderFila: (producto: Producto) => ReactNode;
  /** Acción en la cabecera de la carpeta (p. ej. "+"); recibe la categoría. */
  accionCarpeta?: (categoriaId: string | null) => ReactNode;
}) {
  const [abierta, setAbierta] = useState<{ id: string; nombre: string } | null>(
    null,
  );

  const conteo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of items) {
      const k = p.categoria_id ?? SIN_CATEGORIA;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [items]);

  const carpetas = useMemo(() => {
    const ordenadas = [...categorias].sort(
      (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
    );
    const out: {
      id: string;
      nombre: string;
      count: number;
      muted?: boolean;
      foto?: string | null;
    }[] = [];
    for (const c of ordenadas) {
      const n = conteo.get(c.id) ?? 0;
      if (incluirVacias || n > 0)
        out.push({ id: c.id, nombre: c.nombre, count: n, foto: c.foto_url });
    }
    const sinN = conteo.get(SIN_CATEGORIA) ?? 0;
    if (sinN > 0)
      out.push({
        id: SIN_CATEGORIA,
        nombre: "Sin categoría",
        count: sinN,
        muted: true,
      });
    return out;
  }, [categorias, conteo, incluirVacias]);

  const abiertaValida =
    abierta &&
    (abierta.id === SIN_CATEGORIA ||
      categorias.some((c) => c.id === abierta.id))
      ? abierta
      : null;

  const itemsCarpeta = useMemo(() => {
    if (!abiertaValida) return [];
    return [...items]
      .filter((p) => (p.categoria_id ?? SIN_CATEGORIA) === abiertaValida.id)
      .sort(comparator);
  }, [items, abiertaValida, comparator]);

  // Vista de carpeta abierta: lista compacta.
  if (abiertaValida) {
    const categoriaId =
      abiertaValida.id === SIN_CATEGORIA ? null : abiertaValida.id;
    return (
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbierta(null)}
            aria-label="Volver a las categorías"
            className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            ←
          </button>
          <h2 className="flex-1 truncate text-lg font-semibold tracking-tight text-neutral-900">
            {abiertaValida.nombre}
          </h2>
          {accionCarpeta?.(categoriaId)}
        </header>

        {itemsCarpeta.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
            No hay productos en esta categoría.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {itemsCarpeta.map((p) => renderFila(p))}
          </ul>
        )}
      </div>
    );
  }

  // Vista de carpetas.
  return (
    <div className="flex flex-col gap-4">
      {(titulo || subtitulo || headerExtra) && (
        <header className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            {acento && (
              <span
                className={`mt-0.5 h-7 w-1.5 shrink-0 rounded-full ${ACENTO_BAR[acento]}`}
                aria-hidden
              />
            )}
            <div>
              {titulo && (
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                  {titulo}
                </h2>
              )}
              {subtitulo && (
                <p className="text-sm text-neutral-500">{subtitulo}</p>
              )}
            </div>
          </div>
          {headerExtra}
        </header>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-400">Cargando…</p>
      ) : carpetas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
          No hay categorías todavía.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {carpetas.map((c) => (
            <CarpetaCard
              key={c.id}
              nombre={c.nombre}
              count={c.count}
              muted={c.muted}
              foto={c.foto}
              onClick={() => setAbierta({ id: c.id, nombre: c.nombre })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Modal: alta / edición ------------------------- */

/**
 * Alta de producto o edición (si llega `producto`). En alta la foto es
 * obligatoria; en edición es opcional. Siempre se elige categoría.
 */
export function ProductoModal({
  categoriaId = null,
  enLista = false,
  producto,
  onClose,
}: {
  /** Categoría inicial sugerida en el alta. */
  categoriaId?: string | null;
  /** Si true, el producto nuevo entra también en la lista (estado "falta"). */
  enLista?: boolean;
  /** Si viene, el modal está en modo edición. */
  producto?: Producto;
  onClose: () => void;
}) {
  const { addProducto, updateProducto, removeProducto, subirFoto, categorias } =
    usePantry();
  const editando = Boolean(producto);

  const categoriasOrden = useMemo(
    () =>
      [...categorias].sort(
        (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
      ),
    [categorias],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    producto?.foto_url ?? null,
  );
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [cantidad, setCantidad] = useState(producto?.cantidad ?? "");
  const [categoriaSel, setCategoriaSel] = useState<string>(
    producto?.categoria_id ?? categoriaId ?? categoriasOrden[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setFile(f);
    setPreview(url);
    setError(null);
  }

  const tieneFoto = Boolean(file) || Boolean(producto?.foto_url);
  const puedeGuardar = tieneFoto && nombre.trim().length > 0 && !saving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tieneFoto) {
      setError("La foto es obligatoria.");
      return;
    }
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fotoUrl = file ? await subirFoto(file) : undefined;
      if (editando && producto) {
        await updateProducto(producto.id, {
          nombre,
          cantidad: cantidad || null,
          categoriaId: categoriaSel || null,
          fotoUrl,
        });
      } else {
        await addProducto({
          nombre,
          cantidad: cantidad || undefined,
          categoriaId: categoriaSel || null,
          fotoUrl,
          enLista,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!producto) return;
    if (!window.confirm(`¿Borrar "${producto.nombre}" del almacén?`)) return;
    setSaving(true);
    setError(null);
    try {
      await removeProducto(producto.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar.");
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={editando ? "Editar producto" : "Nuevo producto"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500 transition-colors hover:border-fucsia-300"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Vista previa"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <span className="text-3xl" aria-hidden>
                  📷
                </span>
                Hacer foto o elegir
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickFile}
            className="hidden"
          />
          <p
            className={`text-xs ${
              tieneFoto ? "text-neutral-400" : "font-medium text-fucsia-600"
            }`}
          >
            {editando && tieneFoto
              ? "Toca la foto para cambiarla."
              : tieneFoto
                ? "Foto lista."
                : "La foto es obligatoria."}
          </p>
        </div>

        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (p. ej. Leche entera)"
          className={inputBase}
        />
        <input
          type="text"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Cantidad (opcional)"
          className={inputBase}
        />
        <select
          value={categoriaSel}
          onChange={(e) => setCategoriaSel(e.target.value)}
          className={inputBase}
        >
          <option value="">Sin categoría</option>
          {categoriasOrden.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

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
            disabled={!puedeGuardar}
            className={`${btnPrimary} flex-1`}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {editando && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="mt-1 text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            Borrar del almacén
          </button>
        )}
      </form>
    </ModalShell>
  );
}
