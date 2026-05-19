export function TableSkeleton({ linhas = 7 }) {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(linhas)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-[14px]">
          <div className="h-4 bg-surface-subtle rounded animate-pulse" style={{ width: '30%' }} />
          <div className="h-4 bg-surface-subtle rounded animate-pulse" style={{ width: '20%' }} />
          <div className="h-4 bg-surface-subtle rounded animate-pulse" style={{ width: '15%' }} />
          <div className="h-4 bg-surface-subtle rounded animate-pulse ml-auto" style={{ width: '12%' }} />
        </div>
      ))}
    </div>
  );
}
