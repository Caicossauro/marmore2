import { useEffect, useState, useRef } from 'react';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

const cache = new Map();
const chaveCache = (a, b) => `${a.lat.toFixed(4)},${a.lng.toFixed(4)}|${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;

const geocodificar = async (endereco, signal) => {
  const url = `${NOMINATIM}?q=${encodeURIComponent(endereco)}&format=json&limit=1&countrycodes=br&accept-language=pt-BR`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('Falha ao buscar endereço.');
  const dados = await r.json();
  if (!dados?.length) throw new Error(`Endereço não encontrado: "${endereco}"`);
  return { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) };
};

const rotear = async (origem, destino, signal) => {
  const url = `${OSRM}/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('Falha ao calcular rota.');
  const dados = await r.json();
  if (dados.code !== 'Ok' || !dados.routes?.length) throw new Error('Rota não encontrada.');
  return {
    distanciaMetros: dados.routes[0].distance,
    duracaoSegundos: dados.routes[0].duration,
    geometria: dados.routes[0].geometry,
  };
};

/**
 * Calcula a rota entre dois pontos. Aceita coords já resolvidas (do autocomplete)
 * ou faz geocode dos endereços livres como fallback.
 *
 * @param {object} saida - { endereco, coords?: {lat,lng} }
 * @param {object} chegada - { endereco, coords?: {lat,lng} }
 */
export function useDistanciaRota(saida, chegada) {
  const [estado, setEstado] = useState({
    km: null, duracaoSegundos: null,
    coordsSaida: null, coordsChegada: null, geometria: null,
    loading: false, erro: null,
  });
  const abortRef = useRef(null);

  const saidaEnd = (saida?.endereco || '').trim();
  const chegadaEnd = (chegada?.endereco || '').trim();

  // Identidade estável das coords (evita re-rodar quando o objeto é recriado mas valores são iguais)
  const sLat = saida?.coords?.lat ?? null;
  const sLng = saida?.coords?.lng ?? null;
  const cLat = chegada?.coords?.lat ?? null;
  const cLng = chegada?.coords?.lng ?? null;

  useEffect(() => {
    // Se nem coords nem endereços disponíveis, zera.
    const temAmbasCoords = sLat != null && sLng != null && cLat != null && cLng != null;
    const temAmbosEnderecos = saidaEnd.length >= 5 && chegadaEnd.length >= 5;
    if (!temAmbasCoords && !temAmbosEnderecos) {
      setEstado({ km: null, duracaoSegundos: null, coordsSaida: null, coordsChegada: null, geometria: null, loading: false, erro: null });
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const executar = async () => {
      setEstado(prev => ({ ...prev, loading: true, erro: null }));
      try {
        const temCoordsSaida = sLat != null && sLng != null;
        const temCoordsChegada = cLat != null && cLng != null;

        const cS = temCoordsSaida
          ? { lat: sLat, lng: sLng }
          : await geocodificar(saidaEnd, ctrl.signal);

        // Pausa de cortesia entre as 2 chamadas ao Nominatim (1 req/s).
        if (!temCoordsSaida && !temCoordsChegada) {
          await new Promise(res => setTimeout(res, 1100));
          if (ctrl.signal.aborted) return;
        }

        const cC = temCoordsChegada
          ? { lat: cLat, lng: cLng }
          : await geocodificar(chegadaEnd, ctrl.signal);

        const chave = chaveCache(cS, cC);
        if (cache.has(chave)) {
          setEstado({ ...cache.get(chave), loading: false, erro: null });
          return;
        }

        const rota = await rotear(cS, cC, ctrl.signal);
        if (ctrl.signal.aborted) return;

        const resultado = {
          km: rota.distanciaMetros / 1000,
          duracaoSegundos: rota.duracaoSegundos,
          coordsSaida: cS,
          coordsChegada: cC,
          geometria: rota.geometria,
        };
        cache.set(chave, resultado);
        setEstado({ ...resultado, loading: false, erro: null });
      } catch (e) {
        if (e.name === 'AbortError' || ctrl.signal.aborted) return;
        setEstado({
          km: null, duracaoSegundos: null, coordsSaida: null, coordsChegada: null, geometria: null,
          loading: false, erro: e.message || 'Erro ao calcular rota.',
        });
      }
    };

    // Coords prontas → executa imediato. Endereços livres → debounce mais longo.
    const delay = temAmbasCoords ? 0 : 700;
    const timer = setTimeout(executar, delay);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [sLat, sLng, cLat, cLng, saidaEnd, chegadaEnd]);

  return estado;
}
