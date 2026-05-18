import { X } from '../../constants/icons';

export const CadastroMaterial = ({
  modo,
  material,
  onChangeMaterial,
  onSalvar,
  onCancelar,
}) => {
  const isNovo = modo === 'novo';
  const titulo = isNovo ? 'Novo Material' : 'Editar Material';
  const placeholder = isNovo
    ? 'Ex: Mármore Branco Carrara, Granito Preto, Quartzo Branco'
    : 'Ex: Mármore Branco Carrara';
  const textoBotao = isNovo ? '✓ Salvar Material' : '✓ Salvar Alterações';

  return (
    <div className="bg-gray-100 rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{titulo}</h2>
        <button
          onClick={onCancelar}
          className="text-gray-600 hover:text-gray-800"
        >
          <X size={24} />
        </button>
      </div>

      {isNovo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> As dimensões e preços da chapa serão configurados individualmente em cada orçamento.
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Material *</label>
        <input
          type="text"
          value={material.nome}
          onChange={(e) => onChangeMaterial({ nome: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSalvar}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          {textoBotao}
        </button>
        <button
          onClick={onCancelar}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
