import { Button } from '../ui/Button';

export const PainelPrecosOrcamento = ({
  aberto,
  precosTemp,
  onChangePrecosTemp,
  onSalvar,
  salvo,
}) => {
  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: aberto ? 1 : 0, display: aberto ? 'block' : 'none' }}
    >
      <div className="mb-6 bg-slate-50 border border-slate-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração de Preços deste Orçamento</h3>
        <p className="text-sm text-slate-600 mb-4">
          Estes preços são específicos deste orçamento e não afetam outros orçamentos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Acabamentos (R$/m)</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Polimento</label>
                <input
                  type="number"
                  value={precosTemp.polimento || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, polimento: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Esquadria</label>
                <input
                  type="number"
                  value={precosTemp.esquadria || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, esquadria: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Boleado</label>
                <input
                  type="number"
                  value={precosTemp.boleado || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, boleado: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Canal</label>
                <input
                  type="number"
                  value={precosTemp.canal || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, canal: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Recortes (R$/un)</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Pia</label>
                <input
                  type="number"
                  value={precosTemp.pia || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, pia: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Cuba Esculpida</label>
                <input
                  type="number"
                  value={precosTemp.cubaEsculpida || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, cubaEsculpida: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Cooktop</label>
                <input
                  type="number"
                  value={precosTemp.cooktop || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, cooktop: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Recorte</label>
                <input
                  type="number"
                  value={precosTemp.recorte || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, recorte: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Pés</label>
                <input
                  type="number"
                  value={precosTemp.pes || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, pes: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Deslocamento</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Valor por km (R$)</label>
                <input
                  type="number"
                  value={precosTemp.valorPorKm || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, valorPorKm: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Hotel por pessoa / noite (R$)</label>
                <input
                  type="number"
                  value={precosTemp.hotelPorPessoaDia || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, hotelPorPessoaDia: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Alimentação por pessoa / dia (R$)</label>
                <input
                  type="number"
                  value={precosTemp.alimentacaoPorPessoaDia || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, alimentacaoPorPessoaDia: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Estacionamento por diária (R$)</label>
                <input
                  type="number"
                  value={precosTemp.valorEstacionamentoPorDia || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, valorEstacionamentoPorDia: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Mão de Obra</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Fixação por metro (R$)</label>
                <input
                  type="number"
                  value={precosTemp.maoDeObraFixacaoPorMetro || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, maoDeObraFixacaoPorMetro: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Grapa (R$)</label>
                <input
                  type="number"
                  value={precosTemp.maoDeObraValorGrapa || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, maoDeObraValorGrapa: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">P.U. (R$)</label>
                <input
                  type="number"
                  value={precosTemp.maoDeObraValorPU || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, maoDeObraValorPU: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Montagem por m² do ambiente (R$)</label>
                <input
                  type="number"
                  value={precosTemp.maoDeObraMontagemPorM2 || 0}
                  onChange={(e) => onChangePrecosTemp({ ...precosTemp, maoDeObraMontagemPorM2: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {salvo ? (
            <span className="w-full max-w-md text-center px-4 py-2.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              ✓ Salvo
            </span>
          ) : (
            <Button variant="primary" size="lg" onClick={onSalvar} className="w-full max-w-md">
              Salvar Preços
            </Button>
          )}
          <p className="text-xs text-slate-500 mt-2 text-center">
            Clique para salvar e atualizar o plano de corte
          </p>
        </div>
      </div>
    </div>
  );
};
