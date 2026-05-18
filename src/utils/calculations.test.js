import { describe, it, expect } from 'vitest';
import {
  mm2ToM2,
  calcularAreaM2,
  converterPrecoParaM2,
  calcularCustosPeca,
  calcularPerdaPorAmbiente,
} from './calculations';

const PRECOS_BASE = {
  polimento: 22, esquadria: 35, boleado: 35, canal: 20,
  pia: 100, cubaEsculpida: 630, cooktop: 150, recorte: 60, pes: 200,
};

const MATERIAL_BASE = {
  id: 'mat-1', nome: 'Granito Preto',
  comprimento: 3000, altura: 2000, custo: 300, venda: 900,
};

describe('mm2ToM2', () => {
  it('converte 1.000.000 mm² em 1 m²', () => {
    expect(mm2ToM2(1_000_000)).toBe(1);
  });

  it('aceita zero', () => {
    expect(mm2ToM2(0)).toBe(0);
  });
});

describe('calcularAreaM2', () => {
  it('1000mm x 1000mm = 1 m²', () => {
    expect(calcularAreaM2(1000, 1000)).toBe(1);
  });

  it('500mm x 800mm = 0,4 m²', () => {
    expect(calcularAreaM2(500, 800)).toBeCloseTo(0.4);
  });
});

describe('converterPrecoParaM2', () => {
  it('preço de R$ 900 numa chapa de 3000x2000 = R$ 150/m²', () => {
    // 3000*2000 = 6.000.000 mm² = 6 m². 900 / 6 = 150
    expect(converterPrecoParaM2(900, 3000, 2000)).toBe(150);
  });
});

describe('calcularCustosPeca', () => {
  it('retorna zeros quando peça é null', () => {
    const r = calcularCustosPeca(null, MATERIAL_BASE, PRECOS_BASE);
    expect(r.total).toBe(0);
    expect(r.area).toBe(0);
  });

  it('retorna zeros quando material é null', () => {
    const peca = { altura: 500, largura: 800 };
    const r = calcularCustosPeca(peca, null, PRECOS_BASE);
    expect(r.total).toBe(0);
  });

  it('peça 500x800 sem acabamentos: custoMaterial = 0,4 m² × 900 = 360', () => {
    const peca = { altura: 500, largura: 800, rotacao: 0 };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    expect(r.area).toBeCloseTo(0.4);
    expect(r.custoMaterial).toBeCloseTo(360);
    expect(r.acabamentos).toBe(0);
    expect(r.recortes).toBe(0);
    expect(r.total).toBeCloseTo(360);
  });

  it('rotação 90° troca altura e largura na conta de área', () => {
    const peca = { altura: 500, largura: 800, rotacao: 90 };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    // mesma área, mas dimensões internas trocadas
    expect(r.area).toBeCloseTo(0.4);
  });

  it('usa material.custo quando material.venda não existe', () => {
    const mat = { ...MATERIAL_BASE, venda: undefined };
    const peca = { altura: 1000, largura: 1000, rotacao: 0 };
    const r = calcularCustosPeca(peca, mat, PRECOS_BASE);
    expect(r.custoMaterial).toBeCloseTo(300); // 1m² × 300
  });

  it('soma acabamento por lado (esquadria nos 4 lados de uma peça 1000x1000)', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      acabamentos: {
        esquadria: { ativo: true, lados: { superior: true, inferior: true, esquerda: true, direita: true } },
      },
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    // 4m × R$ 35 = R$ 140
    expect(r.acabamentos).toBeCloseTo(140);
  });

  it('valor personalizado de acabamento sobrepõe cálculo por lados', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      acabamentos: {
        polimento: { ativo: true, lados: { superior: true, inferior: false, esquerda: false, direita: false } },
      },
      acabamentosPersonalizados: { polimento: '2.50' },
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    // 2,5 m × R$ 22 = R$ 55 (e não 1m × 22)
    expect(r.acabamentos).toBeCloseTo(55);
  });

  it('soma recortes (cuba=2, cooktop=1)', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      cuba: 2, cooktop: 1,
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    // 2 × 100 + 1 × 150 = 350
    expect(r.recortes).toBeCloseTo(350);
  });

  it('soma adicionais ("Outros")', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      adicionais: [
        { descricao: 'Frete', valor: 50 },
        { descricao: 'Mão de obra', valor: '120.50' },
      ],
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    expect(r.adicionais).toBeCloseTo(170.5);
    expect(r.detalhesAdicionais).toHaveLength(2);
  });

  it('ignora adicionais com valor 0 ou inválido', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      adicionais: [{ descricao: 'Zero', valor: 0 }, { descricao: 'Inválido', valor: 'abc' }],
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    expect(r.adicionais).toBe(0);
    expect(r.detalhesAdicionais).toHaveLength(0);
  });

  it('total = material + acabamentos + recortes + adicionais', () => {
    const peca = {
      altura: 1000, largura: 1000, rotacao: 0,
      acabamentos: { polimento: { ativo: true, lados: { superior: true, inferior: false, esquerda: false, direita: false } } },
      cuba: 1,
      adicionais: [{ descricao: 'X', valor: 10 }],
    };
    const r = calcularCustosPeca(peca, MATERIAL_BASE, PRECOS_BASE);
    // 900 (mat) + 22 (1m polimento) + 100 (cuba) + 10 = 1032
    expect(r.total).toBeCloseTo(1032);
  });
});

describe('calcularPerdaPorAmbiente', () => {
  it('retorna mapa vazio para orçamento sem ambientes', () => {
    expect(calcularPerdaPorAmbiente({})).toEqual({});
    expect(calcularPerdaPorAmbiente({ ambientes: [], chapas: [] })).toEqual({});
  });

  it('zera perda quando ambiente não tem peças', () => {
    const orc = {
      ambientes: [{ id: 'a1', nome: 'Cozinha', pecas: [] }],
      chapas: [],
    };
    expect(calcularPerdaPorAmbiente(orc)).toEqual({ a1: 0 });
  });

  it('distribui perda proporcional à área de cada ambiente', () => {
    // 2 ambientes usando o mesmo material. Ambiente "a" tem 2x mais área que "b".
    // Espera que "a" receba 2x mais perda que "b".
    const orc = {
      ambientes: [
        { id: 'a', nome: 'A', pecas: [{ id: 1, materialId: 'm1', altura: 1000, largura: 2000, rotacao: 0, quantidade: 1 }] },
        { id: 'b', nome: 'B', pecas: [{ id: 2, materialId: 'm1', altura: 1000, largura: 1000, rotacao: 0, quantidade: 1 }] },
      ],
      chapas: [{
        id: 'c1', materialId: 'm1',
        material: { comprimento: 3000, altura: 2000, custo: 300, venda: 900 },
        pecas: [
          { id: 1, materialId: 'm1', altura: 1000, largura: 2000, rotacao: 0, posX: 25, posY: 25 },
          { id: 2, materialId: 'm1', altura: 1000, largura: 1000, rotacao: 0, posX: 25, posY: 1025 },
        ],
      }],
    };
    const r = calcularPerdaPorAmbiente(orc);
    expect(r.a).toBeGreaterThan(r.b);
    expect(r.a / r.b).toBeCloseTo(2, 1);
  });
});
