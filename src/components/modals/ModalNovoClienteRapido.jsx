import { useState } from 'react';
import { Button } from '../ui/Button';

export function ModalNovoClienteRapido({ onCriar, onCancelar }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const mascaraTel = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSalvando(true);
    await onCriar({ nome: nome.trim(), telefone });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-4">Novo Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={nome}
              onChange={e => { setNome(e.target.value); setErro(''); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none ${erro ? 'border-red-400' : 'border-slate-300'}`}
              placeholder="Nome completo"
            />
            {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(mascaraTel(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
