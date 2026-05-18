import { useEffect, useMemo, useState } from 'react';
import { MapaPreview } from './MapaPreview';
import { InputEnderecoAutocomplete } from './InputEnderecoAutocomplete';
import { useDistanciaRota } from '../../hooks/useDistanciaRota';
import {
  calcularDeslocamento, validarFuncionarios, validarDiasEntrega,
} from '../../utils/deslocamento';
import { formatBRL } from '../../utils/formatters';
import { ENDERECO_SAIDA_PADRAO } from '../../constants/config';
import { ChevronDownIcon } from '../../constants/icons';

const DESLOCAMENTO_VAZIO = {
  modoEntrega: 'estadia',
  enderecoSaida: ENDERECO_SAIDA_PADRAO.texto,
  enderecoChegada: '',
  coordsSaida: ENDERECO_SAIDA_PADRAO.coords,
  coordsChegada: null,
  kmIda: 0,
  pedagioIdaVolta: 0,
  funcionarios: 2,
  diasEntrega: 1,
  cobrarFrete: true,
  cobrarPedagio: true,
  cobrarHotel: true,
  cobrarAlimentacao: true,
  cobrarEstacionamento: true,
  cobrarMedicao: true,
};

const SeletorModo = ({ valor, onChange }) => {
  const opcoes = [
    {
      id: 'diario',
      titulo: 'Retorno diário',
      subtitulo: 'Equipe vai e volta todo dia',
      detalhe: 'Sem hospedagem. Km e pedágio × dias.',
    },
    {
      id: 'estadia',
      titulo: 'Estadia',
      subtitulo: 'Vai segunda, volta sexta',
      detalhe: 'Hotel cobrado. 1 viagem ida + 1 volta.',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {opcoes.map(op => {
        const ativo = valor === op.id;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => onChange(op.id)}
            className={`text-left rounded-lg border-2 px-3 py-2 transition-all ${
              ativo
                ? 'border-slate-700 bg-slate-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full border-2 ${
                ativo ? 'bg-slate-700 border-slate-700' : 'border-slate-400'
              }`} />
              <span className={`text-sm font-semibold ${ativo ? 'text-slate-800' : 'text-slate-600'}`}>
                {op.titulo}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 ml-5">{op.subtitulo}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 ml-5">{op.detalhe}</div>
          </button>
        );
      })}
    </div>
  );
};

const InputNumero = ({ label, value, onChange, min, max, sufixo, erro }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step="1"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          erro ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 focus:ring-slate-400'
        } ${sufixo ? 'pr-12' : ''}`}
      />
      {sufixo && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          {sufixo}
        </span>
      )}
    </div>
    {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
  </div>
);

const formatarDuracao = (segundos) => {
  if (!Number.isFinite(segundos) || segundos < 60) return null;
  const horas = Math.floor(segundos / 3600);
  const min = Math.round((segundos % 3600) / 60);
  if (horas === 0) return `${min} min`;
  if (min === 0) return `${horas}h`;
  return `${horas}h ${min}min`;
};

const LinhaResumo = ({ label, detalhe, valor, ativo = true, onToggleAtivo }) => (
  <div
    className={`flex items-baseline justify-between py-1.5 border-b border-slate-200 last:border-0 transition-opacity ${
      ativo ? '' : 'opacity-50'
    }`}
  >
    <div className="flex items-center gap-2">
      {onToggleAtivo && (
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => onToggleAtivo(e.target.checked)}
          className="w-4 h-4 accent-slate-700 cursor-pointer"
          title={ativo ? 'Desativar cobrança' : 'Ativar cobrança'}
        />
      )}
      <div>
        <span className={`text-sm font-medium ${ativo ? 'text-slate-700' : 'text-slate-500 line-through'}`}>
          {label}
        </span>
        {detalhe && ativo && <span className="text-xs text-slate-500 ml-2">{detalhe}</span>}
      </div>
    </div>
    <span className="text-sm font-semibold text-slate-800">{formatBRL(ativo ? valor : 0)}</span>
  </div>
);

export function BlocoDeslocamento({ deslocamento, onChange, precos }) {
  const d = useMemo(() => ({ ...DESLOCAMENTO_VAZIO, ...(deslocamento || {}) }), [deslocamento]);

  // Hook calcula km a partir de coords (do autocomplete) ou geocode dos endereços livres.
  const rota = useDistanciaRota(
    { endereco: d.enderecoSaida, coords: d.coordsSaida },
    { endereco: d.enderecoChegada, coords: d.coordsChegada }
  );

  // Quando o hook resolve um km diferente do que está salvo, persiste.
  useEffect(() => {
    if (rota.km != null && rota.km !== d.kmIda) {
      onChange({ ...d, kmIda: rota.km });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rota.km]);

  const set = (campo, valor) => onChange({ ...d, [campo]: valor });

  // coords === undefined: preserva as coords atuais (usuário só editou o texto)
  // coords === null:      limpa explicitamente (botão ✕)
  // coords === objeto:    fixa nova localização (seleção do autocomplete)
  const onMudarSaida = (texto, coords) => {
    onChange({
      ...d,
      enderecoSaida: texto,
      coordsSaida: coords === undefined ? d.coordsSaida : coords,
    });
  };

  const onMudarChegada = (texto, coords) => {
    onChange({
      ...d,
      enderecoChegada: texto,
      coordsChegada: coords === undefined ? d.coordsChegada : coords,
    });
  };

  const erroFunc = validarFuncionarios(d.funcionarios);
  const erroDias = validarDiasEntrega(d.diasEntrega);

  const calc = useMemo(() => calcularDeslocamento(d, precos), [d, precos]);
  const [expandido, setExpandido] = useState(false);

  return (
    <div
      className="bg-white border-2 rounded-lg shadow-md hover:shadow-lg transition-all"
      style={{ borderColor: '#cbd5e1', borderLeft: '6px solid #475569' }}
    >
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className={`w-full text-left p-3 sm:p-4 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors ${
          expandido ? 'border-b border-slate-200' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">Deslocamento</h3>
          <span className="text-xs text-slate-500 truncate">
            {rota.loading ? 'Calculando rota…' : rota.km != null ? `${rota.km.toFixed(1)} km (ida)` : '— km'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base font-bold text-green-700">{formatBRL(calc.total)}</span>
          <ChevronDownIcon
            size={16}
            className={`text-slate-500 transition-transform duration-300 ${expandido ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expandido ? '5000px' : '0',
          opacity: expandido ? 1 : 0,
        }}
      >
      <div className="p-3 sm:p-4 space-y-4 bg-white">
        {/* Endereços com autocomplete */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputEnderecoAutocomplete
            label="Saída"
            valor={d.enderecoSaida}
            coords={d.coordsSaida}
            onChange={onMudarSaida}
            placeholder="Comece a digitar a rua, bairro ou cidade…"
          />
          <InputEnderecoAutocomplete
            label="Chegada"
            valor={d.enderecoChegada}
            coords={d.coordsChegada}
            onChange={onMudarChegada}
            placeholder="Comece a digitar a rua, bairro ou cidade…"
          />
        </div>

        {/* Mapa */}
        <MapaPreview
          coordsSaida={rota.coordsSaida}
          coordsChegada={rota.coordsChegada}
          geometria={rota.geometria}
          altura={300}
        />

        {/* Distância e tempo abaixo do mapa */}
        {(rota.km != null || rota.loading) && (
          <div className="grid grid-cols-2 py-2 px-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="flex items-center justify-center gap-2">
              <span className="text-slate-400 text-base">📍</span>
              <span className="text-lg font-semibold text-slate-800">
                {rota.loading ? '—' : `${rota.km.toFixed(1)} km`}
              </span>
              <span className="text-xs text-slate-500">(ida)</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-slate-400 text-base">🕐</span>
              <span className="text-lg font-semibold text-slate-800">
                {rota.loading
                  ? '—'
                  : (formatarDuracao(rota.duracaoSegundos) || '—')}
              </span>
              <span className="text-xs text-slate-500">estimado</span>
            </div>
          </div>
        )}

        {rota.erro && (
          <p className="text-xs text-red-500">⚠️ {rota.erro}</p>
        )}

        {/* Seletor de modo de deslocamento */}
        <SeletorModo
          valor={d.modoEntrega}
          onChange={(modo) => set('modoEntrega', modo)}
        />

        {/* Inputs numéricos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pedágio <span className="text-slate-400 font-normal">(por viagem)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
              <input
                type="number"
                value={d.pedagioIdaVolta ?? ''}
                min={0}
                step="0.01"
                onChange={(e) => set('pedagioIdaVolta', parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
          <InputNumero
            label="Funcionários"
            value={d.funcionarios}
            min={1}
            max={10}
            onChange={(v) => set('funcionarios', parseInt(v) || 0)}
            erro={erroFunc}
          />
          <InputNumero
            label="Dias de entrega"
            value={d.diasEntrega}
            min={1}
            max={100}
            sufixo="dias"
            onChange={(v) => set('diasEntrega', parseInt(v) || 0)}
            erro={erroDias}
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {d.modoEntrega === 'diario' ? 'Viagens (ida e volta)' : 'Hotel / Viagens'}
            </label>
            <div className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-600">
              {d.modoEntrega === 'diario' ? (
                <>{calc.viagensEntrega} {calc.viagensEntrega === 1 ? 'viagem' : 'viagens'}</>
              ) : (
                <>
                  {calc.diariasHotel} {calc.diariasHotel === 1 ? 'noite' : 'noites'}
                  <span className="text-xs text-slate-400 ml-1">·</span>
                  <span className="text-xs text-slate-500 ml-1">
                    {calc.viagensEntrega} {calc.viagensEntrega === 1 ? 'viagem' : 'viagens'}
                  </span>
                </>
              )}
              <span className="text-xs text-slate-400 ml-1">(calculado)</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4">
          <LinhaResumo
            label="Frete (km)"
            detalhe={
              calc.viagensEntrega > 0
                ? `${calc.kmIda.toFixed(1)} km × ${formatBRL(precos?.valorPorKm || 0)}/km × ${calc.viagensEntrega} ${calc.viagensEntrega === 1 ? 'viagem' : 'viagens'}`
                : `— km × ${formatBRL(precos?.valorPorKm || 0)}/km`
            }
            valor={calc.valorKm}
            ativo={calc.cobrarFrete}
            onToggleAtivo={(v) => set('cobrarFrete', v)}
          />
          <LinhaResumo
            label="Pedágio"
            detalhe={
              calc.viagensEntrega > 0
                ? `${formatBRL(calc.pedagioIdaVolta)}/viagem × ${calc.viagensEntrega} ${calc.viagensEntrega === 1 ? 'viagem' : 'viagens'}`
                : 'por viagem'
            }
            valor={calc.valorPedagio}
            ativo={calc.cobrarPedagio}
            onToggleAtivo={(v) => set('cobrarPedagio', v)}
          />
          {d.modoEntrega === 'estadia' && (
            <LinhaResumo
              label="Hotel"
              detalhe={`${calc.diariasHotel} noites × ${calc.funcionarios} pessoas × ${formatBRL(precos?.hotelPorPessoaDia || 0)}`}
              valor={calc.valorHotel}
              ativo={calc.cobrarHotel}
              onToggleAtivo={(v) => set('cobrarHotel', v)}
            />
          )}
          <LinhaResumo
            label="Alimentação"
            detalhe={`${calc.diasEntrega} dias × ${calc.funcionarios} pessoas × ${formatBRL(precos?.alimentacaoPorPessoaDia || 0)}`}
            valor={calc.valorAlimentacao}
            ativo={calc.cobrarAlimentacao}
            onToggleAtivo={(novoAtivo) => set('cobrarAlimentacao', novoAtivo)}
          />
          <LinhaResumo
            label="Estacionamento"
            detalhe={`${calc.cobrancasEstacionamento} ${calc.cobrancasEstacionamento === 1 ? 'diária' : 'diárias'} (24h) × ${formatBRL(precos?.valorEstacionamentoPorDia || 0)}`}
            valor={calc.valorEstacionamento}
            ativo={calc.cobrarEstacionamento}
            onToggleAtivo={(novoAtivo) => set('cobrarEstacionamento', novoAtivo)}
          />
          <LinhaResumo
            label="Medição"
            detalhe="2 viagens (ida e volta), 2 pessoas (km + pedágio + alimentação)"
            valor={calc.valorMedicao}
            ativo={calc.cobrarMedicao}
            onToggleAtivo={(v) => set('cobrarMedicao', v)}
          />
          <div className="flex items-baseline justify-between pt-3 mt-1 border-t-2 border-slate-300">
            <span className="text-sm font-bold text-slate-800">Total Deslocamento</span>
            <span className="text-base font-bold text-green-700">{formatBRL(calc.total)}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
