import { CONFIG_CHAPA_PADRAO } from '../../constants/config';
import { Button } from '../ui/Button';

export const PainelMateriaisOrcamento = ({
  aberto,
  orcamentoAtual,
  materiais,
  materiaisTemp,
  onChangeMateriaisTemp,
  onSubstituirMaterial,
  getMaterialConfig,
  onSalvar,
  salvo,
}) => {
  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: aberto ? 1 : 0, display: aberto ? 'block' : 'none' }}
    >
      <div className="mb-6 bg-slate-50 border border-slate-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração de Materiais deste Orçamento</h3>
        <p className="text-sm text-slate-600 mb-4">
          Defina as dimensões e preços das chapas para cada material usado neste orçamento.
        </p>

        {(() => {
          const materiaisUsados = new Set();
          orcamentoAtual.ambientes.forEach(amb => {
            amb.pecas.forEach(peca => {
              if (peca.materialId) {
                materiaisUsados.add(peca.materialId);
              }
            });
          });

          if (materiaisUsados.size === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum material em uso neste orçamento.</p>
                <p className="text-sm mt-2">Adicione peças aos ambientes para configurar materiais.</p>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {Array.from(materiaisUsados).map(materialId => {
                const material = materiais.find(m => m.id === materialId);
                if (!material) return null;

                const config = materiaisTemp[materialId] || getMaterialConfig(materialId) || CONFIG_CHAPA_PADRAO;

                return (
                  <div key={materialId} className="bg-gray-100 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-800">{material.nome}</h4>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-600">Substituir por:</label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              onSubstituirMaterial(materialId, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="text-xs border border-slate-300 rounded px-2 py-1 bg-gray-100 hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Selecionar...</option>
                          {materiais
                            .filter(m => m.id !== materialId)
                            .map(m => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Largura (mm)</label>
                        <input
                          type="number"
                          value={config.comprimento || ''}
                          onChange={(e) => onChangeMateriaisTemp({
                            ...materiaisTemp,
                            [materialId]: { ...config, comprimento: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="3000"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Altura (mm)</label>
                        <input
                          type="number"
                          value={config.altura || ''}
                          onChange={(e) => onChangeMateriaisTemp({
                            ...materiaisTemp,
                            [materialId]: { ...config, altura: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="2000"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Custo (R$/m²)</label>
                        <input
                          type="number"
                          value={config.custo || ''}
                          onChange={(e) => onChangeMateriaisTemp({
                            ...materiaisTemp,
                            [materialId]: { ...config, custo: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="250.00"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Venda (R$/m²)</label>
                        <input
                          type="number"
                          value={config.venda || ''}
                          onChange={(e) => onChangeMateriaisTemp({
                            ...materiaisTemp,
                            [materialId]: { ...config, venda: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="900"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!config.naoCobrarPerda}
                          onChange={(e) => onChangeMateriaisTemp({
                            ...materiaisTemp,
                            [materialId]: { ...config, naoCobrarPerda: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        Não cobrar perda deste material
                        <span className="text-xs text-slate-500">(material em estoque — sobra não entra no orçamento)</span>
                      </label>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                      <p>
                        <strong>Área da chapa:</strong> {((config.comprimento * config.altura) / 1000000).toFixed(2)} m²
                        <span className="mx-2">|</span>
                        <strong>Custo/chapa:</strong> R$ {((config.comprimento * config.altura / 1000000) * config.custo).toFixed(2)}
                        <span className="mx-2">|</span>
                        <strong>Venda/chapa:</strong> R$ {((config.comprimento * config.altura / 1000000) * config.venda).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="mt-4 flex flex-col items-center">
          {salvo ? (
            <span className="px-4 py-2.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              ✓ Salvo
            </span>
          ) : (
            <Button variant="primary" size="lg" onClick={onSalvar}>
              Salvar Configurações
            </Button>
          )}
          <p className="text-xs text-slate-500 mt-3 text-center">
            Clique para salvar e atualizar o plano de corte
          </p>
        </div>
      </div>
    </div>
  );
};
