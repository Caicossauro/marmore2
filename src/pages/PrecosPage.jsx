import { useState } from 'react';
import { usePrecos } from '../hooks/usePrecos';
import { PRECOS_PADRAO } from '../constants/config';
import { formatBRL } from '../utils/formatters';
import { ChevronDownIcon } from '../constants/icons';
import { InputMoedaBR } from '../components/forms/InputMoedaBR';
import { Button } from '../components/ui/Button';

const ACABAMENTOS = [
  { chave: 'polimento', label: 'Polimento' },
  { chave: 'esquadria', label: 'Esquadria' },
  { chave: 'boleado', label: 'Boleado' },
  { chave: 'canal', label: 'Canal' },
];

const RECORTES = [
  { chave: 'pia', label: 'Pia' },
  { chave: 'cubaEsculpida', label: 'Cuba Esculpida' },
  { chave: 'cooktop', label: 'Cooktop' },
  { chave: 'recorte', label: 'Recorte Avulso' },
  { chave: 'pes', label: 'Pés' },
];

const DESLOCAMENTO = [
  { chave: 'valorPorKm',                label: 'Valor por km rodado' },
  { chave: 'hotelPorPessoaDia',         label: 'Hotel (por pessoa / noite)' },
  { chave: 'alimentacaoPorPessoaDia',   label: 'Alimentação (por pessoa / dia)' },
  { chave: 'valorEstacionamentoPorDia', label: 'Estacionamento (por diária)' },
];

const MAO_DE_OBRA = [
  { chave: 'maoDeObraFixacaoPorMetro', label: 'Fixação na parede (por metro)' },
  { chave: 'maoDeObraValorGrapa',      label: 'Grapa (1 a cada 60cm)' },
  { chave: 'maoDeObraValorPU',         label: 'P.U. (1 a cada 2 grapas)' },
  { chave: 'maoDeObraMontagemPorM2',   label: 'Montagem do ambiente (por m²)' },
];

const Campo = ({ label, valorPadrao, mostraRestaurar, onRestaurar, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
      <span>{label}</span>
      <span className="text-xs text-slate-400 font-normal">padrão: {formatBRL(valorPadrao)}</span>
      {mostraRestaurar && (
        <button
          type="button"
          onClick={onRestaurar}
          title="Restaurar valor padrão"
          className="text-slate-400 hover:text-slate-600 transition-colors text-base leading-none"
        >
          ↺
        </button>
      )}
    </label>
    {children}
  </div>
);

function CampoPreco({ chave, label, precos, atualizarPreco }) {
  const valorAtual = precos[chave] ?? 0;
  const valorPadrao = PRECOS_PADRAO[chave] ?? 0;
  const difereDoPadrao = valorAtual !== valorPadrao;

  return (
    <Campo
      label={label}
      valorPadrao={valorPadrao}
      mostraRestaurar={difereDoPadrao}
      onRestaurar={() => atualizarPreco(chave, valorPadrao)}
    >
      <InputMoedaBR
        value={valorAtual}
        onChange={(v) => atualizarPreco(chave, v)}
        ariaLabel={`Preço de ${label}`}
        className="max-w-[140px]"
      />
    </Campo>
  );
}

export default function PrecosPage() {
  const { precos, precosSalvos, erroSalvar, atualizarPreco, salvarPrecos } = usePrecos();
  const [salvando, setSalvando] = useState(false);
  const [secoes, setSecoes] = useState({ acabamentos: true, recortes: true, deslocamento: true, maoDeObra: true });

  const toggleSecao = (s) => setSecoes(prev => ({ ...prev, [s]: !prev[s] }));

  const handleSalvar = async () => {
    setSalvando(true);
    await salvarPrecos();
    setSalvando(false);
  };

  return (
    <div className="p-6">
      <div className="bg-gray-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden">

        <div className="flex items-stretch justify-between border-b border-slate-200">
          <div className="flex items-stretch">
            <div className="flex flex-col justify-center px-5 py-[18px]">
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">Preços Padrão</h1>
              <p className="text-xs text-slate-900 mt-0.5">
                Valores aplicados automaticamente ao criar um novo orçamento
              </p>
            </div>
          </div>
          <div className="px-5 py-[18px]" />
        </div>

        <div
          className="bg-marble marble-section-hover border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
          style={{ backgroundPosition: '15% 25%' }}
          onClick={() => toggleSecao('acabamentos')}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Acabamentos</h2>
            <span className="text-xs text-white/70 font-normal normal-case tracking-normal">R$/metro linear</span>
          </div>
          <ChevronDownIcon size={16} className={`text-white transition-transform duration-300 ${secoes.acabamentos ? 'rotate-0' : '-rotate-90'}`} />
        </div>
        <div style={{ height: secoes.acabamentos ? 'auto' : '0px', overflow: 'hidden', contain: 'layout' }}>
          <div style={{
            transform: secoes.acabamentos ? 'translateY(0)' : 'translateY(-6px)',
            opacity: secoes.acabamentos ? 1 : 0,
            transition: 'transform 0.2s ease-out, opacity 0.15s ease-out',
            willChange: 'transform, opacity'
          }}>
            <div className="bg-gray-100 px-5 pt-5 pb-12 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ACABAMENTOS.map(campo => (
                  <CampoPreco
                    key={campo.chave}
                    chave={campo.chave}
                    label={campo.label}
                    precos={precos}
                    atualizarPreco={atualizarPreco}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="bg-marble marble-section-hover border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
          style={{ backgroundPosition: '80% 75%' }}
          onClick={() => toggleSecao('recortes')}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recortes</h2>
            <span className="text-xs text-white/70 font-normal normal-case tracking-normal">R$/unidade</span>
          </div>
          <ChevronDownIcon size={16} className={`text-white transition-transform duration-300 ${secoes.recortes ? 'rotate-0' : '-rotate-90'}`} />
        </div>
        <div style={{ height: secoes.recortes ? 'auto' : '0px', overflow: 'hidden', contain: 'layout' }}>
          <div style={{
            transform: secoes.recortes ? 'translateY(0)' : 'translateY(-6px)',
            opacity: secoes.recortes ? 1 : 0,
            transition: 'transform 0.2s ease-out, opacity 0.15s ease-out',
            willChange: 'transform, opacity'
          }}>
            <div className="bg-gray-100 px-5 pt-5 pb-12 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RECORTES.map(campo => (
                  <CampoPreco
                    key={campo.chave}
                    chave={campo.chave}
                    label={campo.label}
                    precos={precos}
                    atualizarPreco={atualizarPreco}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="bg-marble marble-section-hover border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
          style={{ backgroundPosition: '40% 50%' }}
          onClick={() => toggleSecao('deslocamento')}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Deslocamento</h2>
            <span className="text-xs text-white/70 font-normal normal-case tracking-normal">entrega e medição</span>
          </div>
          <ChevronDownIcon size={16} className={`text-white transition-transform duration-300 ${secoes.deslocamento ? 'rotate-0' : '-rotate-90'}`} />
        </div>
        <div style={{ height: secoes.deslocamento ? 'auto' : '0px', overflow: 'hidden', contain: 'layout' }}>
          <div style={{
            transform: secoes.deslocamento ? 'translateY(0)' : 'translateY(-6px)',
            opacity: secoes.deslocamento ? 1 : 0,
            transition: 'transform 0.2s ease-out, opacity 0.15s ease-out',
            willChange: 'transform, opacity'
          }}>
            <div className="bg-gray-100 px-5 pt-5 pb-12 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DESLOCAMENTO.map(campo => (
                  <CampoPreco
                    key={campo.chave}
                    chave={campo.chave}
                    label={campo.label}
                    precos={precos}
                    atualizarPreco={atualizarPreco}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="bg-marble marble-section-hover border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
          style={{ backgroundPosition: '60% 30%' }}
          onClick={() => toggleSecao('maoDeObra')}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Mão de Obra</h2>
            <span className="text-xs text-white/70 font-normal normal-case tracking-normal">fixação e montagem</span>
          </div>
          <ChevronDownIcon size={16} className={`text-white transition-transform duration-300 ${secoes.maoDeObra ? 'rotate-0' : '-rotate-90'}`} />
        </div>
        <div style={{ height: secoes.maoDeObra ? 'auto' : '0px', overflow: 'hidden', contain: 'layout' }}>
          <div style={{
            transform: secoes.maoDeObra ? 'translateY(0)' : 'translateY(-6px)',
            opacity: secoes.maoDeObra ? 1 : 0,
            transition: 'transform 0.2s ease-out, opacity 0.15s ease-out',
            willChange: 'transform, opacity'
          }}>
            <div className="bg-gray-100 px-5 pt-5 pb-12 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MAO_DE_OBRA.map(campo => (
                  <CampoPreco
                    key={campo.chave}
                    chave={campo.chave}
                    label={campo.label}
                    precos={precos}
                    atualizarPreco={atualizarPreco}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 flex items-center justify-end gap-2 px-5 py-5 border-t border-slate-200">
          {erroSalvar && (
            <span className="text-sm text-red-500 mr-auto">{erroSalvar}</span>
          )}
          {precosSalvos ? (
            <span className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              ✓ Salvo
            </span>
          ) : (
            <Button variant="primary" size="lg" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
