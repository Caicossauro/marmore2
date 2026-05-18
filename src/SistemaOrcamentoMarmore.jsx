import { useState, useEffect } from 'react';
import { PRECOS_PADRAO } from './constants/config';
import { usePrecos } from './hooks/usePrecos';
import { useMaterials } from './hooks/useMaterials';
import { useBudgets } from './hooks/useBudgets';
import { useAutoSave } from './hooks/useAutoSave';
import { usePainelConfigOrcamento } from './hooks/usePainelConfigOrcamento';
import { usePecasMutations } from './hooks/usePecasMutations';
import { usePecasOrcamento } from './hooks/usePecasOrcamento';
import { gerarRelatorioPDF as gerarRelatorioPDFUtil } from './utils/pdf/relatorio';
import { gerarEtiquetasPDF as gerarEtiquetasPDFUtil } from './utils/pdf/etiquetas';
import { imprimirPlanoCortePDF } from './utils/pdf/planoCorte';
import { TelaPlanoCorte } from './components/cutting/TelaPlanoCorte';
import { TelaEditorOrcamento } from './components/budget/TelaEditorOrcamento';
import { Header } from './components/layout/Header';
import { ModalConfirmacaoExclusao } from './components/modals/ModalConfirmacaoExclusao';
import { ModalNovaChapa } from './components/modals/ModalNovaChapa';
import { ModalOtimizacaoCorte } from './components/modals/ModalOtimizacaoCorte';
import { ModalDetalhesPeca } from './components/modals/ModalDetalhesPeca';
import { EditorDePecaPortal } from './components/budget/EditorDePecaPortal';
import { PainelPrecosOrcamento } from './components/budget/PainelPrecosOrcamento';
import { PainelMateriaisOrcamento } from './components/budget/PainelMateriaisOrcamento';
import { Button } from './components/ui/Button';


const SistemaOrcamentoMarmore = ({ initialOrcamentoId } = {}) => {
  // Hooks customizados
  const { precos } = usePrecos();
  const { materiais, atualizarMaterialSimples } = useMaterials();
  const { orcamentos, orcamentoAtual, carregando, setOrcamentos, setOrcamentoAtual, adicionarAmbiente, removerAmbiente, renomearAmbiente, salvarOrcamentoAtual } = useBudgets();

  // Telas internas do editor: orcamento | plano-corte | precos | materiais
  const [tela, setTela] = useState('orcamento');
  const [mostrandoDetalhePeca, setMostrandoDetalhePeca] = useState(null);
  const [modoEdicaoPeca, setModoEdicaoPeca] = useState(false);
  const [pecaEditada, setPecaEditada] = useState(null);
  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const {
    precosTemp,
    setPrecosTemp,
    precosSalvosOrcamento,
    setPrecosSalvosOrcamento,
    materiaisTemp,
    setMateriaisTemp,
    materiaisSalvosOrcamento,
    setMateriaisSalvosOrcamento,
  } = usePainelConfigOrcamento(orcamentoAtual, tela);
  const [orcamentoVersion, setOrcamentoVersion] = useState(0);
  const [mostrarModalOtimizacao, setMostrarModalOtimizacao] = useState(false);
  const [mostrarModalNovaChapa, setMostrarModalNovaChapa] = useState(false);
  const [materialNovaChapa, setMaterialNovaChapa] = useState('');
  // Preview flutuante da peça durante drag entre chapas
  const [dragPreview, setDragPreview] = useState(null);
  const OPCOES_OTIMIZACAO_PADRAO = {
    tipoOtimizacao: 'aproveitamento',
    ordenacaoSequencial: 'maiores-menores',
    margemLaterais: 25,
    espessuraDisco: 4,
  };

  const [opcoesOtimizacao, setOpcoesOtimizacao] = useState(OPCOES_OTIMIZACAO_PADRAO);

  // Atualiza as opções localmente E salva dentro do orçamento atual
  const atualizarOpcoesOtimizacao = (novasOpcoes) => {
    setOpcoesOtimizacao(novasOpcoes);
    if (orcamentoAtual) {
      const orcAtualizado = { ...orcamentoAtual, opcoesOtimizacao: novasOpcoes };
      setOrcamentoAtual(orcAtualizado);
      setOrcamentos(prev => prev.map(o => o.id === orcamentoAtual.id ? orcAtualizado : o));
    }
  };

  // Auto-save com debounce + retry + indicador visual de status
  const { status: saveStatus, ultimaGravacao, salvar: salvarAgora } = useAutoSave(orcamentoAtual);

  // Quando vindo de uma rota (/orcamentos/:id), abre o orçamento correto após o carregamento
  useEffect(() => {
    if (carregando || !initialOrcamentoId) return;
    const orc = orcamentos.find(o => String(o.id) === String(initialOrcamentoId));
    if (orc && !orcamentoAtual) {
      setOrcamentoAtual(orc);
      setTela('orcamento');
      setOpcoesOtimizacao(
        orc.opcoesOtimizacao
          ? { ...OPCOES_OTIMIZACAO_PADRAO, ...orc.opcoesOtimizacao }
          : OPCOES_OTIMIZACAO_PADRAO
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando]);

  const {
    adicionarPeca,
    excluirPeca,
    salvarEdicaoPeca,
    // organizarPecasLocalmente, atualizarMaterial e getMaterialConfig são consumidas internamente / via prop
    getMaterialConfig,
    substituirMaterial,
    otimizarCorte,
    salvarPrecosOrcamento,
    salvarMateriaisOrcamento,
  } = usePecasOrcamento({
    orcamentoAtual,
    setOrcamentoAtual,
    orcamentos,
    setOrcamentos,
    materiais,
    atualizarMaterialSimples,
    precosTemp,
    setPrecosSalvosOrcamento,
    materiaisTemp,
    setMateriaisSalvosOrcamento,
    mostrandoDetalhePeca,
    setMostrandoDetalhePeca,
    setModoEdicaoPeca,
    pecaEditada,
    setPecaEditada,
    setOrcamentoVersion,
    precos,
    setTela,
    opcoesOtimizacao,
    setMostrarModalOtimizacao,
  });

  const gerarEtiquetasPDF = () => {
    gerarEtiquetasPDFUtil(orcamentoAtual, materiais);
  };

  const gerarRelatorioPDF = async () => {
    const precosAtual = orcamentoAtual.precos || PRECOS_PADRAO;
    await gerarRelatorioPDFUtil(orcamentoAtual, materiais, precosAtual);
  };


  // Mutações de peças/chapas no plano de corte (drag/drop, girar, plano manual, etc.)
  const {
    girarPeca,
    moverPecaNaChapa,
    moverPeca,
    moverPecaParaAvulsas,
    excluirChapa,
    iniciarPlanoManual,
    adicionarChapa,
    linkarPecas,
    desfazerLink,
    moverGrupoLinkado,
  } = usePecasMutations({
    orcamentoAtual,
    setOrcamentoAtual,
    setOrcamentos,
    opcoesOtimizacao,
    materiais,
    setMostrarModalNovaChapa,
    setMaterialNovaChapa,
  });

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header
        tela={tela}
        orcamentoAtual={orcamentoAtual}
        setTela={setTela}
        onGerarEtiquetas={gerarEtiquetasPDF}
        onGerarRelatorio={gerarRelatorioPDF}
      />

      <div data-app-content className="p-1 sm:p-2">
        {/* Modal de visualização da peça (modo visualizar) */}
        {mostrandoDetalhePeca && !modoEdicaoPeca && (
          <ModalDetalhesPeca
            peca={mostrandoDetalhePeca}
            modoEdicao={false}
            pecaEditada={pecaEditada}
            onChangePecaEditada={setPecaEditada}
            materiais={materiais}
            precos={orcamentoAtual?.precos || PRECOS_PADRAO}
            onSalvar={salvarEdicaoPeca}
            onFechar={() => {
              setMostrandoDetalhePeca(null);
              setModoEdicaoPeca(false);
              setPecaEditada(null);
            }}
          />
        )}

        {/* Editor full-screen (modo editar) — reusa o portal da tela de adicionar peça */}
        {mostrandoDetalhePeca && modoEdicaoPeca && pecaEditada && orcamentoAtual && (
          <EditorDePecaPortal
            peca={pecaEditada}
            onChangePeca={setPecaEditada}
            materiais={materiais}
            materialConfigs={orcamentoAtual.materiais || {}}
            precos={orcamentoAtual.precos || PRECOS_PADRAO}
            renderFooterAcoes={({ valido }) => (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMostrandoDetalhePeca(null);
                    setModoEdicaoPeca(false);
                    setPecaEditada(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const alt = parseFloat(pecaEditada.altura);
                    const larg = parseFloat(pecaEditada.largura);
                    if (!pecaEditada.nome || !pecaEditada.materialId) {
                      alert('Preencha o nome e selecione um material.');
                      return;
                    }
                    if (!Number.isFinite(alt) || alt <= 0 || !Number.isFinite(larg) || larg <= 0) {
                      alert('Altura e largura precisam ser números maiores que zero.');
                      return;
                    }
                    setPecaEditada({
                      ...pecaEditada,
                      altura: alt,
                      largura: larg,
                      quantidade: parseInt(pecaEditada.quantidade) || 1,
                    });
                    setTimeout(() => salvarEdicaoPeca(), 0);
                  }}
                  disabled={!valido}
                >
                  Salvar alterações
                </Button>
              </>
            )}
          />
        )}


        <ModalConfirmacaoExclusao
          pecaParaExcluir={pecaParaExcluir}
          onCancelar={() => setPecaParaExcluir(null)}
          onConfirmar={() => {
            excluirPeca(pecaParaExcluir.ambienteId, pecaParaExcluir.pecaId);
            setPecaParaExcluir(null);
          }}
        />

        {/* Loader inicial enquanto o orçamento é carregado pela rota */}
        {!orcamentoAtual && (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400 text-sm">Carregando orçamento...</p>
          </div>
        )}

        {/* Tela dedicada de Preços do orçamento */}
        {tela === 'precos' && orcamentoAtual && (
          <PainelPrecosOrcamento
            aberto={true}
            precosTemp={precosTemp}
            onChangePrecosTemp={setPrecosTemp}
            onSalvar={salvarPrecosOrcamento}
            salvo={precosSalvosOrcamento}
          />
        )}

        {/* Tela dedicada de Materiais do orçamento */}
        {tela === 'materiais' && orcamentoAtual && (
          <PainelMateriaisOrcamento
            aberto={true}
            orcamentoAtual={orcamentoAtual}
            materiais={materiais}
            materiaisTemp={materiaisTemp}
            onChangeMateriaisTemp={setMateriaisTemp}
            onSubstituirMaterial={substituirMaterial}
            getMaterialConfig={getMaterialConfig}
            onSalvar={salvarMateriaisOrcamento}
            salvo={materiaisSalvosOrcamento}
          />
        )}

        {/* Tela de Orçamento */}
        {tela === 'orcamento' && orcamentoAtual && (
          <TelaEditorOrcamento
            orcamentoAtual={orcamentoAtual}
            setOrcamentoAtual={setOrcamentoAtual}
            materiais={materiais}
            orcamentoVersion={orcamentoVersion}
            mostrandoDetalhePeca={mostrandoDetalhePeca}
            pecaParaExcluir={pecaParaExcluir}
            adicionarAmbiente={adicionarAmbiente}
            removerAmbiente={removerAmbiente}
            renomearAmbiente={renomearAmbiente}
            adicionarPeca={adicionarPeca}
            excluirPeca={excluirPeca}
            onVisualizarPeca={(peca) => {
              // Preparar cópia da peça para edição
              const copia = JSON.parse(JSON.stringify(peca));

              // Garantir que tenha todos os campos
              if (!copia.acabamentos) {
                copia.acabamentos = {
                  polimento: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                  esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                  boleado: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
                  canal: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } }
                };
              }
              if (!copia.cuba) copia.cuba = 0;
              if (!copia.cubaEsculpida) copia.cubaEsculpida = 0;
              if (!copia.cooktop) copia.cooktop = 0;
              if (!copia.recorte) copia.recorte = 0;
              if (!copia.pes) copia.pes = 0;

              // Inicializar acabamentos personalizados
              if (!copia.acabamentosPersonalizados) {
                const largura = copia.rotacao === 90 ? copia.altura : copia.largura;
                const altura = copia.rotacao === 90 ? copia.largura : copia.altura;

                copia.acabamentosPersonalizados = {};
                ['esquadria', 'boleado', 'polimento', 'canal'].forEach(tipo => {
                  if (copia.acabamentos[tipo]?.ativo) {
                    let totalMm = 0;
                    const lados = copia.acabamentos[tipo].lados;
                    if (lados.superior) totalMm += largura;
                    if (lados.inferior) totalMm += largura;
                    if (lados.esquerda) totalMm += altura;
                    if (lados.direita) totalMm += altura;
                    copia.acabamentosPersonalizados[tipo] = (totalMm / 1000).toFixed(2);
                  } else {
                    copia.acabamentosPersonalizados[tipo] = '';
                  }
                });
              }

              // Abrir modal já em modo de edição
              setMostrandoDetalhePeca(peca);
              setPecaEditada(copia);
              setModoEdicaoPeca(true);
            }}
            setPecaParaExcluir={setPecaParaExcluir}
            salvarOrcamentoAtual={salvarOrcamentoAtual}
            setTela={setTela}
          />
        )}

        <ModalNovaChapa
          aberto={mostrarModalNovaChapa}
          materiais={materiais}
          materialSelecionadoId={materialNovaChapa}
          onChangeMaterial={setMaterialNovaChapa}
          materiaisConfig={orcamentoAtual?.materiais}
          onConfirmar={() => adicionarChapa(materialNovaChapa)}
          onFechar={() => {
            setMostrarModalNovaChapa(false);
            setMaterialNovaChapa('');
          }}
        />

        <ModalOtimizacaoCorte
          aberto={mostrarModalOtimizacao}
          opcoes={opcoesOtimizacao}
          onChangeOpcoes={atualizarOpcoesOtimizacao}
          onAplicar={otimizarCorte}
          onFechar={() => setMostrarModalOtimizacao(false)}
        />

        {/* Plano de Corte */}
        {tela === 'plano-corte' && orcamentoAtual && (
          <TelaPlanoCorte
            orcamentoAtual={orcamentoAtual}
            materiais={materiais}
            opcoesOtimizacao={opcoesOtimizacao}
            saveStatus={saveStatus}
            ultimaGravacao={ultimaGravacao}
            onSalvar={salvarAgora}
            onAbrirNovaChapa={() => {
              setMaterialNovaChapa(materiais[0]?.id?.toString() || '');
              setMostrarModalNovaChapa(true);
            }}
            onAbrirOtimizacao={() => setMostrarModalOtimizacao(true)}
            onIniciarPlanoManual={iniciarPlanoManual}
            onImprimirPDF={() => imprimirPlanoCortePDF(orcamentoAtual)}
            onMoverPeca={moverPeca}
            onMoverPecaNaChapa={moverPecaNaChapa}
            onMoverPecaParaAvulsas={moverPecaParaAvulsas}
            onGirarPeca={girarPeca}
            onLinkarPecas={linkarPecas}
            onDesfazerLink={desfazerLink}
            onMoverGrupoLinkado={moverGrupoLinkado}
            onExcluirChapa={excluirChapa}
            setDragPreview={setDragPreview}
            setMostrandoDetalhePeca={setMostrandoDetalhePeca}
            setModoEdicaoPeca={setModoEdicaoPeca}
            setPecaEditada={setPecaEditada}
          />
        )}
      </div>


      {/* Preview flutuante durante drag entre chapas */}
      {dragPreview && (() => {
        const w = (dragPreview.peca.rotacao === 90 ? dragPreview.peca.altura : dragPreview.peca.largura) * dragPreview.escala;
        const h = (dragPreview.peca.rotacao === 90 ? dragPreview.peca.largura : dragPreview.peca.altura) * dragPreview.escala;
        return (
          <div
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              left: dragPreview.clientX - w / 2,
              top: dragPreview.clientY - h / 2,
              width: w,
              height: h,
              border: '2px dashed #1e40af',
              background: 'rgba(59, 130, 246, 0.35)',
              borderRadius: '2px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {dragPreview.peca.nome || 'Peça'}
          </div>
        );
      })()}
    </div>
  );
};


export { SistemaOrcamentoMarmore };
