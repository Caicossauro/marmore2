import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useMaterials, materialVazio } from '../hooks/useMaterials';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { FormField } from '../components/forms/FormField';
import { ChevronDownIcon } from '../constants/icons';
import { getTiposMaterial, saveTiposMaterial, getAcabamentosMaterial, saveAcabamentosMaterial } from '../utils/database';
import { TIPOS_MATERIAL_PADRAO, ACABAMENTOS_MATERIAL_PADRAO } from '../constants/config';
import { Button } from '../components/ui/Button';

const mapearTipoAutomatico = (tipoCsv, nome = '') => {
  const mapaTipo = {
    'Mármore': 'Mármore',
    'Granito': 'Granito',
    'Quartzito': 'Quartzito',
    'Quartzo': 'Quartzito',
    'Glass': 'Porcelanato',
    'Lâmina': 'Pedra Natural',
    'Prime': 'Porcelanato',
    'Onix': 'Pedra Natural',
    'Limestone': 'Pedra Natural',
  };

  if (tipoCsv && mapaTipo[tipoCsv]) return mapaTipo[tipoCsv];

  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes('mármore') || nomeLower.includes('marble')) return 'Mármore';
  if (nomeLower.includes('granito') || nomeLower.includes('granite')) return 'Granito';
  if (nomeLower.includes('quartzo') || nomeLower.includes('quartz')) return 'Quartzito';
  if (nomeLower.includes('porcelanato') || nomeLower.includes('porcelain')) return 'Porcelanato';
  if (nomeLower.includes('pedra') || nomeLower.includes('stone') || nomeLower.includes('lâmina')) return 'Pedra Natural';

  return tipoCsv || 'Outro';
};

const sortPtBR = (arr) => [...arr].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

// Cache em memória — evita leituras repetidas ao Firebase a cada abertura do formulário
let _tiposCache = null;
let _acabamentosCache = null;

const Secao = ({ titulo, bgPos, children }) => {
  const [aberta, setAberta] = useState(true);
  return (
    <>
      <div
        className="bg-marble border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
        style={{ backgroundPosition: bgPos, transition: 'filter 0.15s ease', willChange: 'filter' }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
        onMouseLeave={e => e.currentTarget.style.filter = ''}
        onClick={() => setAberta(v => !v)}
      >
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{titulo}</h2>
        <ChevronDownIcon
          size={16}
          className={`text-white transition-transform duration-300 ${aberta ? 'rotate-0' : '-rotate-90'}`}
        />
      </div>
      <div style={{ contain: 'layout', display: 'grid', gridTemplateRows: aberta ? '1fr' : '0fr', transition: 'grid-template-rows 0.26s ease', willChange: 'grid-template-rows' }}>
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </>
  );
};

export default function MaterialFormPage() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdicao  = Boolean(id);

  const { adicionarMaterial, atualizarMaterial, buscarMaterialPorId, excluirMaterial, carregando, materiais } = useMaterials();

  const [form, setForm]             = useState(materialVazio());
  const [erros, setErros]           = useState({});
  const [salvando, setSalvando]     = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [tipos, setTipos]                     = useState(TIPOS_MATERIAL_PADRAO);
  const [adicionandoTipo, setAdicionandoTipo] = useState(false);
  const [novoTipo, setNovoTipo]               = useState('');
  const novoTipoRef                           = useRef(null);

  const [acabamentos, setAcabamentos]                 = useState(ACABAMENTOS_MATERIAL_PADRAO);
  const [adicionandoAcabamento, setAdicionandoAcabamento] = useState(false);
  const [novoAcabamento, setNovoAcabamento]           = useState('');
  const novoAcabamentoRef                             = useRef(null);

  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const salvouRef   = useRef(false);
  const carregouRef = useRef(false);


  useEffect(() => {
    if (_tiposCache) {
      setTipos(_tiposCache);
    } else {
      getTiposMaterial().then(t => {
        if (t?.length) { _tiposCache = sortPtBR(t); setTipos(_tiposCache); }
      });
    }
    if (_acabamentosCache) {
      setAcabamentos(_acabamentosCache);
    } else {
      getAcabamentosMaterial().then(a => {
        if (a?.length) { _acabamentosCache = sortPtBR(a); setAcabamentos(_acabamentosCache); }
      });
    }
  }, []);

  useEffect(() => {
    if (adicionandoTipo) novoTipoRef.current?.focus();
  }, [adicionandoTipo]);

  useEffect(() => {
    if (adicionandoAcabamento) novoAcabamentoRef.current?.focus();
  }, [adicionandoAcabamento]);

  const handleConfirmarNovoAcabamento = async () => {
    const nome = novoAcabamento.trim();
    if (!nome) return;
    const jaExiste = acabamentos.some(a => a.toLowerCase() === nome.toLowerCase());
    if (!jaExiste) {
      const novaLista = sortPtBR([...acabamentos, nome]);
      _acabamentosCache = novaLista;
      setAcabamentos(novaLista);
      await saveAcabamentosMaterial(novaLista);
    }
    set('acabamento', jaExiste ? acabamentos.find(a => a.toLowerCase() === nome.toLowerCase()) : nome);
    setNovoAcabamento('');
    setAdicionandoAcabamento(false);
  };

  const handleConfirmarNovoTipo = async () => {
    const nome = novoTipo.trim();
    if (!nome) return;
    const jaExiste = tipos.some(t => t.toLowerCase() === nome.toLowerCase());
    if (!jaExiste) {
      const novaLista = sortPtBR([...tipos, nome]);
      _tiposCache = novaLista;
      setTipos(novaLista);
      await saveTiposMaterial(novaLista);
    }
    set('tipo', jaExiste ? tipos.find(t => t.toLowerCase() === nome.toLowerCase()) : nome);
    setNovoTipo('');
    setAdicionandoTipo(false);
  };

  const temAlteracoesRef = useRef(false);
  temAlteracoesRef.current = temAlteracoes;

  const blocker = useBlocker(() => temAlteracoesRef.current && !salvouRef.current);

  useEffect(() => {
    if (!temAlteracoes) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [temAlteracoes]);

  const set = useCallback((campo, valor) => {
    setTemAlteracoes(true);
    setForm(prev => ({ ...prev, [campo]: valor }));
    setErros(prev => prev[campo] ? { ...prev, [campo]: '' } : prev);
  }, []);

  // Sugerir tipo automaticamente baseado no nome (só para novos materiais)
  useEffect(() => {
    if (isEdicao || !form.nome.trim() || form.tipo) return;
    const tipoSugerido = mapearTipoAutomatico('', form.nome);
    if (tipoSugerido && tipoSugerido !== 'Outro') {
      setForm(prev => ({ ...prev, tipo: tipoSugerido }));
    }
  }, [form.nome, form.tipo, isEdicao]);

  // Carregar dados do material para edição — roda só uma vez
  useEffect(() => {
    if (!isEdicao || carregando || materiais.length === 0) return;
    if (carregouRef.current) return;
    const m = buscarMaterialPorId(id);
    if (!m) return;
    carregouRef.current = true;

    let dimensoes;
    if (m.dimensoes?.length) {
      dimensoes = m.dimensoes.map(d => ({
        largura:   d.largura   != null ? String(d.largura)   : '',
        altura:    d.altura    != null ? String(d.altura)    : '',
        espessura: d.espessura != null ? String(d.espessura) : '',
      }));
    } else {
      dimensoes = [{
        largura:   m.largura   != null ? String(m.largura)   : '',
        altura:    m.altura    != null ? String(m.altura)    : '',
        espessura: m.espessura != null ? String(m.espessura) : '',
      }];
    }
    setForm({
      nome:       m.nome       ?? '',
      tipo:       mapearTipoAutomatico(m.tipo, m.nome) || '',
      acabamento: m.acabamento ?? '',
      origem:     m.origem     ?? '',
      dimensoes,
      url:        m.url        ?? '',
    });
    setTemAlteracoes(false);
  }, [isEdicao, carregando, id, buscarMaterialPorId, materiais]);

  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    if (!form.tipo)        e.tipo = 'Tipo é obrigatório.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setSalvando(true);
    const dimensoesFiltradas = form.dimensoes
      .map(d => ({
        largura:   d.largura   !== '' ? Number(d.largura)   : null,
        altura:    d.altura    !== '' ? Number(d.altura)    : null,
        espessura: d.espessura !== '' ? Number(d.espessura) : null,
      }))
      .filter(d => d.largura != null || d.altura != null || d.espessura != null);

    const p = dimensoesFiltradas[0] ?? {};
    const payload = {
      ...form,
      dimensoes: dimensoesFiltradas,
      largura:   p.largura   ?? null,
      altura:    p.altura    ?? null,
      espessura: p.espessura ?? null,
    };
    if (isEdicao) await atualizarMaterial(id, payload);
    else          await adicionarMaterial(payload);
    setSalvando(false);
    salvouRef.current = true;
    navigate('/materiais');
  };

  const setDim = useCallback((idx, campo, valor) => {
    setTemAlteracoes(true);
    setForm(prev => ({
      ...prev,
      dimensoes: prev.dimensoes.map((d, i) => i === idx ? { ...d, [campo]: valor } : d),
    }));
  }, []);

  const addDim = useCallback(() => {
    setTemAlteracoes(true);
    setForm(prev => ({ ...prev, dimensoes: [...prev.dimensoes, { largura: '', altura: '', espessura: '' }] }));
  }, []);

  const removeDim = useCallback((idx) => {
    setTemAlteracoes(true);
    setForm(prev => ({ ...prev, dimensoes: prev.dimensoes.filter((_, i) => i !== idx) }));
  }, []);

  if (isEdicao && (carregando || materiais.length === 0)) {
    return (
      <div className="p-1 sm:p-2 flex items-center justify-center py-20">
        <p className="text-slate-400 text-sm">Carregando material...</p>
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
              onClick={() => navigate('/materiais')}
              className="marble-btn-dark-red text-white px-9 flex items-center shrink-0 rounded-none"
              aria-label="Voltar"
            >
              <span className="relative z-10">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </span>
            </button>
            <div className="flex flex-col justify-center px-4 py-[18px]">
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">
                {isEdicao ? 'Editar Material' : 'Novo Material'}
              </h1>
              <p className="text-xs text-slate-900 mt-0.5">
                {isEdicao ? 'Atualize os dados do material' : 'Preencha os dados para cadastrar'}
              </p>
            </div>
          </div>
          <div className="px-5 py-[18px]" />
        </div>

        <form id="form-material" onSubmit={handleSubmit} onDragStart={e => e.preventDefault()} noValidate>

          {/* ── Identificação ── */}
          <Secao titulo="Identificação" bgPos="15% 25%">
              <div className="bg-gray-100 px-5 pt-5 pb-12 space-y-4 border-b border-slate-200">
                <FormField label="Nome" obrigatorio erro={erros.nome}>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => set('nome', e.target.value)}
                    className={`input-base${erros.nome ? ' input-base-error' : ''}`}
                    placeholder="Ex: Paraná Novulatto"
                    autoFocus
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Tipo" obrigatorio erro={erros.tipo}>
                    {adicionandoTipo ? (
                      <div className="flex gap-1.5">
                        <input
                          ref={novoTipoRef}
                          type="text"
                          value={novoTipo}
                          onChange={e => setNovoTipo(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleConfirmarNovoTipo(); }
                            if (e.key === 'Escape') { setNovoTipo(''); setAdicionandoTipo(false); }
                          }}
                          placeholder="Nome do novo tipo..."
                          className="input-base"
                        />
                        <Button type="button" variant="primary" size="sm" onClick={handleConfirmarNovoTipo} title="Confirmar">
                          ✓
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setNovoTipo(''); setAdicionandoTipo(false); }} title="Cancelar">
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <select
                        value={form.tipo}
                        onChange={e => {
                          if (e.target.value === '__novo__') { setAdicionandoTipo(true); }
                          else { set('tipo', e.target.value); }
                        }}
                        className={`input-base${erros.tipo ? ' input-base-error' : ''}`}
                      >
                        <option value="">Selecionar...</option>
                        {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                        <option value="__novo__">+ Adicionar tipo...</option>
                      </select>
                    )}
                  </FormField>

                  <FormField label="Acabamento">
                    {adicionandoAcabamento ? (
                      <div className="flex gap-1.5">
                        <input
                          ref={novoAcabamentoRef}
                          type="text"
                          value={novoAcabamento}
                          onChange={e => setNovoAcabamento(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleConfirmarNovoAcabamento(); }
                            if (e.key === 'Escape') { setNovoAcabamento(''); setAdicionandoAcabamento(false); }
                          }}
                          placeholder="Nome do novo acabamento..."
                          className="input-base"
                        />
                        <Button type="button" variant="primary" size="sm" onClick={handleConfirmarNovoAcabamento} title="Confirmar">
                          ✓
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setNovoAcabamento(''); setAdicionandoAcabamento(false); }} title="Cancelar">
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <select
                        value={form.acabamento}
                        onChange={e => {
                          if (e.target.value === '__novo__') { setAdicionandoAcabamento(true); }
                          else { set('acabamento', e.target.value); }
                        }}
                        className="input-base"
                      >
                        <option value="">Selecionar...</option>
                        {acabamentos.map(a => <option key={a} value={a}>{a}</option>)}
                        <option value="__novo__">+ Adicionar acabamento...</option>
                      </select>
                    )}
                  </FormField>

                  <FormField label="Origem">
                    <input
                      type="text"
                      value={form.origem}
                      onChange={e => set('origem', e.target.value)}
                      className="input-base"
                      placeholder="Ex: Paraná, Itália..."
                    />
                  </FormField>
                </div>

                <FormField label="URL de referência">
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => set('url', e.target.value)}
                    className="input-base"
                    placeholder="https://..."
                  />
                </FormField>
              </div>
          </Secao>

          {/* ── Dimensões ── */}
          <Secao titulo="Dimensões da chapa (mm)" bgPos="80% 75%">
              <div className="bg-gray-100 px-5 py-5 space-y-3">

                {/* Cabeçalho das colunas */}
                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 2rem' }}>
                  <span className="text-sm font-medium text-slate-700">Largura (mm)</span>
                  <span className="text-sm font-medium text-slate-700">Altura (mm)</span>
                  <span className="text-sm font-medium text-slate-700">Espessura (mm)</span>
                  <span />
                </div>

                {form.dimensoes.map((dim, idx) => (
                  <div key={idx} className="grid gap-3 items-center" style={{ gridTemplateColumns: '1fr 1fr 1fr 2rem' }}>
                    <input
                      type="number"
                      value={dim.largura}
                      onChange={e => setDim(idx, 'largura', e.target.value)}
                      className="input-base"
                      placeholder="3220"
                      min={0}
                    />
                    <input
                      type="number"
                      value={dim.altura}
                      onChange={e => setDim(idx, 'altura', e.target.value)}
                      className="input-base"
                      placeholder="2010"
                      min={0}
                    />
                    <input
                      type="number"
                      value={dim.espessura}
                      onChange={e => setDim(idx, 'espessura', e.target.value)}
                      className="input-base"
                      placeholder="20"
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => removeDim(idx)}
                      disabled={form.dimensoes.length === 1}
                      title="Remover dimensão"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDim}
                  className="mt-1 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span className="text-base leading-none">+</span> Adicionar dimensão
                </button>
              </div>
          </Secao>

          {/* ── Botões de ação ── */}
          <div className="bg-gray-100 flex items-center justify-end gap-2 px-5 py-5 border-t border-slate-200">
            {isEdicao && (
              <Button variant="destructive" size="lg" onClick={() => setConfirmarExclusao(true)}>
                Excluir
              </Button>
            )}
            <Button type="submit" variant="primary" size="lg" form="form-material" disabled={salvando}>
              {salvando ? 'Salvando...' : isEdicao ? 'Salvar' : 'Criar material'}
            </Button>
          </div>

        </form>
      </div>

      {confirmarExclusao && (
        <ConfirmDialog
          mensagem="Deseja realmente excluir este material? Orçamentos que o usam podem ficar inconsistentes."
          onConfirmar={async () => {
            salvouRef.current = true;
            await excluirMaterial(id);
            navigate('/materiais');
          }}
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
