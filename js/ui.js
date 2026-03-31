import { STATE } from './state.js';
import { abrirEditor } from './actions.js';
import { matchesStateFilter, formatDateValue, stateSortWeight } from './utils.js';

export function createPopup(props) {
  return `
    <div class="popup-card">
      <strong>${props.microrruta || '-'}</strong><br>
      <span>${props.cuadrilla_display || props.cuadrilla || '-'}</span><br>
      <span>Estado: ${props.estado || 'Pendiente'}</span>
    </div>
  `;
}

export function renderInfoPanel(feature) {
  const props = feature.properties || {};
  const panel = document.getElementById('info-panel');
  const content = document.getElementById('panel-content');

  content.innerHTML = `
    <div class="detail-card">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Microrruta</span>
          <span class="detail-value">${props.microrruta || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Cuadrilla</span>
          <span class="detail-value">${props.cuadrilla_display || props.cuadrilla || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Lote</span>
          <span class="detail-value">${props.lote || '-'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Estado</span>
          <span class="status-chip status-${slugifyState(props.estado)}">${props.estado || 'Pendiente'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Fecha inicio</span>
          <span class="detail-value">${formatDateValue(props.fecha_inicio)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Fecha fin</span>
          <span class="detail-value">${formatDateValue(props.fecha_fin)}</span>
        </div>
        <div class="detail-item full-width">
          <span class="detail-label">Novedad</span>
          <span class="detail-value">${props.tipo_novedad || (props.novedad ? 'Sí' : 'Sin novedad')}</span>
        </div>
      </div>

      <div class="readonly-banner">
        <i class="fas fa-eye"></i>
        Este visor es de solo lectura. Para cambiar estados, abra el editor protegido.
      </div>

      <div class="panel-actions">
        <button id="btn-open-editor" class="btn-primary">
          <i class="fas fa-pen"></i>
          Modificar
        </button>
      </div>
    </div>
  `;

  panel.classList.remove('hidden');

  document.getElementById('btn-open-editor')?.addEventListener('click', () => {
    abrirEditor({
      microrruta: props.microrruta,
      cuadrilla: props.cuadrilla,
      lote: props.lote
    });
  });
}

export function renderLayersList() {
  const list = document.getElementById('layers-list');
  if (!list) return;

  const visible = STATE.microrrutasData.filter((feature) =>
    matchesStateFilter(feature.properties.estado, STATE.activeFilters)
  );

  if (!visible.length) {
    list.innerHTML = '<div class="empty-list">No hay cuadrillas con los filtros actuales.</div>';
    return;
  }

  const grouped = visible.reduce((acc, feature) => {
    const props = feature.properties || {};
    const cuadrilla = props.cuadrilla_display || props.cuadrilla || 'SIN CUADRILLA';

    if (!acc[cuadrilla]) {
      acc[cuadrilla] = {
        cuadrilla,
        features: []
      };
    }

    acc[cuadrilla].features.push(feature);
    return acc;
  }, {});

  const selectedCuadrilla = (() => {
    const selected = STATE.microrrutasData.find(
      (item) => String(item.id) === String(STATE.selectedFeatureId)
    );
    return selected?.properties?.cuadrilla_display || selected?.properties?.cuadrilla || null;
  })();

  const orderedGroups = Object.values(grouped).sort((a, b) =>
    String(a.cuadrilla).localeCompare(String(b.cuadrilla))
  );

  list.innerHTML = `
    <button class="route-item${!STATE.selectedFeatureId ? ' selected' : ''}" data-cuadrilla="__ALL__">
      <span class="route-title">TODAS LAS CUADRILLAS</span>
    </button>
    ${orderedGroups.map((group) => {
      const selected = selectedCuadrilla === group.cuadrilla ? ' selected' : '';

      return `
        <button class="route-item${selected}" data-cuadrilla="${group.cuadrilla}">
          <span class="route-title">${group.cuadrilla}</span>
        </button>
      `;
    }).join('')}
  `;

  list.querySelectorAll('[data-cuadrilla]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cuadrilla = btn.dataset.cuadrilla;

      if (cuadrilla === '__ALL__') {
        STATE.selectedFeatureId = null;

        if (STATE.geojsonLayer) {
          const bounds = STATE.geojsonLayer.getBounds();
          if (bounds?.isValid?.()) {
            STATE.map.fitBounds(bounds, { padding: [20, 20] });
          }
        }

        document.getElementById('info-panel')?.classList.add('hidden');
        renderLayersList();
        return;
      }

      const features = STATE.microrrutasData.filter((feature) => {
        const p = feature.properties || {};
        return (p.cuadrilla_display || p.cuadrilla || '') === cuadrilla;
      });

      if (!features.length) return;

      STATE.selectedFeatureId = features[0].id;
      renderInfoPanel(features[0]);

      if (STATE.geojsonLayer) {
        let bounds = null;

        STATE.geojsonLayer.eachLayer((layer) => {
          const p = layer.feature?.properties || {};
          const layerCuadrilla = p.cuadrilla_display || p.cuadrilla || '';

          if (layerCuadrilla === cuadrilla) {
            const layerBounds = layer.getBounds?.();
            if (layerBounds?.isValid?.()) {
              bounds = bounds ? bounds.extend(layerBounds) : layerBounds;
            } else if (layer.getLatLng) {
              const latlng = layer.getLatLng();
              if (latlng) {
                bounds = bounds
                  ? bounds.extend(latlng)
                  : L.latLngBounds([latlng, latlng]);
              }
            }
          }
        });

        if (bounds?.isValid?.()) {
          STATE.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }

      renderLayersList();
    });
  });
}

export function updateStats() {
  const data = STATE.microrrutasData;

  document.getElementById('total-routes').textContent = data.length;
  document.getElementById('in-progress').textContent = data.filter((feature) => feature.properties.estado === 'En proceso').length;
  document.getElementById('completed').textContent = data.filter((feature) => String(feature.properties.estado || '').includes('Ejecutado')).length;
}

export function setupUI(renderApp) {
  document.getElementById('refresh-data')?.addEventListener('click', () => location.reload());

  document.getElementById('close-panel')?.addEventListener('click', () => {
    document.getElementById('info-panel')?.classList.add('hidden');
    STATE.selectedFeatureId = null;
    renderLayersList();
  });

  document.querySelectorAll('.filter-options input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        STATE.activeFilters.add(checkbox.value);
      } else {
        STATE.activeFilters.delete(checkbox.value);
      }
      renderApp();
    });
  });
}

function slugifyState(value) {
  return String(value || 'pendiente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
