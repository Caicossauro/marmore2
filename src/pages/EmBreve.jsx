export default function EmBreve({ titulo }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-3 text-slate-400">
      <span className="text-5xl">🚧</span>
      <h1 className="text-2xl font-bold text-slate-600">{titulo}</h1>
      <p className="text-sm">Em breve...</p>
    </div>
  );
}
