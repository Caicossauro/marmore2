import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { SecaoAcordeao } from '../components/forms/SecaoAcordeao';
import { FormField } from '../components/forms/FormField';
import { useClienteForm } from '../hooks/useClienteForm';
import { Button } from '../components/ui/Button';

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
      <div className="p-1 sm:p-2 flex items-center justify-center py-20">
        <p className="text-slate-400 text-sm">Carregando cliente...</p>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2">
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
              <FormField label="Nome" obrigatorio erro={erros.nome}>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  className={`input-base${erros.nome ? ' input-base-error' : ''}`}
                  placeholder="Nome completo"
                  autoFocus
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={handleTelefone}
                    className="input-base"
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                  />
                </FormField>
                <FormField label="CPF / CNPJ" erro={erros.cpfCnpj}>
                  <input
                    type="text"
                    value={form.cpfCnpj}
                    onChange={handleCpfCnpj}
                    className={`input-base${erros.cpfCnpj ? ' input-base-error' : ''}`}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                  />
                </FormField>
                <FormField label="RG" erro={erros.rg}>
                  <input
                    type="text"
                    value={form.rg}
                    onChange={handleRg}
                    className={`input-base${erros.rg ? ' input-base-error' : ''}`}
                    placeholder="00.000.000-0"
                    inputMode="numeric"
                  />
                </FormField>
              </div>

              <FormField label="E-mail" erro={erros.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={`input-base${erros.email ? ' input-base-error' : ''}`}
                  placeholder="email@exemplo.com"
                />
              </FormField>
            </div>
          </SecaoAcordeao>

          {/* ── Endereço ── */}
          <SecaoAcordeao titulo="Endereço" aberta={secoes.endereco} onToggle={() => toggleSecao('endereco')} backgroundPosition="50% 50%">
            <div className="bg-gray-100 px-5 pt-5 pb-12 space-y-4 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="CEP">
                  <div className="relative">
                    <input
                      type="text"
                      value={form.endereco.cep}
                      onChange={handleCep}
                      className={`input-base${cepErro ? ' input-base-error' : ''}`}
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
                  {cepErro && <p className="mt-1 text-xs text-status-danger">{cepErro}</p>}
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Rua / Logradouro">
                    <input
                      type="text"
                      value={form.endereco.rua}
                      onChange={e => setEnd('rua', e.target.value)}
                      className="input-base"
                      placeholder="Rua, Avenida..."
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField label="Número">
                  <input
                    type="text"
                    value={form.endereco.numero}
                    onChange={e => setEnd('numero', e.target.value)}
                    className="input-base"
                    placeholder="123"
                  />
                </FormField>
                <div className="col-span-1 sm:col-span-3">
                  <FormField label="Complemento">
                    <input
                      type="text"
                      value={form.endereco.complemento}
                      onChange={e => setEnd('complemento', e.target.value)}
                      className="input-base"
                      placeholder="Apto, bloco..."
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Bairro">
                  <input
                    type="text"
                    value={form.endereco.bairro}
                    onChange={e => setEnd('bairro', e.target.value)}
                    className="input-base"
                  />
                </FormField>
                <FormField label="Cidade">
                  <input
                    type="text"
                    value={form.endereco.cidade}
                    onChange={e => setEnd('cidade', e.target.value)}
                    className="input-base"
                  />
                </FormField>
                <FormField label="UF">
                  <input
                    type="text"
                    value={form.endereco.uf}
                    onChange={e => setEnd('uf', e.target.value.toUpperCase().slice(0, 2))}
                    className="input-base"
                    placeholder="SP"
                    maxLength={2}
                  />
                </FormField>
              </div>
            </div>
          </SecaoAcordeao>

          {/* ── Observações ── */}
          <SecaoAcordeao titulo="Observações" aberta={secoes.observacoes} onToggle={() => toggleSecao('observacoes')} backgroundPosition="80% 75%">
            <div className="bg-gray-100 px-5 py-5">
              <FormField label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  rows={3}
                  className="input-base resize-none"
                  placeholder="Informações adicionais sobre o cliente..."
                />
              </FormField>
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
