import { CONFIG } from './config.js';

function valorSeguro(value) {
  if (value === null || value === undefined || value === '') return 'No disponible';
  return String(value);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateOnly(value) {
  if (!value) return '';
  const str = String(value).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function buildContextUrl({ microrruta, cuadrilla, lote }) {
  const callback = `ctx_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const url = new URL(CONFIG.WEBAPP_URL);

  url.searchParams.set('callback', callback);
  url.searchParams.set('api', '1');
  url.searchParams.set('action', 'contextoReporte');
  url.searchParams.set('microrruta', microrruta || '');
  url.searchParams.set('cuadrilla', cuadrilla || '');
  url.searchParams.set('lote', lote || '');

  return { url: url.toString(), callback };
}

function fetchJsonp(url, callbackName) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de espera agotado al consultar el contexto.'));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('No fue posible cargar el contexto del registro.'));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

function fetchMicrorrutaContext({ microrruta, cuadrilla, lote }) {
  return new Promise((resolve, reject) => {
    if (!microrruta || !cuadrilla) {
      resolve(null);
      return;
    }

    const { url, callback } = buildContextUrl({ microrruta, cuadrilla, lote });

    fetchJsonp(url, callback)
      .then((response) => {
        if (!response || response.success === false) {
          resolve(null);
          return;
        }
        resolve(response.data || response);
      })
      .catch(reject);
  });
}

function findNovedadActiva(detalle) {
  const registro = detalle?.registro || {};
  const novedades = Array.isArray(detalle?.novedades) ? detalle.novedades : [];

  const activaDesdeRegistro =
    registro?.novedad_activa && typeof registro.novedad_activa === 'object'
      ? registro.novedad_activa
      : null;

  if (activaDesdeRegistro) return activaDesdeRegistro;

  const activaDesdeLista = novedades.find((n) => {
    const estado = String(
      n?.estado_novedad ||
      n?.estado ||
      ''
    ).trim().toUpperCase();

    return estado === 'REPORTADA' || estado === 'SUBSANADA';
  });

  return activaDesdeLista || null;
}

function renderResumenBasico(detalle) {
  const registro = detalle?.registro || {};

  return `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Microrruta</span>
        <span class="detail-value">${escapeHtml(valorSeguro(registro.microrruta))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Cuadrilla</span>
        <span class="detail-value">${escapeHtml(valorSeguro(registro.cuadrilla))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Lote</span>
        <span class="detail-value">${escapeHtml(valorSeguro(registro.lote))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Quincena</span>
        <span class="detail-value">${escapeHtml(valorSeguro(registro.quincena))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Estado</span>
        <span class="detail-value">${escapeHtml(valorSeguro(registro.estado))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Fecha ejecución</span>
        <span class="detail-value">${escapeHtml(valorSeguro(formatDateOnly(registro.fecha_ejecucion)))}</span>
      </div>
    </div>
  `;
}

function renderNovedadActiva(detalle) {
  const activa = findNovedadActiva(detalle);

  if (!activa) {
    return `
      <div class="detail-grid">
        <div class="detail-item full-width">
          <span class="detail-label">Novedad activa reportada</span>
          <span class="detail-value">Sin novedad activa</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="detail-grid">
      <div class="detail-item full-width detail-alert">
        <span class="detail-label">Tipo de novedad activa</span>
        <span class="detail-value">${escapeHtml(valorSeguro(
          activa.tipo_novedad ||
          activa.tipo_novedad_ejecucion ||
          'Sin tipo'
        ))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Estado novedad</span>
        <span class="detail-value">${escapeHtml(valorSeguro(
          activa.estado_novedad ||
          activa.estado ||
          'REPORTADA'
        ))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Fecha reporte</span>
        <span class="detail-value">${escapeHtml(valorSeguro(formatDateOnly(
          activa.fecha_reporte_novedad ||
          activa.fecha_reporte
        )))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Inicio subsanación</span>
        <span class="detail-value">${escapeHtml(valorSeguro(formatDateOnly(
          activa.fecha_inicio_subsanacion ||
          activa.fecha_inicio
        )))}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Fin subsanación</span>
        <span class="detail-value">${escapeHtml(valorSeguro(formatDateOnly(
          activa.fecha_fin_subsanacion ||
          activa.fecha_fin
        )))}</span>
      </div>

      <div class="detail-item full-width">
        <span class="detail-label">Observación</span>
        <span class="detail-value">${escapeHtml(valorSeguro(
          activa.observacion_novedad ||
          activa.observacion
        ))}</span>
      </div>
    </div>
  `;
}

function renderHistorialNovedades(detalle) {
  const novedades = Array.isArray(detalle?.novedades) ? detalle.novedades : [];

  if (!novedades.length) {
    return `
      <div class="detail-grid">
        <div class="detail-item full-width">
          <span class="detail-label">Historial de novedades</span>
          <span class="detail-value">Sin registros</span>
        </div>
      </div>
    `;
  }

  const html = novedades.map((n) => `
    <div class="detail-item full-width">
      <span class="detail-label">${escapeHtml(valorSeguro(n.tipo_novedad || n.tipo_novedad_ejecucion || 'Sin tipo'))}</span>
      <span class="detail-value">
        Estado: ${escapeHtml(valorSeguro(n.estado_novedad || n.estado || 'No disponible'))}<br>
        Fecha reporte: ${escapeHtml(valorSeguro(formatDateOnly(n.fecha_reporte_novedad || n.fecha_reporte)))}<br>
        Inicio: ${escapeHtml(valorSeguro(formatDateOnly(n.fecha_inicio_subsanacion || n.fecha_inicio)))}<br>
        Fin: ${escapeHtml(valorSeguro(formatDateOnly(n.fecha_fin_subsanacion || n.fecha_fin)))}<br>
        Observación: ${escapeHtml(valorSeguro(n.observacion_novedad || n.observacion))}
      </span>
    </div>
  `).join('');

  return `<div class="detail-grid">${html}</div>`;
}

function renderDetalleCompleto(detalle) {
  return `
    <div class="detail-section">
      <h4 class="detail-title">Información general</h4>
      ${renderResumenBasico(detalle)}
    </div>

    <div class="detail-section">
      <h4 class="detail-title">Novedad activa</h4>
      ${renderNovedadActiva(detalle)}
    </div>

    <div class="detail-section">
      <h4 class="detail-title">Historial</h4>
      ${renderHistorialNovedades(detalle)}
    </div>
  `;
}

export function bindInfoPanel({
  map,
  infoPanelSelector = '#info-panel',
  panelContentSelector = '#panel-content',
  closePanelSelector = '#close-panel'
} = {}) {
  const infoPanel = document.querySelector(infoPanelSelector);
  const panelContent = document.querySelector(panelContentSelector);
  const closeBtn = document.querySelector(closePanelSelector);

  if (!infoPanel || !panelContent) {
    return {
      openFromFeature: () => {},
      close: () => {}
    };
  }

  function close() {
    infoPanel.classList.add('hidden');
    panelContent.innerHTML = `<div class="empty-panel">Seleccione una microrruta en el mapa.</div>`;
  }

  async function openFromFeature(feature) {
    const props = feature?.properties || feature?.props || {};
    const microrruta = props.microrruta || '';
    const cuadrilla = props.cuadrilla || '';
    const lote = props.lote || '';

    infoPanel.classList.remove('hidden');
    panelContent.innerHTML = `<div class="empty-panel">Cargando detalle...</div>`;

    try {
      const detalle = await fetchMicrorrutaContext({ microrruta, cuadrilla, lote });
      console.log('DETALLE CONTEXTO:', detalle);

      if (!detalle) {
        panelContent.innerHTML = `
          <div class="empty-panel">
            No fue posible cargar el detalle del registro.
          </div>
        `;
        return;
      }

      panelContent.innerHTML = renderDetalleCompleto(detalle);
    } catch (error) {
      console.error(error);
      panelContent.innerHTML = `
        <div class="empty-panel">
          Ocurrió un error al consultar el detalle.
        </div>
      `;
    }
  }

  closeBtn?.addEventListener('click', close);

  if (map && typeof map.on === 'function') {
    map.on('popupclose', () => {});
  }

  return {
    openFromFeature,
    close
  };
}
