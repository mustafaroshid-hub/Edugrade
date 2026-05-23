import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children, projectId }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isAdmin } = useAuth();
  const path = location.pathname;

  const navItems = [
    { label: 'Home',  icon: HomeIcon,  to: '/' },
    { label: 'New',   icon: PlusIcon,  to: '/project/new' },
    ...(projectId ? [
      { label: 'Entry', icon: PenIcon,  to: `/project/${projectId}/entry` },
      { label: 'Stats', icon: DiamondIcon, to: `/project/${projectId}/stats` },
      { label: 'Merit', icon: ListIcon, to: `/project/${projectId}/merit` },
    ] : []),
    ...(isAdmin ? [{ label: 'Admin', icon: BoltIcon, to: '/admin', admin: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-gray-800">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          {navItems.map(({ label, icon: Icon, to, admin }) => {
            const active = path === to;
            return (
              <button
                key={label}
                onClick={() => navigate(to)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[52px] ${
                  active
                    ? admin
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                    : admin
                      ? 'text-yellow-600 hover:text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── Inline SVG Icons ──────────────────────────────────────────── */
const HomeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const PenIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const DiamondIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 12 12 22 2 12"/>
  </svg>
);
const ListIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const BoltIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
