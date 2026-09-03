export type UserRole = 'admin' | 'employee' | 'host' | 'co-host';

export interface User {
  id: string; // e.g. "Admin", "EMP-101"
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Participant {
  socketId: string;
  userId: string;
  name: string;
  role: UserRole;
  department?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  inWaitingRoom: boolean;
  joinedAt: string;
  avatarColor: string;
}

export interface MeetingSettings {
  waitingRoomEnabled: boolean;
  isLocked: boolean;
  allowChat: boolean;
  allowScreenShare: boolean;
  allowUnmute: boolean;
  requirePasscode: boolean;
  encryptedChat: boolean;
}

export interface Meeting {
  id: string; // e.g. "948-283-1029"
  title: string;
  passcode: string;
  hostUserId: string;
  hostName: string;
  settings: MeetingSettings;
  createdAt: string;
  activeParticipantsCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderSocketId: string;
  senderName: string;
  senderRole: UserRole;
  recipientSocketId?: string; // 'everyone' or specific socketId
  recipientName?: string;
  encryptedContent: string;
  plainTextPreview?: string; // decrypted locally
  isEncrypted: boolean;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  category: 'auth' | 'meeting' | 'moderation' | 'user-management' | 'security';
  details: string;
  roomId?: string;
}

export interface MeetingAnalytics {
  activeRooms: number;
  totalOnlineParticipants: number;
  totalMeetingsToday: number;
  aggregateBandwidthMbps: number;
  avgLatencyMs: number;
  packetLossPercent: number;
  uptimeHours: number;
}

export interface SignalOfferPayload {
  targetSocketId: string;
  senderSocketId: string;
  senderInfo: Participant;
  offer: RTCSessionDescriptionInit;
}

export interface SignalAnswerPayload {
  targetSocketId: string;
  senderSocketId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  targetSocketId: string;
  senderSocketId: string;
  candidate: RTCIceCandidateInit;
}
