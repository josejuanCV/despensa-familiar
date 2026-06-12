// Estilos compartidos para una identidad visual coherente en toda la app.
// Base neutra y limpia + acentos pastel, con chispas de FUCSIA en los puntos
// clave (acción principal, indicador activo). El fucsia se usa con moderación.

/** Acción principal: la chispa de fucsia. */
export const btnPrimary =
  "rounded-xl bg-fucsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-fucsia-600 disabled:opacity-50";

/** Acción secundaria: neutra, discreta. */
export const btnSecondary =
  "rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50";

/** Campos de formulario, con foco en fucsia suave. */
export const inputBase =
  "rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-500/15";

/** Contenedor/tarjeta neutra muy suave para que destaque el contenido. */
export const card = "rounded-2xl border border-neutral-100 bg-white shadow-sm";

/** Aviso de error (semántico en rojo, no se confunde con el fucsia de marca). */
export const errorBox =
  "rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600";
