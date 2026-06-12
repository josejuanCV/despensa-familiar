"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import type { Categoria, Producto } from "@/lib/types";

/** Nombre del bucket de Supabase Storage para las fotos de producto. */
export const FOTOS_BUCKET = "product-photos";

/**
 * Categorías que se crean automáticamente la primera vez que un usuario entra
 * sin ninguna categoría. El orden marca el `orden` (recorrido de supermercado).
 * El usuario puede luego añadir, renombrar, reordenar o borrar.
 */
export const CATEGORIAS_POR_DEFECTO = [
  "Frutas y verduras",
  "Carne",
  "Pescado",
  "Lácteos y huevos",
  "Panadería",
  "Despensa (pasta, arroz, conservas, aceite...)",
  "Congelados",
  "Bebidas",
  "Especias y condimentos",
  "Limpieza",
  "Higiene y baño",
  "Otros",
];

type AddInput = {
  nombre: string;
  cantidad?: string;
  /** Categoría por id (prioritario). null = sin categoría. */
  categoriaId?: string | null;
  /** Alternativa: categoría por nombre (se crea si no existe). */
  categoriaNombre?: string;
  /** URL pública de la foto ya subida a Storage. */
  fotoUrl?: string;
  /** Si true, entra directo en la lista como "falta". */
  enLista?: boolean;
  /** Cosa suelta de la lista que no forma parte de la despensa. */
  suelto?: boolean;
};

type PantryContextValue = {
  productos: Producto[];
  categorias: Categoria[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Inserta un producto. Lanza el error si algo falla. */
  addProducto: (input: AddInput) => Promise<void>;
  /** Edita un producto del catálogo (Almacén). Lanza si falla. */
  updateProducto: (
    id: string,
    patch: {
      nombre?: string;
      categoriaId?: string | null;
      cantidad?: string | null;
      fotoUrl?: string;
    },
  ) => Promise<void>;
  /** Sube una foto a Storage y devuelve su URL pública. Lanza si falla. */
  subirFoto: (file: File) => Promise<string>;
  /** "Se acabó": de la despensa a la lista. */
  marcarFalta: (id: string) => Promise<void>;
  /** Fija las unidades a comprar (mínimo 1) de un producto en la lista. */
  setCantidadLista: (id: string, n: number) => Promise<void>;
  /** Fija el stock en casa (mínimo 0) de un producto de la despensa. */
  setStock: (id: string, n: number) => Promise<void>;
  /** "Ya lo tengo": vuelve a la despensa, fuera de la lista. */
  marcarHay: (id: string) => Promise<void>;
  /** Tachar en la lista mientras compras. */
  marcarComprado: (id: string) => Promise<void>;
  /** Destachar en la lista. */
  desmarcarComprado: (id: string) => Promise<void>;
  /** Guardar la compra: comprados normales → despensa; sueltos → fuera. */
  finalizarCompra: () => Promise<void>;
  /**
   * Saca un producto de lista y despensa, pero lo mantiene en el Almacén
   * (queda solo en catálogo). Los sueltos, que no están en el catálogo, se
   * eliminan del todo.
   */
  quitarDeCirculacion: (id: string) => Promise<void>;
  /** Vaciar la lista entera (cada producto sale de circulación). */
  vaciarLista: () => Promise<void>;
  /** Vaciar la despensa entera (cada producto sale de circulación). */
  vaciarDespensa: () => Promise<void>;
  /** Borrar definitivamente un producto (también del Almacén). */
  removeProducto: (id: string) => Promise<void>;
  /** Crear una categoría nueva (foto opcional). Lanza si falla. */
  addCategoria: (nombre: string, fotoUrl?: string | null) => Promise<void>;
  /** Editar una categoría (nombre y/o foto). Lanza si falla. */
  updateCategoria: (
    id: string,
    patch: { nombre?: string; fotoUrl?: string | null },
  ) => Promise<void>;
  /** Borrar una categoría (sus productos quedan sin categoría). Lanza si falla. */
  removeCategoria: (id: string) => Promise<void>;
};

const PantryContext = createContext<PantryContextValue | undefined>(undefined);

const now = () => new Date().toISOString();

export function PantryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seedIntentado = useRef(false);

  const refetch = useCallback(async () => {
    const [prodRes, catRes] = await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("categorias").select("*").order("orden").order("nombre"),
    ]);
    if (prodRes.error || catRes.error) {
      setError(prodRes.error?.message ?? catRes.error?.message ?? "Error al cargar.");
    } else {
      setError(null);
      setProductos((prodRes.data as Producto[]) ?? []);
      setCategorias((catRes.data as Categoria[]) ?? []);
    }
    setLoading(false);
  }, []);

  // Carga inicial + seed + sincronización en tiempo real (multi-dispositivo).
  useEffect(() => {
    if (!user) return;

    // Crea las categorías por defecto si el usuario no tiene ninguna todavía.
    // Idempotente: comprueba el conteo real en BD antes de insertar, así no
    // duplica las que ya existan ni reescribe nada del usuario.
    const seedCategoriasPorDefecto = async () => {
      const { count, error } = await supabase
        .from("categorias")
        .select("id", { count: "exact", head: true });
      if (error || (count ?? 0) > 0) return;
      const filas = CATEGORIAS_POR_DEFECTO.map((nombre, i) => ({
        user_id: user.id,
        nombre,
        orden: i,
      }));
      const { error: insErr } = await supabase
        .from("categorias")
        .insert(filas);
      if (!insErr) await refetch();
    };

    const init = async () => {
      await refetch();
      if (!seedIntentado.current) {
        seedIntentado.current = true;
        await seedCategoriasPorDefecto();
      }
    };
    // El setState ocurre tras awaits dentro de init, no de forma síncrona.
    init();

    const channel = supabase
      .channel("pantry-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "productos" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categorias" },
        () => refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  // Resuelve una categoría por nombre, creándola si no existe. Lanza si falla.
  async function ensureCategoria(nombre?: string): Promise<string | null> {
    const n = nombre?.trim();
    if (!n || !user) return null;
    const existing = categorias.find(
      (c) => c.nombre.toLowerCase() === n.toLowerCase(),
    );
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("categorias")
      .insert({ user_id: user.id, nombre: n })
      .select()
      .single();
    if (error) throw error;
    setCategorias((prev) => [...prev, data as Categoria]);
    return (data as Categoria).id;
  }

  // Sube la foto a Storage y devuelve su URL pública.
  async function subirFoto(file: File): Promise<string> {
    if (!user) throw new Error("No hay sesión activa.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(FOTOS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (error) throw error;
    const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function addProducto(input: AddInput) {
    if (!user) throw new Error("No hay sesión activa.");
    const nombre = input.nombre.trim();
    if (!nombre) throw new Error("El nombre es obligatorio.");
    const categoria_id =
      "categoriaId" in input && input.categoriaId !== undefined
        ? input.categoriaId
        : await ensureCategoria(input.categoriaNombre);
    const enLista = input.enLista ?? false;
    const { error } = await supabase.from("productos").insert({
      user_id: user.id,
      nombre,
      cantidad: input.cantidad?.trim() || null,
      categoria_id,
      foto_url: input.fotoUrl ?? null,
      estado: enLista ? "falta" : "hay",
      en_lista: enLista,
      metadata: input.suelto
        ? { suelto: true }
        : enLista
          ? {}
          : { stock: 1 },
    });
    if (error) throw error;
    await refetch();
  }

  async function updateProducto(
    id: string,
    input: {
      nombre?: string;
      categoriaId?: string | null;
      cantidad?: string | null;
      fotoUrl?: string;
    },
  ) {
    const patch: Record<string, unknown> = { updated_at: now() };
    if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
    if (input.categoriaId !== undefined) patch.categoria_id = input.categoriaId;
    if (input.cantidad !== undefined)
      patch.cantidad = input.cantidad?.trim() || null;
    if (input.fotoUrl !== undefined) patch.foto_url = input.fotoUrl;
    const { error } = await supabase
      .from("productos")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
    await refetch();
  }

  // Actualización optimista local + persistencia.
  function patchLocal(id: string, patch: Partial<Producto>) {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  async function patch(id: string, patch: Partial<Producto>) {
    patchLocal(id, patch);
    const { error } = await supabase
      .from("productos")
      .update({ ...patch, updated_at: now() })
      .eq("id", id);
    if (error) {
      setError(error.message);
      await refetch();
    }
  }

  const marcarFalta = (id: string) => {
    // Al entrar en la lista, arranca con 1 unidad (preservando metadata).
    const prod = productos.find((p) => p.id === id);
    const metadata = { ...(prod?.metadata ?? {}), cantidad_lista: 1 };
    return patch(id, { estado: "falta", en_lista: true, metadata });
  };
  const marcarHay = (id: string) =>
    patch(id, { estado: "hay", en_lista: false });

  const setCantidadLista = (id: string, n: number) => {
    const prod = productos.find((p) => p.id === id);
    if (!prod) return Promise.resolve();
    const cantidad_lista = Math.max(1, Math.round(n));
    return patch(id, { metadata: { ...prod.metadata, cantidad_lista } });
  };
  const setStock = (id: string, n: number) => {
    const prod = productos.find((p) => p.id === id);
    if (!prod) return Promise.resolve();
    const stock = Math.max(0, Math.round(n));
    return patch(id, { metadata: { ...prod.metadata, stock } });
  };
  const marcarComprado = (id: string) => patch(id, { estado: "comprado" });
  const desmarcarComprado = (id: string) => patch(id, { estado: "falta" });

  async function finalizarCompra() {
    const comprados = productos.filter(
      (p) => p.en_lista && p.estado === "comprado",
    );
    if (comprados.length === 0) return;

    const sueltos = comprados.filter((p) => p.metadata?.suelto);
    const normales = comprados.filter((p) => !p.metadata?.suelto);

    // Las unidades compradas (cantidad_lista) pasan a ser el stock en casa.
    const metaComprado = (p: Producto) => {
      const m = { ...(p.metadata ?? {}) };
      m.stock = p.metadata?.cantidad_lista ?? 1;
      delete m.cantidad_lista;
      return m;
    };

    // Optimista: sueltos fuera; normales a casa con su stock y sin cantidad_lista.
    setProductos((prev) =>
      prev
        .filter((p) => !sueltos.some((s) => s.id === p.id))
        .map((p) =>
          normales.some((n) => n.id === p.id)
            ? {
                ...p,
                estado: "hay",
                en_lista: false,
                metadata: metaComprado(p),
              }
            : p,
        ),
    );

    // Cada producto vuelve a casa con su stock (update por fila).
    for (const p of normales) {
      const { error } = await supabase
        .from("productos")
        .update({
          estado: "hay",
          en_lista: false,
          metadata: metaComprado(p),
          updated_at: now(),
        })
        .eq("id", p.id);
      if (error) setError(error.message);
    }
    if (sueltos.length) {
      const { error } = await supabase
        .from("productos")
        .delete()
        .in(
          "id",
          sueltos.map((p) => p.id),
        );
      if (error) setError(error.message);
    }
    await refetch();
  }

  async function removeProducto(id: string) {
    setProductos((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) {
      setError(error.message);
      await refetch();
    }
  }

  // Saca un producto de circulación: queda solo en catálogo (estado "falta",
  // fuera de la lista). Los sueltos, que no están en el catálogo, se borran.
  async function quitarDeCirculacion(id: string) {
    const prod = productos.find((p) => p.id === id);
    if (!prod) return;
    if (prod.metadata?.suelto) return removeProducto(id);
    const metadata = { ...(prod.metadata ?? {}) };
    delete metadata.cantidad_lista;
    return patch(id, { estado: "falta", en_lista: false, metadata });
  }

  async function vaciarLista() {
    const enLista = productos.filter((p) => p.en_lista);
    if (enLista.length === 0) return;
    const sueltos = enLista.filter((p) => p.metadata?.suelto);
    const normales = enLista.filter((p) => !p.metadata?.suelto);

    const metaSinLista = (p: Producto) => {
      const m = { ...(p.metadata ?? {}) };
      delete m.cantidad_lista;
      return m;
    };

    // Optimista: sueltos fuera; normales a solo-catálogo (falta, sin lista).
    setProductos((prev) =>
      prev
        .filter((p) => !sueltos.some((s) => s.id === p.id))
        .map((p) =>
          normales.some((n) => n.id === p.id)
            ? {
                ...p,
                estado: "falta",
                en_lista: false,
                metadata: metaSinLista(p),
              }
            : p,
        ),
    );

    for (const p of normales) {
      const { error } = await supabase
        .from("productos")
        .update({
          estado: "falta",
          en_lista: false,
          metadata: metaSinLista(p),
          updated_at: now(),
        })
        .eq("id", p.id);
      if (error) setError(error.message);
    }
    if (sueltos.length) {
      const { error } = await supabase
        .from("productos")
        .delete()
        .in(
          "id",
          sueltos.map((p) => p.id),
        );
      if (error) setError(error.message);
    }
    await refetch();
  }

  async function vaciarDespensa() {
    const enCasa = productos.filter(
      (p) => p.estado === "hay" && !p.en_lista && !p.metadata?.suelto,
    );
    if (enCasa.length === 0) return;

    // Salen de la despensa (estado "falta"); siguen en el Almacén.
    setProductos((prev) =>
      prev.map((p) =>
        enCasa.some((e) => e.id === p.id) ? { ...p, estado: "falta" } : p,
      ),
    );
    const { error } = await supabase
      .from("productos")
      .update({ estado: "falta", updated_at: now() })
      .in(
        "id",
        enCasa.map((p) => p.id),
      );
    if (error) setError(error.message);
    await refetch();
  }

  async function addCategoria(nombre: string, fotoUrl?: string | null) {
    if (!user) throw new Error("No hay sesión activa.");
    const n = nombre.trim();
    if (!n) throw new Error("El nombre es obligatorio.");
    const orden = categorias.length
      ? Math.max(...categorias.map((c) => c.orden)) + 1
      : 0;
    const { error } = await supabase
      .from("categorias")
      .insert({ user_id: user.id, nombre: n, orden, foto_url: fotoUrl ?? null });
    if (error) throw error;
    await refetch();
  }

  async function updateCategoria(
    id: string,
    input: { nombre?: string; fotoUrl?: string | null },
  ) {
    const patch: Record<string, unknown> = { updated_at: now() };
    if (input.nombre !== undefined) {
      const n = input.nombre.trim();
      if (!n) throw new Error("El nombre es obligatorio.");
      patch.nombre = n;
    }
    if (input.fotoUrl !== undefined) patch.foto_url = input.fotoUrl;
    const { error } = await supabase
      .from("categorias")
      .update(patch)
      .eq("id", id);
    if (error) throw error;
    await refetch();
  }

  async function removeCategoria(id: string) {
    // Los productos quedan con categoria_id = null (FK on delete set null).
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) throw error;
    await refetch();
  }

  const value: PantryContextValue = {
    productos,
    categorias,
    loading,
    error,
    refetch,
    addProducto,
    updateProducto,
    subirFoto,
    marcarFalta,
    setCantidadLista,
    setStock,
    marcarHay,
    marcarComprado,
    desmarcarComprado,
    finalizarCompra,
    quitarDeCirculacion,
    vaciarLista,
    vaciarDespensa,
    removeProducto,
    addCategoria,
    updateCategoria,
    removeCategoria,
  };

  return (
    <PantryContext.Provider value={value}>{children}</PantryContext.Provider>
  );
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error("usePantry debe usarse dentro de <PantryProvider>");
  }
  return ctx;
}
