export const STATE = {
  map: null,
  geojsonLayer: null,
  sheetData: [],
  microrrutasData: [],
  geojsonFiles: [],
  selectedFeatureId: null,
  activeFilters: new Set([
    'Pendiente',
    'En proceso',
    'Ejecutado',
    'Ejecutado con novedad',
    'No ejecutado con novedad'
  ])
};
