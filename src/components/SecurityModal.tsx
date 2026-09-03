import React from 'react';
import { X, Shield, Lock, Unlock, Users, Share2, MessageSquare, Mic, KeyRound } from 'lucide-react';
import type { MeetingSettings } from '../types';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MeetingSettings;
  meetingId: string;
  passcode: string;
  onToggleLock: (isLocked: boolean) => void;
  onUpdateSettings: (newSettings: Partial<MeetingSettings>) => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  settings,
  meetingId,
  passcode,
  onToggleLock,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1B1F2A] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Security Controls</h3>
              <p className="text-[11px] text-gray-400">Manage room access & participant permissions</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Meeting Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => onToggleLock(!settings.isLocked)}
            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              settings.isLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                : 'bg-gray-900 border-gray-700/80 text-gray-200 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              {settings.isLocked ? (
                <Lock className="w-5 h-5 text-amber-400" />
              ) : (
                <Unlock className="w-5 h-5 text-gray-400" />
              )}
              <div className="text-left">
                <span className="text-xs font-bold block">
                  {settings.isLocked ? 'Meeting is Locked' : 'Lock Meeting'}
                </span>
                <span className="text-[11px] text-gray-400">
                  {settings.isLocked
                    ? 'No new participants can join this session.'
                    : 'Prevent any new users from joining.'}
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                settings.isLocked
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {settings.isLocked ? 'Locked' : 'Unlocked'}
            </span>
          </button>
        </div>

        {/* Permissions Section */}
        <div className="space-y-2 mb-4">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Participant Rules
          </h4>

          {/* Enable Waiting Room */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-gray-200">Enable Waiting Room</span>
            </div>
            <input
              type="checkbox"
              checked={settings.waitingRoomEnabled}
              onChange={(e) => onUpdateSettings({ waitingRoomEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          {/* Allow Share Screen */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-200">Allow Screen Sharing</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowScreenShare}
              onChange={(e) => onUpdateSettings({ allowScreenShare: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          {/* Allow Chat */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-gray-200">Allow In-Meeting Chat</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowChat}
              onChange={(e) => onUpdateSettings({ allowChat: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          {/* Allow Unmute */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <Mic className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-gray-200">Allow Participants to Unmute</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowUnmute}
              onChange={(e) => onUpdateSettings({ allowUnmute: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Credentials reminder */}
        <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <span>Room Passcode: <code className="text-white font-mono">{passcode}</code></span>
          </div>
          <span className="text-emerald-400 font-medium">AES-256 E2EE Active</span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
