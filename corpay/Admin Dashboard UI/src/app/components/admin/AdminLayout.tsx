import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { Button } from '../ui/button';
import { 
  BarChart3, 
  FileText, 
  Users, 
  PieChart,
  MonitorPlay,
  LogOut 
} from 'lucide-react';
import corpayLogo from '@/assets/e2cb3fa95a48c26580b1b8f80641608a87f3d801.png';

interface AdminLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

const navItems = [
  { path: '/admin/revenue', label: 'Revenue', icon: BarChart3 },
  { path: '/admin/posts', label: 'Posts', icon: FileText },
  { path: '/admin/employees', label: 'Employees', icon: Users },
  { path: '/admin/switch-screen', label: 'Switch Screen', icon: MonitorPlay },
];

export function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10">
        <div className="p-6">
          <div className="mb-8">
            <img src={corpayLogo} alt="Corpay" className="h-20 w-auto" />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-pink-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}