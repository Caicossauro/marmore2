import { useState, useEffect, useLayoutEffect } from 'react';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.25;

export function usePreviewViewport(containerRef, svgRef, height) {
  const alturaResponsiva = height == null;
  const CANVAS_HEIGHT_PADRAO = 340;

  const [containerSize, setContainerSize] = useState({ w: 800, h: height ?? CANVAS_HEIGHT_PADRAO });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState(null);

  // Medição síncrona antes do paint — evita flash inicial com tamanho padrão
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setContainerSize({
        w: Math.max(200, rect.width),
        h: alturaResponsiva ? Math.max(180, rect.height) : height,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver: acompanha mudanças subsequentes (resize da janela, sidebar, etc.)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) {
        const w = Math.max(200, e.contentRect.width);
        const h = alturaResponsiva ? Math.max(180, e.contentRect.height) : height;
        setContainerSize({ w, h });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [height, alturaResponsiva, containerRef]);

  // Pan: drag do fundo para mover a vista
  useEffect(() => {
    if (!panDrag) return;
    const onMove = (evt) => {
      const dx = (evt.clientX - panDrag.startClientX) / zoom;
      const dy = (evt.clientY - panDrag.startClientY) / zoom;
      setPan({ x: panDrag.startPan.x - dx, y: panDrag.startPan.y - dy });
    };
    const onUp = () => setPanDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panDrag, zoom]);

  // Handler de wheel com passive:false (onWheel do React é passive por padrão)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (evt) => {
      evt.preventDefault();
      const factor = evt.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)));
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [svgRef]);

  const aplicarZoom = (novoZoom) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, novoZoom)));

  const vbW = containerSize.w / zoom;
  const vbH = containerSize.h / zoom;
  const vbX = (containerSize.w - vbW) / 2 + pan.x;
  const vbY = (containerSize.h - vbH) / 2 + pan.y;
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const iniciarPan = (evt, onClearSelection) => {
    setPanDrag({ startClientX: evt.clientX, startClientY: evt.clientY, startPan: pan });
    if (onClearSelection) onClearSelection();
  };

  return {
    containerSize,
    zoom,
    pan,
    panDrag,
    viewBox,
    iniciarPan,
    zoomControls: {
      in: () => aplicarZoom(zoom * ZOOM_STEP),
      out: () => aplicarZoom(zoom / ZOOM_STEP),
      reset: () => { setZoom(1); setPan({ x: 0, y: 0 }); },
      setZoom: aplicarZoom,
    },
  };
}
