import React, { useState, useEffect } from 'react';
import type { User } from './types';
import { getCurrentUser, getStoredToken, clearStoredAuth, loginUser } from './services/api';
import { disconnectSocket } from './services/socket';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { LobbyView } from './components/LobbyView';
import { MeetingRoom } from './components/MeetingRoom';
import { AdminDashboard } from './components/AdminDashboard';
import { Users, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeView, setActiveView] = useState<'lobby' | 'meeting' | 'admin'>('lobby');

  // Quick switch modal
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Active meeting params
  const [activeMeetingId, setActiveMeetingId] = useState<string>('');
  const [activePasscode, setActivePasscode] = useState<string>('');
  const [mediaState, setMediaState] = useState<{ isMuted: boolean; isVideoOff: boolean }>({
    isMuted: false,
    isVideoOff: false,
  });

  // Restore session
  useEffect(() => {
    async function restore() {
      const stored = getStoredToken();
      if (!stored) {
        setLoadingAuth(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        setToken(stored);
      } catch {
        clearStoredAuth();
        setCurrentUser(null);
        setToken(null);
      } finally {
        setLoadingAuth(false);
      }
    }
    restore();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setToken(getStoredToken());
    setActiveView('lobby');
    setShowSwitchModal(false);
  };

  const handleLogout = () => {
    clearStoredAuth();
    disconnectSocket();
    setCurrentUser(null);
    setToken(null);
    setActiveView('lobby');
  };

  const handleJoinMeeting = (
    meetingId: string,
    passcode: string,
    initialMedia: { isMuted: boolean; isVideoOff: boolean }
  ) => {
    setActiveMeetingId(meetingId);
    setActivePasscode(passcode);
    setMediaState(initialMedia);
    setActiveView('meeting');
  };

  const handleLeaveMeeting = () => {
    disconnectSocket();
    setActiveView('lobby');
    setActiveMeetingId('');
    setActivePasscode('');
  };

  const handleSwitchAccount = async (id: string, pass: string) => {
    try {
      const res = await loginUser(id, pass);
      setCurrentUser(res.user);
      setToken(res.token);
      setShowSwitchModal(false);
      if (activeView === 'meeting') {
        handleLeaveMeeting();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Switch failed');
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-gray-400 text-xs font-medium">
        Verifying Session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* If not authenticated, render Login Modal */}
      {!currentUser && <AuthModal onSuccess={handleLoginSuccess} />}

      {/* Global Navigation Bar (unless inside full meeting screen) */}
      {currentUser && activeView !== 'meeting' && (
        <Navbar
          currentUser={currentUser}
          activeView={activeView}
          onNavigate={(view) => setActiveView(view)}
          onLogout={handleLogout}
          onOpenQuickSwitch={() => setShowSwitchModal(true)}
        />
      )}

      {/* Main Content Area */}
      {currentUser && (
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'lobby' && (
            <LobbyView
              currentUser={currentUser}
              onJoinMeeting={handleJoinMeeting}
              onOpenAdmin={() => setActiveView('admin')}
            />
          )}

          {activeView === 'meeting' && token && (
            <MeetingRoom
              currentUser={currentUser}
              token={token}
              meetingId={activeMeetingId}
              passcode={activePasscode}
              initialMediaState={mediaState}
              onLeave={handleLeaveMeeting}
            />
          )}

          {activeView === 'admin' && currentUser.role === 'admin' && (
            <AdminDashboard
              currentUser={currentUser}
              onBackToLobby={() => setActiveView('lobby')}
              onJoinRoomDirectly={(rId, pass) =>
                handleJoinMeeting(rId, pass, { isMuted: false, isVideoOff: false })
              }
            />
          )}
        </main>
      )}

      {/* Quick Switch User Modal (for effortless multi-role testing) */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1B1F2A] border border-gray-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Switch User Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Quickly switch identity to test meetings across multiple roles (Admin host vs Employee participant):
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSwitchAccount('Admin', 'Admin')}
                className="w-full p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-purple-300 block">👑 Executive Admin</span>
                  <span className="text-[10px] text-gray-400">ID: Admin • Role: Admin</span>
                </div>
                <span className="text-xs text-purple-400 font-semibold">Switch &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchAccount('EMP-101', 'sarah123')}
                className="w-full p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-blue-300 block">👩‍💻 Sarah Connor</span>
                  <span className="text-[10px] text-gray-400">ID: EMP-101 • Platform Eng</span>
                </div>
                <span className="text-xs text-blue-400 font-semibold">Switch &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchAccount('EMP-102', 'david123')}
                className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-emerald-300 block">👨‍💼 David Chen</span>
                  <span className="text-[10px] text-gray-400">ID: EMP-102 • Product Ops</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Switch &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchAccount('EMP-103', 'elena123')}
                className="w-full p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-pink-300 block">🎨 Elena Rostova</span>
                  <span className="text-[10px] text-gray-400">ID: EMP-103 • Design Systems</span>
                </div>
                <span className="text-xs text-pink-400 font-semibold">Switch &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
