import { Button } from '../ui/Button';

export const ModalNovoOrcamento = ({ aberto, nome, onChangeNome, onConfirmar, onFechar }) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Novo Orçamento</h2>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nome do Orçamento
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => onChangeNome(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onConfirmar();
                }
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
              placeholder="Ex: Cliente João Silva - Cozinha"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button variant="primary" onClick={onConfirmar}>Criar Orçamento</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
