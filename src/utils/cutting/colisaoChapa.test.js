import { describe, it, expect } from 'vitest';
import { temColisao, foraDosLimites, hidratarPecaParaEdicao } from './colisaoChapa';

const CHAPA_3000_2000 = { material: { comprimento: 3000, altura: 2000 } };

const peca = (over = {}) => ({
  id: 1, altura: 500, largura: 800, rotacao: 0, posX: 100, posY: 100, ...over,
});

describe('temColisao', () => {
  it('peça isolada não colide', () => {
    expect(temColisao({
      peca: peca({ id: 1 }), outras: [], espacamento: 4, novaX: 100, novaY: 100,
    })).toBe(false);
  });

  it('peça em (100,100) 500x800 colide com outra em (200,200)', () => {
    const p1 = peca({ id: 1 });
    const p2 = peca({ id: 2, posX: 200, posY: 200 });
    expect(temColisao({
      peca: p1, outras: [p2], espacamento: 4, novaX: 100, novaY: 100,
    })).toBe(true);
  });

  it('ignora colisão com a própria peça', () => {
    const p = peca({ id: 1 });
    expect(temColisao({
      peca: p, outras: [p], espacamento: 4, novaX: 100, novaY: 100,
    })).toBe(false);
  });

  it('peças encostadas exatamente colidem por causa do espaçamento (disco de corte)', () => {
    // Peça A 800w em x=0 ocupa 0..800. Peça B começa em x=800 (encostada).
    const a = peca({ id: 2, posX: 0, posY: 0, largura: 800, altura: 500 });
    const b = peca({ id: 1, posX: 800, posY: 0, largura: 800, altura: 500 });
    expect(temColisao({
      peca: b, outras: [a], espacamento: 4, novaX: 800, novaY: 0,
    })).toBe(true);
  });

  it('peças separadas pelo espaçamento mínimo NÃO colidem', () => {
    // A ocupa 0..800. B começa em x=804 (4mm de gap).
    // AABB inflado: A vai até 804. B em novaX=804 → não satisfaz < 804.
    const a = peca({ id: 2, posX: 0, posY: 0, largura: 800, altura: 500 });
    const b = peca({ id: 1, largura: 800, altura: 500 });
    expect(temColisao({
      peca: b, outras: [a], espacamento: 4, novaX: 804, novaY: 0,
    })).toBe(false);
  });

  it('considera rotação 90° da peça arrastada (troca altura/largura)', () => {
    // Peça com rotacao=90 e largura=800, altura=500. Ao posicionar, largura efetiva = 500.
    const p1 = peca({ id: 1, rotacao: 90, largura: 800, altura: 500 });
    const p2 = peca({ id: 2, posX: 600, posY: 0, largura: 200, altura: 200 });
    // p1 em (0,0) com largura efetiva 500 → vai até x=500. Não colide com p2 em x=600.
    expect(temColisao({
      peca: p1, outras: [p2], espacamento: 4, novaX: 0, novaY: 0,
    })).toBe(false);
  });

  // Regressão do bug do parseFloat — peça com altura/largura como string deve continuar funcionando
  it('REGRESSÃO: trata altura/largura como string sem string-concat (bug parseFloat)', () => {
    const p1 = peca({ id: 1, altura: '500', largura: '800' });
    const p2 = peca({ id: 2, posX: 2000, posY: 1500, altura: '200', largura: '200' });
    // Se houvesse string-concat, "100" + "800" = "100800" e colidiria com qualquer coisa.
    // Com Number() defensivo, fica em x=100..900, y=100..600 — não colide com p2 em 2000,1500.
    expect(temColisao({
      peca: p1, outras: [p2], espacamento: 4, novaX: 100, novaY: 100,
    })).toBe(false);
  });
});

describe('foraDosLimites', () => {
  it('peça dentro da chapa retorna false', () => {
    expect(foraDosLimites({
      peca: peca(), chapa: CHAPA_3000_2000, margemLaterais: 25, novaX: 100, novaY: 100,
    })).toBe(false);
  });

  it('peça que ultrapassa a borda direita retorna true', () => {
    expect(foraDosLimites({
      peca: peca({ largura: 800 }), chapa: CHAPA_3000_2000, margemLaterais: 25,
      novaX: 2300, novaY: 100, // 2300 + 800 + 25 = 3125 > 3000
    })).toBe(true);
  });

  it('peça que ultrapassa a borda inferior retorna true', () => {
    expect(foraDosLimites({
      peca: peca({ altura: 500 }), chapa: CHAPA_3000_2000, margemLaterais: 25,
      novaX: 100, novaY: 1600, // 1600 + 500 + 25 = 2125 > 2000
    })).toBe(true);
  });

  it('peça antes da margem esquerda retorna true', () => {
    expect(foraDosLimites({
      peca: peca(), chapa: CHAPA_3000_2000, margemLaterais: 25, novaX: 10, novaY: 100,
    })).toBe(true);
  });

  it('peça antes da margem superior retorna true', () => {
    expect(foraDosLimites({
      peca: peca(), chapa: CHAPA_3000_2000, margemLaterais: 25, novaX: 100, novaY: 10,
    })).toBe(true);
  });

  it('peça exatamente na borda direita (com margem) cabe', () => {
    // largura=800, x=2175 → 2175 + 800 + 25 = 3000 (não > 3000)
    expect(foraDosLimites({
      peca: peca({ largura: 800 }), chapa: CHAPA_3000_2000, margemLaterais: 25,
      novaX: 2175, novaY: 100,
    })).toBe(false);
  });

  it('rotação 90° troca dimensões para limites', () => {
    // Peça 800x500 rotacionada vira 500x800. Em x=2175 (limite da peça 800), agora cabe.
    // Sem rotação: 2175 + 800 + 25 = 3000 (limite). Com rotação: 2175 + 500 + 25 = 2700 (folga).
    const rot = peca({ rotacao: 90, largura: 800, altura: 500 });
    expect(foraDosLimites({
      peca: rot, chapa: CHAPA_3000_2000, margemLaterais: 25, novaX: 2175, novaY: 100,
    })).toBe(false);
  });

  // REGRESSÃO do bug do parseFloat — limites não devem virar string concat
  it('REGRESSÃO: trata altura/largura como string sem string-concat', () => {
    // novaX=100 (number) + "800" (string) viraria "100800" se não houvesse Number().
    // "100800" > 3000 seria true → "fora dos limites" falso-positivo.
    const p = peca({ largura: '800', altura: '500' });
    expect(foraDosLimites({
      peca: p, chapa: CHAPA_3000_2000, margemLaterais: 25, novaX: 100, novaY: 100,
    })).toBe(false);
  });

  it('REGRESSÃO: limites da chapa como string também funcionam', () => {
    const chapaStr = { material: { comprimento: '3000', altura: '2000' } };
    expect(foraDosLimites({
      peca: peca(), chapa: chapaStr, margemLaterais: 25, novaX: 100, novaY: 100,
    })).toBe(false);
  });
});

describe('hidratarPecaParaEdicao', () => {
  it('preserva campos existentes', () => {
    const original = { id: 1, nome: 'X', altura: 500, largura: 800, rotacao: 0 };
    const h = hidratarPecaParaEdicao(original);
    expect(h.id).toBe(1);
    expect(h.nome).toBe('X');
    expect(h.altura).toBe(500);
  });

  it('adiciona estrutura de acabamentos se faltar', () => {
    const h = hidratarPecaParaEdicao({ id: 1, altura: 500, largura: 800, rotacao: 0 });
    expect(h.acabamentos.polimento.ativo).toBe(false);
    expect(h.acabamentos.esquadria.lados).toEqual({
      superior: false, inferior: false, esquerda: false, direita: false,
    });
  });

  it('zera campos de recortes ausentes', () => {
    const h = hidratarPecaParaEdicao({ id: 1, altura: 500, largura: 800, rotacao: 0 });
    expect(h.cuba).toBe(0);
    expect(h.cooktop).toBe(0);
    expect(h.pes).toBe(0);
  });

  it('calcula acabamentosPersonalizados baseado nos lados ativos', () => {
    const peca = {
      id: 1, altura: 1000, largura: 1000, rotacao: 0,
      acabamentos: {
        polimento: { ativo: true, lados: { superior: true, inferior: false, esquerda: false, direita: false } },
        esquadria: { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
        boleado:   { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
        canal:     { ativo: false, lados: { superior: false, inferior: false, esquerda: false, direita: false } },
      },
    };
    const h = hidratarPecaParaEdicao(peca);
    expect(h.acabamentosPersonalizados.polimento).toBe('1.00');
    expect(h.acabamentosPersonalizados.esquadria).toBe('');
  });

  it('cópia é independente do original (deep clone)', () => {
    const original = { id: 1, altura: 500, largura: 800, rotacao: 0, dados: { x: 1 } };
    const h = hidratarPecaParaEdicao(original);
    h.dados.x = 999;
    expect(original.dados.x).toBe(1);
  });
});
