import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useClientes } from '../hooks/useClientes';
import { useMaterials } from '../hooks/useMaterials';
import { calcularOrcamentoComDetalhes } from '../utils/calculations';
import { formatBRL } from '../utils/formatters';
import { PRECOS_PADRAO } from '../constants/config';
import { PageHeader } from '../components/layout/PageHeader';
import { OrcamentosIcon, UsersIcon, MateriaisIcon, PrecosIcon } from '../constants/icons';
import { CORES_AMBIENTES } from '../constants/colors';

function DeltaBadge({ delta, deltaSufixo }) {
  if (delta === undefined) return null;

  if (delta === 0) {
    return (
      <span className="text-xs font-medium text-content-muted">— sem variação</span>
    );
  }

  const positivo = delta > 0;
  const cor = positivo ? 'text-status-success' : 'text-status-danger';
  const Seta = positivo ? TrendingUp : TrendingDown;
  const sinal = positivo ? '+' : '';

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${cor}`}>
      <Seta size={12} />
      {sinal}{delta}{deltaSufixo}
    </span>
  );
}

function KpiCard({ titulo, valor, subtitulo, Icone, delta, deltaSufixo = '' }) {
  return (
    <div className="bg-white rounded-card border border-border shadow-card p-5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icone size={18} className="text-brand-600" />
        </div>
        <DeltaBadge delta={delta} deltaSufixo={deltaSufixo} />
      </div>
      <p className="text-3xl font-bold text-content-primary mt-3">{valor}</p>
      <p className="text-sm text-content-muted mt-0.5">{subtitulo}</p>
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
      <div className="p-1 sm:p-2 space-y-3">
        <div className="h-8 w-48 bg-surface-subtle rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-card border border-border shadow-card p-5 space-y-3">
              <div className="h-10 w-10 bg-surface-subtle rounded-lg animate-pulse" />
              <div className="h-8 w-16 bg-surface-subtle rounded animate-pulse" />
              <div className="h-4 w-24 bg-surface-subtle rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const valorTotal = orcamentos.reduce((acc, orc) => {
    const calc = calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO);
    return acc + (calc.vendaTotal || 0);
  }, 0);

  const recentes = [...orcamentos]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const agora = new Date();
  const inicioMesAtual    = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const orcMesAtual    = orcamentos.filter(o => o.dataCriacao && new Date(o.dataCriacao) >= inicioMesAtual).length;
  const orcMesAnterior = orcamentos.filter(o => { const d = o.dataCriacao && new Date(o.dataCriacao); return d && d >= inicioMesAnterior && d < inicioMesAtual; }).length;
  const deltaOrc = orcMesAtual - orcMesAnterior;

  const cliMesAtual    = clientes.filter(c => c.criadoEm && new Date(c.criadoEm) >= inicioMesAtual).length;
  const cliMesAnterior = clientes.filter(c => { const d = c.criadoEm && new Date(c.criadoEm); return d && d >= inicioMesAnterior && d < inicioMesAtual; }).length;
  const deltaCli = cliMesAtual - cliMesAnterior;

  return (
    <div className="p-1 sm:p-2 space-y-3">
      <PageHeader
        titulo="Dashboard"
        subtitulo={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Orçamentos" valor={orcamentos.length} subtitulo="em carteira"  Icone={OrcamentosIcon} delta={deltaOrc} deltaSufixo=" este mês" />
        <KpiCard titulo="Clientes"   valor={clientes.length}  subtitulo="cadastrados"  Icone={UsersIcon}       delta={deltaCli} deltaSufixo=" este mês" />
        <KpiCard titulo="Materiais"  valor={materiais.length} subtitulo="cadastrados"  Icone={MateriaisIcon} />
        <KpiCard titulo="Valor Total" valor={formatBRL(valorTotal)} subtitulo="em carteira" Icone={PrecosIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-card border border-border shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">Orçamentos Recentes</h2>
              <button
                onClick={() => navigate('/orcamentos')}
                className="flex items-center gap-1 text-xs text-content-muted hover:text-content-secondary transition-colors"
              >
                Ver todos <ArrowRight size={12} />
              </button>
            </div>

            {recentes.length === 0 ? (
              <p className="text-center py-10 text-content-muted text-sm">Nenhum orçamento criado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide">Orçamento</th>
                    <th className="px-5 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide hidden sm:table-cell">Data</th>
                    <th className="px-5 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide text-right">Total</th>
                    <th className="px-5 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wide text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentes.map((orc, index) => {
                    const calc = calcularOrcamentoComDetalhes(orc, materiais, orc.precos || PRECOS_PADRAO);
                    return (
                      <tr
                        key={orc.id}
                        onClick={() => navigate('/orcamentos/' + orc.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: CORES_AMBIENTES[index % CORES_AMBIENTES.length] }}
                            >
                              {(orc.nome || 'O')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-content-primary truncate">
                              {orc.nome || `Orçamento #${String(orc.id).slice(-6)}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-content-muted text-sm hidden sm:table-cell">
                          {orc.dataCriacao ? new Date(orc.dataCriacao).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-content-primary text-right whitespace-nowrap">
                          {formatBRL(calc.vendaTotal)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-content-muted text-xs">Abrir →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-card border border-border shadow-card p-5">
            <h2 className="text-sm font-semibold text-content-primary mb-4">Ações Rápidas</h2>
            <div className="space-y-1">
              {[
                { label: 'Novo Orçamento', onClick: () => navigate('/orcamentos'), icon: Plus },
                { label: 'Novo Cliente',   onClick: () => navigate('/clientes/novo'), icon: Plus },
                { label: 'Novo Material',  onClick: () => navigate('/materiais/novo'), icon: Plus },
                { label: 'Ver Orçamentos', onClick: () => navigate('/orcamentos'), icon: ArrowRight },
                { label: 'Ver Clientes',   onClick: () => navigate('/clientes'), icon: ArrowRight },
              ].map(({ label, onClick, icon: Icon }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-colors text-left group"
                >
                  <span className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <Icon size={14} className="text-brand-600" />
                  </span>
                  <span className="text-sm text-content-secondary">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
