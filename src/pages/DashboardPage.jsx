import { useNavigate } from 'react-router-dom';
import { useBudgets } from '../hooks/useBudgets';
import { useClientes } from '../hooks/useClientes';
import { useMaterials } from '../hooks/useMaterials';
import { calcularOrcamentoComDetalhes } from '../utils/calculations';
import { formatBRL } from '../utils/formatters';
import { PRECOS_PADRAO } from '../constants/config';

function KpiCard({ titulo, valor, subtitulo }) {
  return (
    <div className="bg-gray-100 rounded-lg border border-slate-200 p-5">
      <p className="text-sm text-slate-500 font-medium">{titulo}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{valor}</p>
      <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { orcamentos, carregando } = useBudgets();
  const { clientes } = useClientes();
  const { materiais } = useMaterials();

  if (carregando) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
    );
  }

  const valorTotal = orcamentos.reduce((acc, orc) => {
    const calc = calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO);
    return acc + (calc.vendaTotal || 0);
  }, 0);

  const recentes = [...orcamentos]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Orçamentos"
          valor={orcamentos.length}
          subtitulo="em carteira"
        />
        <KpiCard
          titulo="Clientes"
          valor={clientes.length}
          subtitulo="cadastrados"
        />
        <KpiCard
          titulo="Materiais"
          valor={materiais.length}
          subtitulo="cadastrados"
        />
        <KpiCard
          titulo="Valor Total"
          valor={formatBRL(valorTotal)}
          subtitulo="em aberto"
        />
      </div>

      {/* Orçamentos recentes */}
      <div className="bg-gray-100 rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Orçamentos Recentes</h2>
          <button
            onClick={() => navigate('/orcamentos')}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Ver todos →
          </button>
        </div>

        {recentes.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-sm">
            Nenhum orçamento criado ainda.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600">Orçamento</th>
                <th className="px-5 py-3 font-semibold text-slate-600 hidden sm:table-cell">Data</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentes.map(orc => {
                const calc = calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO);
                return (
                  <tr
                    key={orc.id}
                    onClick={() => navigate('/orcamentos/' + orc.id)}
                    className="marble-row-hover cursor-pointer"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-[200px]">
                      <span className="truncate block">
                        {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                      {orc.dataCriacao
                        ? new Date(orc.dataCriacao).toLocaleDateString('pt-BR')
                        : '—'
                      }
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800 text-right whitespace-nowrap">
                      {formatBRL(calc.vendaTotal)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-slate-400 text-xs">Abrir →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
