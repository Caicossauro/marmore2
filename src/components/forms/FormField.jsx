export function FormField({ label, obrigatorio, erro, children }) {
  return (
    <div>
      <label className="label-base">
        {label}
        {obrigatorio && <span className="text-status-danger ml-0.5">*</span>}
      </label>
      {children}
      {erro && <p className="mt-1 text-xs text-status-danger">{erro}</p>}
    </div>
  );
}
