import { ChevronDownIcon } from '../../constants/icons';

export function SecaoAcordeao({ titulo, aberta, onToggle, backgroundPosition, children }) {
  return (
    <>
      <div
        className="bg-marble marble-section-hover border-b border-white/10 px-5 py-3 flex items-center justify-between cursor-pointer select-none"
        style={{ backgroundPosition }}
        onClick={onToggle}
      >
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{titulo}</h2>
        <ChevronDownIcon size={16} className={`text-white transition-transform duration-300 ${aberta ? 'rotate-0' : '-rotate-90'}`} />
      </div>
      <div style={{ height: aberta ? 'auto' : '0px', overflow: 'hidden', contain: 'layout' }}>
        <div style={{ transform: aberta ? 'translateY(0)' : 'translateY(-6px)', opacity: aberta ? 1 : 0, transition: 'transform 0.2s ease-out, opacity 0.15s ease-out', willChange: 'transform, opacity' }}>
          {children}
        </div>
      </div>
    </>
  );
}
