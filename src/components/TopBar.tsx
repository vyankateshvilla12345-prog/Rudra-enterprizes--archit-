import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  onToggleMenu: () => void;
}

export default function TopBar({ onToggleMenu }: TopBarProps) {
  const { profile } = useAuth();

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button 
          onClick={onToggleMenu}
          className="p-2 text-gray-400 hover:text-gray-900 lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for dispatches, drivers..." 
            className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <button className="relative p-2 text-gray-400 hover:text-gray-900 transition-colors hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 min-w-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900">{profile?.displayName}</p>
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{profile?.role}</p>
          </div>
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden">
            {profile?.displayName ? (
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=random`} alt="avatar" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
