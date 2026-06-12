/**
 * Pequeño distintivo de marca: un cuadrado fucsia con borde redondeado y una
 * "chispa" pastel. Es uno de los pocos toques de fucsia que dan carácter.
 */
export function BrandMark({
  className = "",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-2xl bg-fucsia-500 text-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="text-base leading-none">🧺</span>
      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-200" />
    </span>
  );
}
