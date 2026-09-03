import React, { useRef, useEffect } from 'react';
import { MicOff, Hand, Pin, Maximize2, Shield, ScreenShare } from 'lucide-react';
import type { Participant } from '../types';

interface VideoTileProps {
  stream?: MediaStream | null;
  participant: Participant;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  reactions?: Array<{ id: string; reaction: string }>;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  participant,
  isLocal = false,
  isActiveSpeaker = false,
  isPinned = false,
  onTogglePin,
  reactions = [],
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && !participant.isVideoOff && stream.getVideoTracks().length > 0;

  return (
    <div
      className={`relative w-full h-full bg-[#12141A] rounded-2xl overflow-hidden border transition-all flex items-center justify-center group select-none ${
        isActiveSpeaker
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40'
          : 'border-gray-800/80 hover:border-gray-700'
      }`}
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video element to avoid audio feedback loop
        className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'} ${
          isLocal && !participant.isScreenSharing ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Avatar Fallback if Camera is Off */}
      {!hasVideo && (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl md:text-3xl shadow-xl relative border-2 border-white/10"
            style={{ backgroundColor: participant.avatarColor || '#0E72ED' }}
          >
            {participant.name.slice(0, 2).toUpperCase()}

            {/* Speaking Pulse Ring */}
            {isActiveSpeaker && (
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-40" />
            )}
          </div>
          <span className="text-sm font-semibold text-gray-200">{participant.name}</span>
        </div>
      )}

      {/* Floating Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-4xl animate-bounce"
            style={{
              animation: 'floatReaction 2.4s ease-out forwards',
            }}
          >
            {r.reaction}
          </div>
        ))}
      </div>

      {/* Top Left: Hand Raised Badge & Screen Share Badge */}
      <div className="absolute top-3 left-3 flex items-center space-x-1.5 z-10">
        {participant.isHandRaised && (
          <div className="bg-amber-500 text-black px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 shadow-md animate-pulse">
            <Hand className="w-3.5 h-3.5" />
            <span>Hand Raised</span>
          </div>
        )}

        {participant.isScreenSharing && (
          <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 shadow-md">
            <ScreenShare className="w-3.5 h-3.5" />
            <span>Sharing Screen</span>
          </div>
        )}
      </div>

      {/* Top Right: Pin & Maximize controls */}
      {onTogglePin && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 z-10">
          <button
            type="button"
            onClick={onTogglePin}
            title={isPinned ? 'Unpin' : 'Pin to primary stage'}
            className={`p-1.5 rounded hover:bg-white/20 text-gray-300 hover:text-white transition-colors ${
              isPinned ? 'text-blue-400' : ''
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom Overlay: Participant Name, Role & Mic Status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs text-white max-w-[85%] truncate">
          <span className="font-medium truncate">
            {participant.name} {isLocal ? '(You)' : ''}
          </span>

          {participant.role === 'admin' && (
            <span className="bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
              Admin
            </span>
          )}

          {participant.role === 'host' && (
            <span className="bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
              Host
            </span>
          )}

          {participant.department && (
            <span className="text-gray-400 text-[10px] hidden sm:inline truncate">
              • {participant.department}
            </span>
          )}
        </div>

        {/* Audio Muted Indicator */}
        <div
          className={`p-1.5 rounded-lg border text-xs shadow-md ${
            participant.isMuted
              ? 'bg-red-500/90 text-white border-red-400'
              : 'bg-black/60 text-emerald-400 border-white/10'
          }`}
        >
          <MicOff className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
