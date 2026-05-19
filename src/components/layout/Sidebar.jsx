import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { PanelLeft } from 'lucide-react';
import logoImg from '/logo.png';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import {
  DashboardIcon,
  UsersIcon,
  OrcamentosIcon,
  MateriaisIcon,
  PrecosIcon,
  LogOutIcon,
} from '../../constants/icons';

const HomeIcon    = ({ size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ContractIcon = ({ size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

const NAV = [
  {
    type: 'link',
    to: '/',
    end: true,
    label: 'Início',
    Icon: HomeIcon,
  },
  {
    type: 'section',
    label: 'Vendas',
    items: [
      { to: '/orcamentos', label: 'Orçamentos', Icon: OrcamentosIcon },
      { to: '/contratos',  label: 'Contratos',  Icon: ContractIcon },
      { to: '/dashboard',  label: 'Dashboard',  Icon: DashboardIcon },
    ],
  },
  {
    type: 'section',
    label: 'Cadastros',
    items: [
      { to: '/clientes',  label: 'Clientes',  Icon: UsersIcon },
      { to: '/materiais', label: 'Materiais', Icon: MateriaisIcon },
      { to: '/precos',    label: 'Preços',    Icon: PrecosIcon },
    ],
  },
];

const linkInativo = 'text-slate-300 hover:bg-white/10 hover:text-white';
const linkAtivo   = 'bg-white/15 text-white';

export function Sidebar({ retraido, onToggle, onFechar }) {
  const navigate = useNavigate();

  const sair = async () => {
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.error('Erro ao sair:', e);
    } finally {
      navigate('/login', { replace: true });
      onFechar?.();
    }
  };

  const linkClass = ({ isActive }) => {
    const base = 'flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors';
    if (retraido) {
      return `${base} ml-3 w-10 justify-center ${isActive ? linkAtivo : linkInativo}`;
    }
    return `${base} gap-3 pr-4 pl-[13px] border-l-[3px] transition-colors
      ${isActive
        ? `${linkAtivo} border-white`
        : `${linkInativo} border-transparent`
      }`;
  };

  return (
    <aside className="w-full h-screen bg-sidebar flex flex-col flex-shrink-0 overflow-hidden">

      {/* Logo */}
      <button
        onClick={onToggle}
        className={`flex items-center border-b border-white/10 w-full hover:bg-white/10 transition-colors shrink-0 ${retraido ? 'justify-center py-7' : 'gap-3 px-4 py-7'}`}
        title={retraido ? 'Expandir menu' : 'Retrair menu'}
      >
        {retraido ? (
          <PanelLeft size={22} className="text-white/60" />
        ) : (
          <>
            <div className="w-20 h-20 flex-shrink-0">
              <img src={logoImg} alt="MarmoSys" className="w-full h-full object-contain" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">MarmoSys</p>
              <p className="text-slate-300 text-xs whitespace-nowrap">Soluções</p>
              <p className="text-slate-300 text-xs whitespace-nowrap">Para Marmoraria</p>
            </div>
          </>
        )}
      </button>

      {/* Navegação */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${retraido ? 'px-0' : 'px-3'}`}>
        {NAV.map((entry, i) => {
          if (entry.type === 'link') {
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                onClick={onFechar}
                title={retraido ? entry.label : undefined}
                className={linkClass}
              >
                <entry.Icon size={17} className="shrink-0" />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${retraido ? 'opacity-0 w-0' : 'opacity-100'}`}>{entry.label}</span>
              </NavLink>
            );
          }

          return (
            <div key={i} className={retraido ? 'pt-2' : 'pt-3'}>
              {!retraido && (
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                  {entry.label}
                </p>
              )}
              {retraido && <div className="mx-3 mb-1 border-t border-white/10" />}
              <div className="space-y-0.5">
                {entry.items.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onFechar}
                    title={retraido ? label : undefined}
                    className={linkClass}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${retraido ? 'opacity-0 w-0' : 'opacity-100'}`}>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Perfil do usuário */}
      {auth?.currentUser && (
        <div className={`border-t border-white/10 pt-3 pb-1 ${retraido ? 'px-0' : 'px-3'}`}>
          {retraido ? (
            <div className="flex justify-center mb-2">
              <div
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0"
                title={auth.currentUser.email ?? ''}
              >
                {(auth.currentUser.email || 'U')[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(auth.currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate leading-tight">
                  {auth.currentUser.displayName || auth.currentUser.email}
                </p>
                <p className="text-slate-400 text-[10px] leading-tight mt-0.5">Administrador</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sair */}
      <div className={`pb-4 border-t border-white/10 pt-3 ${retraido ? 'px-0' : 'px-3'}`}>
        <button
          onClick={sair}
          title={retraido ? 'Sair' : undefined}
          className={`flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors ${linkInativo} ${retraido ? 'ml-3 w-10 justify-center' : 'gap-3 px-4 w-full'}`}
        >
          <LogOutIcon size={17} className="shrink-0" />
          {!retraido && <span className="whitespace-nowrap">Sair</span>}
        </button>
        {!retraido && (
          <p className="text-[10px] text-slate-600 text-center mt-2 select-none">v1.0</p>
        )}
      </div>

    </aside>
  );
}
