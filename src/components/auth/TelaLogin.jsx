import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../lib/firebase';

const mensagemDeErro = (codigo) => {
  switch (codigo) {
    case 'auth/invalid-email':         return 'E-mail inválido.';
    case 'auth/user-disabled':         return 'Usuário desativado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':    return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':     return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 'auth/network-request-failed':return 'Sem conexão. Verifique sua internet.';
    default:                           return 'Não foi possível entrar. Tente novamente.';
  }
};

export const TelaLogin = ({ aoEntrar }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    let timer;
    if (bloqueado && segundosRestantes > 0) {
      timer = setTimeout(() => setSegundosRestantes(s => s - 1), 1000);
    }
    if (segundosRestantes === 0 && bloqueado) {
      setBloqueado(false);
      setTentativas(0);
    }
    return () => clearTimeout(timer);
  }, [bloqueado, segundosRestantes]);

  const tentar = async () => {
    if (bloqueado || !email || !senha || verificando) return;
    if (!isFirebaseConfigured || !auth) {
      setErro('Sistema de autenticação não configurado.');
      return;
    }

    setVerificando(true);
    setErro('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      aoEntrar?.();
    } catch (e) {
      const novas = tentativas + 1;
      setTentativas(novas);
      setErro(mensagemDeErro(e?.code));
      setSenha('');
      if (novas >= 5) {
        setBloqueado(true);
        setSegundosRestantes(30);
      }
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950">
      <div className="w-full max-w-[380px]">

        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[20px] flex items-center justify-center text-[38px] shadow-[0_10px_40px_rgba(59,130,246,0.3)]">
            ⊞
          </div>
        </div>

        <h1 className="text-white text-[28px] font-bold text-center mb-1">
          Pietra Ambientes
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Sistema de Orçamentos
        </p>

        <div className="bg-slate-800 rounded-[20px] border border-slate-700 p-8 shadow-[0_25px_50px_rgba(0,0,0,0.4)]">

          <label className="block text-slate-300 text-[13px] font-semibold mb-2">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') tentar(); }}
            placeholder="seu@email.com"
            disabled={bloqueado || verificando}
            autoFocus
            autoComplete="username"
            className={`w-full px-4 py-3 rounded-xl text-white text-base outline-none transition-colors mb-4
              ${bloqueado ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-700'}
              ${erro ? 'border-2 border-red-500' : 'border border-slate-600'}
            `}
          />

          <label className="block text-slate-300 text-[13px] font-semibold mb-2">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') tentar(); }}
            placeholder={bloqueado ? `Bloqueado... ${segundosRestantes}s` : '••••••••'}
            disabled={bloqueado || verificando}
            autoComplete="current-password"
            className={`w-full px-4 py-3 rounded-xl text-white text-base outline-none transition-colors
              ${bloqueado ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-700'}
              ${erro ? 'border-2 border-red-500' : 'border border-slate-600'}
            `}
          />

          {erro && !bloqueado && (
            <p className="text-red-400 text-[13px] mt-2">
              ⚠️ {erro}
              {tentativas > 0 && tentativas < 5 && ` Tentativas restantes: ${5 - tentativas}`}
            </p>
          )}

          {bloqueado && (
            <p className="text-amber-400 text-[13px] mt-2">
              🔒 Bloqueado por tentativas. Aguarde {segundosRestantes}s
            </p>
          )}

          <button
            onClick={tentar}
            disabled={bloqueado || !email || !senha || verificando}
            className={`w-full mt-6 py-[13px] rounded-xl border-none text-white text-[15px] font-bold transition-all
              ${bloqueado || !email || !senha || verificando
                ? 'bg-slate-600 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 cursor-pointer shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:brightness-110'
              }
            `}
          >
            {bloqueado ? '🔒 Bloqueado' : verificando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <p className="text-slate-600 text-center text-xs mt-5">
          Acesso restrito · Fale com o administrador para obter as credenciais
        </p>
      </div>
    </div>
  );
};
