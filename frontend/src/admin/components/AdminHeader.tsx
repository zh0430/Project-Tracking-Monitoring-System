import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Admin } from "../AdminApp";

interface AdminHeaderProps {
  admin: Admin;
  onLogout: () => void;
}

/**
 * ADMIN HEADER COMPONENT
 * Displays the admin user dropdown menu with profile information,
 * settings navigation, and logout functionality. Closes automatically
 * when clicking outside the component.
 */

export function AdminHeader({ admin, onLogout }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg"
      >
        <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center">
          {admin.name.charAt(0)}
        </div>
        <span className="text-gray-700">{admin.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 flex gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-gray-900 font-medium">
                {admin.name}
              </div>
              <div className="text-gray-600 text-sm">
                {admin.email}
              </div>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/admin/settings");
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded text-left"
            >
              <Settings className="w-5 h-5" />
              Admin Settings
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded text-left"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}