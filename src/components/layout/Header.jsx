import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '../../constants/icons';

/**
 * Sub-header do editor de orçamento.
 * Substituiu o antigo cabeçalho com logo gigante — agora é uma barra compacta
 * com breadcrumb de volta para /orcamentos e botões de ação inline.
 */
export const Header = ({
  tela,
  orcamentoAtual,
  setTela,
  onGerarEtiquetas,
  onGerarRelatorio,
}) => {
  const navigate = useNavigate();

  const btn = (ativo) =>
    `px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors whitespace-nowrap ${
      ativo
        ? 'bg-white/20 text-white'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  const trocar = (novaTela) => {
    setTela(novaTela);
  };

  // Rastreia a última tela "primária" (orcamento ou plano-corte) — pra que ao
  // entrar em precos/materiais, o botão de volta retorne pra onde o usuário
  // estava antes, não obrigatoriamente pra orcamento.
  const ultimaTelaPrimaria = useRef(
    tela === 'plano-corte' ? 'plano-corte' : 'orcamento'
  );
  useEffect(() => {
    if (tela === 'orcamento' || tela === 'plano-corte') {
      ultimaTelaPrimaria.current = tela;
    }
  }, [tela]);

  const emEditor = tela === 'orcamento' || tela === 'plano-corte' || tela === 'precos' || tela === 'materiais';

  return (
    <header data-app-header className="bg-marble border-b border-white/10 flex-shrink-0 sticky top-0 z-40 overflow-hidden">
      <div
        className="flex items-center h-12 px-4 gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          maskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
        }}
      >
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/orcamentos')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors shrink-0"
        >
          <ArrowLeftIcon size={15} />
          Orçamentos
        </button>

        {orcamentoAtual && (
          <>
            <span className="text-slate-600 text-sm shrink-0">/</span>
            <span className="text-slate-200 text-sm font-medium truncate min-w-0 max-w-xs">
              {orcamentoAtual.nome}
            </span>
          </>
        )}

        <div className="flex-1 shrink-0" />

        {/* Botões de ação — só aparecem dentro do editor */}
        {emEditor && orcamentoAtual && (
          <div className="flex items-center gap-1 shrink-0">
            {tela === 'orcamento' ? (
              <button onClick={() => trocar('plano-corte')} className={btn(tela === 'plano-corte')}>
                Plano de Corte
              </button>
            ) : tela === 'plano-corte' ? (
              <button onClick={() => trocar('orcamento')} className={btn(false)}>
                Voltar ao Orçamento
              </button>
            ) : (
              // Em precos/materiais: volta pra última tela primária (orcamento ou plano-corte)
              <button onClick={() => trocar(ultimaTelaPrimaria.current)} className={btn(false)}>
                {ultimaTelaPrimaria.current === 'plano-corte' ? 'Voltar ao Plano de Corte' : 'Voltar ao Orçamento'}
              </button>
            )}

            <button onClick={onGerarEtiquetas} className={btn(false)}>
              Etiquetas
            </button>

            <button onClick={onGerarRelatorio} className={btn(false)}>
              Relatório
            </button>

            <button onClick={() => trocar('precos')} className={btn(tela === 'precos')}>
              Preços
            </button>

            <button onClick={() => trocar('materiais')} className={btn(tela === 'materiais')}>
              Materiais
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
