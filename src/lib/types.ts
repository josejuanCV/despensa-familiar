export type Estado = "hay" | "falta" | "comprado";

export type ProductoMetadata = {
  suelto?: boolean;
  /** Unidades a comprar cuando el producto está en la lista. */
  cantidad_lista?: number;
  /** Unidades en casa (stock de la despensa). */
  stock?: number;
  [key: string]: unknown;
};

export type Producto = {
  id: string;
  user_id: string;
  nombre: string;
  categoria_id: string | null;
  cantidad: string | null;
  foto_url: string | null;
  estado: Estado;
  en_lista: boolean;
  metadata: ProductoMetadata;
  created_at: string;
  updated_at: string;
};

export type Categoria = {
  id: string;
  user_id: string;
  nombre: string;
  orden: number;
  /** Foto opcional de la categoría (URL pública en Storage). */
  foto_url: string | null;
  created_at: string;
  updated_at: string;
};
