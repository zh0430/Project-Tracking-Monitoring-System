import { User as UserIcon, LayoutDashboard, ListChecks, Settings, GanttChartSquare, LogOut } from 'lucide-react';
import { User } from '../App';
import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";

interface LayoutProps {
  user: User;
  successMessage: string;
  onLogout?: () => void;
}

export function Layout({
  user,
  successMessage,
  onLogout,
}: LayoutProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      path: 'dashboard',
      label: 'Global Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: 'projects',
      label: 'Manage Projects',
      icon: ListChecks,
    },
    {
      path: 'gantt',
      label: 'Gantt Chart Tracking',
      icon: GanttChartSquare,
    },
    {
      path: 'settings',
      label: 'User Settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Menu</h2>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.endsWith(item.path);
              return (
                <li key={item.path}>
                  <button
  onClick={() => navigate(item.path)}
  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
    isActive
      ? 'bg-red-600 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`}
>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-8 py-6 flex items-center justify-between">
            <h1 className="text-gray-900">
              Task Tracking and Workload Monitoring System - User Panel
            </h1>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="text-right">
                  <div className="text-gray-900">{user.fullName}</div>
                  <div className="text-gray-600 text-sm">{user.userId}</div>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-600" />
                  )}
                </div>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-8 h-8 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-gray-900">{user.fullName}</div>
                        <div className="text-gray-600 text-sm">{user.email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
                    >
                      <Settings className="w-5 h-5" />
                      <span>User Settings</span>
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-colors text-left"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-8 mt-6">
            <div className="bg-gray-100 border border-gray-300 text-gray-900 px-4 py-3 rounded">
              {successMessage}
            </div>
          </div>
        )}

        {/* Page Content - Using Outlet for nested routes */}
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}