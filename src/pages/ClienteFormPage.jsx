import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { SecaoAcordeao } from '../components/forms/SecaoAcordeao';
import { useClienteForm } from '../hooks/useClienteForm';
import { Button } from '../components/ui/Button';

const Campo = ({ label, obrigatorio, erro, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}
      {obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
  </div>
);

const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-colors';

const inputErroClass =
  'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 focus:outline-none transition-colors';

export default function ClienteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdicao = Boolean(id);

  const {
    form,
    set,
    setEnd,
    erros,
    salvando,
    buscandoCep,
    cepErro,
    handleTelefone,
    handleCpfCnpj,
    handleRg,
    handleCep,
    handleSubmit,
    blocker,
    excluir,
    carregando,
  } = useClienteForm({ id, isEdicao });

  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [secoes, setSecoes] = useState({ dadosPrincipais: true, endereco: true, observacoes: true });

  const toggleSecao = (s) => {
    setSecoes(prev => ({ ...prev, [s]: !prev[s] }));
  };

  if (isEdicao && carregando) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <p className="text-slate-400 text-sm">Carregando cliente...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-gray-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-stretch justify-between border-b border-slate-200">
          <div className="flex items-stretch">
            <button
              onClick={() => navigate('/clientes')}
              className="marble-btn-dark-red text-white px-9 flex items-center shrink-0 rounded-none"
              aria-label="Voltar"
            >
              <span className="relative z-10 flex items-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </span>
            </button>
            <div className="flex flex-col justify-center px-4 py-[18px]">
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">
                {isEdicao ? 'Editar Cliente' : 'Novo Cliente'}
              </h1>
              <p className="text-xs text-slate-900 mt-0.5">
                {isEdicao ? 'Atualize os dados do cliente' : 'Preencha os dados para cadastrar'}
              </p>
            </div>
          </div>
          <div className="px-5 py-[18px]" />
        </div>

        <form id="form-cliente" onSubmit={handleSubmit} onDragStart={e => e.preventDefault()} noValidate>

          {/* ── Dados principais ── */}
          <SecaoAcordeao titulo="Dados principais" aberta={secoes.dadosPrincipais} onToggle={() => toggleSecao('dadosPrincipais')} backgroundPosition="15% 25%">
            <div className="bg-gray-100 px-5 pt-5 pb-12 space-y-4 border-b border-slate-200">
              <Campo label="Nome" obrigatorio erro={erros.nome}>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  className={erros.nome ? inputErroClass : inputClass}
                  placeholder="Nome completo"
                  autoFocus
                />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={handleTelefone}
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                  />
                </Campo>
                <Campo label="CPF / CNPJ" erro={erros.cpfCnpj}>
                  <input
                    type="text"
                    value={form.cpfCnpj}
                    onChange={handleCpfCnpj}
                    className={erros.cpfCnpj ? inputErroClass : inputClass}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </Campo>
                <Campo label="RG" erro={erros.rg}>
                  <input
                    type="text"
                    value={form.rg}
                    onChange={handleRg}
                    className={erros.rg ? inputErroClass : inputClass}
                    placeholder="00.000.000-0"
                    inputMode="numeric"
                  />
                </Campo>
              </div>

              <Campo label="E-mail" erro={erros.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={erros.email ? inputErroClass : inputClass}
                  placeholder="email@exemplo.com"
                />
              </Campo>
            </div>
          </SecaoAcordeao>

          {/* ── Endereço ── */}
          <SecaoAcordeao titulo="Endereço" aberta={secoes.endereco} onToggle={() => toggleSecao('endereco')} backgroundPosition="50% 50%">
            <div className="bg-gray-100 px-5 pt-5 pb-12 space-y-4 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo label="CEP">
                  <div className="relative">
                    <input
                      type="text"
                      value={form.endereco.cep}
                      onChange={handleCep}
                      className={`${inputClass} ${cepErro ? 'border-red-400' : ''}`}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                    />
                    {buscandoCep && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        buscando...
                      </span>
                    )}
                  </div>
                  {cepErro && <p className="mt-1 text-xs text-red-500">{cepErro}</p>}
                </Campo>
                <div className="sm:col-span-2">
                  <Campo label="Rua / Logradouro">
                    <input
                      type="text"
                      value={form.endereco.rua}
                      onChange={e => setEnd('rua', e.target.value)}
                      className={inputClass}
                      placeholder="Rua, Avenida..."
                    />
                  </Campo>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Campo label="Número">
                  <input
                    type="text"
                    value={form.endereco.numero}
                    onChange={e => setEnd('numero', e.target.value)}
                    className={inputClass}
                    placeholder="123"
                  />
                </Campo>
                <div className="col-span-1 sm:col-span-3">
                  <Campo label="Complemento">
                    <input
                      type="text"
                      value={form.endereco.complemento}
                      onChange={e => setEnd('complemento', e.target.value)}
                      className={inputClass}
                      placeholder="Apto, bloco..."
                    />
                  </Campo>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo label="Bairro">
                  <input
                    type="text"
                    value={form.endereco.bairro}
                    onChange={e => setEnd('bairro', e.target.value)}
                    className={inputClass}
                  />
                </Campo>
                <Campo label="Cidade">
                  <input
                    type="text"
                    value={form.endereco.cidade}
                    onChange={e => setEnd('cidade', e.target.value)}
                    className={inputClass}
                  />
                </Campo>
                <Campo label="UF">
                  <input
                    type="text"
                    value={form.endereco.uf}
                    onChange={e => setEnd('uf', e.target.value.toUpperCase().slice(0, 2))}
                    className={inputClass}
                    placeholder="SP"
                    maxLength={2}
                  />
                </Campo>
              </div>
            </div>
          </SecaoAcordeao>

          {/* ── Observações ── */}
          <SecaoAcordeao titulo="Observações" aberta={secoes.observacoes} onToggle={() => toggleSecao('observacoes')} backgroundPosition="80% 75%">
            <div className="bg-gray-100 px-5 py-5">
              <Campo label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Informações adicionais sobre o cliente..."
                />
              </Campo>
            </div>
          </SecaoAcordeao>

          {/* ── Botões de ação ── */}
          <div className="bg-gray-100 flex items-center justify-end gap-2 px-5 py-5 border-t border-slate-200">
            {isEdicao && (
              <Button variant="destructive" size="lg" onClick={() => setConfirmarExclusao(true)}>
                Excluir
              </Button>
            )}
            <Button type="submit" variant="primary" size="lg" form="form-cliente" disabled={salvando}>
              {salvando ? 'Salvando...' : isEdicao ? 'Salvar' : 'Criar cliente'}
            </Button>
          </div>

        </form>
      </div>

      {confirmarExclusao && (
        <ConfirmDialog
          mensagem="Deseja realmente excluir este cliente? Orçamentos vinculados a ele não serão afetados."
          onConfirmar={excluir}
          onCancelar={() => setConfirmarExclusao(false)}
        />
      )}

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          mensagem="Há alterações não salvas. Deseja sair sem salvar?"
          onConfirmar={() => blocker.proceed()}
          onCancelar={() => blocker.reset()}
        />
      )}
    </div>
  );
}
