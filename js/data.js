import { STATE } from './state.js';
import { fetchSheetData } from './api.js';
import { normalizeText, inferCuadrillaFromPath, extractQuadrillaNumber } from './utils.js';

export async function loadAllData() {
  STATE.sheetData = await fetchSheetData();
  await loadGeoJSON();
}

async function loadGeoJSON() {
  const collections = await Promise.all(
    STATE.geojsonFiles.map(async (file) => {
      const res = await fetch(file);
      const geojson = await res.json();
      return { geojson, file };
    })
  );

  STATE.microrrutasData = collections.flatMap(({ geojson, file }) => {
    const inferredCuadrilla = inferCuadrillaFromPath(file);
    const cuadrillaNumber = extractQuadrillaNumber(inferredCuadrilla);

    return (geojson.features || []).map((feature, index) => {
      const microrruta = feature.properties?.Microruta || feature.properties?.microrruta || '';
      const lote = feature.properties?.No_Lote || feature.properties?.Lote || feature.properties?.lote || '';
      const sheet = findSheetRow(STATE.sheetData, microrruta, inferredCuadrilla, cuadrillaNumber) || {};
      const cuadrilla = sheet.cuadrilla || inferredCuadrilla;

      return {
        ...feature,
        id: feature.id ?? `${cuadrilla}-${microrruta}-${index}`,
        properties: {
          ...feature.properties,
          microrruta,
          lote,
          cuadrilla,
          cuadrilla_display: cuadrilla,
          estado: sheet.estado || 'Pendiente',
          fecha_inicio: sheet.fecha_inicio || '',
          fecha_fin: sheet.fecha_fin || '',
          novedad: Boolean(sheet.novedad),
          tipo_novedad: sheet.tipo_novedad || ''
        }
      };
    });
  });
}

function findSheetRow(rows, microrruta, cuadrilla, cuadrillaNumber) {
  const micKey = normalizeText(microrruta);
  const cuaKey = normalizeText(cuadrilla);

  return rows.find((row) => {
    if (normalizeText(row.microrruta) !== micKey) return false;

    const rowCuadrilla = row.cuadrilla || '';
    if (!rowCuadrilla) return true;

    const rowCuaKey = normalizeText(rowCuadrilla);
    if (rowCuaKey === cuaKey) return true;

    const rowNumber = extractQuadrillaNumber(rowCuadrilla);
    return rowNumber && cuadrillaNumber && rowNumber === cuadrillaNumber;
  });
}

