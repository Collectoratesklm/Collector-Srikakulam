import React from 'react';
import { Video, Shield, User as UserIcon, LogOut, Users, Sparkles } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeView: 'lobby' | 'meeting' | 'admin';
  onNavigate: (view: 'lobby' | 'admin') => void;
  onLogout: () => void;
  onOpenQuickSwitch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onLogout,
  onOpenQuickSwitch,
}) => {
  return (
    <header className="h-16 bg-[#161922] border-b border-gray-800/80 px-4 md:px-8 flex items-center justify-between select-none z-30">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('lobby')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-tight">ZoomRTC</span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              WebRTC Pro
            </span>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">Secure Enterprise Video & Moderation</p>
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {currentUser && (
          <>
            {/* View Switcher: Lobby / Admin */}
            <div className="hidden sm:flex items-center bg-gray-900/90 p-1 rounded-lg border border-gray-800">
              <button
                type="button"
                onClick={() => onNavigate('lobby')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeView === 'lobby'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Meeting Lobby
              </button>

              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center space-x-1.5 ${
                    activeView === 'admin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-indigo-400 hover:text-indigo-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
              )}
            </div>

            {/* Quick Switch Button (great for opening second tab or testing multiple personas) */}
            <button
              type="button"
              onClick={onOpenQuickSwitch}
              title="Quick Switch User Profile"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Switch User</span>
            </button>

            {/* Current User Pill */}
            <div className="flex items-center space-x-2.5 pl-2 border-l border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center border border-blue-400/30 shadow-inner">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="hidden lg:block text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-gray-200">{currentUser.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">ID: {currentUser.id}</div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
