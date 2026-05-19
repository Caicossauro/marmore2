/**
 * Botão padrão do sistema — único ponto de verdade pra estilo.
 *
 * Variantes:
 *  - primary       : Ação principal (mármore preto → verde no hover). Use UMA por contexto.
 *  - secondary     : Outline neutro (border slate-300 + texto slate-700). Padrão pra ações comuns.
 *  - ghost         : Sem borda, hover bg-slate-100. Ações terciárias (Imprimir, Cancelar, etc.).
 *  - destructive   : Outline vermelho discreto pra ações destrutivas (Excluir).
 *  - destructiveSolid : Vermelho mármore sólido pra "confirmar exclusão" em modais.
 *  - warning       : Outline amber discreto pra "atenção" (Plano Manual e similares).
 *
 * Tamanhos:
 *  - sm  : compacto (h-8) — toolbars densas
 *  - md  : padrão (h-9) — uso geral
 *  - lg  : destaque (h-10) — Salvar Orçamento, primário em destaque
 *
 * Aceita `as="a"` pra renderizar como link, e qualquer prop nativa de <button>.
 */

const BASE = 'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3 sm:px-4 text-xs sm:text-sm gap-2',
  lg: 'h-10 px-4 sm:px-5 text-sm sm:text-base gap-2',
};

const VARIANTS = {
  primary:          'inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-800 text-white font-semibold shadow-sm hover:shadow disabled:hover:bg-zinc-900',
  secondary:        'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 font-medium',
  ghost:            'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium',
  destructive:      'bg-white text-red-700 border border-red-300 hover:bg-red-50 hover:border-red-400 font-medium',
  destructiveSolid: 'marble-btn-dark-red text-white font-semibold shadow-sm',
  warning:          'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 hover:border-amber-400 font-medium',
};

const PRECISA_Z10 = new Set(['destructiveSolid']);

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  const sizeCls = SIZES[size] || SIZES.md;
  const variantCls = VARIANTS[variant] || VARIANTS.secondary;
  const cls = `${BASE} ${sizeCls} ${variantCls} ${className}`.trim();

  // Variantes com efeito mármore (`:before` overlay animado) exigem o conteúdo
  // dentro de um span com z-index pra ficar acima da camada animada.
  if (PRECISA_Z10.has(variant)) {
    return (
      <button type={type} className={cls} {...props}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
