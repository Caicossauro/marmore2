import { useState } from 'react';
import { EditorDePecaPortal } from './EditorDePecaPortal';
import { formatBRL } from '../../utils/formatters';
import { calcularCustosPeca } from '../../utils/calculations';
import { calcularFixacaoPeca, calcularColagemPeca } from '../../utils/maoDeObra';
import { Button } from '../ui/Button';
import { PreviewAcabamentos } from '../preview/PreviewAcabamentos';
import { temaDoAmbiente } from '../../constants/colors';
import { useSharedHeight } from '../../hooks/useSharedHeight';
import { STORAGE_KEYS } from '../../constants/config';
import { ChevronDownIcon } from '../../constants/icons';

const MATERIAL_CONFIG_PADRAO = {
  comprimento: 3000,
  altura: 2000,
  custo: 300,
  venda: 900
};

const ACABAMENTO_INICIAL = () => ({
  ativo: false,
  lados: { superior: false, inferior: false, esquerda: false, direita: false },
  extensoes: {},
});

const NOVA_PECA_VAZIA = (materialId = null) => ({
  nome: '',
  altura: '',
  largura: '',
  quantidade: 1,
  materialId,
  acabamentos: {
    esquadria: ACABAMENTO_INICIAL(),
    boleado: ACABAMENTO_INICIAL(),
    polimento: ACABAMENTO_INICIAL(),
    canal: ACABAMENTO_INICIAL(),
  },
  acabamentosPersonalizados: { esquadria: '', boleado: '', polimento: '', canal: '' },
  recortesPosicionados: [],
  adicionais: [],
  cuba: 0,
  cubaEsculpida: 0,
  cooktop: 0,
  recorte: 0,
  pes: 0
});

// Handle de resize vertical: arrastar pra mudar a altura do bloco acima dele.
function ResizeHandleAltura({ altura, setAltura, minAltura = 200, maxAltura = 1500, label = 'Arraste para ajustar a altura' }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startAltura = altura;
    const onMove = (ev) => {
      const dy = ev.clientY - startY;
      setAltura(Math.min(maxAltura, Math.max(minAltura, startAltura + dy)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-2.5 cursor-ns-resize flex items-center justify-center group select-none"
      title={label}
    >
      <div className="w-12 h-1 rounded-full bg-slate-300 group-hover:bg-slate-500 transition-colors" />
    </div>
  );
}

export const AmbienteCard = ({
  ambiente, indice = 0, materiais, materialConfigs, precos, perda = 0,
  onAdicionarPeca, onExcluirAmbiente, onRenomearAmbiente,
  onVisualizarPeca, onPedirConfirmacaoExclusao,
  // Controle externo do form de "Nova Peça" — apenas 1 ambiente edita por vez,
  // pra que o preview global (renderizado em portal) não duplique.
  formAberto = false, onAbrirForm, onFecharForm,
}) => {
  const [expandido, setExpandido] = useState(false);
  const mostrarForm = formAberto;
  const setMostrarForm = (valor) => {
    if (valor) onAbrirForm?.();
    else onFecharForm?.();
  };
  const [novaPeca, setNovaPeca] = useState(NOVA_PECA_VAZIA(materiais[0]?.id || null));
  const [blocoHeight, setBlocoHeight] = useSharedHeight(STORAGE_KEYS.BLOCO_AMBIENTE_HEIGHT, 800);

  // Valida nome, dimensões positivas e material. Retorna a peça pronta ou null se inválida.
  const validarNovaPeca = () => {
    const alt = parseFloat(novaPeca.altura);
    const larg = parseFloat(novaPeca.largura);
    const qtd = parseInt(novaPeca.quantidade) || 1;
    if (!novaPeca.nome || !novaPeca.materialId) {
      alert('Preencha o nome e selecione um material.');
      return null;
    }
    if (!Number.isFinite(alt) || alt <= 0 || !Number.isFinite(larg) || larg <= 0) {
      alert('Altura e largura precisam ser números maiores que zero.');
      return null;
    }
    if (qtd <= 0) {
      alert('Quantidade precisa ser maior que zero.');
      return null;
    }
    return { ...novaPeca, altura: alt, largura: larg, quantidade: qtd };
  };

  // Salva a peça em edição e fecha o form
  const salvarNovaPeca = () => {
    const pecaValida = validarNovaPeca();
    if (!pecaValida) return;
    onAdicionarPeca(pecaValida);
    setNovaPeca(NOVA_PECA_VAZIA(novaPeca.materialId));
    setMostrarForm(false);
  };

  // Salva e mantém o form aberto pra adicionar a próxima peça
  // (limpa campos mas preserva o material — quem tá fazendo orçamento normalmente
  // adiciona várias peças do mesmo material em sequência)
  const salvarEContinuar = () => {
    const pecaValida = validarNovaPeca();
    if (!pecaValida) return;
    onAdicionarPeca(pecaValida);
    setNovaPeca(NOVA_PECA_VAZIA(novaPeca.materialId));
    // form fica aberto
  };

  const cancelarNovaPeca = () => {
    setNovaPeca(NOVA_PECA_VAZIA(materiais[0]?.id || null));
    setMostrarForm(false);
  };


  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditando, setNomeEditando] = useState(ambiente.nome);
  const tema = temaDoAmbiente(indice);

  const subtotais = ambiente.pecas.reduce((acc, peca) => {
    const materialConfig = materialConfigs[peca.materialId] || MATERIAL_CONFIG_PADRAO;
    const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
    const fixacao = calcularFixacaoPeca(peca, precos);
    const colagem = calcularColagemPeca(peca, precos);
    const qtd = Number(peca.quantidade) || 1;
    return {
      material: acc.material + custosPeca.custoMaterial,
      acabamentos: acc.acabamentos + custosPeca.acabamentos,
      recortes: acc.recortes + custosPeca.recortes,
      total: acc.total + custosPeca.total,
      area: acc.area + ((peca.altura * peca.largura) / 1000000) * (peca.quantidade || 1),
      maoDeObra: acc.maoDeObra + (fixacao.total + colagem.total) * qtd,
    };
  }, { material: 0, acabamentos: 0, recortes: 0, total: 0, area: 0, maoDeObra: 0 });

  return (
    <div
      className="bg-white border-2 rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden"
      style={{
        position: 'relative',
        zIndex: 1,
        borderColor: '#cbd5e1',
        borderLeft: `6px solid ${tema.base}`,
      }}
    >
      <div
        className={`p-3 sm:p-4 bg-white hover:bg-slate-50 cursor-pointer transition-colors ${
          expandido ? 'border-b border-slate-200' : ''
        }`}
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editandoNome ? (
              <input
                autoFocus
                value={nomeEditando}
                onChange={(e) => setNomeEditando(e.target.value)}
                onBlur={() => {
                  setEditandoNome(false);
                  if (nomeEditando.trim() && nomeEditando.trim() !== ambiente.nome) {
                    onRenomearAmbiente?.(nomeEditando.trim());
                  } else {
                    setNomeEditando(ambiente.nome);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') {
                    setNomeEditando(ambiente.nome);
                    setEditandoNome(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400 w-48"
              />
            ) : (
              <h3
                className="text-base font-semibold text-slate-800 cursor-text hover:text-slate-600 transition-colors"
                title="Clique para renomear"
                onClick={(e) => {
                  e.stopPropagation();
                  setNomeEditando(ambiente.nome);
                  setEditandoNome(true);
                }}
              >
                {ambiente.nome}
              </h3>
            )}
            {onExcluirAmbiente && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Tem certeza que deseja excluir o ambiente "${ambiente.nome}"?\n\nTodas as peças deste ambiente serão perdidas.`)) {
                    onExcluirAmbiente();
                  }
                }}
                title="Excluir ambiente"
                className="!text-slate-400 hover:!text-red-600 hover:!bg-red-50"
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500">{ambiente.pecas.length} peças • {subtotais.area.toFixed(2)}m²</span>
            <ChevronDownIcon
              size={16}
              className={`text-slate-500 transition-transform duration-300 ${expandido ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
        </div>

        {ambiente.pecas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {[
              { label: 'Material', valor: subtotais.material },
              { label: 'Acabamentos', valor: subtotais.acabamentos },
              { label: 'Recortes', valor: subtotais.recortes },
              { label: 'Perda', valor: perda },
              { label: 'Mão de Obra', valor: subtotais.maoDeObra },
              { label: 'Total', valor: subtotais.total + perda, destaque: true },
            ].map(({ label, valor, destaque }) => (
              <div
                key={label}
                className="rounded p-2 border border-slate-200 bg-slate-50"
              >
                <div className="text-xs text-slate-500 text-center">{label}</div>
                <div className={`text-center ${destaque ? 'text-sm font-bold text-slate-900' : 'text-sm font-semibold text-slate-700'}`}>
                  {formatBRL(valor)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: expandido ? '5000px' : '0',
          opacity: expandido ? 1 : 0
        }}
      >
        <div
          className="p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto"
          style={{ maxHeight: blocoHeight }}
        >
          {mostrarForm && (
            <EditorDePecaPortal
              peca={novaPeca}
              onChangePeca={setNovaPeca}
              materiais={materiais}
              materialConfigs={materialConfigs}
              precos={precos}
              renderFooterAcoes={({ valido }) => (
                <>
                  <Button variant="ghost" onClick={cancelarNovaPeca}>
                    Cancelar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={salvarNovaPeca}
                    disabled={!valido}
                    title="Adiciona a peça e fecha a edição"
                  >
                    <span className="sm:hidden">+ Fechar</span>
                    <span className="hidden sm:inline">Adicionar e fechar</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={salvarEContinuar}
                    disabled={!valido}
                    title="Adiciona a peça e mantém o form aberto pra próxima"
                  >
                    <span className="sm:hidden">+ Continuar</span>
                    <span className="hidden sm:inline">+ Adicionar e continuar</span>
                  </Button>
                </>
              )}
            />
          )}

          {!mostrarForm && (
            <button
              type="button"
              onClick={() => setMostrarForm(true)}
              className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-sm font-medium text-slate-600 hover:border-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              + Adicionar Peça
            </button>
          )}

          {[...ambiente.pecas].reverse().map(peca => {
            const material = materiais.find(m => m.id === peca.materialId);
            const materialConfig = materialConfigs[peca.materialId] || MATERIAL_CONFIG_PADRAO;
            const custosPeca = calcularCustosPeca(peca, materialConfig, precos);
            const fixacaoPeca = calcularFixacaoPeca(peca, precos);
            const colagemPeca = calcularColagemPeca(peca, precos);
            const qtdPeca = Number(peca.quantidade) || 1;
            const valorFixacaoTotal = fixacaoPeca.total * qtdPeca;
            const valorColagemTotal = colagemPeca.total * qtdPeca;
            const valorMaoDeObraTotal = valorFixacaoTotal + valorColagemTotal;
            const totalPecaComMaoDeObra = custosPeca.total + valorMaoDeObraTotal;
            return (
              <div key={peca.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all">
                <div className="flex gap-4">
                  <div
                    className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ width: '100px', height: '75px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualizarPeca && onVisualizarPeca(peca);
                    }}
                    title="Clique para ver detalhes"
                  >
                    <PreviewAcabamentos peca={peca} mostrarSempre={true} mini={true} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-base">{peca.nome || 'Sem nome'}</h4>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onVisualizarPeca && onVisualizarPeca(peca);
                          }}
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onPedirConfirmacaoExclusao) {
                              onPedirConfirmacaoExclusao(peca.id, peca.nome);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Excluir peça"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 mt-1">
                      <span><span className="font-medium text-slate-700">{peca.largura} x {peca.altura}</span> mm</span>
                      <span>{material?.nome}</span>
                      <span>Chapa #{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}</span>
                    </div>

                    {peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(peca.acabamentos).map(tipo => {
                          const acab = peca.acabamentos[tipo];
                          if (!acab.ativo) return null;
                          return (
                            <span key={tipo} className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-slate-500">Área: <span className="font-semibold text-slate-700">{custosPeca.area.toFixed(2)}m²</span></span>
                    <span className="text-slate-500">Material: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.custoMaterial)}</span></span>
                    {custosPeca.acabamentos > 0 && (
                      <span className="text-slate-500">Acabamentos: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.acabamentos)}</span></span>
                    )}
                    {custosPeca.recortes > 0 && (
                      <span className="text-slate-500">Recortes: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.recortes)}</span></span>
                    )}
                    {custosPeca.adicionais > 0 && (
                      <span className="text-slate-500">Outros: <span className="font-semibold text-slate-700">{formatBRL(custosPeca.adicionais)}</span></span>
                    )}
                    {valorMaoDeObraTotal > 0 && (() => {
                      const partes = [];
                      if (valorFixacaoTotal > 0) {
                        partes.push(`Fixação: ${fixacaoPeca.qtdGrapas} grapas, ${fixacaoPeca.qtdPus} P.U.`);
                      }
                      if (valorColagemTotal > 0) {
                        partes.push(`Colagem: ${colagemPeca.areaM2.toFixed(2)}m² × R$/m²`);
                      }
                      const tooltip = partes.join(' · ') + (qtdPeca > 1 ? ` × ${qtdPeca}` : '');
                      return (
                        <span className="text-slate-500" title={tooltip}>
                          Mão de Obra: <span className="font-semibold text-slate-700">{formatBRL(valorMaoDeObraTotal)}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Total da Peça:</span>
                    <span className="text-base font-bold text-green-700">{formatBRL(totalPecaComMaoDeObra)}</span>
                  </div>

                  {(custosPeca.detalhesAcabamentos.length > 0 || custosPeca.detalhesRecortes.length > 0 || (custosPeca.detalhesAdicionais && custosPeca.detalhesAdicionais.length > 0)) && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Ver detalhes dos custos
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-300">
                        {custosPeca.detalhesAcabamentos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Acabamentos:</p>
                            {custosPeca.detalhesAcabamentos.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo.charAt(0).toUpperCase() + detalhe.tipo.slice(1)} ({detalhe.metros}m)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {custosPeca.detalhesRecortes.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs font-semibold text-slate-700">Recortes:</p>
                            {custosPeca.detalhesRecortes.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.tipo} ({detalhe.quantidade}x)</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {custosPeca.detalhesAdicionais && custosPeca.detalhesAdicionais.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs font-semibold text-slate-700">Outros:</p>
                            {custosPeca.detalhesAdicionais.map((detalhe, idx) => (
                              <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                <span>• {detalhe.descricao}</span>
                                <span className="font-medium">{formatBRL(detalhe.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {expandido && (
          <ResizeHandleAltura
            altura={blocoHeight}
            setAltura={setBlocoHeight}
            minAltura={300}
            maxAltura={2000}
            label="Arraste para ajustar a altura do bloco"
          />
        )}
      </div>
    </div>
  );
};
