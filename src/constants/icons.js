import React from 'react';
import {
  Home as _Home,
  Users as _Users,
  FileText as _FileText,
  Package as _Package,
  DollarSign as _DollarSign,
  LogOut as _LogOut,
  LayoutDashboard as _LayoutDashboard,
  ArrowLeft as _ArrowLeft,
  ChevronRight as _ChevronRight,
  ChevronDown as _ChevronDown,
  Search as _Search,
  ArrowUpDown as _ArrowUpDown,
  ArrowUp as _ArrowUp,
  ArrowDown as _ArrowDown,
  GripVertical as _GripVertical,
} from 'lucide-react';

// Ícones como wrappers de emoji — legado, usados no SistemaOrcamentoMarmore existente.
// O parâmetro `size` é aceito (mas não aplicado ao emoji) para compatibilidade.
const emoji = (char) => {
  const Icon = () => React.createElement('span', null, char);
  Icon.displayName = `EmojiIcon(${char})`;
  return Icon;
};

export const PlusCircle = emoji('➕');
export const Trash2     = emoji('🗑️');
export const Edit2      = emoji('✏️');
export const Save       = emoji('💾');
export const X          = emoji('❌');
export const Move       = emoji('↔️');
export const Grid       = emoji('⊞');
export const FileText   = emoji('📄');
export const Home       = emoji('🏠');
export const Package    = emoji('📦');
export const Printer    = emoji('🖨️');

// Ícones lucide-react para o novo layout (Sidebar e novas páginas).
// Nomes distintos evitam conflito com os exports emoji acima.
export const HomeIcon       = _Home;
export const UsersIcon      = _Users;
export const OrcamentosIcon = _FileText;
export const MateriaisIcon  = _Package;
export const PrecosIcon     = _DollarSign;
export const LogOutIcon     = _LogOut;
export const DashboardIcon    = _LayoutDashboard;
export const ArrowLeftIcon    = _ArrowLeft;
export const ChevronRightIcon = _ChevronRight;
export const ChevronDownIcon  = _ChevronDown;
export const SearchIcon       = _Search;
export const ArrowUpDownIcon  = _ArrowUpDown;
export const ArrowUpIcon        = _ArrowUp;
export const ArrowDownIcon      = _ArrowDown;
export const GripVerticalIcon   = _GripVertical;
