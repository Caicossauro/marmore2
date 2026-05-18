/**
 * Helpers puros para a feature "Linkar peças" (paginação com veio).
 *
 * Peças linkadas compartilham um `linkId` e são tratadas como uma "super peça"
 * — pelo drag (movem juntas), pelo otimizador (posicionadas juntas), e pelo
 * indicador visual (correntes entre peças adjacentes do grupo).
 *
 * `pecasTocando` e `floodFillLink` são puras: recebem peças, devolvem peças.
 * Não importam React nem mutam estado.
 */

/** Dimensões efetivas considerando rotação (90°). */
function dimEf(peca) {
  return {
    w: peca.rotacao === 90 ? peca.altura : peca.largura,
    h: peca.rotacao === 90 ? peca.largura : peca.altura,
  };
}

/**
 * Posição (top-left) da peça, normalizada para chapa OU staging.
 * - Peça em chapa: usa posX/posY (coords relativas à chapa).
 * - Peça avulsa: usa outsideX/outsideY (coords relativas ao frame da staging).
 *
 * O "frame" não importa pro link — todas as peças do grupo compartilham o mesmo
 * frame de origem (mesma chapa, ou mesma staging por materialId).
 */
function posDe(peca) {
  if (peca?.chapaId != null) {
    return { x: Number(peca.posX) || 0, y: Number(peca.posY) || 0 };
  }
  return { x: Number(peca.outsideX) || 0, y: Number(peca.outsideY) || 0 };
}

/**
 * Retorna as peças "tocando" a peça-alvo (mesma chapa).
 * Critério: sobreposição em UM eixo + gap ≤ espessuraDisco (+ tolerância) no OUTRO.
 *
 * Não conta como "tocando" peças sobrepostas (gap negativo) — apenas adjacentes.
 *
 * @param {object} pecaAlvo - peça com posX, posY, largura, altura, rotacao
 * @param {Array} outrasPecas - outras peças da MESMA chapa (sem a alvo)
 * @param {number} espessuraDisco - espaçamento esperado em mm
 * @param {number} tolerancia - folga adicional em mm (default 1)
 */
export function pecasTocando(pecaAlvo, outrasPecas, espessuraDisco, tolerancia = 1) {
  const { w: aw, h: ah } = dimEf(pecaAlvo);
  const { x: ax, y: ay } = posDe(pecaAlvo);
  const gapMax = espessuraDisco + tolerancia;
  const resultado = [];
  // CALLER deve filtrar peças do mesmo escopo (mesma chapa, ou mesma staging por material).

  for (const p of outrasPecas) {
    if (!p || p.id === pecaAlvo.id) continue;

    const { w: pw, h: ph } = dimEf(p);
    const { x: px, y: py } = posDe(p);

    // Sobreposição "geométrica" (espelho da bbox) — usada como gate.
    const yOverlap = Math.min(ay + ah, py + ph) - Math.max(ay, py);
    const xOverlap = Math.min(ax + aw, px + pw) - Math.max(ax, px);

    // Adjacentes horizontalmente (uma à esquerda da outra, com sobreposição em Y).
    if (yOverlap > 0) {
      const gapDir = px - (ax + aw); // p à direita de a
      const gapEsq = ax - (px + pw); // p à esquerda de a
      if ((gapDir >= 0 && gapDir <= gapMax) || (gapEsq >= 0 && gapEsq <= gapMax)) {
        resultado.push(p);
        continue;
      }
    }

    // Adjacentes verticalmente (uma acima da outra, com sobreposição em X).
    if (xOverlap > 0) {
      const gapInf = py - (ay + ah); // p abaixo de a
      const gapSup = ay - (py + ph); // p acima de a
      if ((gapInf >= 0 && gapInf <= gapMax) || (gapSup >= 0 && gapSup <= gapMax)) {
        resultado.push(p);
      }
    }
  }

  return resultado;
}

/**
 * Flood-fill transitivo: a partir de uma peça inicial, encontra TODAS as peças
 * conectadas por adjacência (A↔B↔C → grupo {A, B, C}).
 *
 * Se a peça inicial JÁ está em um grupo (linkId existente), o flood-fill começa
 * por todas as peças daquele grupo (semente). Útil pra "engolir" novas vizinhas
 * sem perder o grupo atual.
 *
 * @returns {string[]} array de ids das peças do grupo (inclui a inicial)
 */
export function floodFillLink(pecaInicial, todasPecasChapa, espessuraDisco, tolerancia = 1) {
  const grupoIds = new Set();
  const fila = [];

  // Semente: peça inicial + peças que já compartilham linkId (se houver)
  const linkIdAtual = pecaInicial.linkId || null;
  if (linkIdAtual) {
    for (const p of todasPecasChapa) {
      if (p.linkId === linkIdAtual) {
        grupoIds.add(p.id);
        fila.push(p);
      }
    }
  } else {
    grupoIds.add(pecaInicial.id);
    fila.push(pecaInicial);
  }

  // BFS — encontra todas as adjacentes transitivas
  while (fila.length > 0) {
    const atual = fila.shift();
    const outras = todasPecasChapa.filter(p => !grupoIds.has(p.id));
    const tocando = pecasTocando(atual, outras, espessuraDisco, tolerancia);
    for (const t of tocando) {
      if (!grupoIds.has(t.id)) {
        grupoIds.add(t.id);
        fila.push(t);
      }
    }
  }

  return Array.from(grupoIds);
}

/**
 * Detecta pares de peças adjacentes DENTRO de um grupo (mesmo linkId).
 * Usado para desenhar o ícone de corrente no ponto de contato entre cada par.
 *
 * Retorna: [{pecaA, pecaB, ladoCompartilhado: 'top'|'bottom'|'left'|'right'}, ...]
 */
export function paresAdjacentesDoGrupo(pecasGrupo, espessuraDisco, tolerancia = 1) {
  const gapMax = espessuraDisco + tolerancia;
  const pares = [];

  for (let i = 0; i < pecasGrupo.length; i++) {
    const a = pecasGrupo[i];
    const { w: aw, h: ah } = dimEf(a);
    const { x: ax, y: ay } = posDe(a);

    for (let j = i + 1; j < pecasGrupo.length; j++) {
      const b = pecasGrupo[j];
      const { w: bw, h: bh } = dimEf(b);
      const { x: bx, y: by } = posDe(b);

      const yOverlap = Math.min(ay + ah, by + bh) - Math.max(ay, by);
      const xOverlap = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);

      // Horizontalmente adjacentes
      if (yOverlap > 0) {
        const gapDir = bx - (ax + aw); // b à direita de a
        const gapEsq = ax - (bx + bw); // b à esquerda de a
        if (gapDir >= 0 && gapDir <= gapMax) {
          pares.push({ pecaA: a, pecaB: b, lado: 'horizontal-right' });
          continue;
        }
        if (gapEsq >= 0 && gapEsq <= gapMax) {
          pares.push({ pecaA: a, pecaB: b, lado: 'horizontal-left' });
          continue;
        }
      }

      // Verticalmente adjacentes
      if (xOverlap > 0) {
        const gapInf = by - (ay + ah);
        const gapSup = ay - (by + bh);
        if (gapInf >= 0 && gapInf <= gapMax) {
          pares.push({ pecaA: a, pecaB: b, lado: 'vertical-bottom' });
          continue;
        }
        if (gapSup >= 0 && gapSup <= gapMax) {
          pares.push({ pecaA: a, pecaB: b, lado: 'vertical-top' });
        }
      }
    }
  }

  return pares;
}

/**
 * Gera um linkId único pra um novo grupo.
 */
export function novoLinkId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calcula o bounding box combinado de um grupo de peças (em mm, em coords da chapa).
 * Considera rotação.
 */
export function bboxGrupo(pecasGrupo) {
  if (pecasGrupo.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pecasGrupo) {
    const { w, h } = dimEf(p);
    const { x, y } = posDe(p);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}
