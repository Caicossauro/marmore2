import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../lib/firebase';

export function ProtectedRoute({ children }) {
  const [estado, setEstado] = useState({ carregando: true, logado: false });

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setEstado({ carregando: false, logado: false });
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setEstado({ carregando: false, logado: !!user });
    });
  }, []);

  if (estado.carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-marble-white">
        <div className="text-slate-500 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!estado.logado) return <Navigate to="/login" replace />;
  return children;
}
