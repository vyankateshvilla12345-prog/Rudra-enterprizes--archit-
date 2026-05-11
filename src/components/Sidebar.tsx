import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Map as MapIcon, 
  Users, 
  Bell, 
  Settings, 
  LogOut,
  Cylinder,
  ShoppingBag,
  Package,
  TrendingUp,
  BarChart3,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'registration', label: 'Add Cylinders', icon: Package },
  { id: 'orders', label: 'Distribution', icon: ShoppingBag },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
  { id: 'stock', label: 'Inventory', icon: Package },
  { id: 'dispatches', label: 'Logistics', icon: Truck },
  { id: 'tracking', label: 'Live Map', icon: MapIcon },
  { id: 'users', label: 'Team', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'analytics', label: 'Performance', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'settings', label: 'Config', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { logout, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';

  const visibleItems = isAdmin 
    ? menuItems 
    : isAccountant 
      ? menuItems.filter(item => ['registration', 'dispatch', 'stock', 'customers', 'invoices'].includes(item.id))
      : menuItems.filter(item => ['settings'].includes(item.id));

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <aside className={cn(
      "w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed lg:sticky top-0 z-[50] py-8 px-4 transition-transform duration-300 ease-in-out",
      "lg:translate-x-0",
      isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="flex items-center gap-3 px-4 mb-10">
        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
          <Cylinder className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-gray-900">CylinTrack</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all",
              activeTab === item.id 
                ? "bg-blue-50 text-blue-600" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-4">
        <button 
          onClick={logout}
          className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-colors text-sm font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
