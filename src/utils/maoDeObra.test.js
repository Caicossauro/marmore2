import { describe, it, expect } from 'vitest';
import {
  calcularFixacaoPeca, calcularMontagemAmbiente, calcularMaoDeObraOrcamento,
} from './maoDeObra';

const PRECOS = {
  maoDeObraFixacaoPorMetro: 150,
  maoDeObraValorGrapa: 40,
  maoDeObraValorPU: 50,
  maoDeObraMontagemPorM2: 250,
};

describe('calcularFixacaoPeca', () => {
  it('flag desligada: zera tudo', () => {
    const r = calcularFixacaoPeca({ largura: 900, altura: 500 }, PRECOS);
    expect(r.total).toBe(0);
    expect(r.qtdGrapas).toBe(0);
  });

  it('peça 0,9m (90cm) → 2 grapas, 1 PU', () => {
    // 0,9m × 150 = 135 (mão)
    // ceil(0,9 / 0,6) = ceil(1,5) = 2 grapas × 40 = 80
    // ceil(2 / 2) = 1 PU × 50 = 50
    const r = calcularFixacaoPeca(
      { largura: 900, altura: 500, cobrarFixacao: true },
      PRECOS
    );
    expect(r.larguraM).toBeCloseTo(0.9);
    expect(r.qtdGrapas).toBe(2);
    expect(r.qtdPus).toBe(1);
    expect(r.valorMao).toBeCloseTo(135);
    expect(r.valorGrapas).toBe(80);
    expect(r.valorPus).toBe(50);
    expect(r.total).toBeCloseTo(265);
  });

  it('peça 2,7m → 5 grapas (arredonda pra cima), 3 PUs (não pra baixo)', () => {
    // 2,7 × 150 = 405
    // ceil(2,7 / 0,6) = ceil(4,5) = 5 grapas × 40 = 200
    // ceil(5 / 2) = ceil(2,5) = 3 PUs × 50 = 150
    const r = calcularFixacaoPeca(
      { largura: 2700, altura: 500, cobrarFixacao: true },
      PRECOS
    );
    expect(r.qtdGrapas).toBe(5);
    expect(r.qtdPus).toBe(3);
    expect(r.valorMao).toBeCloseTo(405);
    expect(r.valorGrapas).toBe(200);
    expect(r.valorPus).toBe(150);
    expect(r.total).toBeCloseTo(755);
  });

  it('peça exatamente 60cm → 1 grapa, 1 PU', () => {
    const r = calcularFixacaoPeca(
      { largura: 600, altura: 400, cobrarFixacao: true },
      PRECOS
    );
    expect(r.qtdGrapas).toBe(1);
    expect(r.qtdPus).toBe(1);
  });

  it('peça 1,2m (2 grapas exatas) → 1 PU', () => {
    const r = calcularFixacaoPeca(
      { largura: 1200, altura: 500, cobrarFixacao: true },
      PRECOS
    );
    expect(r.qtdGrapas).toBe(2);
    expect(r.qtdPus).toBe(1);
  });

  it('considera rotação (rotacao=90 usa altura como largura)', () => {
    // Largura 500, altura 2700, rotacionada → largura efetiva 2700mm = 2,7m
    const r = calcularFixacaoPeca(
      { largura: 500, altura: 2700, rotacao: 90, cobrarFixacao: true },
      PRECOS
    );
    expect(r.larguraM).toBeCloseTo(2.7);
    expect(r.qtdGrapas).toBe(5);
  });

  it('largura 0 ou inválida zera', () => {
    expect(calcularFixacaoPeca({ largura: 0, cobrarFixacao: true }, PRECOS).total).toBe(0);
    expect(calcularFixacaoPeca({ largura: 'abc', cobrarFixacao: true }, PRECOS).total).toBe(0);
  });

  it('preços ausentes zeram', () => {
    const r = calcularFixacaoPeca({ largura: 900, cobrarFixacao: true }, null);
    expect(r.total).toBe(0);
  });
});

describe('calcularMontagemAmbiente', () => {
  it('flag desligada zera', () => {
    const r = calcularMontagemAmbiente(
      { pecas: [{ largura: 1000, altura: 500 }] },
      PRECOS
    );
    expect(r.total).toBe(0);
    expect(r.areaM2).toBe(0);
  });

  it('soma área das peças × 250', () => {
    // peça 1: 1m × 0,5m = 0,5 m²
    // peça 2: 2m × 0,6m = 1,2 m²
    // total: 1,7 m² × 250 = 425
    const r = calcularMontagemAmbiente(
      {
        cobrarMontagem: true,
        pecas: [
          { largura: 1000, altura: 500 },
          { largura: 2000, altura: 600 },
        ],
      },
      PRECOS
    );
    expect(r.areaM2).toBeCloseTo(1.7);
    expect(r.total).toBeCloseTo(425);
  });

  it('considera quantidade da peça', () => {
    // peça 1m × 0,5m = 0,5 m², quantidade 3 → 1,5 m² × 250 = 375
    const r = calcularMontagemAmbiente(
      {
        cobrarMontagem: true,
        pecas: [{ largura: 1000, altura: 500, quantidade: 3 }],
      },
      PRECOS
    );
    expect(r.areaM2).toBeCloseTo(1.5);
    expect(r.total).toBeCloseTo(375);
  });

  it('considera rotação na área', () => {
    // Sem rotação: 0,3 × 1,0 = 0,3 m². Com rotação: 1,0 × 0,3 = 0,3 m². Mesma área.
    const semRotacao = calcularMontagemAmbiente(
      {
        cobrarMontagem: true,
        pecas: [{ largura: 1000, altura: 300, rotacao: 0 }],
      },
      PRECOS
    );
    const comRotacao = calcularMontagemAmbiente(
      {
        cobrarMontagem: true,
        pecas: [{ largura: 1000, altura: 300, rotacao: 90 }],
      },
      PRECOS
    );
    expect(semRotacao.areaM2).toBeCloseTo(comRotacao.areaM2);
  });

  it('ambiente sem peças zera', () => {
    const r = calcularMontagemAmbiente({ cobrarMontagem: true, pecas: [] }, PRECOS);
    expect(r.total).toBe(0);
  });
});

describe('calcularMaoDeObraOrcamento', () => {
  it('orçamento vazio zera tudo', () => {
    const r = calcularMaoDeObraOrcamento({}, PRECOS);
    expect(r.total).toBe(0);
    expect(r.detalhesPorAmbiente).toEqual({});
  });

  it('soma fixação de peças + montagem de ambientes', () => {
    const orc = {
      ambientes: [
        {
          id: 'a1',
          cobrarMontagem: true,
          pecas: [
            { largura: 900, altura: 500, cobrarFixacao: true },   // fixacao 265
            { largura: 1000, altura: 500 },                       // sem fixação
          ],
        },
        {
          id: 'a2',
          pecas: [
            { largura: 2700, altura: 500, cobrarFixacao: true },  // fixacao 755
          ],
        },
      ],
    };
    const r = calcularMaoDeObraOrcamento(orc, PRECOS);
    expect(r.fixacao).toBeCloseTo(265 + 755);     // 1020
    // a1: 0,9×0,5 + 1×0,5 = 0,95 m² × 250 = 237,5
    expect(r.montagem).toBeCloseTo(237.5);
    expect(r.total).toBeCloseTo(1020 + 237.5);
    expect(r.detalhesPorAmbiente.a1.fixacao).toBeCloseTo(265);
    expect(r.detalhesPorAmbiente.a1.montagem).toBeCloseTo(237.5);
    expect(r.detalhesPorAmbiente.a2.fixacao).toBeCloseTo(755);
    expect(r.detalhesPorAmbiente.a2.montagem).toBe(0);
  });

  it('fixação por peça é multiplicada pela quantidade da peça', () => {
    const orc = {
      ambientes: [{
        id: 'a',
        pecas: [{ largura: 900, altura: 500, cobrarFixacao: true, quantidade: 3 }],
      }],
    };
    const r = calcularMaoDeObraOrcamento(orc, PRECOS);
    expect(r.fixacao).toBeCloseTo(265 * 3);       // 795
  });
});
