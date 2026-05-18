import { useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { PreviewAcabamentosInterativo } from '../preview/PreviewAcabamentosInterativo';
import { useSharedHeight } from '../../hooks/useSharedHeight';
import { STORAGE_KEYS, CONFIG_CHAPA_PADRAO } from '../../constants/config';
import { calcularCustosPeca } from '../../utils/calculations';
import { calcularFixacaoPeca, calcularColagemPeca } from '../../utils/maoDeObra';
import { recalcularPersonalizados } from '../../utils/preview/acabamentosGeometry';
import { formatBRL } from '../../utils/formatters';
import { SearchIcon } from '../../constants/icons';

// Combobox de materiais (mesmo padrão usado no AmbienteCard, duplicado aqui pra encapsular).
function MaterialCombobox({ materiais, value, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const selecionado = materiais.find(m => String(m.id) === String(value));

  useEffect(() => {
    if (!aberto) return;
    const handler = (e) => {
      if (!e.target.closest('[data-material-combobox]')) {
        setAberto(false);
        setBusca('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto]);

  const filtrados = [...materiais]
    .filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const selecionar = (mat) => {
    onChange(mat.id);
    setAberto(false);
    setBusca('');
  };

  return (
    <div data-material-combobox className="relative">
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-full flex items-center justify-between border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white hover:border-slate-400 transition-colors text-left"
        >
          <span className={selecionado ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>
            {selecionado ? selecionado.nome : 'Selecione um material'}
          </span>
          <SearchIcon size={14} className="text-slate-400 shrink-0 ml-2" />
        </button>
      ) : (
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar material..."
            className="w-full border border-slate-400 rounded-md pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setAberto(false); setBusca(''); }
              if (e.key === 'Enter' && filtrados.length > 0) selecionar(filtrados[0]);
            }}
          />
          <SearchIcon size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      {aberto && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtrados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">
              {busca ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
            </li>
          ) : (
            filtrados.map(mat => {
              const ativo = String(mat.id) === String(value);
              return (
                <li key={mat.id}>
                  <button
                    type="button"
                    onClick={() => selecionar(mat)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      ativo ? 'bg-slate-100 font-semibold text-slate-800' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {mat.nome}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Portal de edição de peça — reutilizado pra criar nova peça (no AmbienteCard) ou
 * editar uma peça existente (no SistemaOrcamentoMarmore).
 *
 * Props:
 *  - peca: estado controlado da peça em edição
 *  - onChangePeca: setter da peça
 *  - materiais: lista pra o combobox
 *  - materialConfigs: configs por material (do orçamento)
 *  - precos: preços do orçamento
 *  - ambienteNome: opcional, mostrado no resumo de custos (header não)
 *  - renderFooterAcoes: função ({ custos, peca }) => JSX dos botões finais
 */
export function EditorDePecaPortal({
  peca,
  onChangePeca,
  materiais,
  materialConfigs,
  precos,
  renderFooterAcoes,
}) {
  // Mede sidebar e header em tempo real pra posicionar o portal sem cobrir
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof document === 'undefined') return 0;
    const el = document.querySelector('[data-app-sidebar]');
    const visivel = el && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    return visivel ? el.getBoundingClientRect().right : 0;
  });
  const [headerHeight, setHeaderHeight] = useState(() => {
    if (typeof document === 'undefined') return 0;
    const hd = document.querySelector('[data-app-header]');
    if (hd && hd.offsetParent !== null) return hd.getBoundingClientRect().bottom;
    const mhd = document.querySelector('[data-app-mobile-header]');
    if (mhd && mhd.offsetParent !== null) return mhd.getBoundingClientRect().bottom;
    return 0;
  });

  useEffect(() => {
    const update = () => {
      const sb = document.querySelector('[data-app-sidebar]');
      const visivel = sb && window.matchMedia('(min-width: 768px)').matches;
      setSidebarWidth(visivel ? sb.getBoundingClientRect().right : 0);
      const hd = document.querySelector('[data-app-header]');
      if (hd && hd.offsetParent !== null) {
        setHeaderHeight(hd.getBoundingClientRect().bottom);
      } else {
        const mhd = document.querySelector('[data-app-mobile-header]');
        setHeaderHeight(mhd && mhd.offsetParent !== null ? mhd.getBoundingClientRect().bottom : 0);
      }
    };
    update();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      const sb = document.querySelector('[data-app-sidebar]');
      const hd = document.querySelector('[data-app-header]');
      if (sb) ro.observe(sb);
      if (hd) ro.observe(hd);
    }
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Esconde o conteúdo da página atrás do portal
  useEffect(() => {
    const el = document.querySelector('[data-app-content]');
    if (!el) return;
    const prevVis = el.style.visibility;
    el.style.visibility = 'hidden';
    return () => { el.style.visibility = prevVis; };
  }, []);

  // Esconde o sub-header (display:none) pro portal cobrir o topo. useLayoutEffect:
  // roda antes do paint, evita flash do portal aparecendo com sub-header visível.
  useLayoutEffect(() => {
    const hd = document.querySelector('[data-app-header]');
    if (!hd) return;
    const prevDisp = hd.style.display;
    hd.style.display = 'none';
    const mhd = document.querySelector('[data-app-mobile-header]');
    if (mhd && mhd.offsetParent !== null) {
      setHeaderHeight(mhd.getBoundingClientRect().bottom);
    } else {
      setHeaderHeight(0);
    }
    return () => { hd.style.display = prevDisp; };
  }, []);

  // Altura do canvas configurável (compartilhada entre todos os ambientes)
  const [previewHeight, setPreviewHeight] = useSharedHeight(STORAGE_KEYS.PREVIEW_HEIGHT, 340);
  // (height usado só se modo responsivo for false — atualmente sempre responsivo dentro do portal)
  void previewHeight; void setPreviewHeight;

  // Cálculo de custos em tempo real
  const custosPeca = (() => {
    const alt = parseFloat(peca.altura) || 0;
    const larg = parseFloat(peca.largura) || 0;
    if (!alt || !larg || !peca.materialId) return null;
    const cfgMat = materialConfigs?.[peca.materialId] || CONFIG_CHAPA_PADRAO;
    const pecaNum = { ...peca, altura: alt, largura: larg };
    const c = calcularCustosPeca(pecaNum, cfgMat, precos);
    const fixacao = calcularFixacaoPeca(pecaNum, precos);
    const colagem = calcularColagemPeca(pecaNum, precos);
    const qtd = parseInt(peca.quantidade) || 1;
    const maoDeObraUnit = fixacao.total + colagem.total;
    const totalUnitario = c.total + maoDeObraUnit;
    return {
      ...c,
      maoDeObra: maoDeObraUnit,
      maoDeObraFixacao: fixacao.total,
      maoDeObraColagem: colagem.total,
      maoDeObraDetalhes: fixacao,
      maoDeObraColagemDetalhes: colagem,
      quantidade: qtd,
      totalGeral: totalUnitario * qtd,
    };
  })();

  return createPortal(
    <div
      className="fixed right-0 bottom-0 z-30 bg-slate-100 md:border-l md:border-slate-300 shadow-xl flex flex-col overflow-y-auto md:overflow-y-hidden"
      style={{ left: sidebarWidth, top: headerHeight }}
    >
      {/* === Canvas interativo ===
          Mobile: altura mínima de ~50vh pra ser bem visível, e o resto do conteúdo
                  flui abaixo (página inteira tem scroll vertical).
          Desktop (md+): preenche o espaço disponível com flex-1. */}
      <div className="min-h-[50vh] md:min-h-0 md:flex-1 flex flex-col shrink-0 md:shrink">
        <PreviewAcabamentosInterativo
          peca={peca}
          precos={precos}
          onChange={onChangePeca}
        />
      </div>

      {/* === Form inputs === */}
      <div
        className="px-2 py-1.5 sm:px-5 sm:py-3 bg-slate-50 border-t border-slate-200 shrink-0"
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end">
          <div className="col-span-12 md:col-span-3">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Nome da peça <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="opcoes-nome-peca-editor"
              value={peca.nome || ''}
              onChange={(e) => onChangePeca({ ...peca, nome: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="Ex: Tampo"
            />
            <datalist id="opcoes-nome-peca-editor">
              <option value="Tampo" />
              <option value="Base" />
              <option value="Lateral" />
              <option value="Pé" />
              <option value="Fundo" />
              <option value="Frontão" />
              <option value="Saia" />
              <option value="Rodapé" />
              <option value="Soleira" />
            </datalist>
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Altura (mm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={peca.altura ?? ''}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || (Number.isFinite(parseFloat(v)) && parseFloat(v) >= 0)) {
                  // Recalcula metros lineares dos acabamentos: ao mudar dimensão,
                  // a extensão (proporção) é preservada, mas o valor em metros varia.
                  const nova = { ...peca, altura: v };
                  onChangePeca({ ...nova, acabamentosPersonalizados: recalcularPersonalizados(nova) });
                }
              }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Largura (mm)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={peca.largura ?? ''}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || (Number.isFinite(parseFloat(v)) && parseFloat(v) >= 0)) {
                  const nova = { ...peca, largura: v };
                  onChangePeca({ ...nova, acabamentosPersonalizados: recalcularPersonalizados(nova) });
                }
              }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>
          <div className="col-span-4 md:col-span-1">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Qtd
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={peca.quantidade ?? 1}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
              onChange={(e) => {
                const n = parseInt(e.target.value);
                onChangePeca({ ...peca, quantidade: Number.isFinite(n) && n > 0 ? n : 1 });
              }}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
              Material
            </label>
            <MaterialCombobox
              materiais={materiais}
              value={peca.materialId}
              onChange={(id) => onChangePeca({ ...peca, materialId: id })}
            />
          </div>
        </div>

        {/* Toggles de mão de obra — fixação (com grapas) e colagem (área × R$/m²) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={peca.cobrarFixacao === true}
                onChange={(e) => onChangePeca({ ...peca, cobrarFixacao: e.target.checked })}
                className="w-4 h-4 accent-slate-700 cursor-pointer mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">
                  Cobrar mão de obra de fixação
                </span>
                <span className="block text-[11px] text-slate-500">
                  Lavatórios, bancadas com mãos-francesas. Calcula grapas (1 a cada 60cm) e P.U. (1 a cada 2 grapas).
                </span>
              </div>
            </label>
          </div>

          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={peca.cobrarColagem === true}
                onChange={(e) => onChangePeca({ ...peca, cobrarColagem: e.target.checked })}
                className="w-4 h-4 accent-slate-700 cursor-pointer mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">
                  Cobrar mão de obra de colagem
                </span>
                <span className="block text-[11px] text-slate-500">
                  Frontões grandes colados na parede. Cobra área (m²) × valor de montagem por m².
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* === Outros — itens livres com descrição e valor === */}
      <div className="px-3 py-2 sm:px-5 sm:py-2.5 bg-slate-50 border-t border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500">Outros</p>
          <button
            type="button"
            onClick={() => onChangePeca({
              ...peca,
              adicionais: [...(peca.adicionais || []), { id: Date.now() + Math.random(), descricao: '', valor: '' }],
            })}
            className="text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-300 rounded px-2 py-0.5 transition-colors"
          >
            + Adicionar
          </button>
        </div>
        {(peca.adicionais || []).length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhum item adicional</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(peca.adicionais || []).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.descricao}
                  onChange={(e) => {
                    const copia = [...peca.adicionais];
                    copia[idx] = { ...item, descricao: e.target.value };
                    onChangePeca({ ...peca, adicionais: copia });
                  }}
                  placeholder="Descrição (ex: Frete, Mão de obra...)"
                  className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1 text-sm bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
                <div className="relative shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.valor}
                    onChange={(e) => {
                      const copia = [...peca.adicionais];
                      copia[idx] = { ...item, valor: e.target.value };
                      onChangePeca({ ...peca, adicionais: copia });
                    }}
                    placeholder="0,00"
                    className="w-24 sm:w-28 border border-slate-300 rounded pl-7 pr-2 py-1 text-sm bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChangePeca({
                    ...peca,
                    adicionais: peca.adicionais.filter(i => i.id !== item.id),
                  })}
                  className="shrink-0 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remover"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Footer combinado: resumo de custos + ações (callback do consumidor) === */}
      <div className="bg-slate-50 border-t border-slate-200">
        {custosPeca ? (
          <div className="flex flex-col lg:flex-row lg:items-stretch lg:divide-x divide-y lg:divide-y-0 divide-slate-200">
            {/* Mini-cards de subtotais */}
            {(() => {
              const partesMaoObra = [];
              if (custosPeca.maoDeObraFixacao > 0) {
                partesMaoObra.push(`Fixação: ${custosPeca.maoDeObraDetalhes.qtdGrapas} grapas · ${custosPeca.maoDeObraDetalhes.qtdPus} P.U.`);
              }
              if (custosPeca.maoDeObraColagem > 0) {
                partesMaoObra.push(`Colagem: ${custosPeca.maoDeObraColagemDetalhes.areaM2.toFixed(2)}m²`);
              }
              const cards = [
                { label: 'Área',        valor: `${custosPeca.area.toFixed(2)} m²` },
                { label: 'Material',    valor: formatBRL(custosPeca.custoMaterial) },
                { label: 'Acabamentos', valor: formatBRL(custosPeca.acabamentos) },
                { label: 'Recortes',    valor: formatBRL(custosPeca.recortes) },
                ...(custosPeca.adicionais > 0 ? [{ label: 'Outros', valor: formatBRL(custosPeca.adicionais) }] : []),
                {
                  label: 'Mão de Obra',
                  valor: formatBRL(custosPeca.maoDeObra),
                  hint: partesMaoObra.length > 0 ? partesMaoObra.join(' · ') : 'Nenhuma cobrança marcada',
                },
              ];
              const colsClass = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6'][cards.length] || 'grid-cols-6';
              return (
                <div className={`grid ${colsClass} gap-0 flex-1 divide-x divide-slate-200`}>
                  {cards.map((c) => (
                    <div
                      key={c.label}
                      className="px-1.5 py-1.5 sm:px-4 sm:py-3 flex flex-col items-center justify-center text-center"
                      title={c.hint || undefined}
                    >
                      <span className="text-[10px] sm:text-sm uppercase tracking-wide font-semibold text-slate-500 leading-tight">{c.label}</span>
                      <span className="text-sm sm:text-lg font-semibold text-slate-800 mt-0.5 sm:mt-1 leading-tight">{c.valor}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Total destacado */}
            <div className="px-3 py-1.5 sm:px-4 sm:py-3 flex flex-col items-center justify-center text-center bg-slate-100 lg:min-w-[220px]">
              <span className="text-[10px] sm:text-sm uppercase tracking-wide font-semibold text-slate-500 leading-tight">
                Total {custosPeca.quantidade > 1 && (
                  <span className="text-slate-400 normal-case tracking-normal">({custosPeca.quantidade}×)</span>
                )}
              </span>
              <span className="text-lg sm:text-2xl font-bold text-green-700 mt-0.5 leading-tight">{formatBRL(custosPeca.totalGeral)}</span>
            </div>

            {/* Ações */}
            <div className="px-2 py-1.5 sm:px-4 sm:py-2.5 flex flex-col-reverse sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-slate-50">
              {renderFooterAcoes({ custosPeca, peca, valido: true })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 sm:px-5 sm:py-2.5">
            <p className="text-xs text-slate-500 italic text-center sm:text-left">
              Preencha altura, largura e material para calcular o custo
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
              {renderFooterAcoes({ custosPeca: null, peca, valido: false })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
