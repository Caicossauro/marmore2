export function EmptyState({ icone: Icone, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      {Icone && (
        <div className="w-14 h-14 rounded-2xl bg-surface-subtle flex items-center justify-center mb-4">
          <Icone size={24} className="text-content-muted" />
        </div>
      )}
      <p className="text-sm font-semibold text-content-secondary mb-1">{titulo}</p>
      {descricao && (
        <p className="text-sm text-content-muted mb-4 max-w-xs">{descricao}</p>
      )}
      {acao && <div>{acao}</div>}
    </div>
  );
}
