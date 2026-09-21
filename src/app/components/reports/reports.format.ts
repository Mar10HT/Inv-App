export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
