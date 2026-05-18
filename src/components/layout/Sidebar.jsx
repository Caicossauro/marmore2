import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
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

  const linkClass = ({ isActive }) =>
    `flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors
     ${retraido ? 'ml-3 w-10 justify-center' : 'gap-3 px-4'}
     ${isActive ? linkAtivo : linkInativo}`;

  return (
    <aside className="w-full h-screen bg-marble flex flex-col flex-shrink-0 overflow-hidden">

      {/* Logo */}
      <button
        onClick={onToggle}
        className={`flex items-center border-b border-white/10 w-full hover:bg-white/10 transition-colors shrink-0 ${retraido ? 'pl-3 py-4' : 'gap-3 px-4 py-4'}`}
        title={retraido ? 'Expandir menu' : 'Retrair menu'}
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <img src={logoImg} alt="Pietra" className="w-full h-full object-cover" />
        </div>
        {!retraido && (
          <div className="text-left overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">Pietra</p>
            <p className="text-slate-300 text-xs whitespace-nowrap">Ambientes</p>
          </div>
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
                {!retraido && <span className="whitespace-nowrap overflow-hidden">{entry.label}</span>}
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
                    {!retraido && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

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
      </div>

    </aside>
  );
}
