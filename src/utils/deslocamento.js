/**
 * Cálculos puros do bloco "Deslocamento" do orçamento.
 * Sem React, sem API externa — só matemática.
 */

const zerado = () => ({
  modoEntrega: 'estadia',
  kmIda: 0, kmIdaEVolta: 0, pedagioIdaVolta: 0,
  funcionarios: 0, diasEntrega: 0, diariasHotel: 0, viagensEntrega: 0,
  cobrancasEstacionamento: 0,
  valorKm: 0, valorPedagio: 0, valorHotel: 0, valorAlimentacao: 0,
  valorEstacionamento: 0,
  valorMedicaoKm: 0, valorMedicaoAlimentacao: 0, valorMedicao: 0,
  total: 0,
});

/**
 * Conta quantas noites de hotel são cobradas.
 * Regra: pula o último dia (volta pra casa) e múltiplos de 5
 * (a cada 5 dias eles voltam pra família no fim de semana).
 */
export function diariasHotelCobradas(diasEntrega) {
  const n = parseInt(diasEntrega) || 0;
  if (n <= 0) return 0;
  let count = 0;
  for (let dia = 1; dia <= n; dia++) {
    if (dia === n) continue;
    if (dia % 5 === 0) continue;
    count++;
  }
  return count;
}

/**
 * No modo estadia, conta quantas viagens (trajetos unidirecionais) a equipe faz.
 * Cada bloco de até 5 dias úteis = 1 ida + 1 volta = 2 viagens.
 *
 * Ex.: 5 dias → 2 viagens (Seg ida + Sex volta).
 *      10 dias → 4 viagens (2 ciclos completos Seg-Sex).
 *      20 dias → 8 viagens (4 ciclos).
 */
export function viagensEstadia(diasEntrega) {
  const n = parseInt(diasEntrega) || 0;
  if (n <= 0) return 0;
  return Math.ceil(n / 5) * 2;
}

/**
 * Calcula o breakdown de custos do deslocamento.
 *
 * @param {object} deslocamento - { modoEntrega?, kmIda, pedagioIdaVolta, funcionarios, diasEntrega }
 * @param {object} precos - { valorPorKm, hotelPorPessoaDia, alimentacaoPorPessoaDia }
 *
 * modoEntrega:
 *  - 'estadia' (default): equipe vai uma vez, dorme em hotel as noites necessárias
 *    (pulando últimos dias e múltiplos de 5), volta ao final. 1 ida+volta de km/pedágio.
 *  - 'diario': equipe vai e volta TODO DIA. Sem hotel. km e pedágio multiplicam por dias.
 *
 * Medição: 1 viagem extra com 2 pessoas (independente do modo).
 */
export function calcularDeslocamento(deslocamento, precos) {
  if (!deslocamento) return zerado();

  const modoEntrega = deslocamento.modoEntrega === 'diario' ? 'diario' : 'estadia';
  // Flags opcionais — default true para preservar comportamento de orçamentos antigos.
  const cobrarFrete = deslocamento.cobrarFrete !== false;
  const cobrarPedagio = deslocamento.cobrarPedagio !== false;
  const cobrarHotel = deslocamento.cobrarHotel !== false;
  const cobrarAlimentacao = deslocamento.cobrarAlimentacao !== false;
  const cobrarEstacionamento = deslocamento.cobrarEstacionamento !== false;
  const cobrarMedicao = deslocamento.cobrarMedicao !== false;

  const kmIda = Number(deslocamento.kmIda) || 0;
  const kmIdaEVolta = kmIda * 2;
  const pedagioIdaVolta = Number(deslocamento.pedagioIdaVolta) || 0;
  const funcionarios = Math.max(0, parseInt(deslocamento.funcionarios) || 0);
  const diasEntrega = Math.max(0, parseInt(deslocamento.diasEntrega) || 0);

  const valorPorKm = Number(precos?.valorPorKm) || 0;
  const hotelPorPessoaDia = Number(precos?.hotelPorPessoaDia) || 0;
  const alimentacaoPorPessoaDia = Number(precos?.alimentacaoPorPessoaDia) || 0;
  const valorEstacionamentoPorDia = Number(precos?.valorEstacionamentoPorDia) || 0;

  // Diário: cada dia = 1 ida + 1 volta = 2 viagens (trajetos).
  // Estadia: cada bloco de 5 dias = 1 ciclo Seg-Sex = 2 viagens.
  // "viagem" aqui é trajeto unidirecional.
  const viagensEntrega = modoEntrega === 'diario'
    ? diasEntrega * 2
    : viagensEstadia(diasEntrega);
  const valorKm = cobrarFrete ? kmIda * valorPorKm * viagensEntrega : 0;
  // pedagioIdaVolta agora representa o valor de UMA viagem (trajeto).
  // Nome mantido por compatibilidade de schema do orçamento salvo.
  const valorPedagio = cobrarPedagio ? pedagioIdaVolta * viagensEntrega : 0;

  // Hotel só no modo estadia.
  const diariasHotel = modoEntrega === 'estadia' ? diariasHotelCobradas(diasEntrega) : 0;
  const valorHotel = cobrarHotel ? diariasHotel * funcionarios * hotelPorPessoaDia : 0;

  const valorAlimentacao = cobrarAlimentacao
    ? diasEntrega * funcionarios * alimentacaoPorPessoaDia
    : 0;

  // Estacionamento:
  //  - Diário: 1 diária por dia útil (carro fica no expediente).
  //  - Estadia: chegada na segunda e saída na sexta não completam 24h cada,
  //    então a cada ciclo de 5 dias cobra só 4 diárias (= dias - ciclos).
  //    Ciclos = viagensEntrega / 2 no estadia.
  const cobrancasEstacionamento = modoEntrega === 'estadia'
    ? Math.max(0, diasEntrega - viagensEntrega / 2)
    : diasEntrega;
  const valorEstacionamento = cobrarEstacionamento
    ? cobrancasEstacionamento * valorEstacionamentoPorDia
    : 0;

  // Medição: 1 ida + 1 volta = 2 viagens com pedágio.
  // A flag cobrarMedicao zera a medição inteira. As componentes individuais
  // continuam refletindo o que SERIA cobrado se a medição estivesse ativa.
  const valorMedicaoKm = kmIdaEVolta * valorPorKm;
  const valorMedicaoAlimentacao = cobrarAlimentacao ? 2 * alimentacaoPorPessoaDia : 0;
  const valorMedicaoPedagio = pedagioIdaVolta * 2;
  const valorMedicaoSomado = valorMedicaoKm + valorMedicaoPedagio + valorMedicaoAlimentacao;
  const valorMedicao = cobrarMedicao ? valorMedicaoSomado : 0;

  const total = valorKm + valorPedagio + valorHotel + valorAlimentacao + valorEstacionamento + valorMedicao;

  return {
    modoEntrega,
    cobrarFrete, cobrarPedagio, cobrarHotel,
    cobrarAlimentacao, cobrarEstacionamento, cobrarMedicao,
    kmIda, kmIdaEVolta, pedagioIdaVolta, funcionarios, diasEntrega, diariasHotel,
    viagensEntrega, cobrancasEstacionamento,
    valorKm, valorPedagio, valorHotel, valorAlimentacao, valorEstacionamento,
    valorMedicaoKm, valorMedicaoAlimentacao, valorMedicao,
    total,
  };
}

/**
 * Validadores de input. Retornam string (mensagem) ou null se OK.
 */
export const validarFuncionarios = (n) => {
  const v = parseInt(n);
  if (!Number.isFinite(v) || v < 1) return 'Mínimo 1 funcionário.';
  if (v > 10) return 'Máximo 10 funcionários.';
  return null;
};

export const validarDiasEntrega = (n) => {
  const v = parseInt(n);
  if (!Number.isFinite(v) || v < 1) return 'Mínimo 1 dia.';
  if (v > 100) return 'Máximo 100 dias.';
  return null;
};
