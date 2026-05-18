import { X } from '../../constants/icons';
import { Button } from '../ui/Button';

export const ModalOtimizacaoCorte = ({ aberto, opcoes, onChangeOpcoes, onAplicar, onFechar }) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Otimização de Corte</h2>
          <button
            onClick={onFechar}
            className="text-white hover:bg-slate-700 rounded-full p-1 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Tipo de Otimização
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-slate-400 transition-all">
                <input
                  type="radio"
                  name="tipoOtimizacao"
                  value="aproveitamento"
                  checked={opcoes.tipoOtimizacao === 'aproveitamento'}
                  onChange={(e) => onChangeOpcoes({ ...opcoes, tipoOtimizacao: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-slate-800">Melhor Aproveitamento</div>
                  <div className="text-sm text-slate-600">Maximiza o uso da chapa, minimizando sobras</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-slate-400 transition-all">
                <input
                  type="radio"
                  name="tipoOtimizacao"
                  value="sequencial"
                  checked={opcoes.tipoOtimizacao === 'sequencial'}
                  onChange={(e) => onChangeOpcoes({ ...opcoes, tipoOtimizacao: e.target.value })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">Corte Sequencial</div>
                  <div className="text-sm text-slate-600 mb-3">Organiza peças por tamanho para facilitar o corte</div>

                  {opcoes.tipoOtimizacao === 'sequencial' && (
                    <div className="ml-0 mt-3 space-y-2 pl-4 border-l-2 border-slate-400">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="ordenacaoSequencial"
                          value="maiores-menores"
                          checked={opcoes.ordenacaoSequencial === 'maiores-menores'}
                          onChange={(e) => onChangeOpcoes({ ...opcoes, ordenacaoSequencial: e.target.value })}
                        />
                        <span className="text-slate-700">Das maiores para as menores</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="ordenacaoSequencial"
                          value="agrupamento-tamanho"
                          checked={opcoes.ordenacaoSequencial === 'agrupamento-tamanho'}
                          onChange={(e) => onChangeOpcoes({ ...opcoes, ordenacaoSequencial: e.target.value })}
                        />
                        <span className="text-slate-700">Agrupamento por mesmo tamanho</span>
                      </label>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Margem das Laterais (mm)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={opcoes.margemLaterais}
                onChange={(e) => onChangeOpcoes({ ...opcoes, margemLaterais: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Desconto das bordas da chapa</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Espessura do Disco (mm)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={opcoes.espessuraDisco}
                onChange={(e) => onChangeOpcoes({ ...opcoes, espessuraDisco: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">Espaçamento entre peças</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button variant="primary" onClick={onAplicar}>Aplicar Otimização</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
