import { useMemo, useState } from 'react';
import { formatBRL } from '../../utils/formatters';
import { calcularOrcamentoComDetalhes } from '../../utils/calculations';
import { ChevronDownIcon } from '../../constants/icons';
import { Button } from '../ui/Button';

export const ResumoOrcamento = ({ orcamentoAtual, materiais, precos, onSalvar }) => {
  const orcamento = useMemo(
    () => calcularOrcamentoComDetalhes(orcamentoAtual, materiais, precos),
    [orcamentoAtual, materiais, precos]
  );

  const [chapasExpandido, setChapasExpandido] = useState(false);
  const [expandido, setExpandido] = useState(true);

  return (
    <div
      className="bg-white border-2 rounded-lg shadow-md hover:shadow-lg transition-all"
      style={{ borderColor: '#cbd5e1', borderLeft: '6px solid #475569' }}
    >
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className={`w-full text-left p-3 sm:p-4 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors ${
          expandido ? 'border-b border-slate-200' : ''
        }`}
      >
        <h3 className="text-base font-semibold text-slate-800">Resumo do Orçamento</h3>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base font-bold text-green-700">{formatBRL(orcamento.vendaTotal || 0)}</span>
          <ChevronDownIcon
            size={16}
            className={`text-slate-500 transition-transform duration-300 ${expandido ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expandido ? '5000px' : '0',
          opacity: expandido ? 1 : 0,
        }}
      >
        <div className="p-3 sm:p-4 bg-white">

      {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
        <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setChapasExpandido((v) => !v)}
            className="w-full flex justify-between items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <span className="font-semibold text-base text-slate-700">
              Chapas ({orcamento.detalhesChapas.length})
            </span>
            <span
              className={`text-slate-500 transition-transform duration-200 ${chapasExpandido ? 'rotate-180' : ''}`}
            >
              ▼
            </span>
          </button>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: chapasExpandido ? '2000px' : '0',
              opacity: chapasExpandido ? 1 : 0,
            }}
          >
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {orcamento.detalhesChapas.map((detalhe, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-slate-800">
                    Chapa {idx + 1} - {detalhe.materialNome}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    detalhe.percentualAproveitamento >= 70 ? 'bg-green-100 text-green-700' :
                    detalhe.percentualAproveitamento >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {detalhe.percentualAproveitamento.toFixed(1)}% aproveitamento
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500">Peças</div>
                    <div className="font-bold text-base text-slate-800">{detalhe.numPecas || 0}</div>
                  </div>
                  <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500">Área Total</div>
                    <div className="font-bold text-sm text-slate-800">{detalhe.areaTotal.toFixed(2)}m²</div>
                  </div>
                  <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500">Área Peças</div>
                    <div className="font-bold text-sm text-slate-800">{detalhe.areaPecas.toFixed(2)}m²</div>
                  </div>
                  <div className="bg-gray-100 rounded p-2 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500">Perda</div>
                    <div className="font-bold text-sm text-slate-800">{detalhe.areaSobra.toFixed(2)}m²</div>
                    <div className="text-xs text-slate-600 mt-1">{formatBRL(detalhe.custoSobra || 0)}</div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(orcamento.acabamentos > 0 || orcamento.recortes > 0 || (orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0)) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {orcamento.acabamentos > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
              <h4 className="font-semibold text-slate-700 mb-3">Acabamentos</h4>
              <div className="space-y-2 flex-1">
                {(() => {
                  const acabamentosPorTipo = {};
                  if (orcamento.detalhesAcabamentos && orcamento.detalhesAcabamentos.length > 0) {
                    orcamento.detalhesAcabamentos.forEach(detalhe => {
                      const tipo = detalhe.tipo;
                      if (!acabamentosPorTipo[tipo]) acabamentosPorTipo[tipo] = 0;
                      acabamentosPorTipo[tipo] += detalhe.valor;
                    });
                  }
                  return Object.keys(acabamentosPorTipo)
                    .filter(tipo => acabamentosPorTipo[tipo] > 0)
                    .map((tipo, idx, arr) => (
                      <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                        <span className="text-slate-600 font-medium">{tipo}</span>
                        <span className="text-slate-700 font-semibold">{formatBRL(acabamentosPorTipo[tipo])}</span>
                      </div>
                    ));
                })()}
              </div>
              <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                <span className="text-slate-700 font-bold">Total</span>
                <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.acabamentos)}</span>
              </div>
            </div>
          )}
          {orcamento.recortes > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
              <h4 className="font-semibold text-slate-700 mb-3">Recortes</h4>
              <div className="space-y-2 flex-1">
                {(() => {
                  const recortesPorTipo = {};
                  if (orcamento.detalhesRecortes && orcamento.detalhesRecortes.length > 0) {
                    orcamento.detalhesRecortes.forEach(detalhe => {
                      const tipo = detalhe.tipo;
                      if (!recortesPorTipo[tipo]) recortesPorTipo[tipo] = 0;
                      recortesPorTipo[tipo] += detalhe.valor;
                    });
                  }
                  return Object.keys(recortesPorTipo)
                    .filter(tipo => recortesPorTipo[tipo] > 0)
                    .map((tipo, idx, arr) => (
                      <div key={tipo} className={`flex justify-between items-center text-sm ${idx < arr.length - 1 ? 'pb-2 border-b border-slate-300' : ''}`}>
                        <span className="text-slate-600 font-medium">{tipo}</span>
                        <span className="text-slate-700 font-semibold">{formatBRL(recortesPorTipo[tipo])}</span>
                      </div>
                    ));
                })()}
              </div>
              <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                <span className="text-slate-700 font-bold">Total</span>
                <span className="text-slate-800 font-bold text-base">{formatBRL(orcamento.recortes)}</span>
              </div>
            </div>
          )}
          {orcamento.detalhesChapas && orcamento.detalhesChapas.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
              <h4 className="font-semibold text-slate-700 mb-3">Resumo de Metragem</h4>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                  <span className="text-slate-600 font-medium">Peças Cobradas</span>
                  <div className="text-right">
                    <span className="text-slate-700 font-semibold">
                      {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0).toFixed(2)}m²
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.vendaPecas, 0))})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-300">
                  <span className="text-slate-600 font-medium">Perda Cobrada</span>
                  <div className="text-right">
                    <span className="text-slate-700 font-semibold">
                      {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaSobra, 0).toFixed(2)}m²
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({formatBRL(orcamento.detalhesChapas.reduce((sum, d) => sum + d.custoSobra, 0))} preço custo)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 mt-auto border-t-2 border-slate-400">
                <span className="text-slate-700 font-bold">Total Geral</span>
                <div className="text-right">
                  <span className="text-slate-800 font-bold text-base">
                    {orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0).toFixed(2)}m²
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    ({((orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaPecas, 0) / orcamento.detalhesChapas.reduce((sum, d) => sum + d.areaTotal, 0)) * 100).toFixed(1)}% aproveitamento)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
          <span className="text-base font-medium text-slate-600">Material (peças)</span>
          <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.vendaPecas || 0)}</span>
        </div>
        {orcamento.acabamentos > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Acabamentos</span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.acabamentos)}</span>
          </div>
        )}
        {orcamento.recortes > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Recortes</span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.recortes)}</span>
          </div>
        )}
        {orcamento.custoSobra && orcamento.custoSobra > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">Perda</span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.custoSobra)}</span>
          </div>
        )}
        {orcamento.deslocamento && orcamento.deslocamento.total > 0 && (
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
            <span className="text-base font-medium text-slate-600">
              Deslocamento
              <span className="text-xs text-slate-400 ml-2">
                ({orcamento.deslocamento.kmIdaEVolta.toFixed(0)} km · {orcamento.deslocamento.funcionarios} pessoas · {orcamento.deslocamento.diasEntrega} dias)
              </span>
            </span>
            <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.deslocamento.total)}</span>
          </div>
        )}
        {orcamento.maoDeObra && orcamento.maoDeObra.total > 0 && (() => {
          const partes = [];
          if (orcamento.maoDeObra.fixacao > 0) partes.push(`fixação ${formatBRL(orcamento.maoDeObra.fixacao)}`);
          if (orcamento.maoDeObra.colagem > 0) partes.push(`colagem ${formatBRL(orcamento.maoDeObra.colagem)}`);
          if (orcamento.maoDeObra.montagem > 0) partes.push(`montagem ${formatBRL(orcamento.maoDeObra.montagem)}`);
          return (
            <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-lg border border-slate-200">
              <span className="text-base font-medium text-slate-600">
                Mão de Obra
                <span className="text-xs text-slate-400 ml-2">({partes.join(' · ')})</span>
              </span>
              <span className="text-base font-semibold text-slate-700">{formatBRL(orcamento.maoDeObra.total)}</span>
            </div>
          );
        })()}
      </div>

      <div className="mt-4 space-y-3">
        <div className="marble-btn-dark-green flex justify-between py-4 px-4 rounded-lg">
          <span className="relative z-10 text-xl font-bold text-white uppercase">Valor de Venda</span>
          <span className="relative z-10 text-xl font-bold text-white">{formatBRL(orcamento.vendaTotal)}</span>
        </div>
      </div>

      {onSalvar && (
        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="lg" onClick={onSalvar}>
            Salvar Orçamento
          </Button>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
