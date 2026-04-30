/**
 * Quita tags HTML de un string para mostrar solo texto plano (útil en listados / truncados).
 */
export const stripHtml = (html) => {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return String(html).replace(/<[^>]*>/g, '').trim();
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
};
