import { describe, it, expect } from 'vitest';
import { formatBRL } from './formatters';

describe('formatBRL', () => {
  it('formata número inteiro em R$ com 2 casas decimais', () => {
    expect(formatBRL(100)).toBe('R$ 100,00');
  });

  it('formata número com decimais', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
  });

  it('arredonda para 2 casas decimais', () => {
    expect(formatBRL(1.999)).toBe('R$ 2,00');
    expect(formatBRL(1.001)).toBe('R$ 1,00');
  });

  it('formata zero', () => {
    expect(formatBRL(0)).toBe('R$ 0,00');
  });

  it('formata valores negativos', () => {
    expect(formatBRL(-50)).toBe('R$ -50,00');
  });

  it('aceita string numérica', () => {
    expect(formatBRL('500.5')).toBe('R$ 500,50');
  });
});
