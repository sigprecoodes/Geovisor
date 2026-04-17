import { STATE } from './state.js';
import { fetchSheetData } from './api.js';
import { normalizeText, inferCuadrillaFromPath, extractQuadrillaNumber } from './utils.js';

function normalizarBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value || '').trim().toLowerCase() === 'true' ||
    String(value || '').trim().toLowerCase() === 'si' ||
    String(value || '').trim().toLowerCase() === 'sí'
  );
}

function claveRegistro(microrruta, cuadrilla) {
  return `${normalizeText(microrruta)}|${normalizeText(cuadrilla)}`;
}

function construirIndiceSheetData(rows) {
  const index = new Map();

  (rows || []).forEach((row) => {
    const microrruta = row.microrruta || row.Microruta || row.MICRORRUTA || '';
    const cuadrilla = row.cuadrilla || row.Cuadrilla || row.CUADRILLA || '';
    if (!microrruta || !cuadrilla) return;

    index.set(claveRegistro(microrruta, cuadrilla), {
      cuadrilla: row.cuadrilla || '',
      microrruta: row.microrruta || '',
      lote: row.lote || row.No_Lote || '',
      estado: row.estado || 'Pendiente',
      fecha_inicio: row.fecha_inicio || '',
      fecha_fin: row.fecha_fin || '',
      tipo_novedad_ejecucion: row.tipo_novedad_ejecucion || '',
      novedad_activa: normalizarBoolean(row.novedad_activa),
      usuario: row.usuario || '',
      rol: row.rol || ''
    });
  });

  return index;
}

function findSheetRow(index, microrruta, cuadrilla, cuadrillaNumber) {
  const direct = index.get(claveRegistro(microrruta, cuadrilla));
  if (direct) return direct;

  for (const row of index.values()) {
    if (normalizeText(row.microrruta) !== normalizeText(microrruta)) continue;
    const rowNumber = extractQuadrillaNumber(row.cuadrilla || '');
    if (rowNumber && cuadrillaNumber && rowNumber === cuadrillaNumber) return row;
  }

  return null;
}

async function loadGeoJSON() {
  const collections = await Promise.all(
    STATE.geojsonFiles.map(async (file) => {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`No se pudo cargar ${file} (${res.status})`);
      const geojson = await res.json();
      return { geojson, file };
    })
  );

  const index = construirIndiceSheetData(STATE.sheetData);

  STATE.microrrutasData = collections.flatMap(({ geojson, file }) => {
    const cuadrilla = inferCuadrillaFromPath(file);
    const cuadrillaNumber = extractQuadrillaNumber(cuadrilla);

    return (geojson.features || []).map((feature, indexFeature) => {
      const props = feature.properties || {};
      const microrruta = props.Microruta || props.microrruta || '';
      const lote = props.No_Lote || props.Lote || props.lote || '';
      const row = findSheetRow(index, microrruta, cuadrilla, cuadrillaNumber) || null;

      return {
        ...feature,
        id: feature.id ?? `${cuadrilla}-${microrruta}-${indexFeature}`,
        properties: {
          ...props,
          microrruta,
          lote,
          cuadrilla,
          cuadrilla_display: cuadrilla.replace('_', ' '),
          estado: row?.estado || 'Pendiente',
          fecha_inicio: row?.fecha_inicio || '',
          fecha_fin: row?.fecha_fin || '',
          tipo_novedad_ejecucion: row?.tipo_novedad_ejecucion || '',
          novedad_activa: row?.novedad_activa || false,
          usuario: row?.usuario || '',
          rol: row?.rol || ''
        }
      };
    });
  });
}

export async function loadAllData() {
  STATE.sheetData = await fetchSheetData();
  await loadGeoJSON();
}

