import { useEffect, useRef, useState } from 'react';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 350;
const MIN_CARS = 3;
const MAX_SUGESTOES = 6;

/**
 * Input com autocomplete de endereços brasileiros via Nominatim/OpenStreetMap.
 *
 * Props:
 *  - valor: texto exibido no input
 *  - coords: { lat, lng } | null — usado só para indicação visual ("📍 fixado")
 *  - onChange(texto, coords): coords=undefined preserva coords atual (livre edição),
 *                              coords={lat,lng} fixa nova localização (seleção),
 *                              coords=null limpa explicitamente.
 *  - label, placeholder
 */
export function InputEnderecoAutocomplete({ valor, coords, onChange, label, placeholder }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [indiceFocado, setIndiceFocado] = useState(-1);
  const wrapperRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const termo = (valor || '').trim();
    if (termo.length < MIN_CARS) {
      setSugestoes([]);
      setCarregando(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setCarregando(true);
      try {
        const url = `${NOMINATIM}?q=${encodeURIComponent(termo)}&format=json&limit=${MAX_SUGESTOES}&countrycodes=br&addressdetails=1&accept-language=pt-BR`;
        const r = await fetch(url, { signal: ctrl.signal });
        const dados = await r.json();
        if (ctrl.signal.aborted) return;
        setSugestoes(dados || []);
      } catch (e) {
        if (e.name !== 'AbortError') setSugestoes([]);
      } finally {
        if (!ctrl.signal.aborted) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [valor]);

  const selecionar = (s) => {
    onChange(s.display_name, { lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setAberto(false);
    setIndiceFocado(-1);
  };

  const onKeyDown = (e) => {
    if (!aberto || sugestoes.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceFocado(i => Math.min(i + 1, sugestoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceFocado(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && indiceFocado >= 0) {
      e.preventDefault();
      selecionar(sugestoes[indiceFocado]);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const formatarSugestao = (s) => {
    const a = s.address || {};
    const linha1 = a.road
      ? `${a.road}${a.house_number ? `, ${a.house_number}` : ''}`
      : (a.suburb || a.neighbourhood || a.village || a.city_district || a.town || a.city || a.municipality || s.name || '');
    const cidade = a.city || a.town || a.village || a.municipality || a.city_district || '';
    const estado = a.state || '';
    const linha2 = [cidade, estado].filter(Boolean).join(' · ');
    return { linha1: linha1 || s.display_name, linha2 };
  };

  const temCoordsFixadas = !!coords;
  const limpar = () => onChange('', null);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
          <span>{label}</span>
          {temCoordsFixadas && (
            <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
              📍 localização fixada
            </span>
          )}
        </label>
      )}
      <input
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={aberto && sugestoes.length > 0}
        value={valor || ''}
        onChange={(e) => {
          // Editar texto livre PRESERVA coords se já houver uma seleção fixada
          // (permite acrescentar nº da casa sem perder a rota).
          onChange(e.target.value, undefined);
          setAberto(true);
          setIndiceFocado(-1);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 [&::-webkit-search-cancel-button]:hidden ${
          temCoordsFixadas ? 'border-green-300 bg-green-50/30 pr-9' : 'border-slate-300'
        }`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
      />
      {temCoordsFixadas && (
        <button
          type="button"
          onClick={limpar}
          className="absolute right-2 top-[34px] text-slate-400 hover:text-slate-700 text-xs px-1"
          title="Limpar endereço e localização"
        >
          ✕
        </button>
      )}
      {carregando && !temCoordsFixadas && (
        <div className="absolute right-3 top-9 text-xs text-slate-400 pointer-events-none">…</div>
      )}

      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-[1100] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {sugestoes.map((s, idx) => {
            const f = formatarSugestao(s);
            const ativo = idx === indiceFocado;
            return (
              <li key={s.place_id}>
                <button
                  type="button"
                  onMouseEnter={() => setIndiceFocado(idx)}
                  onClick={() => selecionar(s)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    ativo ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-slate-800 font-medium truncate">{f.linha1}</div>
                  {f.linha2 && (
                    <div className="text-xs text-slate-500 truncate">{f.linha2}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
