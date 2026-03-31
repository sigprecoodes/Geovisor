import { CONFIG } from '../config.js';
import { initMap, renderMap } from './map.js';
import { loadAllData } from './data.js';
import { setupUI, updateStats, renderLayersList } from './ui.js';
import { STATE } from './state.js';

function setupMobileLayersToggle() {
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('toggle-layers');
  const closeBtn = document.getElementById('close-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const layersList = document.getElementById('layers-list');

  if (!sidebar || !openBtn || !closeBtn || !backdrop) return;

  function openSidebar() {
    sidebar.classList.add('is-open');
    backdrop.classList.remove('hidden');
    backdrop.classList.add('show');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('show');
    backdrop.classList.add('hidden');
  }

  openBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);

  layersList?.addEventListener('click', (e) => {
    if (window.innerWidth <= 860 && e.target.closest('.route-item')) {
      closeSidebar();
    }
  });
}

function renderApp() {
  renderMap();
  updateStats();
  renderLayersList();
}

document.addEventListener('DOMContentLoaded', async () => {
  STATE.geojsonFiles = CONFIG.GEOJSON_FILES;
  initMap();
  await loadAllData();
  renderApp();
  setupUI(renderApp);
  setupMobileLayersToggle();
});

