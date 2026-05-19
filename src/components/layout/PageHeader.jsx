export function PageHeader({ titulo, subtitulo, acoes }) {
  return (
    <div className="flex items-start justify-between px-3 pt-5 mb-3">
      <div>
        <h1 className="text-2xl font-bold text-content-primary leading-tight">{titulo}</h1>
        {subtitulo && (
          <p className="text-sm text-content-muted mt-0.5">{subtitulo}</p>
        )}
      </div>
      {acoes && (
        <div className="flex items-center gap-2 shrink-0 ml-4">{acoes}</div>
      )}
    </div>
  );
}
