import { describe, it, expect } from 'vitest';
import {
  diariasHotelCobradas, viagensEstadia, calcularDeslocamento,
  validarFuncionarios, validarDiasEntrega,
} from './deslocamento';

const PRECOS = {
  valorPorKm: 2.5,
  hotelPorPessoaDia: 150,
  alimentacaoPorPessoaDia: 100,
  valorEstacionamentoPorDia: 85,
};

describe('diariasHotelCobradas', () => {
  it('1 dia: zero diárias (último dia não cobra)', () => {
    expect(diariasHotelCobradas(1)).toBe(0);
  });

  it('2 dias: 1 diária (dia 1 cobra, dia 2 é último)', () => {
    expect(diariasHotelCobradas(2)).toBe(1);
  });

  it('5 dias: 4 diárias (dia 5 é último E múltiplo de 5)', () => {
    expect(diariasHotelCobradas(5)).toBe(4);
  });

  it('7 dias: 5 diárias (pula dia 5 e dia 7)', () => {
    // cobra: 1, 2, 3, 4, 6 = 5 diárias
    expect(diariasHotelCobradas(7)).toBe(5);
  });

  it('10 dias: 8 diárias (pula dia 5 e dia 10)', () => {
    // cobra: 1, 2, 3, 4, 6, 7, 8, 9 = 8 diárias
    expect(diariasHotelCobradas(10)).toBe(8);
  });

  it('15 dias: 12 diárias (pula 5, 10, 15)', () => {
    // cobra: 1,2,3,4, 6,7,8,9, 11,12,13,14 = 12
    expect(diariasHotelCobradas(15)).toBe(12);
  });

  it('0 ou negativo: zero', () => {
    expect(diariasHotelCobradas(0)).toBe(0);
    expect(diariasHotelCobradas(-3)).toBe(0);
  });

  it('aceita string', () => {
    expect(diariasHotelCobradas('7')).toBe(5);
  });
});

describe('viagensEstadia', () => {
  it('0 ou negativo → 0', () => {
    expect(viagensEstadia(0)).toBe(0);
    expect(viagensEstadia(-3)).toBe(0);
  });

  it('1 a 5 dias → 2 viagens (1 ida + 1 volta, 1 ciclo Seg-Sex)', () => {
    expect(viagensEstadia(1)).toBe(2);
    expect(viagensEstadia(3)).toBe(2);
    expect(viagensEstadia(5)).toBe(2);
  });

  it('6 a 10 dias → 4 viagens (2 ciclos Seg-Sex)', () => {
    expect(viagensEstadia(6)).toBe(4);
    expect(viagensEstadia(10)).toBe(4);
  });

  it('11 a 15 dias → 6 viagens (3 ciclos)', () => {
    expect(viagensEstadia(11)).toBe(6);
    expect(viagensEstadia(15)).toBe(6);
  });

  it('20 dias → 8 viagens (4 ciclos)', () => {
    expect(viagensEstadia(20)).toBe(8);
  });

  it('aceita string', () => {
    expect(viagensEstadia('10')).toBe(4);
  });
});

describe('calcularDeslocamento', () => {
  it('retorna tudo zerado quando deslocamento é null', () => {
    const r = calcularDeslocamento(null, PRECOS);
    expect(r.total).toBe(0);
  });

  it('modo estadia (default): cenário típico', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5 },
      PRECOS
    );
    expect(r.modoEntrega).toBe('estadia');
    expect(r.viagensEntrega).toBe(2);
    expect(r.valorKm).toBe(500);
    expect(r.valorPedagio).toBe(160);            // 80/viagem × 2 viagens
    expect(r.diariasHotel).toBe(4);
    expect(r.valorHotel).toBe(1800);
    expect(r.valorAlimentacao).toBe(1500);
    expect(r.cobrancasEstacionamento).toBe(4);
    expect(r.valorEstacionamento).toBe(340);
    expect(r.valorMedicao).toBe(860);            // 500 + 80×2 + 200
    expect(r.total).toBe(5160);                  // 500+160+1800+1500+340+860
  });

  it('modo estadia com 10 dias: 4 viagens (2 ciclos Seg-Sex)', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 10 },
      PRECOS
    );
    expect(r.viagensEntrega).toBe(4);
    expect(r.valorKm).toBe(1000);
    expect(r.valorPedagio).toBe(320);            // 80 × 4 viagens
    expect(r.diariasHotel).toBe(8);
    expect(r.valorHotel).toBe(3600);
    expect(r.valorAlimentacao).toBe(3000);
    expect(r.cobrancasEstacionamento).toBe(8);
    expect(r.valorEstacionamento).toBe(680);
    expect(r.total).toBe(9460);                  // 1000+320+3600+3000+680+860
  });

  it('modo estadia com 20 dias: 8 viagens (4 ciclos)', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 20 },
      PRECOS
    );
    expect(r.viagensEntrega).toBe(8);
    expect(r.valorKm).toBe(2000);
    expect(r.valorPedagio).toBe(640);            // 80 × 8 viagens
    expect(r.diariasHotel).toBe(16);
    expect(r.valorHotel).toBe(7200);
    expect(r.valorAlimentacao).toBe(6000);
    expect(r.cobrancasEstacionamento).toBe(16);
    expect(r.valorEstacionamento).toBe(1360);
    expect(r.total).toBe(18060);                 // 2000+640+7200+6000+1360+860
  });

  it('modo diario: 2 viagens por dia, zera hotel, estacionamento 1 diária/dia', () => {
    const r = calcularDeslocamento(
      { modoEntrega: 'diario', kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5 },
      PRECOS
    );
    expect(r.modoEntrega).toBe('diario');
    expect(r.viagensEntrega).toBe(10);           // 5 dias × 2 viagens
    expect(r.valorKm).toBe(2500);
    expect(r.valorPedagio).toBe(800);            // 80 × 10 viagens
    expect(r.diariasHotel).toBe(0);
    expect(r.valorHotel).toBe(0);
    expect(r.valorAlimentacao).toBe(1500);
    expect(r.cobrancasEstacionamento).toBe(5);
    expect(r.valorEstacionamento).toBe(425);
    expect(r.valorMedicao).toBe(860);
    expect(r.total).toBe(6085);                  // 2500+800+0+1500+425+860
  });

  it('cobrarAlimentacao=false zera alimentação na entrega E na medição', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarAlimentacao: false },
      PRECOS
    );
    expect(r.valorAlimentacao).toBe(0);
    expect(r.valorMedicaoAlimentacao).toBe(0);
    expect(r.valorMedicao).toBe(500 + 160 + 0);    // sem alimentação na medição
    expect(r.total).toBe(5160 - 1500 - 200);       // sem alimentação entrega nem medição
  });

  it('cobrarEstacionamento=false zera estacionamento', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarEstacionamento: false },
      PRECOS
    );
    expect(r.valorEstacionamento).toBe(0);
    expect(r.total).toBe(5160 - 340);              // sem estacionamento
  });

  it('orçamento antigo (sem as flags) cobra tudo normalmente', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5 },
      PRECOS
    );
    expect(r.cobrarFrete).toBe(true);
    expect(r.cobrarPedagio).toBe(true);
    expect(r.cobrarHotel).toBe(true);
    expect(r.cobrarAlimentacao).toBe(true);
    expect(r.cobrarEstacionamento).toBe(true);
    expect(r.cobrarMedicao).toBe(true);
    expect(r.total).toBe(5160);
  });

  it('cobrarFrete=false zera valorKm (não afeta medicaoKm)', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarFrete: false },
      PRECOS
    );
    expect(r.valorKm).toBe(0);
    expect(r.valorMedicaoKm).toBe(500);             // não afetado
    expect(r.total).toBe(5160 - 500);
  });

  it('cobrarPedagio=false zera valorPedagio (não afeta medicaoPedagio)', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarPedagio: false },
      PRECOS
    );
    expect(r.valorPedagio).toBe(0);
    expect(r.valorMedicao).toBe(860);               // medição tem pedágio próprio
    expect(r.total).toBe(5160 - 160);
  });

  it('cobrarHotel=false zera valorHotel', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarHotel: false },
      PRECOS
    );
    expect(r.valorHotel).toBe(0);
    expect(r.total).toBe(5160 - 1800);
  });

  it('cobrarMedicao=false zera medição inteira', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 80, funcionarios: 3, diasEntrega: 5, cobrarMedicao: false },
      PRECOS
    );
    expect(r.valorMedicao).toBe(0);
    expect(r.total).toBe(5160 - 860);
  });

  it('estacionamento estadia: 1 ciclo de 5 dias = 4 diárias', () => {
    const r = calcularDeslocamento(
      { kmIda: 0, pedagioIdaVolta: 0, funcionarios: 1, diasEntrega: 5 },
      { valorPorKm: 0, hotelPorPessoaDia: 0, alimentacaoPorPessoaDia: 0, valorEstacionamentoPorDia: 85 }
    );
    expect(r.cobrancasEstacionamento).toBe(4);
    expect(r.valorEstacionamento).toBe(340);
  });

  it('estacionamento diário: 1 diária por dia útil', () => {
    const r = calcularDeslocamento(
      { modoEntrega: 'diario', kmIda: 0, pedagioIdaVolta: 0, funcionarios: 1, diasEntrega: 5 },
      { valorPorKm: 0, hotelPorPessoaDia: 0, alimentacaoPorPessoaDia: 0, valorEstacionamentoPorDia: 85 }
    );
    expect(r.cobrancasEstacionamento).toBe(5);
    expect(r.valorEstacionamento).toBe(425);
  });

  it('quando dias=1 não cobra hotel', () => {
    const r = calcularDeslocamento(
      { kmIda: 50, pedagioIdaVolta: 0, funcionarios: 2, diasEntrega: 1 },
      PRECOS
    );
    expect(r.valorHotel).toBe(0);
  });

  it('aceita strings em inputs (defesa em profundidade)', () => {
    const r = calcularDeslocamento(
      { kmIda: '100', pedagioIdaVolta: '80', funcionarios: '3', diasEntrega: '5' },
      PRECOS
    );
    expect(r.total).toBe(5160);
  });

  it('km zero zera valores de km mas mantém hotel/alimentação/medição/estacionamento', () => {
    const r = calcularDeslocamento(
      { kmIda: 0, pedagioIdaVolta: 0, funcionarios: 2, diasEntrega: 3 },
      PRECOS
    );
    expect(r.valorKm).toBe(0);
    expect(r.valorMedicaoKm).toBe(0);
    expect(r.valorHotel).toBe(600);                  // 2 noites × 2 funcs × 150
    expect(r.valorAlimentacao).toBe(600);            // 3 × 2 × 100
    expect(r.valorMedicaoAlimentacao).toBe(200);     // 2 × 100
    expect(r.cobrancasEstacionamento).toBe(2);       // 3 dias - 1 ciclo
    expect(r.valorEstacionamento).toBe(170);         // 2 × 85
    expect(r.total).toBe(600 + 600 + 200 + 170);     // 1570
  });

  it('precos ausentes resultam em zero', () => {
    const r = calcularDeslocamento(
      { kmIda: 100, pedagioIdaVolta: 0, funcionarios: 1, diasEntrega: 2 },
      null
    );
    expect(r.valorKm).toBe(0);
    expect(r.valorHotel).toBe(0);
    expect(r.valorAlimentacao).toBe(0);
    expect(r.valorEstacionamento).toBe(0);
  });
});

describe('validarFuncionarios', () => {
  it('aceita 1 a 10', () => {
    expect(validarFuncionarios(1)).toBeNull();
    expect(validarFuncionarios(5)).toBeNull();
    expect(validarFuncionarios(10)).toBeNull();
  });

  it('rejeita 0, negativos, NaN', () => {
    expect(validarFuncionarios(0)).toMatch(/Mínimo 1/);
    expect(validarFuncionarios(-1)).toMatch(/Mínimo 1/);
    expect(validarFuncionarios('abc')).toMatch(/Mínimo 1/);
  });

  it('rejeita > 10', () => {
    expect(validarFuncionarios(11)).toMatch(/Máximo 10/);
  });
});

describe('validarDiasEntrega', () => {
  it('aceita 1 a 100', () => {
    expect(validarDiasEntrega(1)).toBeNull();
    expect(validarDiasEntrega(50)).toBeNull();
    expect(validarDiasEntrega(100)).toBeNull();
  });

  it('rejeita 0, negativos', () => {
    expect(validarDiasEntrega(0)).toMatch(/Mínimo 1/);
    expect(validarDiasEntrega(-5)).toMatch(/Mínimo 1/);
  });

  it('rejeita > 100', () => {
    expect(validarDiasEntrega(101)).toMatch(/Máximo 100/);
  });
});
