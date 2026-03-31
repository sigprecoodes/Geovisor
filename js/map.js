import { STATE } from './state.js';
import { getStyle, matchesStateFilter } from './utils.js';
import { renderInfoPanel } from './ui.js';

export function initMap() {
  STATE.map = L.map('map').setView([6.2, -75.57], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(STATE.map);
}

export function renderMap() {
  if (STATE.geojsonLayer) {
    STATE.map.removeLayer(STATE.geojsonLayer);
  }

  const visibleFeatures = STATE.microrrutasData.filter((feature) =>
    matchesStateFilter(feature.properties.estado, STATE.activeFilters)
  );

  if (!visibleFeatures.length) {
    STATE.geojsonLayer = null;
    return;
  }

  STATE.geojsonLayer = L.geoJSON(visibleFeatures, {
    style: (feature) => getStyle(feature.properties.estado),
    onEachFeature: (feature, layer) => {
      if (layer.unbindPopup) layer.unbindPopup();

      layer.on('click', () => {
        if (layer.closePopup) layer.closePopup();
        STATE.selectedFeatureId = feature.id;
        renderInfoPanel(feature);
      });
    }
  }).addTo(STATE.map);

  const bounds = STATE.geojsonLayer.getBounds();
  if (bounds.isValid()) {
    STATE.map.fitBounds(bounds, { padding: [20, 20] });
  }
}
