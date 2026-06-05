/**
 * Convierte un color hex (#RRGGBB o #RGB) a rgba con la opacidad indicada.
 * Sirve para construir un chip "soft" tipo bg-green-50 + text-green-700
 * a partir de un color custom guardado en el modelo.
 */
export function softTint(hex, alpha = 0.15) {
  if (!hex || typeof hex !== 'string') return `rgba(100, 116, 139, ${alpha})`;
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
