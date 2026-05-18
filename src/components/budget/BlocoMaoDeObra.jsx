import { useMemo, useState } from 'react';
import {
  calcularMaoDeObraOrcamento,
  calcularMontagemAmbiente,
  calcularFixacaoPeca,
  calcularColagemPeca,
} from '../../utils/maoDeObra';
import { formatBRL } from '../../utils/formatters';
import { ChevronDownIcon } from '../../constants/icons';

/**
 * Bloco de Mão de Obra do orçamento.
 *
 * Agrega as três modalidades, cada uma com master switch por ambiente:
 *  - Fixação: `ambiente.cobrarFixacao` (default ON) + `peca.cobrarFixacao` por peça
 *  - Colagem: `ambiente.cobrarColagem` (default ON) + `peca.cobrarColagem` por peça
 *  - Montagem: `ambiente.cobrarMontagem` (default OFF)
 *
 * Padrão: bloco começa fechado, exibindo apenas o total agregado.
 */
export function BlocoMaoDeObra({ orcamento, onAtualizarAmbiente, precos }) {
  const [expandido, setExpandido] = useState(false);

  const maoDeObra = useMemo(
    () => calcularMaoDeObraOrcamento(orcamento, precos),
    [orcamento, precos]
  );

  const ambientes = (orcamento?.ambientes || []).filter(amb => (amb.pecas || []).length > 0);
  const precoM2 = Number(precos?.maoDeObraMontagemPorM2) || 0;

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
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">Mão de Obra</h3>
          <span className="text-xs text-slate-500 truncate">
            {(() => {
              const partes = [];
              if (maoDeObra.fixacao > 0) partes.push(`Fixação ${formatBRL(maoDeObra.fixacao)}`);
              if (maoDeObra.colagem > 0) partes.push(`Colagem ${formatBRL(maoDeObra.colagem)}`);
              if (maoDeObra.montagem > 0) partes.push(`Montagem ${formatBRL(maoDeObra.montagem)}`);
              return partes.length === 0 ? 'Nenhuma cobrança ativa' : partes.join(' · ');
            })()}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base font-bold text-green-700">{formatBRL(maoDeObra.total)}</span>
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
        <div className="p-3 sm:p-4 space-y-3 bg-white">
          {ambientes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Adicione peças aos ambientes para configurar a mão de obra.
            </p>
          ) : (
            ambientes.map((amb) => {
              const detalhes = maoDeObra.detalhesPorAmbiente[amb.id] || { fixacao: 0, colagem: 0, montagem: 0, areaMontagem: 0, total: 0 };
              const cobrarMontagem = amb.cobrarMontagem === true;
              const cobrarFixacao = amb.cobrarFixacao !== false; // default ON (retrocompat)
              const cobrarColagem = amb.cobrarColagem !== false; // default ON (retrocompat)
              const pecasComFixacao = (amb.pecas || []).filter(p => p.cobrarFixacao === true).length;
              const pecasComColagem = (amb.pecas || []).filter(p => p.cobrarColagem === true).length;
              const montagemInfo = calcularMontagemAmbiente({ ...amb, cobrarMontagem: true }, precos);
              // Totais brutos (ignorando o master switch) para exibir o valor que SERIA cobrado
              // quando o toggle está desligado — feedback visual igual ao da Montagem.
              const fixacaoBruta = (amb.pecas || []).reduce((acc, peca) => {
                const calc = calcularFixacaoPeca(peca, precos);
                return acc + calc.total * (Number(peca.quantidade) || 1);
              }, 0);
              const colagemBruta = (amb.pecas || []).reduce((acc, peca) => {
                const calc = calcularColagemPeca(peca, precos);
                return acc + calc.total * (Number(peca.quantidade) || 1);
              }, 0);

              return (
                <div
                  key={amb.id}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{amb.nome}</span>
                    <span className="text-sm font-bold text-slate-900">{formatBRL(detalhes.total)}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {/* Fixação (master switch por ambiente + per-peça via cobrarFixacao) */}
                    <label className="flex items-baseline justify-between py-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cobrarFixacao}
                          onChange={(e) => onAtualizarAmbiente?.(amb.id, { cobrarFixacao: e.target.checked })}
                          className="w-3.5 h-3.5 accent-slate-700 cursor-pointer"
                        />
                        <span className={`font-medium ${cobrarFixacao ? 'text-slate-600' : 'text-slate-500'}`}>
                          Fixação
                        </span>
                        <span className="text-slate-400">
                          {pecasComFixacao > 0
                            ? `${pecasComFixacao} ${pecasComFixacao === 1 ? 'peça marcada' : 'peças marcadas'}`
                            : 'nenhuma peça marcada'}
                        </span>
                      </div>
                      <span className={`font-semibold ${cobrarFixacao ? 'text-slate-700' : 'text-slate-400'}`}>
                        {formatBRL(cobrarFixacao ? detalhes.fixacao : fixacaoBruta)}
                      </span>
                    </label>

                    {/* Colagem (master switch por ambiente + per-peça via cobrarColagem) */}
                    <label className="flex items-baseline justify-between py-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cobrarColagem}
                          onChange={(e) => onAtualizarAmbiente?.(amb.id, { cobrarColagem: e.target.checked })}
                          className="w-3.5 h-3.5 accent-slate-700 cursor-pointer"
                        />
                        <span className={`font-medium ${cobrarColagem ? 'text-slate-600' : 'text-slate-500'}`}>
                          Colagem
                        </span>
                        <span className="text-slate-400">
                          {pecasComColagem > 0
                            ? `${pecasComColagem} ${pecasComColagem === 1 ? 'peça marcada' : 'peças marcadas'}`
                            : 'nenhuma peça marcada'}
                        </span>
                      </div>
                      <span className={`font-semibold ${cobrarColagem ? 'text-slate-700' : 'text-slate-400'}`}>
                        {formatBRL(cobrarColagem ? detalhes.colagem : colagemBruta)}
                      </span>
                    </label>

                    {/* Montagem (toggle opcional) */}
                    <label className="flex items-baseline justify-between py-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cobrarMontagem}
                          onChange={(e) => onAtualizarAmbiente?.(amb.id, { cobrarMontagem: e.target.checked })}
                          className="w-3.5 h-3.5 accent-slate-700 cursor-pointer"
                        />
                        <span className={`font-medium ${cobrarMontagem ? 'text-slate-600' : 'text-slate-500'}`}>
                          Montagem
                        </span>
                        <span className="text-slate-400">
                          {montagemInfo.areaM2.toFixed(2)}m² × {formatBRL(precoM2)}
                        </span>
                      </div>
                      <span className={`font-semibold ${cobrarMontagem ? 'text-slate-700' : 'text-slate-400'}`}>
                        {formatBRL(cobrarMontagem ? montagemInfo.total : 0)}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-baseline justify-between pt-3 mt-1 border-t-2 border-slate-300">
            <span className="text-sm font-bold text-slate-800">Total Mão de Obra</span>
            <span className="text-base font-bold text-green-700">{formatBRL(maoDeObra.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
