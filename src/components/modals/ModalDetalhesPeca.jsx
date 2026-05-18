import { Button } from '../ui/Button';

export const ModalDetalhesPeca = ({
  peca,
  modoEdicao,
  pecaEditada,
  onChangePecaEditada,
  materiais,
  precos,
  onSalvar,
  onFechar,
}) => {
  if (!peca) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-100 rounded-lg shadow-lg w-full max-w-2xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">
            {modoEdicao ? 'Editando' : ''} {peca.nome || 'Peça'}
          </h3>
          <button
            onClick={onFechar}
            className="text-slate-300 hover:text-white transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Informações Gerais - COMPACTAS */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-2 text-sm">Dimensões</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-600 text-xs mb-1">Nome:</label>
                  {modoEdicao ? (
                    <input
                      type="text"
                      value={pecaEditada?.nome || ''}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, nome: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    />
                  ) : (
                    <span className="font-bold text-slate-800 text-sm">{peca.nome || 'Sem nome'}</span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-600 text-xs mb-1">Largura (mm):</label>
                  {modoEdicao ? (
                    <input
                      type="number"
                      value={pecaEditada?.largura || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, largura: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    />
                  ) : (
                    <span className="font-bold text-slate-800 text-sm">{peca.largura} mm</span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-600 text-xs mb-1">Altura (mm):</label>
                  {modoEdicao ? (
                    <input
                      type="number"
                      value={pecaEditada?.altura || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, altura: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    />
                  ) : (
                    <span className="font-bold text-slate-800 text-sm">{peca.altura} mm</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-2 text-sm">Material</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-600 text-xs mb-1">Material:</label>
                  {modoEdicao ? (
                    <select
                      value={pecaEditada?.materialId || ''}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, materialId: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    >
                      {materiais.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-slate-800 text-sm">
                      {materiais.find(m => m.id === peca.materialId)?.nome || 'N/A'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-600 text-xs mb-1">Chapa:</label>
                  <span className="font-bold text-slate-800 text-sm">
                    #{peca.chapaId ? String(peca.chapaId).slice(-4) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Acabamentos - EDITÁVEL OU VISUALIZAÇÃO */}
          {(modoEdicao || (peca.acabamentos && Object.values(peca.acabamentos).some(a => a.ativo))) && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-3 text-sm">Acabamentos</h4>
              {modoEdicao ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-300">
                    Insira a quantidade de acabamento em metros lineares. Deixe em branco ou 0 para desativar.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {['polimento', 'esquadria', 'boleado', 'canal'].map(tipo => {
                      return (
                        <div key={tipo} className="bg-gray-100 rounded-lg p-3 border border-slate-300">
                          <label className="block mb-2">
                            <span className="font-semibold text-sm capitalize text-slate-700">{tipo}</span>
                            <span className="text-xs text-slate-500 ml-1">(R$ {precos[tipo]}/m)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pecaEditada?.acabamentosPersonalizados?.[tipo] || ''}
                              onChange={(e) => {
                                const novosAcabamentosPersonalizados = {
                                  ...(pecaEditada?.acabamentosPersonalizados || {}),
                                  [tipo]: e.target.value
                                };
                                onChangePecaEditada({
                                  ...pecaEditada,
                                  acabamentosPersonalizados: novosAcabamentosPersonalizados
                                });
                              }}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none text-sm font-medium"
                              placeholder="0.00"
                            />
                            <span className="text-sm text-slate-600 whitespace-nowrap">metros</span>
                          </div>
                          {pecaEditada?.acabamentosPersonalizados?.[tipo] > 0 && (
                            <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                              <strong>Custo:</strong> {((parseFloat(pecaEditada.acabamentosPersonalizados[tipo]) || 0) * precos[tipo]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {Object.keys(peca.acabamentos).map(tipo => {
                    const acab = peca.acabamentos[tipo];
                    const valorPersonalizado = peca.acabamentosPersonalizados?.[tipo];

                    if (valorPersonalizado && parseFloat(valorPersonalizado) > 0) {
                      const metros = parseFloat(valorPersonalizado);
                      const valor = metros * precos[tipo];
                      return (
                        <div key={tipo} className="bg-gray-100 rounded p-2 border border-slate-300">
                          <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                          <div className="text-xs text-slate-700">
                            <span className="font-bold text-slate-800">{metros.toFixed(2)}m</span>
                            <span className="ml-2 text-slate-600">({valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                          </div>
                        </div>
                      );
                    }

                    if (!acab.ativo) return null;
                    const lados = Object.keys(acab.lados).filter(lado => acab.lados[lado]);
                    return (
                      <div key={tipo} className="bg-gray-100 rounded p-2 border border-slate-300">
                        <div className="font-semibold text-slate-800 capitalize text-sm mb-1">{tipo}</div>
                        <div className="flex flex-wrap gap-1">
                          {lados.map(lado => (
                            <span key={lado} className="text-xs bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
                              {lado}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recortes - EDITÁVEL OU VISUALIZAÇÃO */}
          {(modoEdicao || peca.cuba > 0 || peca.cubaEsculpida > 0 ||
            peca.cooktop > 0 || peca.recorte > 0 ||
            peca.pes > 0) && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-2 text-sm">Recortes</h4>
              {modoEdicao ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pia/Cuba:</label>
                    <input
                      type="number"
                      value={pecaEditada?.cuba || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, cuba: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cuba Esculpida:</label>
                    <input
                      type="number"
                      value={pecaEditada?.cubaEsculpida || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, cubaEsculpida: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cooktop:</label>
                    <input
                      type="number"
                      value={pecaEditada?.cooktop || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, cooktop: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Recorte:</label>
                    <input
                      type="number"
                      value={pecaEditada?.recorte || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, recorte: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pés:</label>
                    <input
                      type="number"
                      value={pecaEditada?.pes || 0}
                      onChange={(e) => onChangePecaEditada({ ...pecaEditada, pes: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                      min="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {peca.cuba > 0 && (
                    <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                      <div className="text-xs text-slate-600">Cuba</div>
                      <div className="font-bold text-slate-800">{peca.cuba}x</div>
                    </div>
                  )}
                  {peca.cubaEsculpida > 0 && (
                    <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                      <div className="text-xs text-slate-600">Cuba Esculpida</div>
                      <div className="font-bold text-slate-800">{peca.cubaEsculpida}x</div>
                    </div>
                  )}
                  {peca.cooktop > 0 && (
                    <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                      <div className="text-xs text-slate-600">Cooktop</div>
                      <div className="font-bold text-slate-800">{peca.cooktop}x</div>
                    </div>
                  )}
                  {peca.recorte > 0 && (
                    <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                      <div className="text-xs text-slate-600">Recorte</div>
                      <div className="font-bold text-slate-800">{peca.recorte}x</div>
                    </div>
                  )}
                  {peca.pes > 0 && (
                    <div className="bg-gray-100 rounded p-2 text-center border border-slate-300">
                      <div className="text-xs text-slate-600">Pés</div>
                      <div className="font-bold text-slate-800">{peca.pes}x</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - APENAS EM MODO EDIÇÃO */}
        {modoEdicao && (
          <div className="bg-gray-100 px-6 py-3 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
            <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button variant="primary" onClick={onSalvar}>Salvar</Button>
          </div>
        )}
      </div>
    </div>
  );
};
