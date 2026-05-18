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
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(59,130,246,0.3)',
              fontSize: '38px'
            }}
          >
            ⊞
          </div>
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: '0 0 4px 0'
          }}
        >
          Pietra Ambientes
        </h1>
        <p
          style={{
            color: '#94a3b8',
            textAlign: 'center',
            margin: '0 0 32px 0',
            fontSize: '14px'
          }}
        >
          Sistema de Orçamentos
        </p>

        <div
          style={{
            background: '#1e293b',
            borderRadius: '20px',
            border: '1px solid #334155',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
          }}
        >
          <label
            style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '8px'
            }}
          >
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
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: erro ? '2px solid #ef4444' : '1px solid #475569',
              background: bloqueado ? '#1e293b' : '#334155',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: bloqueado ? 'not-allowed' : 'text',
              transition: 'border 0.2s',
              marginBottom: '16px'
            }}
          />

          <label
            style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '8px'
            }}
          >
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
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: erro ? '2px solid #ef4444' : '1px solid #475569',
              background: bloqueado ? '#1e293b' : '#334155',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: bloqueado ? 'not-allowed' : 'text',
              transition: 'border 0.2s'
            }}
          />

          {erro && !bloqueado && (
            <p
              style={{
                color: '#f87171',
                fontSize: '13px',
                marginTop: '8px',
                margin: '8px 0 0 0'
              }}
            >
              ⚠️ {erro}
              {tentativas > 0 && tentativas < 5 && ` Tentativas restantes: ${5 - tentativas}`}
            </p>
          )}

          {bloqueado && (
            <p
              style={{
                color: '#fbbf24',
                fontSize: '13px',
                marginTop: '8px',
                margin: '8px 0 0 0'
              }}
            >
              🔒 Bloqueado por tentativas. Aguarde {segundosRestantes}s
            </p>
          )}

          <button
            onClick={tentar}
            disabled={bloqueado || !email || !senha || verificando}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background:
                bloqueado || !email || !senha || verificando
                  ? '#475569'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: bloqueado || !email || !senha || verificando ? 'not-allowed' : 'pointer',
              boxShadow:
                bloqueado || !email || !senha || verificando ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
              transition: 'all 0.2s'
            }}
          >
            {bloqueado ? '🔒 Bloqueado' : verificando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <p
          style={{
            color: '#475569',
            textAlign: 'center',
            fontSize: '12px',
            marginTop: '20px'
          }}
        >
          Acesso restrito · Fale com o administrador para obter as credenciais
        </p>
      </div>
    </div>
  );
};
