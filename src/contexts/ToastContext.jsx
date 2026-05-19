import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let _id = 0;

const CONFIG = {
  success: { bg: 'bg-green-50',  border: 'border-green-200',  icon: CheckCircle,   cor: 'text-green-600'  },
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    icon: AlertCircle,   cor: 'text-red-600'    },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: AlertTriangle, cor: 'text-amber-600'  },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Info,          cor: 'text-blue-600'   },
};

function ToastItem({ item, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const { bg, border, icon: Icon, cor } = CONFIG[item.tipo] || CONFIG.info;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 border rounded-card shadow-dropdown px-4 py-3 min-w-[280px] max-w-sm transition-all duration-200 ${bg} ${border} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${cor}`} />
      <p className="text-sm text-content-primary flex-1 leading-snug">{item.mensagem}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-content-muted hover:text-content-secondary transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((tipo, mensagem, duracao = 4000) => {
    const id = ++_id;
    setItems(prev => [...prev.slice(-2), { id, tipo, mensagem }]);
    setTimeout(() => dismiss(id), duracao);
  }, [dismiss]);

  const toast = {
    success: (m) => add('success', m),
    error:   (m) => add('error',   m),
    warning: (m) => add('warning', m),
    info:    (m) => add('info',    m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {items.map(item => (
          <ToastItem key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
