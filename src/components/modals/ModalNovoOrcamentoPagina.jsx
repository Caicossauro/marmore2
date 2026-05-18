import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

function ClienteCombobox({ clientes, value, onChange }) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const selecionar = (cliente) => {
    onChange(cliente);
    setBusca('');
    setAberto(false);
  };

  const limpar = () => {
    onChange(null);
    setBusca('');
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
        <span className="flex-1 text-sm text-slate-800 font-medium">{value.nome}</span>
        <button
          type="button"
          onClick={limpar}
          className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          aria-label="Limpar seleção"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder="Buscar cliente pelo nome..."
        value={busca}
        onChange={e => { setBusca(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none"
      />
      {aberto && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtrados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">
              {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
            </li>
          ) : (
            filtrados.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selecionar(c)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{c.nome}</span>
                  {c.telefone && (
                    <span className="ml-2 text-slate-400 text-xs">{c.telefone}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function ModalNovoOrcamentoPagina({ clientes, onCriar, onCancelar, onAbrirNovoCliente }) {
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [descricao, setDescricao] = useState('');

  const nomePreview = clienteSelecionado
    ? descricao.trim()
      ? `${clienteSelecionado.nome} - ${descricao.trim()}`
      : clienteSelecionado.nome
    : '';

  const handleCriar = () => {
    if (!clienteSelecionado) return;
    onCriar(clienteSelecionado, descricao.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-5">Novo Orçamento</h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Cliente <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={onAbrirNovoCliente}
                className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors"
              >
                + Novo cliente
              </button>
            </div>
            <ClienteCombobox
              clientes={clientes}
              value={clienteSelecionado}
              onChange={setClienteSelecionado}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Cozinha, Banheiro..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && clienteSelecionado) handleCriar();
                if (e.key === 'Escape') onCancelar();
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none"
            />
          </div>

          {nomePreview && (
            <div className="bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
              <p className="text-xs text-slate-500 mb-0.5">Nome do orçamento</p>
              <p className="text-sm font-semibold text-slate-800">{nomePreview}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
          <Button variant="primary" onClick={handleCriar} disabled={!clienteSelecionado}>
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}
