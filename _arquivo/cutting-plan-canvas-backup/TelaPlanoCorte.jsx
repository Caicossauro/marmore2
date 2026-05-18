import { useState } from 'react';
import { Grid, FileText, Save, ChevronDownIcon } from '../../constants/icons';
import { PlanoCorteChapa } from './PlanoCorteChapa';
import { BandejaPecasAvulsas } from './BandejaPecasAvulsas';
import { SaveStatusIndicator } from '../layout/SaveStatusIndicator';

/**
 * Tela do Plano de Corte (toolbar + bandeja de avulsas + lista de chapas).
 *
 * Layout segue o padrão da Tela de Edição de Orçamento:
 *  - Container externo bg-gray-100 com acento esquerdo escuro.
 *  - Cabeçalho com título + ações.
 *  - Corpo com bandeja de avulsas (sidebar) + grupos de chapas por material.
 *
 * IMPORTANTE: o overlay flutuante de dragPreview NÃO é renderizado aqui —
 * ele permanece no componente raiz (SistemaOrcamentoMarmore) como overlay global.
 */
export function TelaPlanoCorte({
  orcamentoAtual,
  materiais,
  opcoesOtimizacao,
  saveStatus,
  ultimaGravacao,
  onSalvar,
  onAbrirNovaChapa,
  onAbrirOtimizacao,
  onIniciarPlanoManual,
  onImprimirPDF,
  onMoverPeca,
  onMoverPecaNaChapa,
  onMoverPecaParaAvulsas,
  onGirarPeca,
  onExcluirChapa,
  setDragPreview,
  setMostrandoDetalhePeca,
  setModoEdicaoPeca,
  setPecaEditada,
}) {
  const todasPecas = orcamentoAtual.ambientes.flatMap(amb => amb.pecas);
  const pecasAvulsas = todasPecas.filter(p => !p.chapaId);
  const temAvulsas = pecasAvulsas.length > 0;
  const totalChapas = orcamentoAtual.chapas.length;
  const totalPecas = todasPecas.length;

  // Agrupa chapas por materialId preservando a ordem de aparição,
  // mantendo a numeração global (idx + 1 sobre o array original).
  const grupos = (() => {
    const map = new Map();
    orcamentoAtual.chapas.forEach((chapa, idx) => {
      const key = String(chapa.materialId);
      if (!map.has(key)) {
        const material = materiais.find(m => String(m.id) === key);
        map.set(key, {
          key,
          nome: material?.nome || chapa.material?.nome || 'Material desconhecido',
          itens: [],
        });
      }
      map.get(key).itens.push({ chapa, numero: idx + 1 });
    });
    return Array.from(map.values());
  })();

  // Grupos começam expandidos; usuário pode colapsar individualmente.
  const [colapsados, setColapsados] = useState(() => new Set());
  const toggleGrupo = (key) => {
    setColapsados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-0 sm:p-0.5 space-y-2 sm:space-y-3">

      {/* Container único: header + toolbar + corpo */}
      <div
        className="bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-all border-2 overflow-hidden"
        style={{ borderColor: '#cbd5e1', borderLeft: '6px solid #475569' }}
      >
        {/* Header — título + status + subtítulo */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-3 sm:px-5 py-3 sm:py-[18px] border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">Plano de Corte</h2>
              <SaveStatusIndicator
                status={saveStatus}
                ultimaGravacao={ultimaGravacao}
                onRetry={onSalvar}
              />
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {totalChapas} {totalChapas === 1 ? 'chapa' : 'chapas'}
              <span className="text-slate-400"> · </span>
              {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}
              {temAvulsas && (
                <>
                  <span className="text-slate-400"> · </span>
                  <span className="text-amber-700 font-medium">{pecasAvulsas.length} avulsas</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar de ações */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSalvar}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Salvar Plano</span>
              <span className="sm:hidden">Salvar</span>
            </button>
            <button
              onClick={onAbrirNovaChapa}
              disabled={materiais.length === 0}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title={materiais.length === 0 ? 'Cadastre um material primeiro' : 'Adicionar nova chapa ao plano'}
            >
              <span className="text-base leading-none">+</span>
              Nova Chapa
            </button>
            <button
              onClick={onAbrirOtimizacao}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors"
            >
              <Grid size={16} />
              <span className="hidden sm:inline">Otimizar Corte</span>
              <span className="sm:hidden">Otimizar</span>
            </button>
            <button
              onClick={onIniciarPlanoManual}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors"
              title="Volta todas as peças para a área de avulsas para montagem manual"
            >
              <span aria-hidden="true">✋</span>
              <span className="hidden sm:inline">Plano Manual</span>
              <span className="sm:hidden">Manual</span>
            </button>
            <button
              onClick={onImprimirPDF}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Imprimir Plano</span>
              <span className="sm:hidden">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Corpo: bandeja de avulsas + grupos de chapas */}
        {totalChapas === 0 && !temAvulsas ? (
          <div className="text-center py-12 px-4 text-slate-400 text-sm">
            Nenhuma chapa no plano. Adicione uma chapa ou rode a otimização para começar.
          </div>
        ) : (
          <div className="px-2 sm:px-5 py-3 sm:py-5">
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
              {temAvulsas && (
                <aside
                  className="w-full lg:w-60 lg:shrink-0 lg:sticky lg:top-4 lg:self-start"
                  style={{ maxHeight: 'calc(100vh - 160px)' }}
                >
                  <BandejaPecasAvulsas
                    pecasAvulsas={pecasAvulsas}
                    ambientes={orcamentoAtual.ambientes}
                    materiais={materiais}
                    onMoverParaChapa={onMoverPeca}
                    onDragPreviewChange={setDragPreview}
                  />
                </aside>
              )}
              <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
                {grupos.map((grupo) => {
                  const expandido = !colapsados.has(grupo.key);
                  return (
                    <section key={grupo.key} className="space-y-2 sm:space-y-3">
                      <button
                        type="button"
                        onClick={() => toggleGrupo(grupo.key)}
                        className="w-full flex items-center justify-between gap-2 px-1 pb-1.5 border-b border-slate-300 hover:border-slate-500 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDownIcon
                            size={14}
                            className={`text-slate-500 group-hover:text-slate-700 transition-transform duration-300 shrink-0 ${expandido ? 'rotate-0' : '-rotate-90'}`}
                          />
                          <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide truncate">
                            {grupo.nome}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">
                          {grupo.itens.length} {grupo.itens.length === 1 ? 'chapa' : 'chapas'}
                        </span>
                      </button>
                      <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                          maxHeight: expandido ? '20000px' : '0',
                          opacity: expandido ? 1 : 0,
                        }}
                      >
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 items-start">
                          {grupo.itens.map(({ chapa, numero }) => (
                            <PlanoCorteChapa
                              key={chapa.id}
                              chapa={chapa}
                              numero={numero}
                              ambientes={orcamentoAtual.ambientes}
                              onMoverPeca={onMoverPeca}
                              onMoverPecaNaChapa={onMoverPecaNaChapa}
                              onGirarPeca={onGirarPeca}
                              onMoverParaAvulsas={onMoverPecaParaAvulsas}
                              onExcluirChapa={onExcluirChapa}
                              todasChapas={orcamentoAtual.chapas}
                              setMostrandoDetalhePeca={setMostrandoDetalhePeca}
                              setModoEdicaoPeca={setModoEdicaoPeca}
                              setPecaEditada={setPecaEditada}
                              espessuraDisco={opcoesOtimizacao.espessuraDisco}
                              margemLaterais={opcoesOtimizacao.margemLaterais}
                              onDragPreviewChange={setDragPreview}
                            />
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
