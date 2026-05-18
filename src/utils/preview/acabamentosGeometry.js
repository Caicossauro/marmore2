export const TIPOS = [
  { tipo: 'esquadria', label: 'Esquadria', cor: '#ef4444', bgAtivo: 'bg-red-500',    bgHover: 'hover:border-red-400 hover:bg-red-50',    border: 'border-red-600' },
  { tipo: 'boleado',   label: 'Boleado',   cor: '#eab308', bgAtivo: 'bg-yellow-500', bgHover: 'hover:border-yellow-400 hover:bg-yellow-50', border: 'border-yellow-600' },
  { tipo: 'polimento', label: 'Polimento', cor: '#3b82f6', bgAtivo: 'bg-blue-500',   bgHover: 'hover:border-blue-400 hover:bg-blue-50',   border: 'border-blue-600' },
  { tipo: 'canal',     label: 'Canal',     cor: '#f59e0b', bgAtivo: 'bg-orange-500', bgHover: 'hover:border-orange-400 hover:bg-orange-50', border: 'border-orange-600' },
];

export const LADOS = ['superior', 'inferior', 'esquerda', 'direita'];

export const RECORTE_TIPOS_LIST = [
  { tipo: 'cuba',          label: 'Cuba',           cor: '#15803d', shape: 'retangulo', defaults: { largura: 500, altura: 400 } },
  { tipo: 'cubaEsculpida', label: 'Cuba Esculpida', cor: '#9333ea', shape: 'retangulo', defaults: { largura: 500, altura: 400 } },
  { tipo: 'cooktop',       label: 'Cooktop',        cor: '#475569', shape: 'retangulo', defaults: { largura: 500, altura: 400 } },
  { tipo: 'recorte',       label: 'Recorte',        cor: '#15803d', shape: 'circulo',   defaults: { raio: 30 } },
  { tipo: 'pes',           label: 'Pé',             cor: '#86efac', shape: 'toggle',    defaults: {} },
];

export const RECORTE_TIPOS = Object.fromEntries(RECORTE_TIPOS_LIST.map(t => [t.tipo, t]));

export const CANAL_OFFSET_PADRAO = 0.04;

export const getExtensao = (acab, lado) =>
  acab?.extensoes?.[lado] ?? { inicio: 0, fim: 1 };

export const dimensaoDoLado = (lado, peca) => {
  const l = parseFloat(peca.largura) || 0;
  const a = parseFloat(peca.altura) || 0;
  return (lado === 'superior' || lado === 'inferior') ? l : a;
};

export const calcularMetrosTipo = (peca, tipo) => {
  const acab = peca.acabamentos?.[tipo];
  if (!acab?.ativo) return 0;
  let totalMm = 0;
  LADOS.forEach(lado => {
    if (!acab.lados[lado]) return;
    const ext = getExtensao(acab, lado);
    totalMm += dimensaoDoLado(lado, peca) * Math.max(0, ext.fim - ext.inicio);
  });
  return totalMm / 1000;
};

export const recalcularPersonalizados = (peca) => {
  const novo = { ...(peca.acabamentosPersonalizados || {}) };
  TIPOS.forEach(({ tipo }) => {
    const m = calcularMetrosTipo(peca, tipo);
    novo[tipo] = m > 0 ? m.toFixed(2) : '';
  });
  return novo;
};

export const clampMm = (v, min, max) => Math.max(min, Math.min(max, v));

export const sincronizarQuantidadesRecortes = (peca) => {
  const recortes = peca.recortesPosicionados || [];
  return {
    ...peca,
    cuba:          recortes.filter(r => r.tipo === 'cuba').length,
    cubaEsculpida: recortes.filter(r => r.tipo === 'cubaEsculpida').length,
    cooktop:       recortes.filter(r => r.tipo === 'cooktop').length,
    recorte:       recortes.filter(r => r.tipo === 'recorte').length,
  };
};

export const cantoRecorte = (rec) => ({
  x: rec.shape === 'circulo' ? rec.x - rec.raio : rec.x,
  y: rec.shape === 'circulo' ? rec.y - rec.raio : rec.y,
  w: rec.shape === 'circulo' ? rec.raio * 2 : rec.largura,
  h: rec.shape === 'circulo' ? rec.raio * 2 : rec.altura,
});
