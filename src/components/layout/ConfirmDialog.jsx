import { useState, useRef } from 'react';
import { Button } from '../ui/Button';

export function ConfirmDialog({ mensagem, onConfirmar, onCancelar }) {
  const [fechando, setFechando] = useState(false);
  const callbackRef = useRef(null);

  const fechar = (callback) => {
    callbackRef.current = callback;
    setFechando(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 bg-black/40 ${fechando ? 'dialog-backdrop-out' : 'dialog-backdrop-in'}`} />
      <div
        className={`relative bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200 ${fechando ? 'dialog-card-out' : 'dialog-card-in'}`}
        onAnimationEnd={() => { if (fechando && callbackRef.current) callbackRef.current(); }}
      >
        <p className="text-slate-800 text-sm mb-5">{mensagem}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => fechar(onCancelar)}>
            Cancelar
          </Button>
          <Button variant="destructiveSolid" onClick={() => fechar(onConfirmar)}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
