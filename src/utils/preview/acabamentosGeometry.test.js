import { describe, it, expect } from 'vitest';
import {
  TIPOS, LADOS, RECORTE_TIPOS, RECORTE_TIPOS_LIST,
  getExtensao, dimensaoDoLado, calcularMetrosTipo, recalcularPersonalizados,
  clampMm, sincronizarQuantidadesRecortes, cantoRecorte,
} from './acabamentosGeometry';

describe('constantes', () => {
  it('TIPOS tem os 4 tipos esperados', () => {
    expect(TIPOS.map(t => t.tipo)).toEqual(['esquadria', 'boleado', 'polimento', 'canal']);
  });

  it('LADOS tem os 4 lados', () => {
    expect(LADOS).toEqual(['superior', 'inferior', 'esquerda', 'direita']);
  });

  it('RECORTE_TIPOS é um map indexado por tipo', () => {
    expect(RECORTE_TIPOS.cuba.shape).toBe('retangulo');
    expect(RECORTE_TIPOS.recorte.shape).toBe('circulo');
    expect(RECORTE_TIPOS_LIST).toHaveLength(5);
  });
});

describe('getExtensao', () => {
  it('retorna extensão default 0..1 quando ausente', () => {
    expect(getExtensao({}, 'superior')).toEqual({ inicio: 0, fim: 1 });
  });

  it('retorna extensão configurada', () => {
    const acab = { extensoes: { superior: { inicio: 0.2, fim: 0.8 } } };
    expect(getExtensao(acab, 'superior')).toEqual({ inicio: 0.2, fim: 0.8 });
  });

  it('aceita acab nulo/undefined', () => {
    expect(getExtensao(null, 'superior')).toEqual({ inicio: 0, fim: 1 });
    expect(getExtensao(undefined, 'superior')).toEqual({ inicio: 0, fim: 1 });
  });
});

describe('dimensaoDoLado', () => {
  const peca = { largura: 1000, altura: 500 };

  it('lado superior e inferior usam largura', () => {
    expect(dimensaoDoLado('superior', peca)).toBe(1000);
    expect(dimensaoDoLado('inferior', peca)).toBe(1000);
  });

  it('lado esquerda e direita usam altura', () => {
    expect(dimensaoDoLado('esquerda', peca)).toBe(500);
    expect(dimensaoDoLado('direita', peca)).toBe(500);
  });

  it('aceita altura/largura como string', () => {
    expect(dimensaoDoLado('superior', { largura: '1500', altura: '700' })).toBe(1500);
  });

  it('default a 0 quando dimensões inválidas', () => {
    expect(dimensaoDoLado('superior', { largura: 'abc', altura: 0 })).toBe(0);
  });
});

describe('calcularMetrosTipo', () => {
  it('retorna 0 quando tipo não está ativo', () => {
    const peca = { largura: 1000, altura: 500, acabamentos: { polimento: { ativo: false } } };
    expect(calcularMetrosTipo(peca, 'polimento')).toBe(0);
  });

  it('soma metros dos lados ativos (extensão completa = 1m em cada lado de 1000mm)', () => {
    const peca = {
      largura: 1000, altura: 500,
      acabamentos: {
        polimento: { ativo: true, lados: { superior: true, inferior: false, esquerda: false, direita: false } },
      },
    };
    expect(calcularMetrosTipo(peca, 'polimento')).toBe(1);
  });

  it('considera extensão parcial', () => {
    const peca = {
      largura: 1000, altura: 500,
      acabamentos: {
        polimento: {
          ativo: true,
          lados: { superior: true, inferior: false, esquerda: false, direita: false },
          extensoes: { superior: { inicio: 0.2, fim: 0.7 } }, // 50% do lado de 1000mm = 500mm = 0.5m
        },
      },
    };
    expect(calcularMetrosTipo(peca, 'polimento')).toBeCloseTo(0.5);
  });

  it('soma todos os lados ativos', () => {
    const peca = {
      largura: 1000, altura: 500,
      acabamentos: {
        boleado: { ativo: true, lados: { superior: true, inferior: true, esquerda: true, direita: true } },
      },
    };
    // 2 × 1000 + 2 × 500 = 3000mm = 3m
    expect(calcularMetrosTipo(peca, 'boleado')).toBe(3);
  });

  it('extensão negativa (fim < inicio) é clampada em 0', () => {
    const peca = {
      largura: 1000, altura: 500,
      acabamentos: {
        polimento: {
          ativo: true,
          lados: { superior: true, inferior: false, esquerda: false, direita: false },
          extensoes: { superior: { inicio: 0.8, fim: 0.2 } },
        },
      },
    };
    expect(calcularMetrosTipo(peca, 'polimento')).toBe(0);
  });
});

describe('recalcularPersonalizados', () => {
  it('gera string formatada para cada tipo, vazia quando metros=0', () => {
    const peca = {
      largura: 1000, altura: 500,
      acabamentos: {
        polimento: { ativo: true, lados: { superior: true, inferior: false, esquerda: false, direita: false } },
        esquadria: { ativo: false, lados: {} },
        boleado: { ativo: false, lados: {} },
        canal: { ativo: false, lados: {} },
      },
    };
    const r = recalcularPersonalizados(peca);
    expect(r.polimento).toBe('1.00');
    expect(r.esquadria).toBe('');
  });
});

describe('clampMm', () => {
  it('mantém valor dentro dos limites', () => {
    expect(clampMm(500, 0, 1000)).toBe(500);
  });

  it('clampa para min', () => {
    expect(clampMm(-50, 0, 1000)).toBe(0);
  });

  it('clampa para max', () => {
    expect(clampMm(1500, 0, 1000)).toBe(1000);
  });
});

describe('sincronizarQuantidadesRecortes', () => {
  it('conta cada tipo de recorte na lista posicionada', () => {
    const peca = {
      recortesPosicionados: [
        { tipo: 'cuba' }, { tipo: 'cuba' },
        { tipo: 'cooktop' },
        { tipo: 'recorte' }, { tipo: 'recorte' }, { tipo: 'recorte' },
      ],
    };
    const r = sincronizarQuantidadesRecortes(peca);
    expect(r.cuba).toBe(2);
    expect(r.cooktop).toBe(1);
    expect(r.recorte).toBe(3);
    expect(r.cubaEsculpida).toBe(0);
  });

  it('zera contadores quando lista vazia', () => {
    const r = sincronizarQuantidadesRecortes({ recortesPosicionados: [] });
    expect(r.cuba).toBe(0);
    expect(r.cooktop).toBe(0);
  });

  it('aceita peça sem recortesPosicionados', () => {
    const r = sincronizarQuantidadesRecortes({});
    expect(r.cuba).toBe(0);
  });
});

describe('cantoRecorte', () => {
  it('retângulo: usa x/y/largura/altura diretamente', () => {
    const r = cantoRecorte({ shape: 'retangulo', x: 100, y: 200, largura: 500, altura: 400 });
    expect(r).toEqual({ x: 100, y: 200, w: 500, h: 400 });
  });

  it('círculo: ajusta x/y pelo raio e usa diâmetro como w/h', () => {
    const r = cantoRecorte({ shape: 'circulo', x: 100, y: 200, raio: 30 });
    expect(r).toEqual({ x: 70, y: 170, w: 60, h: 60 });
  });
});
