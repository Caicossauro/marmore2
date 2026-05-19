import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const SIDEBAR_MIN       = 64;
const SIDEBAR_MAX       = 480;
const SIDEBAR_DEFAULT   = 240;
const SIDEBAR_COLLAPSED = 64;
const SNAP_THRESHOLD    = 120;
const LS_KEY          = 'sidebar_width';
const LS_KEY_EXPANDED = 'sidebar_expanded_width';

export default function AppLayout() {
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? Number(saved) : SIDEBAR_DEFAULT;
    } catch { return SIDEBAR_DEFAULT; }
  });

  const isDragging    = useRef(false);
  const startX        = useRef(0);
  const startWidth    = useRef(0);
  const [animating, setAnimating] = useState(false);

  const location = useLocation();

  const retraido = sidebarWidth <= SIDEBAR_COLLAPSED;

  const handleToggle = useCallback(() => {
    setAnimating(true);
    setSidebarWidth(w => {
      if (w <= SIDEBAR_COLLAPSED) {
        // Expandindo — restaura a última largura salva antes de colapsar
        let expanded = SIDEBAR_DEFAULT;
        try {
          const v = localStorage.getItem(LS_KEY_EXPANDED);
          if (v) expanded = Math.max(SIDEBAR_DEFAULT, Number(v));
        } catch { /* ignore */ }
        localStorage.setItem(LS_KEY, String(expanded));
        return expanded;
      } else {
        // Colapsando — salva largura atual como referência para o próximo expand
        localStorage.setItem(LS_KEY_EXPANDED, String(w));
        localStorage.setItem(LS_KEY, String(SIDEBAR_COLLAPSED));
        return SIDEBAR_COLLAPSED;
      }
    });
  }, []);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    setAnimating(false);
    startX.current     = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta    = e.clientX - startX.current;
      const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current             = false;
      setAnimating(true);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      setSidebarWidth(w => {
        const snapped = w < SNAP_THRESHOLD ? SIDEBAR_COLLAPSED : w;
        localStorage.setItem(LS_KEY, String(snapped));
        if (snapped > SIDEBAR_COLLAPSED) {
          localStorage.setItem(LS_KEY_EXPANDED, String(snapped));
        }
        return snapped;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">

        {/* Wrapper desktop — largura controlada pelo drag */}
        <div
          data-app-sidebar
          className="hidden md:flex flex-shrink-0 overflow-hidden h-screen relative"
          style={{
            width: sidebarWidth,
            transition: animating ? 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          <Sidebar retraido={retraido} onToggle={handleToggle} />

          {/* Handle de drag — borda direita da sidebar */}
          <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-20 group"
          >
            <div className="h-full w-full group-hover:bg-white/25 transition-colors duration-150" />
          </div>
        </div>

        {/* Drawer mobile */}
        {drawerAberto && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setDrawerAberto(false)}
            />
            <div className="fixed left-0 top-0 h-full z-[61]">
              <Sidebar retraido={false} onToggle={() => {}} onFechar={() => setDrawerAberto(false)} />
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div data-app-mobile-header className="md:hidden flex items-center bg-sidebar px-4 py-3 gap-3 relative z-[70]">
            <button
              onClick={() => setDrawerAberto(prev => !prev)}
              className="text-white p-1"
              aria-label={drawerAberto ? 'Fechar menu' : 'Abrir menu'}
            >
              {drawerAberto ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <span className="text-white font-semibold text-sm">MarmoSys</span>
          </div>

          <main
            className="flex-1 overflow-auto bg-marble-white [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>

      </div>
    </ProtectedRoute>
  );
}
