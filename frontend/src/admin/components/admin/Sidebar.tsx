import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Menu,
  X,
  GanttChart,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      path: '/admin/dashboard',
      label: 'Global Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/admin/users',
      label: 'Manage Users',
      icon: Users,
    },
    {
      // ✅ MUST include employeeId
      path: '/admin/summary/1',
      label: 'Employee Summary',
      icon: FileText,
    },
    {
      path: '/admin/gantt',
      label: 'Team Gantt Chart',
      icon: GanttChart,
    },
    {
      path: '/admin/settings',
      label: 'Admin Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-300 z-30
          transition-all duration-300
          ${isOpen ? 'w-64' : 'w-20'}
        `}
      >
        {/* Header / Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          {isOpen && <span className="text-gray-900 font-medium">Menu</span>}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            // ✅ Highlight summary correctly even with different IDs
            const isActive =
              item.label === 'Employee Summary'
                ? location.pathname.startsWith('/admin/summary')
                : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}