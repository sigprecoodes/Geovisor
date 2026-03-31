import { buildEditorUrl } from './api.js';

export function abrirEditor({ microrruta, cuadrilla, lote }) {
  const url = buildEditorUrl({ microrruta, cuadrilla, lote });
  window.open(url, '_blank', 'noopener,noreferrer');
}
