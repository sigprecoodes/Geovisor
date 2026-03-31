export function getStyle(estado) {
  const colors = {
    'Pendiente': '#374151',
    'En proceso': '#f59e0b',
    'Ejecutado': '#16a34a',
    'Ejecutado con novedad': '#ea580c',
    'No ejecutado con novedad': '#dc2626'
  };

  return {
    color: colors[estado] || '#6b7280',
    weight: 2,
    fillOpacity: 0.2
  };
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

export function inferCuadrillaFromPath(path) {
  const filename = String(path || '').split('/').pop() || '';
  const match = filename.match(/cuadrilla[_\s-]?(\d+)/i);
  return match ? `CUADRILLA ${match[1]}` : 'CUADRILLA';
}

export function extractQuadrillaNumber(value) {
  const match = String(value || '').match(/(\d+)/);
  return match ? match[1] : '';
}

export function matchesStateFilter(estado, filters) {
  return filters.has(estado || 'Pendiente');
}

export function formatDateValue(value) {
  if (!value) return '-';
  return String(value);
}

export function stateSortWeight(estado) {
  const order = {
    'En proceso': 0,
    'Pendiente': 1,
    'Ejecutado con novedad': 2,
    'No ejecutado con novedad': 3,
    'Ejecutado': 4
  };

  return order[estado] ?? 99;
}
