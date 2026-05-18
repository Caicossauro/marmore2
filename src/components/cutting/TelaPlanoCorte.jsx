import { useState } from 'react';
import { Grid, FileText, Save } from '../../constants/icons';
import { PlanoCorteGrupoSvg } from './PlanoCorteGrupoSvg';
import { SaveStatusIndicator } from '../layout/SaveStatusIndicator';
import { Button } from '../ui/Button';

/**
 * Tela do Plano de Corte.
 *
 * Renderização: SVG agregado por material (PlanoCorteGrupoSvg). Cada material vira
 * um grupo que renderiza no mesmo SVG:
 *  - Chapas daquele material empilhadas verticalmente
 *  - Staging area abaixo, com as peças avulsas daquele material posicionadas
 *
 * A bandeja lateral foi removida — peças avulsas vivem dentro do SVG do seu material.
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
  onLinkarPecas,
  onDesfazerLink,
  onMoverGrupoLinkado,
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

  // Agrupa por materialId. Cada grupo inclui chapas E peças avulsas daquele material.
  // Materiais com SÓ avulsas (sem chapa) também aparecem como grupo (pra a staging ter onde viver).
  const grupos = (() => {
    const map = new Map();

    // Numero global das chapas: índice + 1 na ordem original
    orcamentoAtual.chapas.forEach((chapa, idx) => {
      const key = String(chapa.materialId);
      if (!map.has(key)) {
        const material = materiais.find(m => String(m.id) === key);
        map.set(key, {
          key,
          materialId: chapa.materialId,
          nome: material?.nome || chapa.material?.nome || 'Material desconhecido',
          itens: [],
          avulsas: [],
        });
      }
      map.get(key).itens.push({ chapa, numero: idx + 1 });
    });

    // Adiciona peças avulsas ao grupo do seu material (cria grupo se não existe)
    for (const peca of pecasAvulsas) {
      const key = String(peca.materialId);
      if (!map.has(key)) {
        const material = materiais.find(m => String(m.id) === key);
        map.set(key, {
          key,
          materialId: peca.materialId,
          nome: material?.nome || 'Material desconhecido',
          itens: [],
          avulsas: [],
        });
      }
      map.get(key).avulsas.push(peca);
    }

    return Array.from(map.values());
  })();

  // Abas estilo Chrome: uma aba por material. abaAtiva guarda a key do grupo selecionado.
  // Se a aba ativa não existir mais (grupo removido), cai no primeiro grupo disponível.
  const [abaAtiva, setAbaAtiva] = useState(null);
  const chaveAtiva = grupos.find(g => g.key === abaAtiva) ? abaAtiva : grupos[0]?.key;
  const grupoAtivo = grupos.find(g => g.key === chaveAtiva) || null;

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

        {/* Corpo: abas (uma por material) + conteúdo do material ativo */}
        {grupos.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 text-sm">
            Nenhuma chapa ou peça no plano. Adicione peças no orçamento e rode a otimização para começar.
          </div>
        ) : (
          <>
            {/* Barra de abas — estilo Chrome. Scroll horizontal em telas pequenas. */}
            <div className="bg-slate-100 border-b border-slate-300 overflow-x-auto overflow-y-hidden">
              <div className="flex items-end gap-0.5 px-2 pt-2 min-w-max">
                {grupos.map((grupo) => {
                  const ativa = grupo.key === chaveAtiva;
                  const totalAvulsas = grupo.avulsas.length;
                  return (
                    <button
                      key={grupo.key}
                      type="button"
                      onClick={() => setAbaAtiva(grupo.key)}
                      className={`px-3 sm:px-4 pt-2 pb-2.5 rounded-t-lg border border-b-0 text-left transition-colors min-w-0 max-w-[260px] ${
                        ativa
                          ? 'bg-white border-slate-300 -mb-px relative z-10'
                          : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                      title={grupo.nome}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className={`text-xs sm:text-sm font-semibold uppercase tracking-wide truncate ${
                            ativa ? 'text-slate-800' : 'text-slate-600'
                          }`}>
                            {grupo.nome}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                            {grupo.itens.length} {grupo.itens.length === 1 ? 'chapa' : 'chapas'}
                            {totalAvulsas > 0 && (
                              <>
                                <span className="text-slate-400"> · </span>
                                <span className="text-amber-700 font-medium">
                                  {totalAvulsas} {totalAvulsas === 1 ? 'avulsa' : 'avulsas'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo da aba ativa */}
            {grupoAtivo && (
              <div className="px-2 sm:px-5 py-3 sm:py-5 bg-white">
                <PlanoCorteGrupoSvg
                  key={grupoAtivo.key}
                  grupo={grupoAtivo}
                  ambientes={orcamentoAtual.ambientes}
                  onExcluirChapa={onExcluirChapa}
                  onMoverPecaNaChapa={onMoverPecaNaChapa}
                  onMoverPeca={onMoverPeca}
                  onMoverParaAvulsas={onMoverPecaParaAvulsas}
                  onDragPreviewChange={setDragPreview}
                  onGirarPeca={onGirarPeca}
                  onLinkarPecas={onLinkarPecas}
                  onDesfazerLink={onDesfazerLink}
                  onMoverGrupoLinkado={onMoverGrupoLinkado}
                  setMostrandoDetalhePeca={setMostrandoDetalhePeca}
                  setModoEdicaoPeca={setModoEdicaoPeca}
                  setPecaEditada={setPecaEditada}
                  espessuraDisco={opcoesOtimizacao.espessuraDisco}
                  margemLaterais={opcoesOtimizacao.margemLaterais}
                />
              </div>
            )}
          </>
        )}

        {/* Toolbar de ações — abaixo do preview, alinhada à direita.
            Hierarquia: ghost (Imprimir) → outline secundário → primário (Salvar Plano). */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="ghost" onClick={onImprimirPDF}>
              <FileText size={16} />
              <span className="hidden sm:inline">Imprimir Plano</span>
              <span className="sm:hidden">Imprimir</span>
            </Button>
            <Button
              variant="secondary"
              onClick={onIniciarPlanoManual}
              title="Volta todas as peças para a staging area de cada material"
            >
              <span aria-hidden="true">✋</span>
              <span className="hidden sm:inline">Plano Manual</span>
              <span className="sm:hidden">Manual</span>
            </Button>
            <Button variant="secondary" onClick={onAbrirOtimizacao}>
              <Grid size={16} />
              <span className="hidden sm:inline">Otimizar Corte</span>
              <span className="sm:hidden">Otimizar</span>
            </Button>
            <Button
              variant="secondary"
              onClick={onAbrirNovaChapa}
              disabled={materiais.length === 0}
              title={materiais.length === 0 ? 'Cadastre um material primeiro' : 'Adicionar nova chapa ao plano'}
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Nova Chapa</span>
              <span className="sm:hidden">Chapa</span>
            </Button>
            {/* Botão "Salvar Plano" — estilo Linear/Stripe (slate-900 sólido).
                Sóbrio, sem gradiente nem efeito mármore — ação técnica de finalização. */}
            <button
              type="button"
              onClick={onSalvar}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-semibold shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
            >
              <Save size={16} strokeWidth={2.2} />
              <span className="hidden sm:inline">Salvar Plano</span>
              <span className="sm:hidden">Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
