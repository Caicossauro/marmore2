import { useMemo } from 'react';
import {
  calcularMaoDeObraOrcamento,
  calcularMontagemAmbiente,
  calcularFixacaoPeca,
  calcularColagemPeca,
} from '../../utils/maoDeObra';
import { formatBRL } from '../../utils/formatters';

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
  const maoDeObra = useMemo(
    () => calcularMaoDeObraOrcamento(orcamento, precos),
    [orcamento, precos]
  );

  const ambientes = (orcamento?.ambientes || []).filter(amb => (amb.pecas || []).length > 0);
  const precoM2 = Number(precos?.maoDeObraMontagemPorM2) || 0;

  return (
    <div className="space-y-3">
          {ambientes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Adicione peças aos ambientes para configurar a mão de obra.
            </p>
          ) : (
            ambientes.map((amb) => {
              const detalhes = maoDeObra.detalhesPorAmbiente[amb.id] || { fixacao: 0, colagem: 0, montagem: 0, areaMontagem: 0, total: 0 };
              const cobrarMontagem = amb.cobrarMontagem === true;
              const pecasComFixacao = (amb.pecas || []).filter(p => p.cobrarFixacao === true).length;
              const pecasComColagem = (amb.pecas || []).filter(p => p.cobrarColagem === true).length;
              // Default: ligado só se houver peças marcadas (e não explicitamente desligado)
              const cobrarFixacao = amb.cobrarFixacao === false ? false : pecasComFixacao > 0;
              const cobrarColagem = amb.cobrarColagem === false ? false : pecasComColagem > 0;
              const montagemInfo = calcularMontagemAmbiente({ ...amb, cobrarMontagem: true }, precos);

              // Totais de fixação: metros lineares, grapas e P.U. somados por peça
              const totaisFixacao = (amb.pecas || []).reduce((acc, peca) => {
                if (peca.cobrarFixacao !== true) return acc;
                const qtd = Number(peca.quantidade) || 1;
                const calc = calcularFixacaoPeca(peca, precos);
                return {
                  larguraM:  acc.larguraM  + calc.larguraM  * qtd,
                  qtdGrapas: acc.qtdGrapas + calc.qtdGrapas * qtd,
                  qtdPus:    acc.qtdPus    + calc.qtdPus    * qtd,
                };
              }, { larguraM: 0, qtdGrapas: 0, qtdPus: 0 });

              // Área total de colagem em m²
              const areaColagemM2 = (amb.pecas || []).reduce((acc, peca) => {
                if (peca.cobrarColagem !== true) return acc;
                const qtd = Number(peca.quantidade) || 1;
                const calc = calcularColagemPeca(peca, precos);
                return acc + calc.areaM2 * qtd;
              }, 0);

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
                            ? `${totaisFixacao.larguraM.toFixed(2)}m · ${totaisFixacao.qtdGrapas} grapa${totaisFixacao.qtdGrapas !== 1 ? 's' : ''} · ${totaisFixacao.qtdPus} P.U.`
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
                            ? `${areaColagemM2.toFixed(2)} m²`
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
  );
}
