import { formatBRL } from '../../utils/formatters';
import { CONFIG_CHAPA_PADRAO } from '../../constants/config';
import { Button } from '../ui/Button';

export const ModalNovaChapa = ({
  aberto,
  materiais,
  materialSelecionadoId,
  onChangeMaterial,
  materiaisConfig,
  onConfirmar,
  onFechar,
}) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Adicionar Nova Chapa</h2>
          <button
            onClick={onFechar}
            className="text-slate-300 hover:text-white transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            A chapa vazia será cobrada pelo preço de custo. Ao arrastar peças para ela, a área
            ocupada passa a ser cobrada pelo preço de venda.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
            <select
              value={materialSelecionadoId}
              onChange={(e) => onChangeMaterial(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              autoFocus
            >
              {materiais.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.nome}
                </option>
              ))}
            </select>
          </div>

          {materialSelecionadoId && (() => {
            const config =
              materiaisConfig?.[materialSelecionadoId] || CONFIG_CHAPA_PADRAO;
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Dimensões:</span>
                  <strong className="text-slate-800">
                    {config.comprimento} × {config.altura} mm
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Custo da chapa:</span>
                  <strong className="text-slate-800">
                    {formatBRL(((config.comprimento * config.altura) / 1000000) * config.custo)}
                  </strong>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirmar} disabled={!materialSelecionadoId}>
            Criar Chapa
          </Button>
        </div>
      </div>
    </div>
  );
};
