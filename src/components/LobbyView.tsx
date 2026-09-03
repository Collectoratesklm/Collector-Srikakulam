import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Share2,
  Mic,
  MicOff,
  VideoOff,
  Lock,
  Users,
  ShieldCheck,
  ArrowRight,
  Settings,
  Sparkles,
  Clock,
  Key,
} from 'lucide-react';
import type { User, Meeting } from '../types';
import { createMeeting } from '../services/api';
import { WebRTCManager } from '../utils/webrtc';

interface LobbyViewProps {
  currentUser: User;
  onJoinMeeting: (meetingId: string, passcode: string, mediaState: { isMuted: boolean; isVideoOff: boolean }) => void;
  onOpenAdmin: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentUser,
  onJoinMeeting,
  onOpenAdmin,
}) => {
  // Media preview states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Join form state
  const [joinMeetingId, setJoinMeetingId] = useState('948-283-1029');
  const [joinPasscode, setJoinPasscode] = useState('654321');

  // Schedule / New meeting state
  const [newTitle, setNewTitle] = useState(`${currentUser.name}'s Virtual Room`);
  const [newPasscode, setNewPasscode] = useState(Math.floor(100000 + Math.random() * 900000).toString());
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(true);
  const [enableEncryptedChat, setEnableEncryptedChat] = useState(true);
  const [allowParticipantScreenShare, setAllowParticipantScreenShare] = useState(true);
  const [allowParticipantChat, setAllowParticipantChat] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  // Pre-configured company meetings list
  const [activeCompanyMeetings] = useState<Array<{
    id: string;
    title: string;
    hostName: string;
    passcode: string;
    waitingRoom: boolean;
    encrypted: boolean;
  }>>([
    {
      id: '948-283-1029',
      title: 'Engineering All-Hands & Product Sync',
      hostName: 'Executive Admin',
      passcode: '654321',
      waitingRoom: true,
      encrypted: true,
    },
    {
      id: '512-839-4401',
      title: 'Security Compliance & RBAC Review',
      hostName: 'Elena Rostova',
      passcode: '908123',
      waitingRoom: false,
      encrypted: true,
    },
  ]);

  // Initialize preview stream
  useEffect(() => {
    const manager = new WebRTCManager();
    webrtcManagerRef.current = manager;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animId: number;

    async function initPreview() {
      try {
        const stream = await manager.getLocalMedia(!isVideoOff, !isMuted);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level meter
        if (window.AudioContext && stream.getAudioTracks().length > 0) {
          audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyser) {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.floor(avg * 1.5)));
            }
            animId = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (err) {
        console.warn('Preview stream error:', err);
      }
    }

    initPreview();

    return () => {
      cancelAnimationFrame(animId);
      if (audioContext) audioContext.close().catch(() => {});
      manager.destroy();
    };
  }, []);

  // Update track state on toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webrtcManagerRef.current?.setAudioMuted(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    webrtcManagerRef.current?.setVideoDisabled(next);
  };

  const handleInstantMeeting = async () => {
    try {
      setCreatingMeeting(true);
      const meeting = await createMeeting({
        title: `${currentUser.name}'s Instant Meeting`,
        passcode: Math.floor(100000 + Math.random() * 900000).toString(),
        settings: {
          waitingRoomEnabled: currentUser.role === 'admin' ? true : false,
          allowChat: true,
          allowScreenShare: true,
          allowUnmute: true,
          encryptedChat: true,
        },
      });
      onJoinMeeting(meeting.id, meeting.passcode, { isMuted, isVideoOff });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not create meeting');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingMeeting(true);
      const meeting = await createMeeting({
        title: newTitle,
        passcode: newPasscode,
        settings: {
          waitingRoomEnabled: enableWaitingRoom,
          allowChat: allowParticipantChat,
          allowScreenShare: allowParticipantScreenShare,
          allowUnmute: true,
          encryptedChat: enableEncryptedChat,
        },
      });
      setShowScheduleModal(false);
      onJoinMeeting(meeting.id, meeting.passcode, { isMuted, isVideoOff });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinMeetingId.trim()) return;
    onJoinMeeting(joinMeetingId.trim(), joinPasscode.trim(), { isMuted, isVideoOff });
  };

  return (
    <div className="flex-1 bg-[#0F1117] text-gray-100 p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full max-w-6xl">
        {/* Welcome greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-widest text-blue-400">
                Enterprise Communications Hub
              </span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Low Latency WebRTC
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Department: {currentUser.department || 'General Operations'} • User ID: <code className="text-blue-400 font-mono bg-blue-950/40 px-1.5 py-0.5 rounded">{currentUser.id}</code>
            </p>
          </div>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs md:text-sm shadow-lg shadow-purple-600/25 flex items-center space-x-2 self-start md:self-auto cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Launch Admin Dashboard & Users</span>
            </button>
          )}
        </div>

        {/* Main Grid: Action Cards on Left, AV Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* Left: Quick Actions */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Start or Join a Virtual Session
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* New Meeting (Orange/Red Zoom Style) */}
              <button
                type="button"
                onClick={handleInstantMeeting}
                disabled={creatingMeeting}
                className="p-5 rounded-2xl bg-gradient-to-br from-orange-600/20 to-orange-700/10 hover:from-orange-600/30 hover:to-orange-700/20 border border-orange-500/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-xl shadow-orange-950/20 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:rotate-3 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <div className="mt-4">
                  <span className="text-base font-bold text-white block">New Meeting</span>
                  <span className="text-xs text-orange-200/70 block mt-0.5">
                    Start instant video room
                  </span>
                </div>
              </button>

              {/* Join Meeting (Blue Zoom Style) */}
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/10 hover:from-blue-600/30 hover:to-blue-700/20 border border-blue-500/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-xl shadow-blue-950/20 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:rotate-3 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="mt-4">
                  <span className="text-base font-bold text-white block">Join</span>
                  <span className="text-xs text-blue-200/70 block mt-0.5">
                    Via ID & Passcode
                  </span>
                </div>
              </button>

              {/* Schedule (Calendar) */}
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-indigo-700/10 hover:from-indigo-600/30 hover:to-indigo-700/20 border border-indigo-500/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-xl shadow-indigo-950/20 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:rotate-3 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="mt-4">
                  <span className="text-base font-bold text-white block">Schedule</span>
                  <span className="text-xs text-indigo-200/70 block mt-0.5">
                    Configure security policies
                  </span>
                </div>
              </button>

              {/* Share Screen */}
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 hover:from-emerald-600/30 hover:to-emerald-700/20 border border-emerald-500/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between group shadow-xl shadow-emerald-950/20 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:rotate-3 transition-transform">
                  <Share2 className="w-6 h-6" />
                </div>
                <div className="mt-4">
                  <span className="text-base font-bold text-white block">Share Screen</span>
                  <span className="text-xs text-emerald-200/70 block mt-0.5">
                    Join with screen share
                  </span>
                </div>
              </button>
            </div>

            {/* Security Guarantee Banner */}
            <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center space-x-3 text-xs text-gray-400">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Meetings protected by <strong>End-to-End Encryption</strong>, Host Waiting Room Controls, and JWT Role-based Authentication.
              </span>
            </div>
          </div>

          {/* Right: Camera & Audio Device Preview */}
          <div className="lg:col-span-6 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Hardware & Audio Check</span>
              <span className="text-xs text-blue-400 font-normal">Pre-Flight Test</span>
            </h2>

            <div className="flex-1 bg-[#161922] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              {/* Video Monitor */}
              <div className="relative aspect-video w-full rounded-xl bg-gray-950 overflow-hidden flex items-center justify-center border border-gray-800/80">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                />

                {isVideoOff && (
                  <div className="flex flex-col items-center justify-center text-gray-500 space-y-2">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xl border border-gray-700">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs">Camera is muted</span>
                  </div>
                )}

                {/* Status Pills */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-white flex items-center space-x-1.5 border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${!isVideoOff ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span>{currentUser.name} (You)</span>
                </div>

                {/* Mic Visualizer Bar on Video */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <Mic className={`w-3.5 h-3.5 ${isMuted ? 'text-red-400' : 'text-emerald-400'}`} />
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${isMuted ? 0 : audioLevel}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {isMuted ? 'Muted' : `${audioLevel}%`}
                  </span>
                </div>
              </div>

              {/* Pre-flight Controls */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                      isMuted
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                    <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleVideo}
                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                      isVideoOff
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4 text-blue-400" />}
                    <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
                  </button>
                </div>

                <span className="text-[11px] text-gray-400">Settings save to session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Active Meetings section */}
        <div className="mt-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Corporate Meeting Rooms</span>
            <span className="text-xs text-gray-500">Available for join</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCompanyMeetings.map((room) => (
              <div
                key={room.id}
                className="bg-[#161922] border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-base">{room.title}</h3>
                    {room.encrypted && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium">
                        E2EE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Host: <span className="text-gray-300 font-medium">{room.hostName}</span> • Meeting ID: <span className="text-blue-400 font-mono">{room.id}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Passcode: <code className="text-gray-400 font-mono">{room.passcode}</code>
                    {room.waitingRoom && ' • Waiting Room Enabled'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onJoinMeeting(room.id, room.passcode, { isMuted, isVideoOff })}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <span>Join Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1B1F2A] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Join a Meeting</h2>
            <p className="text-xs text-gray-400 mb-5">
              Enter the Meeting ID and Passcode provided by the meeting host.
            </p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Meeting ID or Personal Link Name
                </label>
                <input
                  type="text"
                  value={joinMeetingId}
                  onChange={(e) => setJoinMeetingId(e.target.value)}
                  placeholder="e.g. 948-283-1029"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Meeting Passcode
                </label>
                <input
                  type="text"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                  placeholder="6-digit passcode"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Join Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule / Custom Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#1B1F2A] border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Schedule Secure Meeting</h2>
            <p className="text-xs text-gray-400 mb-5">
              Configure participant permissions, waiting room gatekeeper, and encryption policies.
            </p>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Topic / Meeting Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Security Passcode
                </label>
                <input
                  type="text"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Policy Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-gray-800">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-white block">Enable Waiting Room</span>
                    <span className="text-[11px] text-gray-400">Host must manually admit participants</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableWaitingRoom}
                    onChange={(e) => setEnableWaitingRoom(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-white block">End-to-End Encrypted Chat</span>
                    <span className="text-[11px] text-gray-400">All text payloads encrypted via AES-GCM</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableEncryptedChat}
                    onChange={(e) => setEnableEncryptedChat(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-white block">Allow Participant Screen Sharing</span>
                    <span className="text-[11px] text-gray-400">Employees can share display feeds</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowParticipantScreenShare}
                    onChange={(e) => setAllowParticipantScreenShare(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMeeting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {creatingMeeting ? 'Creating...' : 'Start Scheduled Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
