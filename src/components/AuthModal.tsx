import React, { useState } from 'react';
import { Shield, KeyRound, Lock, ArrowRight, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { loginUser } from '../services/api';
import type { User } from '../types';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [userId, setUserId] = useState('Admin');
  const [password, setPassword] = useState('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError('Please provide both User ID and Password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await loginUser(userId.trim(), password.trim());
      onSuccess(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = async (id: string, pass: string) => {
    setUserId(id);
    setPassword(pass);
    setError(null);
    try {
      setLoading(true);
      const res = await loginUser(id, pass);
      onSuccess(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Preset login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#1B1F2A] border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">ZoomRTC Security Portal</h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Enterprise WebRTC conference with JWT session verification
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-red-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              User ID / Employee ID
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. Admin or EMP-101"
                className="w-full bg-gray-900/90 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900/90 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="text-xs">Authenticating Session...</span>
            ) : (
              <>
                <span>Sign In Securely</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Presets for Demo & Multi-Peer Testing */}
        <div className="mt-6 pt-5 border-t border-gray-800">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
            One-Click Login Presets
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectPreset('Admin', 'Admin')}
              className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-colors flex flex-col group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-purple-300">👑 Admin</span>
                <span className="text-[10px] text-purple-400">Host</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5">Admin / Admin</span>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('EMP-101', 'sarah123')}
              className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-colors flex flex-col group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-blue-300">👩‍💻 Sarah C.</span>
                <span className="text-[10px] text-blue-400">Eng</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5">EMP-101</span>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('EMP-102', 'david123')}
              className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-colors flex flex-col group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-emerald-300">👨‍💼 David Chen</span>
                <span className="text-[10px] text-emerald-400">Product</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5">EMP-102</span>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('EMP-103', 'elena123')}
              className="p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-left transition-colors flex flex-col group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-pink-300">🎨 Elena R.</span>
                <span className="text-[10px] text-pink-400">Design</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5">EMP-103</span>
            </button>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-[11px] text-gray-400 flex items-start space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              Log in as <strong>Admin</strong> to generate custom employee IDs, access real-time meeting analytics, and exercise host moderation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
