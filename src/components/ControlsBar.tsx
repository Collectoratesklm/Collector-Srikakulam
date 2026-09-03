import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Users,
  MessageSquare,
  Share2,
  Smile,
  PhoneOff,
  Hand,
  ChevronUp,
  CircleDot,
} from 'lucide-react';
import type { Participant, MeetingSettings } from '../types';

interface ControlsBarProps {
  participant: Participant;
  settings: MeetingSettings;
  participantsCount: number;
  waitingCount: number;
  unreadChatCount: number;
  isRecording: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onSendReaction: (reaction: string) => void;
  onToggleRecording: () => void;
  onOpenDrawer: (tab: 'participants' | 'chat' | 'security') => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  participant,
  settings,
  participantsCount,
  waitingCount,
  unreadChatCount,
  isRecording,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onSendReaction,
  onToggleRecording,
  onOpenDrawer,
  onLeaveMeeting,
  onEndMeetingForAll,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showLeaveMenu, setShowLeaveMenu] = useState(false);

  const isHostOrAdmin = participant.role === 'host' || participant.role === 'admin';
  const reactionsList = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥'];

  return (
    <div className="h-18 md:h-20 bg-[#161922] border-t border-gray-800 px-3 md:px-6 flex items-center justify-between z-30 select-none relative">
      {/* Left: Audio & Video controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Audio Button */}
        <div className="flex items-center bg-gray-900/90 rounded-xl border border-gray-800 p-0.5">
          <button
            type="button"
            onClick={onToggleAudio}
            title={participant.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              participant.isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'text-gray-200 hover:bg-gray-800'
            }`}
          >
            {participant.isMuted ? (
              <MicOff className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {participant.isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>
        </div>

        {/* Video Button */}
        <div className="flex items-center bg-gray-900/90 rounded-xl border border-gray-800 p-0.5">
          <button
            type="button"
            onClick={onToggleVideo}
            title={participant.isVideoOff ? 'Start Camera' : 'Stop Camera'}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              participant.isVideoOff
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'text-gray-200 hover:bg-gray-800'
            }`}
          >
            {participant.isVideoOff ? (
              <VideoOff className="w-4 h-4 text-red-400" />
            ) : (
              <Video className="w-4 h-4 text-blue-400" />
            )}
            <span className="hidden sm:inline">
              {participant.isVideoOff ? 'Start Video' : 'Stop Video'}
            </span>
          </button>
        </div>
      </div>

      {/* Center: Meeting Actions (Security, Participants, Chat, Share Screen, Record, Reactions) */}
      <div className="flex items-center space-x-1 md:space-x-2">
        {/* Security (Host & Admin only) */}
        {isHostOrAdmin && (
          <button
            type="button"
            onClick={() => onOpenDrawer('security')}
            title="Meeting Security & Moderation Tools"
            className="flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl hover:bg-gray-800/80 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <Shield className="w-5 h-5 text-indigo-400 mb-0.5" />
            <span className="text-[10px] hidden sm:block">Security</span>
          </button>
        )}

        {/* Participants */}
        <button
          type="button"
          onClick={() => onOpenDrawer('participants')}
          title="Participant list and waiting room"
          className="flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl hover:bg-gray-800/80 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
        >
          <div className="relative">
            <Users className="w-5 h-5 text-gray-200 mb-0.5" />
            {waitingCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-black font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {waitingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] hidden sm:block">
            Users ({participantsCount})
          </span>
        </button>

        {/* Chat */}
        <button
          type="button"
          onClick={() => onOpenDrawer('chat')}
          title="In-meeting encrypted chat"
          className="flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl hover:bg-gray-800/80 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-gray-200 mb-0.5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-blue-500 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] hidden sm:block">Chat</span>
        </button>

        {/* Share Screen (Green in classic Zoom) */}
        <button
          type="button"
          onClick={onToggleScreenShare}
          title="Share your desktop screen"
          className={`flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl transition-colors cursor-pointer ${
            isScreenSharing
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'hover:bg-gray-800/80 text-emerald-400 hover:text-emerald-300'
          }`}
        >
          <Share2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] hidden sm:block">
            {isScreenSharing ? 'Sharing' : 'Share Screen'}
          </span>
        </button>

        {/* Record Meeting simulation */}
        <button
          type="button"
          onClick={onToggleRecording}
          title="Session Recording"
          className={`flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl transition-colors cursor-pointer ${
            isRecording
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              : 'hover:bg-gray-800/80 text-gray-400 hover:text-white'
          }`}
        >
          <CircleDot className="w-5 h-5 mb-0.5 text-red-500" />
          <span className="text-[10px] hidden sm:block">
            {isRecording ? 'Recording' : 'Record'}
          </span>
        </button>

        {/* Reactions & Hand Raise */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactions(!showReactions)}
            title="Emoji Reactions and Hand Raise"
            className="flex flex-col items-center justify-center w-12 md:w-16 h-12 md:h-14 rounded-xl hover:bg-gray-800/80 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <Smile className="w-5 h-5 text-amber-400 mb-0.5" />
            <span className="text-[10px] hidden sm:block">Reactions</span>
          </button>

          {/* Reactions Popover */}
          {showReactions && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-[#1B1F2A] border border-gray-700/80 rounded-2xl p-3 shadow-2xl flex flex-col space-y-2 z-50 w-64 backdrop-blur-lg">
              <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-gray-800">
                {reactionsList.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactions(false);
                    }}
                    className="text-2xl p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Raise / Lower Hand */}
              <button
                type="button"
                onClick={() => {
                  onToggleHand();
                  setShowReactions(false);
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                  participant.isHandRaised
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                }`}
              >
                <Hand className="w-4 h-4 text-amber-400" />
                <span>{participant.isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: End / Leave Meeting (Red Button) */}
      <div className="relative">
        {isHostOrAdmin ? (
          <div>
            <button
              type="button"
              onClick={() => setShowLeaveMenu(!showLeaveMenu)}
              className="px-3.5 md:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs md:text-sm flex items-center space-x-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {showLeaveMenu && (
              <div className="absolute bottom-14 right-0 w-48 bg-[#1B1F2A] border border-gray-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveMenu(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  End Meeting for All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveMenu(false);
                    onLeaveMeeting();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                >
                  Leave Meeting Only
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onLeaveMeeting}
            className="px-3.5 md:px-5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs md:text-sm flex items-center space-x-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </button>
        )}
      </div>
    </div>
  );
};
