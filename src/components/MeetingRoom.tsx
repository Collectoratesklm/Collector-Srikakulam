import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Grid,
  Maximize,
  Clock,
  KeyRound,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type {
  User,
  Meeting,
  MeetingSettings,
  Participant,
  ChatMessage,
} from '../types';
import { getSocket, connectSocket } from '../services/socket';
import { WebRTCManager } from '../utils/webrtc';
import { VideoGrid } from './VideoGrid';
import { ControlsBar } from './ControlsBar';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { ChatDrawer } from './ChatDrawer';
import { SecurityModal } from './SecurityModal';

interface MeetingRoomProps {
  currentUser: User;
  token: string;
  meetingId: string;
  passcode: string;
  initialMediaState: { isMuted: boolean; isVideoOff: boolean };
  onLeave: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  currentUser,
  token,
  meetingId,
  passcode,
  initialMediaState,
  onLeave,
}) => {
  // Meeting metadata & settings
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [settings, setSettings] = useState<MeetingSettings>({
    waitingRoomEnabled: true,
    isLocked: false,
    allowChat: true,
    allowScreenShare: true,
    allowUnmute: true,
    requirePasscode: true,
    encryptedChat: true,
  });

  // Waiting Room state (if placed in waiting room)
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [waitingInfo, setWaitingInfo] = useState<{ meetingTitle: string; hostName: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // Participants & Media
  const [localParticipant, setLocalParticipant] = useState<Participant>({
    socketId: '',
    userId: currentUser.id,
    name: currentUser.name,
    role: currentUser.role === 'admin' ? 'admin' : 'employee',
    department: currentUser.department,
    isMuted: initialMediaState.isMuted,
    isVideoOff: initialMediaState.isVideoOff,
    isScreenSharing: false,
    isHandRaised: false,
    inWaitingRoom: false,
    joinedAt: new Date().toISOString(),
    avatarColor: '#0E72ED',
  });

  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState<'participants' | 'chat' | 'security' | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Session states
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeakerSocketId, setActiveSpeakerSocketId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Map<string, Array<{ id: string; reaction: string }>>>(new Map());

  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Setup WebRTC & Socket Connection
  useEffect(() => {
    const socket = connectSocket();
    const manager = new WebRTCManager();
    webrtcManagerRef.current = manager;

    // Handle remote streams from WebRTC
    manager.onRemoteStream = (socketId, stream) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(socketId, stream);
        return next;
      });
    };

    manager.onRemoteStreamRemoved = (socketId) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    // Forward ICE candidate to remote peer via Socket.io
    manager.onIceCandidate = (targetSocketId, candidate) => {
      socket.emit('signal:ice-candidate', { targetSocketId, candidate });
    };

    // Acquire local media
    manager.getLocalMedia(!initialMediaState.isVideoOff, !initialMediaState.isMuted)
      .then((stream) => {
        setLocalStream(stream);

        // Join room via socket
        socket.emit('room:join', {
          roomId: meetingId,
          token,
          passcode,
          mediaState: initialMediaState,
        });
      })
      .catch((err) => {
        console.error('Failed to acquire local media:', err);
      });

    // Socket Events
    socket.on('room:error', (data: { message: string }) => {
      alert(data.message);
      onLeave();
    });

    socket.on('room:waiting-room', (data: { meetingTitle: string; hostName: string; message: string }) => {
      setIsConnecting(false);
      setInWaitingRoom(true);
      setWaitingInfo({ meetingTitle: data.meetingTitle, hostName: data.hostName });
    });

    socket.on('room:admitted', () => {
      setInWaitingRoom(false);
      setIsConnecting(false);
      showToast('You have been admitted to the meeting.');
    });

    socket.on('room:denied', (data: { message: string }) => {
      alert(data.message || 'Host denied admission.');
      onLeave();
    });

    socket.on('room:joined', async (data: {
      meeting: Meeting;
      self: Participant;
      existingParticipants: Participant[];
      waitingParticipants: Participant[];
      chatHistory: ChatMessage[];
    }) => {
      setIsConnecting(false);
      setInWaitingRoom(false);
      setMeeting(data.meeting);
      setSettings(data.meeting.settings);
      setLocalParticipant(data.self);
      setRemoteParticipants(data.existingParticipants);
      setWaitingParticipants(data.waitingParticipants || []);
      setChatHistory(data.chatHistory || []);

      // Initiate WebRTC connections with all existing peers
      for (const peer of data.existingParticipants) {
        try {
          const offer = await manager.createOffer(peer.socketId);
          socket.emit('signal:offer', {
            targetSocketId: peer.socketId,
            offer,
            senderInfo: data.self,
          });
        } catch (e) {
          console.warn('Failed to create offer for peer:', peer.socketId, e);
        }
      }
    });

    // Peer joined
    socket.on('peer:joined', ({ participant }: { participant: Participant }) => {
      setRemoteParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      showToast(`${participant.name} joined the meeting.`);
    });

    // WebRTC Signaling Events
    socket.on('signal:offer', async ({ senderSocketId, offer }: {
      senderSocketId: string;
      offer: RTCSessionDescriptionInit;
      senderInfo: Participant;
    }) => {
      try {
        const answer = await manager.handleOffer(senderSocketId, offer);
        socket.emit('signal:answer', { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.warn('Error handling offer:', err);
      }
    });

    socket.on('signal:answer', async ({ senderSocketId, answer }: {
      senderSocketId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        await manager.handleAnswer(senderSocketId, answer);
      } catch (err) {
        console.warn('Error handling answer:', err);
      }
    });

    socket.on('signal:ice-candidate', async ({ senderSocketId, candidate }: {
      senderSocketId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        await manager.handleIceCandidate(senderSocketId, candidate);
      } catch (err) {
        console.warn('Error handling ICE candidate:', err);
      }
    });

    // Peer left
    socket.on('peer:left', ({ socketId, participantName }: { socketId: string; participantName: string }) => {
      manager.closePeerConnection(socketId);
      setRemoteParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      showToast(`${participantName} left the meeting.`);
    });

    // Peer state changes (audio, video, hand, screenshare)
    socket.on('peer:state-changed', ({ socketId, updates }: { socketId: string; updates: Partial<Participant> }) => {
      setRemoteParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...updates } : p))
      );
    });

    // Reactions
    socket.on('peer:reaction', ({ socketId, reaction }: { socketId: string; reaction: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactionsMap((prev) => {
        const next = new Map<string, Array<{ id: string; reaction: string }>>(prev);
        const list = next.get(socketId) || [];
        next.set(socketId, [...list, { id, reaction }]);
        return next;
      });

      // Clear after animation
      setTimeout(() => {
        setReactionsMap((prev) => {
          const next = new Map<string, Array<{ id: string; reaction: string }>>(prev);
          const list = next.get(socketId) || [];
          next.set(socketId, list.filter((r) => r.id !== id));
          return next;
        });
      }, 2500);
    });

    // In-meeting Chat
    socket.on('chat:received', (message: ChatMessage) => {
      setChatHistory((prev) => [...prev, message]);
      if (activeDrawer !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
    });

    // Moderation events
    socket.on('moderation:force-mute', () => {
      manager.setAudioMuted(true);
      setLocalParticipant((p) => ({ ...p, isMuted: true }));
      showToast('You have been muted by the host.');
    });

    socket.on('moderation:force-stop-video', () => {
      manager.setVideoDisabled(true);
      setLocalParticipant((p) => ({ ...p, isVideoOff: true }));
      showToast('The host has requested your video be turned off.');
    });

    socket.on('moderation:kicked', ({ reason }: { reason: string }) => {
      alert(reason || 'You were removed from the meeting.');
      onLeave();
    });

    socket.on('meeting:terminated', ({ reason }: { reason: string }) => {
      alert(reason || 'The meeting has ended.');
      onLeave();
    });

    socket.on('waiting-room:updated', ({ waitingParticipants }: { waitingParticipants: Participant[] }) => {
      setWaitingParticipants(waitingParticipants);
    });

    socket.on('room:settings-updated', ({ settings }: { settings: MeetingSettings }) => {
      setSettings(settings);
      showToast('Meeting settings updated.');
    });

    socket.on('room:host-transferred', ({ newHostName }: { newHostName: string }) => {
      showToast(`${newHostName} is now the host of this meeting.`);
    });

    return () => {
      socket.off('room:error');
      socket.off('room:waiting-room');
      socket.off('room:admitted');
      socket.off('room:denied');
      socket.off('room:joined');
      socket.off('peer:joined');
      socket.off('signal:offer');
      socket.off('signal:answer');
      socket.off('signal:ice-candidate');
      socket.off('peer:left');
      socket.off('peer:state-changed');
      socket.off('peer:reaction');
      socket.off('chat:received');
      socket.off('moderation:force-mute');
      socket.off('moderation:force-stop-video');
      socket.off('moderation:kicked');
      socket.off('meeting:terminated');
      socket.off('waiting-room:updated');
      socket.off('room:settings-updated');
      socket.off('room:host-transferred');

      manager.destroy();
    };
  }, [meetingId, token, passcode]);

  // Handle Controls Bar Actions
  const handleToggleAudio = () => {
    const next = !localParticipant.isMuted;
    if (!next && !settings.allowUnmute && localParticipant.role !== 'host' && localParticipant.role !== 'admin') {
      showToast('The host has disallowed participants from unmuting themselves.');
      return;
    }
    webrtcManagerRef.current?.setAudioMuted(next);
    setLocalParticipant((p) => ({ ...p, isMuted: next }));
    getSocket().emit('user:toggle-audio', { isMuted: next });
  };

  const handleToggleVideo = () => {
    const next = !localParticipant.isVideoOff;
    webrtcManagerRef.current?.setVideoDisabled(next);
    setLocalParticipant((p) => ({ ...p, isVideoOff: next }));
    getSocket().emit('user:toggle-video', { isVideoOff: next });
  };

  const handleToggleScreenShare = async () => {
    const manager = webrtcManagerRef.current;
    if (!manager) return;

    if (localParticipant.isScreenSharing) {
      manager.stopScreenShare();
      setLocalParticipant((p) => ({ ...p, isScreenSharing: false }));
      getSocket().emit('user:toggle-screenshare', { isScreenSharing: false });
    } else {
      try {
        await manager.startScreenShare();
        setLocalParticipant((p) => ({ ...p, isScreenSharing: true }));
        getSocket().emit('user:toggle-screenshare', { isScreenSharing: true });
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  const handleToggleHand = () => {
    const next = !localParticipant.isHandRaised;
    setLocalParticipant((p) => ({ ...p, isHandRaised: next }));
    getSocket().emit('user:toggle-hand', { isHandRaised: next });
  };

  const handleSendReaction = (reaction: string) => {
    getSocket().emit('user:send-reaction', { reaction });
  };

  const handleSendMessage = (payload: {
    recipientSocketId?: string;
    encryptedContent: string;
    isEncrypted: boolean;
  }) => {
    getSocket().emit('chat:send-message', payload);
  };

  // Host/Admin Moderation Actions
  const handleAdmit = (targetSocketId: string) => {
    getSocket().emit('waiting-room:admit', { targetSocketId });
  };

  const handleAdmitAll = () => {
    getSocket().emit('waiting-room:admit-all');
  };

  const handleDeny = (targetSocketId: string) => {
    getSocket().emit('waiting-room:deny', { targetSocketId });
  };

  const handleMuteParticipant = (targetSocketId: string) => {
    getSocket().emit('host:mute-participant', { targetSocketId });
  };

  const handleStopVideoParticipant = (targetSocketId: string) => {
    getSocket().emit('host:stop-video', { targetSocketId });
  };

  const handleKickParticipant = (targetSocketId: string) => {
    getSocket().emit('host:kick-participant', { targetSocketId });
  };

  const handleTransferHost = (targetSocketId: string) => {
    getSocket().emit('host:transfer-host', { targetSocketId });
  };

  const handleMuteAll = () => {
    getSocket().emit('host:mute-all');
  };

  const handleToggleLock = (isLocked: boolean) => {
    getSocket().emit('host:toggle-lock', { isLocked });
  };

  const handleUpdateSettings = (newSettings: Partial<MeetingSettings>) => {
    getSocket().emit('host:update-settings', newSettings);
  };

  const handleEndMeetingForAll = () => {
    getSocket().emit('host:end-meeting');
    onLeave();
  };

  const copyMeetingDetails = () => {
    navigator.clipboard.writeText(
      `ZoomRTC Meeting\nID: ${meetingId}\nPasscode: ${passcode}\nURL: ${window.location.href}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 1. Loading / Connecting Screen
  if (isConnecting) {
    return (
      <div className="flex-1 bg-[#0F1117] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Connecting to Secure Session...</h2>
        <p className="text-xs text-gray-400 max-w-sm">
          Negotiating WebRTC mesh peer connection and verifying JWT credentials.
        </p>
      </div>
    );
  }

  // 2. Waiting Room Screen (Participant is waiting for Host/Admin approval)
  if (inWaitingRoom) {
    return (
      <div className="flex-1 bg-[#0F1117] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-full max-w-md bg-[#161922] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Pulsing indicator */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 z-10">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-white mb-2">
            Please wait, the meeting host will let you in soon.
          </h2>

          <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 my-5 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Meeting Topic:</span>
              <span className="text-white font-semibold">{waitingInfo?.meetingTitle || 'Virtual Conference'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Host:</span>
              <span className="text-blue-400 font-semibold">{waitingInfo?.hostName || 'Executive Host'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Your Identity:</span>
              <span className="text-gray-200">{currentUser.name} ({currentUser.id})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Leave Waiting Room
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Zoom Meeting Room
  return (
    <div className="flex-1 flex flex-col bg-[#0F1117] h-[calc(100vh-4rem)] overflow-hidden relative select-none">
      {/* Top Meeting Header (Zoom Style) */}
      <div className="h-14 bg-[#161922] border-b border-gray-800 px-4 md:px-6 flex items-center justify-between z-20 shrink-0">
        {/* Meeting Details & Security Badge */}
        <div className="flex items-center space-x-3 truncate">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-sm text-white truncate">
              {meeting?.title || 'Virtual Meeting'}
            </span>
          </div>

          {/* E2EE indicator */}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted (AES-GCM)</span>
          </div>

          {settings.isLocked && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </div>
          )}
        </div>

        {/* Room ID & Passcode with Quick Copy */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            type="button"
            onClick={copyMeetingDetails}
            className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Copy Meeting Link & Passcode"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="font-mono text-[11px] hidden sm:inline">
              ID: {meetingId} • Pass: {passcode}
            </span>
            <span className="sm:hidden font-mono text-[11px]">Copy Info</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {notification && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md border border-gray-700 px-4 py-2 rounded-xl text-xs text-white shadow-2xl animate-fade-in">
          {notification}
        </div>
      )}

      {/* Main Video Stage */}
      <div className="flex-1 overflow-hidden relative flex">
        <VideoGrid
          localParticipant={localParticipant}
          localStream={localStream}
          remoteParticipants={remoteParticipants}
          remoteStreams={remoteStreams}
          activeSpeakerSocketId={activeSpeakerSocketId}
          reactionsMap={reactionsMap}
        />

        {/* Side Drawers */}
        <ParticipantsDrawer
          isOpen={activeDrawer === 'participants'}
          onClose={() => setActiveDrawer(null)}
          localParticipant={localParticipant}
          participants={remoteParticipants}
          waitingParticipants={waitingParticipants}
          meetingId={meetingId}
          passcode={passcode}
          onAdmit={handleAdmit}
          onAdmitAll={handleAdmitAll}
          onDeny={handleDeny}
          onMuteParticipant={handleMuteParticipant}
          onStopVideoParticipant={handleStopVideoParticipant}
          onKickParticipant={handleKickParticipant}
          onTransferHost={handleTransferHost}
          onMuteAll={handleMuteAll}
        />

        <ChatDrawer
          isOpen={activeDrawer === 'chat'}
          onClose={() => setActiveDrawer(null)}
          localParticipant={localParticipant}
          participants={remoteParticipants}
          chatHistory={chatHistory}
          meetingId={meetingId}
          passcode={passcode}
          allowChat={settings.allowChat}
          onSendMessage={handleSendMessage}
        />

        <SecurityModal
          isOpen={activeDrawer === 'security'}
          onClose={() => setActiveDrawer(null)}
          settings={settings}
          meetingId={meetingId}
          passcode={passcode}
          onToggleLock={handleToggleLock}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Zoom Bottom Controls Bar */}
      <ControlsBar
        participant={localParticipant}
        settings={settings}
        participantsCount={remoteParticipants.length + 1}
        waitingCount={waitingParticipants.length}
        unreadChatCount={unreadChatCount}
        isRecording={isRecording}
        isScreenSharing={localParticipant.isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHand={handleToggleHand}
        onSendReaction={handleSendReaction}
        onToggleRecording={() => setIsRecording(!isRecording)}
        onOpenDrawer={(tab) => {
          if (tab === 'chat') setUnreadChatCount(0);
          setActiveDrawer(activeDrawer === tab ? null : tab);
        }}
        onLeaveMeeting={onLeave}
        onEndMeetingForAll={handleEndMeetingForAll}
      />
    </div>
  );
};
