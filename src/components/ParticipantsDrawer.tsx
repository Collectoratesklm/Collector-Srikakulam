import React, { useState } from 'react';
import {
  X,
  Users,
  UserCheck,
  UserX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  MoreVertical,
  Shield,
  Copy,
  Check,
  Crown,
} from 'lucide-react';
import type { Participant, UserRole } from '../types';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  localParticipant: Participant;
  participants: Participant[];
  waitingParticipants: Participant[];
  meetingId: string;
  passcode: string;
  onAdmit: (socketId: string) => void;
  onAdmitAll: () => void;
  onDeny: (socketId: string) => void;
  onMuteParticipant: (socketId: string) => void;
  onStopVideoParticipant: (socketId: string) => void;
  onKickParticipant: (socketId: string) => void;
  onTransferHost: (socketId: string) => void;
  onMuteAll: () => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  localParticipant,
  participants,
  waitingParticipants,
  meetingId,
  passcode,
  onAdmit,
  onAdmitAll,
  onDeny,
  onMuteParticipant,
  onStopVideoParticipant,
  onKickParticipant,
  onTransferHost,
  onMuteAll,
}) => {
  const [search, setSearch] = useState('');
  const [activeMenuSocketId, setActiveMenuSocketId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isHostOrAdmin = localParticipant.role === 'host' || localParticipant.role === 'admin';
  const allInMeeting = [localParticipant, ...participants.filter((p) => p.socketId !== localParticipant.socketId)];

  const filteredParticipants = allInMeeting.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.department && p.department.toLowerCase().includes(search.toLowerCase()))
  );

  const copyInvite = () => {
    navigator.clipboard.writeText(
      `Join ZoomRTC Meeting\nMeeting ID: ${meetingId}\nPasscode: ${passcode}\nJoin Link: ${window.location.origin}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-[#161922] border-l border-gray-800 z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white text-base">Participants</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
            {allInMeeting.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Waiting Room Section (if any and host/admin) */}
      {isHostOrAdmin && waitingParticipants.length > 0 && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
              <span>Waiting Room ({waitingParticipants.length})</span>
            </span>
            <button
              type="button"
              onClick={onAdmitAll}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Admit All
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {waitingParticipants.map((wp) => (
              <div
                key={wp.socketId}
                className="flex items-center justify-between bg-[#1B1F2A] p-2 rounded-lg border border-amber-500/20 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-white block truncate">{wp.name}</span>
                  <span className="text-[10px] text-gray-400">ID: {wp.userId}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onAdmit(wp.socketId)}
                    title="Admit to meeting"
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center space-x-0.5 cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Admit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeny(wp.socketId)}
                    title="Deny entry"
                    className="p-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] cursor-pointer"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search participants..."
          className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredParticipants.map((p) => {
          const isSelf = p.socketId === localParticipant.socketId;
          const showActions = isHostOrAdmin && !isSelf;

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition-colors group relative"
            >
              {/* Avatar and info */}
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                  style={{ backgroundColor: p.avatarColor || '#0E72ED' }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                    {isSelf && <span className="text-[10px] text-gray-400">(Me)</span>}
                  </div>

                  <div className="flex items-center space-x-1 text-[10px] text-gray-400 mt-0.5">
                    {p.role === 'admin' && (
                      <span className="text-purple-400 font-bold uppercase">Admin</span>
                    )}
                    {p.role === 'host' && (
                      <span className="text-blue-400 font-bold uppercase">Host</span>
                    )}
                    {p.department && <span>• {p.department}</span>}
                  </div>
                </div>
              </div>

              {/* Status & Moderation Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                {p.isHandRaised && (
                  <Hand className="w-4 h-4 text-amber-400 animate-bounce" title="Hand Raised" />
                )}

                {p.isMuted ? (
                  <MicOff className="w-4 h-4 text-red-400" title="Microphone muted" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400" title="Microphone active" />
                )}

                {p.isVideoOff ? (
                  <VideoOff className="w-4 h-4 text-red-400" title="Camera stopped" />
                ) : (
                  <Video className="w-4 h-4 text-blue-400" title="Camera active" />
                )}

                {/* Host Moderation Menu */}
                {showActions && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuSocketId(
                          activeMenuSocketId === p.socketId ? null : p.socketId
                        )
                      }
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuSocketId === p.socketId && (
                      <div className="absolute right-0 top-8 w-44 bg-[#1F2430] border border-gray-700 rounded-xl shadow-2xl p-1 z-50 flex flex-col space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onMuteParticipant(p.socketId);
                            setActiveMenuSocketId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-gray-200 hover:bg-gray-700/70 rounded-lg flex items-center space-x-2"
                        >
                          <MicOff className="w-3.5 h-3.5 text-red-400" />
                          <span>Mute Audio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onStopVideoParticipant(p.socketId);
                            setActiveMenuSocketId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-gray-200 hover:bg-gray-700/70 rounded-lg flex items-center space-x-2"
                        >
                          <VideoOff className="w-3.5 h-3.5 text-red-400" />
                          <span>Stop Video</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onTransferHost(p.socketId);
                            setActiveMenuSocketId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-gray-200 hover:bg-gray-700/70 rounded-lg flex items-center space-x-2"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Make Host</span>
                        </button>

                        <div className="border-t border-gray-700 my-0.5" />

                        <button
                          type="button"
                          onClick={() => {
                            onKickParticipant(p.socketId);
                            setActiveMenuSocketId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center space-x-2 font-medium"
                        >
                          <UserX className="w-3.5 h-3.5 text-red-400" />
                          <span>Remove User</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Moderation Mute All & Copy Invite */}
      <div className="p-3 border-t border-gray-800 bg-[#12141A] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={copyInvite}
          className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Invite'}</span>
        </button>

        {isHostOrAdmin && (
          <button
            type="button"
            onClick={onMuteAll}
            className="flex-1 py-2 px-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span>Mute All</span>
          </button>
        )}
      </div>
    </div>
  );
};
