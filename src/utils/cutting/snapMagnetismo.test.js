import { describe, it, expect } from 'vitest';
import { calcularSnap } from './snapMagnetismo';

const CHAPA = { material: { comprimento: 3000, altura: 2000 } };
const PECA = { id: 1, altura: 500, largura: 800, rotacao: 0 };

const params = (over = {}) => ({
  peca: PECA, outrasPecas: [], chapa: CHAPA,
  espessuraDisco: 4, margemLaterais: 25, tolerancia: 40,
  ...over,
});

describe('calcularSnap', () => {
  it('sem candidatos próximos: mantém posição original', () => {
    const r = calcularSnap({ ...params(), origX: 500, origY: 500 });
    expect(r.novaX).toBe(500);
    expect(r.novaY).toBe(500);
  });

  it('snap pra borda esquerda da chapa quando perto', () => {
    // margem = 25; origX = 30 → distância 5 < tolerância 40 → snap
    const r = calcularSnap({ ...params(), origX: 30, origY: 500 });
    expect(r.novaX).toBe(25);
  });

  it('snap pra borda direita: posiciona considerando largura da peça', () => {
    // peça largura 800. Borda direita: x + 800 + 25 = 3000 → x = 2175.
    // origX = 2180 → dist do alvo = 5 < 40 → snap.
    const r = calcularSnap({ ...params(), origX: 2180, origY: 500 });
    expect(r.novaX).toBe(2175);
  });

  it('snap pra borda superior', () => {
    const r = calcularSnap({ ...params(), origX: 500, origY: 30 });
    expect(r.novaY).toBe(25);
  });

  it('snap pra borda inferior', () => {
    // peça altura 500. Borda inf: y + 500 + 25 = 2000 → y = 1475.
    const r = calcularSnap({ ...params(), origX: 500, origY: 1480 });
    expect(r.novaY).toBe(1475);
  });

  it('não snap quando longe demais (acima da tolerância)', () => {
    // margem = 25; origX = 100 → dist 75 > 40 → não snap
    const r = calcularSnap({ ...params(), origX: 100, origY: 100 });
    expect(r.novaX).toBe(100);
    expect(r.novaY).toBe(100);
  });

  it('snap horizontal pra encostar (com gap = espessura disco) em peça vizinha', () => {
    // Vizinha em (0,500) com 800x500. Direita dela = 800. Com espaçamento 4 → snap target = 804.
    // origX = 800, origY = 500 (sobreposição vertical existe).
    const vizinha = { id: 2, posX: 0, posY: 500, largura: 800, altura: 500, rotacao: 0 };
    const r = calcularSnap({
      ...params({ outrasPecas: [vizinha] }),
      origX: 800, origY: 500,
    });
    expect(r.novaX).toBe(804);
  });

  it('snap de alinhamento (topo de duas peças em colunas diferentes)', () => {
    // Vizinha em (1500, 300). Peça arrastada em coluna diferente (x distante).
    // origY próximo a 300 → snap pro topo da vizinha (y=300).
    const vizinha = { id: 2, posX: 1500, posY: 300, largura: 500, altura: 500, rotacao: 0 };
    const r = calcularSnap({
      ...params({ outrasPecas: [vizinha] }),
      origX: 100, origY: 305,
    });
    expect(r.novaY).toBe(300);
  });

  it('espaçamento (gap mínimo) tem prioridade sobre alinhamento de borda', () => {
    // Há duas peças: uma que oferece snap de gap (mais perto) e outra de alinhamento.
    // O resultado deve ser o gap.
    const vizinhaGap = { id: 2, posX: 0, posY: 500, largura: 800, altura: 500, rotacao: 0 };
    const r = calcularSnap({
      ...params({ outrasPecas: [vizinhaGap] }),
      origX: 805, origY: 500, // perto do gap (804). Resultado deve ser 804.
    });
    expect(r.novaX).toBe(804);
  });

  it('rotação 90° usa dimensões trocadas para calcular alvos', () => {
    // Peça 800x500 com rotação 90 → largura efetiva 500, altura efetiva 800.
    // Borda inferior: y + 800 + 25 = 2000 → y = 1175.
    const pecaRot = { ...PECA, rotacao: 90 };
    const r = calcularSnap({ ...params({ peca: pecaRot }), origX: 100, origY: 1180 });
    expect(r.novaY).toBe(1175);
  });
});
