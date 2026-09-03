import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, ShieldCheck, User as UserIcon, Smile } from 'lucide-react';
import type { Participant, ChatMessage } from '../types';
import { encryptMessage, decryptMessage } from '../utils/crypto';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  localParticipant: Participant;
  participants: Participant[];
  chatHistory: ChatMessage[];
  meetingId: string;
  passcode: string;
  allowChat: boolean;
  onSendMessage: (payload: {
    recipientSocketId?: string;
    encryptedContent: string;
    isEncrypted: boolean;
  }) => void;
}

interface DecryptedDisplayMessage extends ChatMessage {
  plainText: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  localParticipant,
  participants,
  chatHistory,
  meetingId,
  passcode,
  allowChat,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [recipientSocketId, setRecipientSocketId] = useState<string>('everyone');
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedDisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Decrypt incoming messages
  useEffect(() => {
    let isCancelled = false;

    async function decryptAll() {
      const results: DecryptedDisplayMessage[] = [];
      for (const msg of chatHistory) {
        let plain = msg.plainTextPreview || '';
        if (!plain && msg.encryptedContent) {
          plain = await decryptMessage(msg.encryptedContent, meetingId, passcode);
        }
        results.push({
          ...msg,
          plainText: plain,
        });
      }
      if (!isCancelled) {
        setDecryptedMessages(results);
      }
    }

    decryptAll();

    return () => {
      isCancelled = true;
    };
  }, [chatHistory, meetingId, passcode]);

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [decryptedMessages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Encrypt payload via AES-GCM
    const cipher = await encryptMessage(textToSend, meetingId, passcode);

    onSendMessage({
      recipientSocketId: recipientSocketId === 'everyone' ? undefined : recipientSocketId,
      encryptedContent: cipher,
      isEncrypted: true,
    });
  };

  const isHostOrAdmin = localParticipant.role === 'host' || localParticipant.role === 'admin';
  const chatDisabled = !allowChat && !isHostOrAdmin;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-[#161922] border-l border-gray-800 z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base">In-Meeting Chat</h3>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
            <Lock className="w-3 h-3" />
            <span>End-to-End Encrypted (AES-GCM)</span>
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

      {/* Security Info Pill */}
      <div className="p-2.5 bg-blue-950/40 border-b border-blue-900/40 text-[11px] text-blue-300/90 flex items-center space-x-2">
        <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span>
          Messages are cryptographically sealed with the room security key.
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {decryptedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
            <Lock className="w-8 h-8 text-gray-600" />
            <p className="text-xs">No messages yet.</p>
            <p className="text-[11px] text-gray-600 max-w-[200px]">
              Chat with everyone or send private direct messages to participants.
            </p>
          </div>
        ) : (
          decryptedMessages.map((msg) => {
            const isSelf = msg.senderSocketId === localParticipant.socketId;
            const isDirect = msg.recipientSocketId && msg.recipientSocketId !== 'everyone';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Metadata */}
                <div className="flex items-center space-x-1.5 text-[11px] mb-1 px-1">
                  <span className={`font-semibold ${isSelf ? 'text-blue-400' : 'text-gray-300'}`}>
                    {msg.senderName} {isSelf ? '(You)' : ''}
                  </span>

                  {msg.senderRole === 'admin' && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded font-bold uppercase">
                      Admin
                    </span>
                  )}
                  {msg.senderRole === 'host' && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1 rounded font-bold uppercase">
                      Host
                    </span>
                  )}

                  {isDirect && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium">
                      Direct Message
                    </span>
                  )}

                  <span className="text-gray-500 text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-md ${
                    isSelf
                      ? isDirect
                        ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-br-none'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                      : isDirect
                      ? 'bg-[#2A231C] border border-amber-500/30 text-amber-100 rounded-bl-none'
                      : 'bg-[#1E2330] border border-gray-700/70 text-gray-200 rounded-bl-none'
                  }`}
                >
                  <p>{msg.plainText}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer & Input */}
      <div className="p-3 border-t border-gray-800 bg-[#12141A]">
        {chatDisabled ? (
          <div className="p-2 text-center text-xs text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
            Chat is currently disabled by the host.
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-2">
            {/* Recipient Selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400 font-medium">To:</span>
              <select
                value={recipientSocketId}
                onChange={(e) => setRecipientSocketId(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 flex-1"
              >
                <option value="everyone">Everyone (Group Chat)</option>
                {participants
                  .filter((p) => p.socketId !== localParticipant.socketId)
                  .map((p) => (
                    <option key={p.socketId} value={p.socketId}>
                      {p.name} (Direct Message)
                    </option>
                  ))}
              </select>
            </div>

            {/* Input Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  recipientSocketId === 'everyone'
                    ? 'Send encrypted group message...'
                    : 'Send private direct message...'
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="absolute right-1.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
