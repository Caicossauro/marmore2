import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { TelaLogin } from '../components/auth/TelaLogin';
import { auth, isFirebaseConfigured } from '../lib/firebase';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    return onAuthStateChanged(auth, (user) => {
      if (user) navigate('/', { replace: true });
    });
  }, [navigate]);

  return <TelaLogin aoEntrar={() => navigate('/', { replace: true })} />;
}
